import { ActivityEvent, ActivityEventType, ActivityStats } from '@/types/activity';
import { prisma } from '@/lib/db';

function parseActivityRecord(record: {
  id: string;
  type: string;
  userId: string;
  summary: string;
  metadataJson: string | null;
  timestamp: Date;
}): ActivityEvent {
  let metadata: Record<string, any> = {};
  if (record.metadataJson) {
    try {
      metadata = JSON.parse(record.metadataJson);
    } catch {
      metadata = {};
    }
  }

  return {
    id: record.id,
    type: record.type as ActivityEventType,
    userId: record.userId,
    summary: record.summary,
    metadata,
    timestamp: record.timestamp.toISOString(),
  };
}

export class ActivityRepository {
  private events: ActivityEvent[] = [];
  private readonly maxEvents = 1000;

  public save(
    data: Omit<ActivityEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ): ActivityEvent {
    const event: ActivityEvent = {
      id: data.id || ('evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
      type: data.type,
      userId: data.userId,
      timestamp: data.timestamp || new Date().toISOString(),
      summary: data.summary,
      metadata: data.metadata || {},
    };

    this.events.unshift(event);

    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Persist to database asynchronously
    this.persistToDb(event).catch(() => {});

    return event;
  }

  public async saveAsync(
    data: Omit<ActivityEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ): Promise<ActivityEvent> {
    const event = this.save(data);
    await this.persistToDb(event);
    return event;
  }

  private async persistToDb(event: ActivityEvent): Promise<void> {
    try {
      await prisma.activity.create({
        data: {
          id: event.id,
          type: event.type,
          userId: event.userId,
          summary: event.summary,
          metadataJson: event.metadata ? JSON.stringify(event.metadata) : null,
          timestamp: new Date(event.timestamp),
        },
      });
    } catch {
      // Safe fallback if database operation fails
    }
  }

  public getAll(limit = 50): ActivityEvent[] {
    return this.events.slice(0, limit);
  }

  public async getAllAsync(limit = 50): Promise<ActivityEvent[]> {
    try {
      const records = await prisma.activity.findMany({
        take: limit,
        orderBy: { timestamp: 'desc' },
      });
      if (records.length > 0) {
        return records.map(parseActivityRecord);
      }
    } catch {
      // fallback
    }
    return this.getAll(limit);
  }

  public getByUserId(userId: string, limit = 50): ActivityEvent[] {
    return this.events
      .filter((e) => e.userId === userId)
      .slice(0, limit);
  }

  public async getByUserIdAsync(userId: string, limit = 50): Promise<ActivityEvent[]> {
    try {
      const records = await prisma.activity.findMany({
        where: { userId },
        take: limit,
        orderBy: { timestamp: 'desc' },
      });
      if (records.length > 0) {
        return records.map(parseActivityRecord);
      }
    } catch {
      // fallback
    }
    return this.getByUserId(userId, limit);
  }

  public countByType(type: ActivityEventType, userId?: string): number {
    return this.events.filter((e) => {
      const matchType = e.type === type;
      const matchUser = userId ? e.userId === userId : true;
      return matchType && matchUser;
    }).length;
  }

  public countTotal(userId?: string): number {
    if (!userId) return this.events.length;
    return this.events.filter((e) => e.userId === userId).length;
  }

  public async countTotalAsync(userId?: string): Promise<number> {
    try {
      const count = await prisma.activity.count({
        where: userId ? { userId } : undefined,
      });
      return count;
    } catch {
      return this.countTotal(userId);
    }
  }

  public getStats(userId?: string): ActivityStats {
    const list = userId
      ? this.events.filter((e) => e.userId === userId)
      : this.events;

    const byType: Record<ActivityEventType, number> = {
      AUDIT_CREATED: 0,
      KEYWORD_RESEARCH: 0,
      CONTENT_ANALYSIS: 0,
      REPORT_CREATED: 0,
      REPORT_EXPORTED: 0,
      AI_IMPROVEMENT_REQUESTED: 0,
      USER_LOGIN: 0,
      ADMIN_LOGIN: 0,
    };

    for (const evt of list) {
      if (byType[evt.type] !== undefined) {
        byType[evt.type]++;
      }
    }

    return {
      totalEvents: list.length,
      totalAudits: byType.AUDIT_CREATED,
      totalKeywordSearches: byType.KEYWORD_RESEARCH,
      totalContentAnalyses: byType.CONTENT_ANALYSIS,
      totalReports: byType.REPORT_CREATED + byType.REPORT_EXPORTED,
      totalAiImprovements: byType.AI_IMPROVEMENT_REQUESTED,
      byType,
    };
  }

  public async getStatsAsync(userId?: string): Promise<ActivityStats> {
    try {
      const records = await prisma.activity.findMany({
        where: userId ? { userId } : undefined,
      });

      const byType: Record<ActivityEventType, number> = {
        AUDIT_CREATED: 0,
        KEYWORD_RESEARCH: 0,
        CONTENT_ANALYSIS: 0,
        REPORT_CREATED: 0,
        REPORT_EXPORTED: 0,
        AI_IMPROVEMENT_REQUESTED: 0,
        USER_LOGIN: 0,
        ADMIN_LOGIN: 0,
      };

      for (const rec of records) {
        const type = rec.type as ActivityEventType;
        if (byType[type] !== undefined) {
          byType[type]++;
        }
      }

      return {
        totalEvents: records.length,
        totalAudits: byType.AUDIT_CREATED,
        totalKeywordSearches: byType.KEYWORD_RESEARCH,
        totalContentAnalyses: byType.CONTENT_ANALYSIS,
        totalReports: byType.REPORT_CREATED + byType.REPORT_EXPORTED,
        totalAiImprovements: byType.AI_IMPROVEMENT_REQUESTED,
        byType,
      };
    } catch {
      return this.getStats(userId);
    }
  }

  public clear(): void {
    this.events = [];
  }
}

export const activityRepository = new ActivityRepository();