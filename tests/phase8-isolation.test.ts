import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/db';
import { userRepository } from '../src/repositories/user.repository';
import { auditRepository } from '../src/repositories/audit.repository';
import { keywordResearchRepository } from '../src/repositories/keyword-research.repository';
import { settingsRepository } from '../src/repositories/settings.repository';
import { createSession, SESSION_COOKIE_NAME } from '../src/lib/auth/session';
import { hashPassword } from '../src/lib/auth/password';

// Route Handlers
import { GET as getAuditById, DELETE as deleteAuditById } from '../src/app/api/v1/audit/[id]/route';
import { GET as getAuditHistory } from '../src/app/api/v1/audit/history/route';
import { POST as exportReport } from '../src/app/api/v1/reports/export/route';
import { GET as getKeywordHistory } from '../src/app/api/v1/keywords/history/route';
import { GET as getSettings, PUT as updateSettings } from '../src/app/api/v1/user/settings/route';
import { GET as getUserDashboard } from '../src/app/api/v1/dashboard/user/route';
import { AuditResult } from '../src/types/audit';

describe('Phase 8 — Complete User Data Isolation & Security Verification', () => {
  const timestamp = Date.now();
  const emailUserA = `iso_user_a_${timestamp}@example.com`;
  const emailUserB = `iso_user_b_${timestamp}@example.com`;

  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let sessionTokenA: string;
  let sessionTokenB: string;

  let testAuditAId: string;
  let testKeywordResearchAId: string;

  beforeAll(async () => {
    // 1. Create real database test users
    const createdA = await userRepository.create({
      email: emailUserA,
      name: 'User Alpha',
      role: 'USER',
      passwordHash: hashPassword('PassAlpha123!'),
    });
    userA = { id: createdA.id, email: createdA.email };

    const createdB = await userRepository.create({
      email: emailUserB,
      name: 'User Beta',
      role: 'USER',
      passwordHash: hashPassword('PassBeta123!'),
    });
    userB = { id: createdB.id, email: createdB.email };

    // 2. Create authenticated sessions for both users
    const sessA = await createSession(userA.id);
    sessionTokenA = sessA.token;

    const sessB = await createSession(userB.id);
    sessionTokenB = sessB.token;

    // 3. Create real data belonging strictly to User A
    testAuditAId = `audit-iso-a-${timestamp}`;
    const auditA: AuditResult = {
      id: testAuditAId,
      url: 'https://alpha-enterprise.example.com',
      targetKeyword: 'enterprise cloud seo',
      score: 88,
      status: 'completed',
      passedCount: 12,
      warningCount: 2,
      criticalCount: 0,
      checks: [
        {
          id: 'title-check',
          title: 'Title Check',
          name: 'Title Check',
          category: 'on-page',
          status: 'passed',
          score: 100,
          description: 'Title is present',
        },
      ],
      userId: userA.id,
      timestamp: new Date().toISOString(),
    };
    await auditRepository.saveAsync(auditA);

    // 4. Create Keyword Research belonging strictly to User A
    const kwA = await keywordResearchRepository.create({
      userId: userA.id,
      provider: 'GOOGLE_ADS_KEYWORD_PLANNER',
      seedKeyword: 'alpha secure keyword',
      location: 'US',
      language: 'en',
      results: [
        {
          keyword: 'alpha secure keyword',
          averageMonthlySearches: 4500,
          competition: 'MEDIUM',
          competitionIndex: 45,
          lowTopOfPageBid: 1.25,
          highTopOfPageBid: 3.5,
          currency: 'USD',
        },
      ],
    });
    testKeywordResearchAId = kwA.id;

    // 5. Create Settings for User A
    await settingsRepository.upsert(userA.id, {
      editorDialect: 'en-GB',
      targetWordCount: '2,500',
    });
  });

  afterAll(async () => {
    // Clean up test data
    try {
      if (testAuditAId) {
        await auditRepository.deleteByIdAsync(testAuditAId, userA?.id);
      }
      if (testKeywordResearchAId) {
        await prisma.keywordResearchResult.deleteMany({ where: { researchId: testKeywordResearchAId } });
        await prisma.keywordResearch.deleteMany({ where: { id: testKeywordResearchAId } });
      }
      if (userA?.id) {
        await prisma.session.deleteMany({ where: { userId: userA.id } });
        await prisma.userSettings.deleteMany({ where: { userId: userA.id } });
        await prisma.activity.deleteMany({ where: { userId: userA.id } });
        await userRepository.delete(userA.id);
      }
      if (userB?.id) {
        await prisma.session.deleteMany({ where: { userId: userB.id } });
        await prisma.userSettings.deleteMany({ where: { userId: userB.id } });
        await prisma.activity.deleteMany({ where: { userId: userB.id } });
        await userRepository.delete(userB.id);
      }
    } catch {
      // Clean up fallback
    }
  });

  // Helper for requests
  function makeReq(url: string, options?: { method?: string; body?: any; token?: string; headers?: Record<string, string> }) {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...(options?.headers || {}),
    };
    if (options?.token) {
      headers['cookie'] = `${SESSION_COOKIE_NAME}=${options.token}`;
    }
    return new NextRequest(url, {
      method: options?.method || 'GET',
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });
  }

  describe('1. Unauthenticated Requests (401 Unauthorized)', () => {
    it('rejects audit history request without session', async () => {
      const req = makeReq('http://localhost:3000/api/v1/audit/history');
      const res = await getAuditHistory(req);
      expect(res.status).toBe(401);
    });

    it('rejects audit retrieval by ID without session', async () => {
      const req = makeReq(`http://localhost:3000/api/v1/audit/${testAuditAId}`);
      const res = await getAuditById(req, { params: Promise.resolve({ id: testAuditAId }) });
      expect(res.status).toBe(401);
    });

    it('rejects audit deletion without session', async () => {
      const req = makeReq(`http://localhost:3000/api/v1/audit/${testAuditAId}`, { method: 'DELETE' });
      const res = await deleteAuditById(req, { params: Promise.resolve({ id: testAuditAId }) });
      expect(res.status).toBe(401);
    });

    it('rejects report export without session', async () => {
      const req = makeReq('http://localhost:3000/api/v1/reports/export', {
        method: 'POST',
        body: { auditId: testAuditAId },
      });
      const res = await exportReport(req);
      expect(res.status).toBe(401);
    });

    it('rejects keyword history request without session', async () => {
      const req = makeReq('http://localhost:3000/api/v1/keywords/history');
      const res = await getKeywordHistory(req);
      expect(res.status).toBe(401);
    });

    it('rejects user settings retrieval without session', async () => {
      const req = makeReq('http://localhost:3000/api/v1/user/settings');
      const res = await getSettings(req);
      expect(res.status).toBe(401);
    });

    it('rejects user dashboard retrieval without session', async () => {
      const req = makeReq('http://localhost:3000/api/v1/dashboard/user');
      const res = await getUserDashboard(req);
      expect(res.status).toBe(401);
    });
  });

  describe('2. Anti-Spoofing: Ignored x-user-id Header', () => {
    it('rejects request with spoofed x-user-id header and no session', async () => {
      const req = makeReq('http://localhost:3000/api/v1/dashboard/user', {
        headers: { 'x-user-id': userA.id },
      });
      const res = await getUserDashboard(req);
      expect(res.status).toBe(401);
    });

    it('processes request using validated session identity, ignoring spoofed x-user-id', async () => {
      // User B attempts to impersonate User A by passing User A's ID in x-user-id header
      const req = makeReq('http://localhost:3000/api/v1/user/settings', {
        token: sessionTokenB,
        headers: { 'x-user-id': userA.id },
      });
      const res = await getSettings(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      // Identity must be User B, not User A!
      expect(json.data.user.email).toBe(userB.email);
      expect(json.data.user.email).not.toBe(userA.email);
      // User B should not see User A's custom settings
      expect(json.data.settings?.editorDialect).toBe('en-US');
    });
  });

  describe('3. Cross-User Audit Isolation', () => {
    it('allows User A to access their own audit by ID', async () => {
      const req = makeReq(`http://localhost:3000/api/v1/audit/${testAuditAId}`, {
        token: sessionTokenA,
      });
      const res = await getAuditById(req, { params: Promise.resolve({ id: testAuditAId }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(testAuditAId);
      expect(json.data.userId).toBe(userA.id);
    });

    it('blocks User B from accessing User A audit by ID (returns 404 Not Found)', async () => {
      const req = makeReq(`http://localhost:3000/api/v1/audit/${testAuditAId}`, {
        token: sessionTokenB,
      });
      const res = await getAuditById(req, { params: Promise.resolve({ id: testAuditAId }) });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('blocks User B from deleting User A audit by ID (returns 404 Not Found)', async () => {
      const req = makeReq(`http://localhost:3000/api/v1/audit/${testAuditAId}`, {
        method: 'DELETE',
        token: sessionTokenB,
      });
      const res = await deleteAuditById(req, { params: Promise.resolve({ id: testAuditAId }) });
      expect(res.status).toBe(404);

      // Verify User A audit is still intact
      const stillExists = await auditRepository.findByIdAsync(testAuditAId, userA.id);
      expect(stillExists).not.toBeNull();
      expect(stillExists?.id).toBe(testAuditAId);
    });

    it('isolates audit history: User B does not see User A audits', async () => {
      // User B fetches audit history
      const reqB = makeReq('http://localhost:3000/api/v1/audit/history', {
        token: sessionTokenB,
      });
      const resB = await getAuditHistory(reqB);
      expect(resB.status).toBe(200);
      const jsonB = await resB.json();
      expect(jsonB.success).toBe(true);
      expect(jsonB.data.audits).toHaveLength(0);
      expect(jsonB.data.total).toBe(0);

      // User A fetches audit history
      const reqA = makeReq('http://localhost:3000/api/v1/audit/history', {
        token: sessionTokenA,
      });
      const resA = await getAuditHistory(reqA);
      expect(resA.status).toBe(200);
      const jsonA = await resA.json();
      expect(jsonA.success).toBe(true);
      expect(jsonA.data.audits.length).toBeGreaterThanOrEqual(1);
      const found = jsonA.data.audits.find((a: any) => a.id === testAuditAId);
      expect(found).toBeDefined();
    });
  });

  describe('4. Cross-User Report Export Isolation', () => {
    it('blocks User B from exporting report for User A audit (returns 404)', async () => {
      const req = makeReq('http://localhost:3000/api/v1/reports/export', {
        method: 'POST',
        token: sessionTokenB,
        body: {
          auditId: testAuditAId,
          format: 'html',
          url: 'https://alpha-enterprise.example.com',
        },
      });
      const res = await exportReport(req);
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('allows User A to export report for their own audit', async () => {
      const req = makeReq('http://localhost:3000/api/v1/reports/export', {
        method: 'POST',
        token: sessionTokenA,
        body: {
          auditId: testAuditAId,
          format: 'html',
          url: 'https://alpha-enterprise.example.com',
        },
      });
      const res = await exportReport(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('5. Cross-User Keyword Research Isolation', () => {
    it('isolates keyword research history strictly to session owner', async () => {
      // User B keyword history check
      const reqB = makeReq('http://localhost:3000/api/v1/keywords/history', {
        token: sessionTokenB,
      });
      const resB = await getKeywordHistory(reqB);
      expect(resB.status).toBe(200);

      const jsonB = await resB.json();
      expect(jsonB.success).toBe(true);
      expect(jsonB.data.history).toHaveLength(0);
      expect(jsonB.data.total).toBe(0);

      // User A keyword history check
      const reqA = makeReq('http://localhost:3000/api/v1/keywords/history', {
        token: sessionTokenA,
      });
      const resA = await getKeywordHistory(reqA);
      expect(resA.status).toBe(200);

      const jsonA = await resA.json();
      expect(jsonA.success).toBe(true);
      expect(jsonA.data.total).toBeGreaterThanOrEqual(1);
      const foundA = jsonA.data.history.find((h: any) => h.id === testKeywordResearchAId);
      expect(foundA).toBeDefined();
      expect(foundA.seedKeyword).toBe('alpha secure keyword');
    });
  });

  describe('6. Cross-User Settings Isolation', () => {
    it('isolates settings: User B cannot see User A settings', async () => {
      const reqB = makeReq('http://localhost:3000/api/v1/user/settings', {
        token: sessionTokenB,
      });
      const resB = await getSettings(reqB);
      expect(resB.status).toBe(200);

      const jsonB = await resB.json();
      expect(jsonB.success).toBe(true);
      // User B has default settings, not User A custom settings
      expect(jsonB.data.settings?.editorDialect).toBe('en-US');
      expect(jsonB.data.settings?.targetWordCount).toBe('1,500');
    });

    it('isolates settings: User B updating settings does not affect User A', async () => {
      const updateReqB = makeReq('http://localhost:3000/api/v1/user/settings', {
        method: 'PUT',
        token: sessionTokenB,
        body: {
          editorDialect: 'en-US',
          targetWordCount: '1,200',
        },
      });
      const updateResB = await updateSettings(updateReqB);
      expect(updateResB.status).toBe(200);

      // Verify User A settings are completely unchanged
      const reqA = makeReq('http://localhost:3000/api/v1/user/settings', {
        token: sessionTokenA,
      });
      const resA = await getSettings(reqA);
      expect(resA.status).toBe(200);

      const jsonA = await resA.json();
      expect(jsonA.data.settings.editorDialect).toBe('en-GB');
      expect(jsonA.data.settings.targetWordCount).toBe('2,500');
    });
  });

  describe('7. Cross-User Dashboard Isolation', () => {
    it('isolates user dashboard: User B sees clean state, unaffected by User A activity', async () => {
      const reqB = makeReq('http://localhost:3000/api/v1/dashboard/user', {
        token: sessionTokenB,
      });
      const resB = await getUserDashboard(reqB);
      expect(resB.status).toBe(200);

      const jsonB = await resB.json();
      expect(jsonB.success).toBe(true);
      expect(jsonB.data.totalAudits).toBe(0);
      expect(jsonB.data.recentAudits).toHaveLength(0);
      expect(jsonB.data.latestAudit).toBeNull();
    });

    it('displays User A dashboard data strictly for User A', async () => {
      const reqA = makeReq('http://localhost:3000/api/v1/dashboard/user', {
        token: sessionTokenA,
      });
      const resA = await getUserDashboard(reqA);
      expect(resA.status).toBe(200);

      const jsonA = await resA.json();
      expect(jsonA.success).toBe(true);
      expect(jsonA.data.totalAudits).toBeGreaterThanOrEqual(1);
      const auditInDashboard = jsonA.data.recentAudits.find((a: any) => a.id === testAuditAId);
      expect(auditInDashboard).toBeDefined();
    });
  });
});
