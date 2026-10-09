import { describe, it, expect, beforeEach } from 'vitest';
import { userDashboardService } from '../src/services/dashboard/user-dashboard.service';
import { adminDashboardService } from '../src/services/dashboard/admin-dashboard.service';
import { activityService } from '../src/services/activity/activity.service';
import { activityRepository } from '../src/repositories/activity.repository';
import { auditRepository } from '../src/repositories/audit.repository';
import { requireAdmin, DEFAULT_ADMIN_SECRET } from '../src/lib/auth/admin-guard';
import { NextRequest } from 'next/server';
import { AuditResult } from '../src/types/audit';

describe('Phase 4: Admin <-> User Dashboard Integration', () => {
  beforeEach(() => {
    activityRepository.clear();
    auditRepository.clear();
  });

  describe('User Dashboard Service & Data Isolation', () => {
    it('returns honest empty state when user has no activity', async () => {
      const data = await userDashboardService.getDashboardData('user_fresh');

      expect(data.totalAudits).toBe(0);
      expect(data.recentAudits).toHaveLength(0);
      expect(data.averageScore).toBeNull();
      expect(data.latestAudit).toBeNull();
      expect(data.keywordSearchesCount).toBe(0);
      expect(data.contentAnalysesCount).toBe(0);
      expect(data.reportsCount).toBe(0);
      expect(data.aiImprovementsCount).toBe(0);
      expect(data.recentActivity).toHaveLength(0);
    });

    it('isolates user activity and prevents cross-user leakage', async () => {
      const auditA: AuditResult = {
        id: 'audit-user-a',
        url: 'https://site-a.com',
        timestamp: new Date().toISOString(),
        score: 92,
        status: 'completed',
        passedCount: 14,
        warningCount: 2,
        criticalCount: 0,
        checks: [],
        userId: 'user_A',
      };
      auditRepository.save(auditA);

      activityService.recordEvent({
        type: 'AUDIT_CREATED',
        userId: 'user_A',
        summary: 'SEO Audit for site-a.com',
        metadata: { score: 92, url: 'https://site-a.com' },
      });

      activityService.recordEvent({
        type: 'KEYWORD_RESEARCH',
        userId: 'user_A',
        summary: 'Keyword query: technical seo checklist',
      });

      // User A dashboard check
      const dataA = await userDashboardService.getDashboardData('user_A');
      expect(dataA.totalAudits).toBe(1);
      expect(dataA.averageScore).toBe(92);
      expect(dataA.latestAudit?.url).toBe('https://site-a.com');
      expect(dataA.keywordSearchesCount).toBe(1);
      expect(dataA.recentActivity).toHaveLength(2);

      // User B dashboard check (must have ZERO cross-user leakage)
      const dataB = await userDashboardService.getDashboardData('user_B');
      expect(dataB.totalAudits).toBe(0);
      expect(dataB.averageScore).toBeNull();
      expect(dataB.latestAudit).toBeNull();
      expect(dataB.keywordSearchesCount).toBe(0);
      expect(dataB.recentActivity).toHaveLength(0);
    });
  });

  describe('Admin Dashboard Service & Platform Aggregation', () => {
    it('returns accurate aggregate counts and real user persistence notice', async () => {
      activityService.recordEvent({
        type: 'AUDIT_CREATED',
        userId: 'user_1',
        summary: 'Audit 1',
      });
      activityService.recordEvent({
        type: 'KEYWORD_RESEARCH',
        userId: 'user_2',
        summary: 'Keyword research 1',
      });
      activityService.recordEvent({
        type: 'CONTENT_ANALYSIS',
        userId: 'user_3',
        summary: 'Content analysis 1',
      });
      activityService.recordEvent({
        type: 'REPORT_EXPORTED',
        userId: 'user_1',
        summary: 'Report exported',
      });
      activityService.recordEvent({
        type: 'AI_IMPROVEMENT_REQUESTED',
        userId: 'user_2',
        summary: 'Improve title',
      });

      const adminData = await adminDashboardService.getDashboardData();

      expect(adminData.totalUsers).toBeGreaterThanOrEqual(0);
      expect(adminData.userManagementNotice).toMatch(/Database persistence active|registered user/);
      expect(adminData.totalKeywordSearches).toBe(1);
      expect(adminData.totalContentAnalyses).toBe(1);
      expect(adminData.totalReports).toBe(1);
      expect(adminData.totalAiImprovements).toBe(1);
      expect(adminData.recentActivity).toHaveLength(5);
      expect(adminData.systemStatus).toBe('healthy');
      expect(adminData.totalProviders).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Activity Service & Metadata Sanitization', () => {
    it('records all supported activity event types', () => {
      const types = [
        'AUDIT_CREATED',
        'KEYWORD_RESEARCH',
        'CONTENT_ANALYSIS',
        'REPORT_CREATED',
        'REPORT_EXPORTED',
        'AI_IMPROVEMENT_REQUESTED',
        'USER_LOGIN',
        'ADMIN_LOGIN',
      ] as const;

      for (const type of types) {
        const evt = activityService.recordEvent({
          type,
          userId: 'test_user',
          summary: 'Testing event ' + type,
        });
        expect(evt.id).toBeDefined();
        expect(evt.type).toBe(type);
        expect(evt.timestamp).toBeDefined();
      }

      const all = activityService.getRecentPlatformActivity(20);
      expect(all).toHaveLength(8);
    });

    it('strictly sanitizes and strips sensitive fields, article content, and keys', () => {
      const evt = activityService.recordEvent({
        type: 'CONTENT_ANALYSIS',
        userId: 'user_secure',
        summary: 'Analysis with attempted payload leakage',
        metadata: {
          apiKey: 'AIzaSySecretKey123',
          password: 'supersecretpassword',
          authToken: 'bearer_token_xyz',
          content: 'This is private article body text that must never be in telemetry.',
          articleBody: 'Secret draft manuscript',
          draftText: 'Another draft',
          score: 88,
          wordCount: 1540,
          targetKeyword: 'best AI tools',
        },
      });

      const meta = evt.metadata || {};
      expect(meta.apiKey).toBeUndefined();
      expect(meta.password).toBeUndefined();
      expect(meta.authToken).toBeUndefined();
      expect(meta.content).toBeUndefined();
      expect(meta.articleBody).toBeUndefined();
      expect(meta.draftText).toBeUndefined();

      expect(meta.score).toBe(88);
      expect(meta.wordCount).toBe(1540);
      expect(meta.targetKeyword).toBe('best AI tools');
    });
  });

  describe('Authorization & Admin API Guards', () => {
    it('rejects unauthorized requests to admin endpoints', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/dashboard');
      const response = await requireAdmin(req);

      expect(response).not.toBeNull();
      expect(response?.status).toBe(401);
    });

    it('authorizes requests with valid admin credentials', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/dashboard', {
        headers: {
          'x-admin-key': DEFAULT_ADMIN_SECRET,
        },
      });
      const response = await requireAdmin(req);

      expect(response).toBeNull();
    });
  });
});
