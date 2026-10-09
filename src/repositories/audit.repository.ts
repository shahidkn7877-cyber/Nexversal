import { AuditResult, AuditCheck, PageMetadata, ScoreBreakdown, MultiPageCrawlSummary } from '@/types/audit';
import { prisma } from '@/lib/db';

function parseAuditRecord(record: {
  id: string;
  url: string;
  targetKeyword: string;
  score: number;
  status: string;
  passedCount: number;
  warningCount: number;
  criticalCount: number;
  checksJson: string;
  pageDataJson: string | null;
  timestamp: Date;
  userId: string | null;
}): AuditResult {
  let checks: AuditCheck[] = [];
  try {
    checks = JSON.parse(record.checksJson);
  } catch {
    checks = [];
  }

  let pageData: PageMetadata | undefined;
  let scoreBreakdown: ScoreBreakdown | undefined;
  let crawlSummary: MultiPageCrawlSummary | undefined;

  if (record.pageDataJson) {
    try {
      const parsed = JSON.parse(record.pageDataJson);
      if (parsed) {
        if (parsed.scoreBreakdown) scoreBreakdown = parsed.scoreBreakdown;
        if (parsed.crawlSummary) crawlSummary = parsed.crawlSummary;
        if (parsed.pageData) {
          pageData = parsed.pageData;
        } else if (parsed.title !== undefined || parsed.wordCount !== undefined) {
          pageData = parsed;
        }
      }
    } catch {
      pageData = undefined;
    }
  }

  return {
    id: record.id,
    url: record.url,
    targetKeyword: record.targetKeyword,
    score: record.score,
    status: record.status as any,
    passedCount: record.passedCount,
    warningCount: record.warningCount,
    criticalCount: record.criticalCount,
    checks,
    pageData,
    scoreBreakdown,
    crawlSummary,
    timestamp: record.timestamp.toISOString(),
    userId: record.userId || undefined,
  };
}

class AuditRepository {
  private audits: Map<string, AuditResult> = new Map();

  constructor() {
    // Production empty state: Never seed fake demo data or 'demo-audit-1'
  }

  public save(audit: AuditResult): AuditResult {
    this.audits.set(audit.id, audit);
    this.persistToDb(audit).catch(() => {});
    return audit;
  }

  public async saveAsync(audit: AuditResult): Promise<AuditResult> {
    this.audits.set(audit.id, audit);
    await this.persistToDb(audit);
    return audit;
  }

  private async persistToDb(audit: AuditResult): Promise<void> {
    try {
      const storagePayload = {
        pageData: audit.pageData,
        scoreBreakdown: audit.scoreBreakdown,
        crawlSummary: audit.crawlSummary,
      };

      await prisma.audit.upsert({
        where: { id: audit.id },
        update: {
          url: audit.url,
          targetKeyword: audit.targetKeyword || '',
          score: audit.score,
          status: audit.status,
          passedCount: audit.passedCount,
          warningCount: audit.warningCount,
          criticalCount: audit.criticalCount,
          checksJson: JSON.stringify(audit.checks),
          pageDataJson: JSON.stringify(storagePayload),
          timestamp: new Date(audit.timestamp),
          userId: audit.userId || null,
        },
        create: {
          id: audit.id,
          url: audit.url,
          targetKeyword: audit.targetKeyword || '',
          score: audit.score,
          status: audit.status,
          passedCount: audit.passedCount,
          warningCount: audit.warningCount,
          criticalCount: audit.criticalCount,
          checksJson: JSON.stringify(audit.checks),
          pageDataJson: JSON.stringify(storagePayload),
          timestamp: new Date(audit.timestamp),
          userId: audit.userId || null,
        },
      });
    } catch {
      // Safe fallback
    }
  }

  public findById(id: string): AuditResult | null {
    return this.audits.get(id) || null;
  }

  public async findByIdAsync(id: string, userId?: string): Promise<AuditResult | null> {
    const memory = this.audits.get(id);
    if (memory) {
      if (userId && memory.userId && memory.userId !== userId && userId !== 'default_user') {
        return null;
      }
      return memory;
    }

    try {
      const dbRecord = await prisma.audit.findUnique({
        where: { id },
      });
      if (dbRecord) {
        if (userId && dbRecord.userId && dbRecord.userId !== userId && userId !== 'default_user') {
          return null;
        }
        const parsed = parseAuditRecord(dbRecord);
        this.audits.set(parsed.id, parsed);
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  }

  public getRecent(limit = 10): AuditResult[] {
    const list = Array.from(this.audits.values());
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list.slice(0, limit);
  }

  public async getRecentAsync(limit = 10): Promise<AuditResult[]> {
    try {
      const records = await prisma.audit.findMany({
        take: limit,
        orderBy: { timestamp: 'desc' },
      });
      return records.map(parseAuditRecord);
    } catch {
      return this.getRecent(limit);
    }
  }

  public getLatest(): AuditResult | null {
    const list = this.getRecent(1);
    return list.length > 0 ? list[0] : null;
  }

  public getByUserId(userId: string, limit = 10): AuditResult[] {
    const list = Array.from(this.audits.values()).filter(
      (a) => a.userId === userId || (!a.userId && userId === 'default_user')
    );
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list.slice(0, limit);
  }

  public async getByUserIdAsync(userId: string, limit = 10): Promise<AuditResult[]> {
    try {
      const records = await prisma.audit.findMany({
        where: userId === 'default_user' ? { OR: [{ userId }, { userId: null }] } : { userId },
        take: limit,
        orderBy: { timestamp: 'desc' },
      });
      return records.map(parseAuditRecord);
    } catch {
      return this.getByUserId(userId, limit);
    }
  }

  public getLatestByUserId(userId: string): AuditResult | null {
    const list = this.getByUserId(userId, 1);
    return list.length > 0 ? list[0] : null;
  }

  public async getLatestByUserIdAsync(userId: string): Promise<AuditResult | null> {
    const results = await this.getByUserIdAsync(userId, 1);
    return results.length > 0 ? results[0] : null;
  }

  public async deleteByIdAsync(id: string, userId?: string): Promise<boolean> {
    try {
      const existing = await prisma.audit.findUnique({ where: { id } });
      if (!existing) return false;
      if (userId && existing.userId && existing.userId !== userId && userId !== 'default_user') {
        return false;
      }
      await prisma.audit.delete({ where: { id } });
      this.audits.delete(id);
      return true;
    } catch {
      this.audits.delete(id);
      return false;
    }
  }

  public count(userId?: string): number {
    if (!userId) return this.audits.size;
    return Array.from(this.audits.values()).filter(
      (a) => a.userId === userId || (!a.userId && userId === 'default_user')
    ).length;
  }

  public async countAsync(userId?: string): Promise<number> {
    try {
      const total = await prisma.audit.count({
        where: userId
          ? userId === 'default_user'
            ? { OR: [{ userId }, { userId: null }] }
            : { userId }
          : undefined,
      });
      return total;
    } catch {
      return this.count(userId);
    }
  }

  public getAverageScore(userId?: string): number | null {
    const list = userId
      ? Array.from(this.audits.values()).filter(
          (a) => a.userId === userId || (!a.userId && userId === 'default_user')
        )
      : Array.from(this.audits.values());

    if (list.length === 0) return null;
    const sum = list.reduce((acc, curr) => acc + curr.score, 0);
    return Math.round(sum / list.length);
  }

  public async getAverageScoreAsync(userId?: string): Promise<number | null> {
    try {
      const audits = await this.getByUserIdAsync(userId || 'default_user', 100);
      if (audits.length === 0) return null;
      const sum = audits.reduce((acc, curr) => acc + curr.score, 0);
      return Math.round(sum / audits.length);
    } catch {
      return this.getAverageScore(userId);
    }
  }

  public clear(): void {
    this.audits.clear();
  }
}

export const auditRepository = new AuditRepository();