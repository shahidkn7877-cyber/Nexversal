import { auditRepository } from '@/repositories/audit.repository';
import { activityService } from '@/services/activity/activity.service';
import { AuditResult } from '@/types/audit';
import { ActivityEvent } from '@/types/activity';

export interface UserDashboardData {
  totalAudits: number;
  recentAudits: AuditResult[];
  averageScore: number | null;
  latestAudit: AuditResult | null;
  keywordSearchesCount: number;
  contentAnalysesCount: number;
  reportsCount: number;
  aiImprovementsCount: number;
  recentActivity: ActivityEvent[];
}

export class UserDashboardService {
  public async getDashboardData(userId: string): Promise<UserDashboardData> {
    let totalAudits = auditRepository.count(userId);
    let recentAudits = auditRepository.getByUserId(userId, 5);
    let latestAudit = auditRepository.getLatestByUserId(userId);
    let averageScore = auditRepository.getAverageScore(userId);

    // If memory is empty (e.g. server reboot or separate process), query DB
    if (totalAudits === 0) {
      const dbAudits = await auditRepository.getByUserIdAsync(userId, 5);
      if (dbAudits.length > 0) {
        recentAudits = dbAudits;
        latestAudit = dbAudits[0] || null;
        totalAudits = await auditRepository.countAsync(userId);
        averageScore = await auditRepository.getAverageScoreAsync(userId);
      }
    }

    const stats = activityService.getActivityStats(userId);
    const recentActivity = activityService.getUserActivity(userId, 10);

    return {
      totalAudits,
      recentAudits,
      averageScore,
      latestAudit,
      keywordSearchesCount: stats.totalKeywordSearches,
      contentAnalysesCount: stats.totalContentAnalyses,
      reportsCount: stats.totalReports,
      aiImprovementsCount: stats.totalAiImprovements,
      recentActivity,
    };
  }
}

export const userDashboardService = new UserDashboardService();