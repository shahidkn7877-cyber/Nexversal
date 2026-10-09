import { auditRepository } from '@/repositories/audit.repository';
import { activityService } from '@/services/activity/activity.service';
import { aiProviderRegistry } from '@/providers/ai/registry';
import { userRepository } from '@/repositories/user.repository';
import { ActivityEvent } from '@/types/activity';

export interface AdminDashboardData {
  totalUsers: number;
  userManagementNotice: string;
  totalAudits: number;
  totalKeywordSearches: number;
  totalContentAnalyses: number;
  totalReports: number;
  totalAiImprovements: number;
  systemStatus: 'healthy' | 'degraded';
  activeProviders: number;
  totalProviders: number;
  recentActivity: ActivityEvent[];
}

export class AdminDashboardService {
  public async getDashboardData(): Promise<AdminDashboardData> {
    const totalUsers = await userRepository.count();
    const totalAudits = await auditRepository.countAsync();
    const stats = await activityService.getActivityStats();
    const recentActivity = activityService.getRecentPlatformActivity(20);

    const providers = aiProviderRegistry.getAllMetadata();
    const availableProviders = aiProviderRegistry.getAvailable();

    const userManagementNotice =
      totalUsers > 0
        ? `${totalUsers} registered ${totalUsers === 1 ? 'user' : 'users'} actively persisted in database.`
        : 'Database persistence active. No registered user accounts yet.';

    return {
      totalUsers,
      userManagementNotice,
      totalAudits,
      totalKeywordSearches: stats.totalKeywordSearches,
      totalContentAnalyses: stats.totalContentAnalyses,
      totalReports: stats.totalReports,
      totalAiImprovements: stats.totalAiImprovements,
      systemStatus: 'healthy',
      activeProviders: availableProviders.length,
      totalProviders: providers.length,
      recentActivity,
    };
  }
}

export const adminDashboardService = new AdminDashboardService();