import { activityRepository } from '@/repositories/activity.repository';
import { ActivityEvent, ActivityEventType, ActivityStats } from '@/types/activity';
import { DEFAULT_USER_ID } from '@/lib/auth/user-session';

export interface RecordActivityInput {
  type: ActivityEventType;
  userId?: string;
  summary: string;
  metadata?: Record<string, any>;
}

export class ActivityService {
  private sanitizeMetadata(
    raw?: Record<string, any>
  ): Record<string, string | number | boolean | null> {
    if (!raw || typeof raw !== 'object') return {};

    const clean: Record<string, string | number | boolean | null> = {};
    const sensitivePatterns = [
      /(?:api[_-]?key|secret[_-]?key|access[_-]?key|private[_-]?key|^key$)/i,
      /secret/i,
      /token/i,
      /password/i,
      /auth/i,
      /cookie/i,
      /credential/i,
      /bearer/i,
      /(?:^|_)content(?:$|_)/i,
      /(?:^|_)body(?:$|_)/i,
      /article(?:body|text|draft)/i,
      /draft/i,
      /html/i,
    ];

    for (const [key, val] of Object.entries(raw)) {
      if (sensitivePatterns.some((pattern) => pattern.test(key))) {
        continue;
      }

      if (val === null || val === undefined) {
        clean[key] = null;
      } else if (typeof val === 'string') {
        clean[key] = val.length > 200 ? val.slice(0, 197) + '...' : val;
      } else if (typeof val === 'number' || typeof val === 'boolean') {
        clean[key] = val;
      }
    }

    return clean;
  }

  public recordEvent(input: RecordActivityInput): ActivityEvent {
    const userId = input.userId?.trim() || DEFAULT_USER_ID;
    const sanitizedMetadata = this.sanitizeMetadata(input.metadata);

    return activityRepository.save({
      type: input.type,
      userId,
      summary: input.summary,
      metadata: sanitizedMetadata,
    });
  }

  public getRecentPlatformActivity(limit = 50, typeFilter?: ActivityEventType): ActivityEvent[] {
    const all = activityRepository.getAll(limit * 2);
    if (typeFilter) {
      return all.filter((e) => e.type === typeFilter).slice(0, limit);
    }
    return all.slice(0, limit);
  }

  public getUserActivity(userId: string, limit = 20): ActivityEvent[] {
    return activityRepository.getByUserId(userId, limit);
  }

  public getActivityStats(userId?: string): ActivityStats {
    return activityRepository.getStats(userId);
  }
}

export const activityService = new ActivityService();
