import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { createSession, deleteSession, getSession, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { auditRepository } from '@/repositories/audit.repository';
import { settingsRepository } from '@/repositories/settings.repository';
import { activityService } from '@/services/activity/activity.service';
import { GET as getAuditById, DELETE as deleteAuditById } from '@/app/api/v1/audit/[id]/route';
import { GET as getAuditHistory } from '@/app/api/v1/audit/history/route';
import { GET as getAuditsList } from '@/app/api/v1/audit/route';
import { POST as exportReport } from '@/app/api/v1/reports/export/route';
import { GET as getSettings, PUT as updateSettings } from '@/app/api/v1/user/settings/route';
import { GET as getUserDashboard } from '@/app/api/v1/dashboard/user/route';
import { GET as getKeywordHistory } from '@/app/api/v1/keywords/history/route';
import { POST as keywordResearch } from '@/app/api/v1/keywords/research/route';
import { GET as getAdminDashboard } from '@/app/api/v1/admin/dashboard/route';
import { GET as getAdminUsers, PATCH as updateAdminUserRole } from '@/app/api/v1/admin/users/route';
import { GET as getAdminActivity } from '@/app/api/v1/admin/activity/route';
import { GET as getAdminAiProviders } from '@/app/api/v1/admin/ai/providers/route';
import { GET as getPublicAiProviders } from '@/app/api/v1/ai/providers/route';
import { POST as registerHandler } from '@/app/api/v1/auth/register/route';
import { POST as loginHandler } from '@/app/api/v1/auth/login/route';
import { POST as logoutHandler } from '@/app/api/v1/auth/logout/route';
import { GET as meHandler } from '@/app/api/v1/auth/me/route';
import { resetAuthRateLimits } from '@/lib/security/auth-rate-limit';

describe('PHASE 9.2 — Complete Privacy & Authorization Audit', () => {
  let userA: any;
  let userB: any;
  let adminUser: any;
  let sessionTokenA: string;
  let sessionTokenB: string;
  let adminSessionToken: string;
  let auditA_id: string;

  beforeAll(async () => {
    resetAuthRateLimits();
    const ts = Date.now();

    // Create User A
    userA = await prisma.user.create({
      data: {
        email: `priv_user_a_${ts}@test-domain.com`,
        passwordHash: hashPassword('Password123!'),
        name: 'User A Privacy Test',
        role: 'USER',
      },
    });
    const sA = await createSession(userA.id);
    sessionTokenA = sA.token;

    // Create User B
    userB = await prisma.user.create({
      data: {
        email: `priv_user_b_${ts}@test-domain.com`,
        passwordHash: hashPassword('Password123!'),
        name: 'User B Privacy Test',
        role: 'USER',
      },
    });
    const sB = await createSession(userB.id);
    sessionTokenB = sB.token;

    // Create Admin User
    adminUser = await prisma.user.create({
      data: {
        email: `priv_admin_${ts}@test-domain.com`,
        passwordHash: hashPassword('AdminPass123!'),
        name: 'Admin Privacy Test',
        role: 'ADMIN',
      },
    });
    const sAdmin = await createSession(adminUser.id);
    adminSessionToken = sAdmin.token;

    // Create custom settings for User A
    await settingsRepository.upsert(userA.id, {
      editorDialect: 'en-GB',
      targetWordCount: '2,500',
    });

    // Create a private audit for User A
    auditA_id = `audit-priv-${ts}`;
    await auditRepository.saveAsync({
      id: auditA_id,
      url: 'https://user-a-confidential-asset.com/',
      targetKeyword: 'confidential keyword',
      score: 91,
      status: 'completed',
      passedCount: 22,
      warningCount: 3,
      criticalCount: 0,
      checks: [],
      timestamp: new Date().toISOString(),
      userId: userA.id,
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    const ids = [userA?.id, userB?.id, adminUser?.id].filter(Boolean);
    if (ids.length > 0) {
      await prisma.session.deleteMany({
        where: { userId: { in: ids } },
      });
      await prisma.userSettings.deleteMany({
        where: { userId: { in: ids } },
      });
      await prisma.audit.deleteMany({
        where: { userId: { in: ids } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: ids } },
      });
    }
  });

  function makeReq(
    url: string,
    options?: {
      method?: string;
      body?: any;
      token?: string;
      headers?: Record<string, string>;
    }
  ) {
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

  // =========================================================================
  // 1. Cross-User Data Isolation & IDOR Prevention
  // =========================================================================
  describe('1. Cross-User Data Ownership & Anti-IDOR Enforcement', () => {
    it('allows User A to fetch their own audit by ID', async () => {
      const req = makeReq(`http://localhost:3000/api/v1/audit/${auditA_id}`, {
        token: sessionTokenA,
      });
      const res = await getAuditById(req, { params: Promise.resolve({ id: auditA_id }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.url).toBe('https://user-a-confidential-asset.com/');
    });

    it('blocks User B from reading User A audit by ID (returns 404 Not Found)', async () => {
      const req = makeReq(`http://localhost:3000/api/v1/audit/${auditA_id}`, {
        token: sessionTokenB,
      });
      const res = await getAuditById(req, { params: Promise.resolve({ id: auditA_id }) });
      expect(res.status).toBe(404);
    });

    it('blocks User B from deleting User A audit by ID (returns 404 Not Found)', async () => {
      const req = makeReq(`http://localhost:3000/api/v1/audit/${auditA_id}`, {
        method: 'DELETE',
        token: sessionTokenB,
      });
      const res = await deleteAuditById(req, { params: Promise.resolve({ id: auditA_id }) });
      expect(res.status).toBe(404);

      // Verify User A audit is still intact
      const check = await auditRepository.findByIdAsync(auditA_id, userA.id);
      expect(check).not.toBeNull();
    });

    it('blocks User B from exporting report for User A audit (returns 404 Not Found)', async () => {
      const req = makeReq('http://localhost:3000/api/v1/reports/export', {
        method: 'POST',
        token: sessionTokenB,
        body: { auditId: auditA_id, format: 'json' },
      });
      const res = await exportReport(req);
      expect(res.status).toBe(404);
    });

    it('isolates user settings: User B cannot see User A custom settings', async () => {
      const req = makeReq('http://localhost:3000/api/v1/user/settings', {
        token: sessionTokenB,
      });
      const res = await getSettings(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.user.email).toBe(userB.email);
      expect(json.data.settings?.editorDialect).not.toBe('en-GB');
    });

    it('isolates user dashboard: User B sees clean state with 0 audits', async () => {
      const req = makeReq('http://localhost:3000/api/v1/dashboard/user', {
        token: sessionTokenB,
      });
      const res = await getUserDashboard(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.totalAudits).toBe(0);
      expect(json.data.latestAudit).toBeNull();
    });
  });

  // =========================================================================
  // 2. Guest Requests & Untrusted Client-Header Rejection
  // =========================================================================
  describe('2. Guest Access Rejection & Client Header Anti-Spoofing', () => {
    it('rejects audit history request from guest without session with 401', async () => {
      const req = makeReq('http://localhost:3000/api/v1/audit/history');
      const res = await getAuditHistory(req);
      expect(res.status).toBe(401);
    });

    it('rejects audit by ID request from guest without session with 401', async () => {
      const req = makeReq(`http://localhost:3000/api/v1/audit/${auditA_id}`);
      const res = await getAuditById(req, { params: Promise.resolve({ id: auditA_id }) });
      expect(res.status).toBe(401);
    });

    it('rejects settings request from guest without session with 401', async () => {
      const req = makeReq('http://localhost:3000/api/v1/user/settings');
      const res = await getSettings(req);
      expect(res.status).toBe(401);
    });

    it('rejects dashboard request from guest without session with 401', async () => {
      const req = makeReq('http://localhost:3000/api/v1/dashboard/user');
      const res = await getUserDashboard(req);
      expect(res.status).toBe(401);
    });

    it('ignores spoofed x-user-id header on GET /api/v1/audit and never returns User A audits to guest', async () => {
      // Guest sends x-user-id: userA.id attempting to view User A audits
      const req = makeReq('http://localhost:3000/api/v1/audit', {
        headers: { 'x-user-id': userA.id },
      });
      const res = await getAuditsList(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      // Audits returned MUST NOT include User A's private audit
      const containsUserAAudit = json.data.audits.some((a: any) => a.id === auditA_id);
      expect(containsUserAAudit).toBe(false);
    });
  });

  // =========================================================================
  // 3. Server-Side RBAC Enforcement on Admin APIs
  // =========================================================================
  describe('3. Server-Side RBAC Enforcement on Admin Endpoints', () => {
    it('returns 403 Forbidden when normal user requests /api/v1/admin/dashboard', async () => {
      const req = makeReq('http://localhost:3000/api/v1/admin/dashboard', {
        token: sessionTokenA,
      });
      const res = await getAdminDashboard(req);
      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden when normal user requests /api/v1/admin/users', async () => {
      const req = makeReq('http://localhost:3000/api/v1/admin/users', {
        token: sessionTokenA,
      });
      const res = await getAdminUsers(req);
      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden when normal user attempts to update role via PATCH /api/v1/admin/users', async () => {
      const req = makeReq('http://localhost:3000/api/v1/admin/users', {
        method: 'PATCH',
        token: sessionTokenA,
        body: { userId: userA.id, role: 'ADMIN' },
      });
      const res = await updateAdminUserRole(req);
      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden when normal user requests /api/v1/admin/activity', async () => {
      const req = makeReq('http://localhost:3000/api/v1/admin/activity', {
        token: sessionTokenA,
      });
      const res = await getAdminActivity(req);
      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden when normal user requests /api/v1/admin/ai/providers', async () => {
      const req = makeReq('http://localhost:3000/api/v1/admin/ai/providers', {
        token: sessionTokenA,
      });
      const res = await getAdminAiProviders(req);
      expect(res.status).toBe(403);
    });

    it('returns 403 Access Restricted on public /api/v1/ai/providers', async () => {
      const res = await getPublicAiProviders();
      expect(res.status).toBe(403);
    });

    it('allows verified ADMIN session to access /api/v1/admin/dashboard', async () => {
      const req = makeReq('http://localhost:3000/api/v1/admin/dashboard', {
        token: adminSessionToken,
      });
      const res = await getAdminDashboard(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  // =========================================================================
  // 4. Session Lifecycle, Revocation & Expiration
  // =========================================================================
  describe('4. Session Lifecycle & Server-Side Invalidation', () => {
    it('returns null for an invalid or non-existent session token', async () => {
      const session = await getSession('non-existent-token-12345');
      expect(session).toBeNull();
    });

    it('rejects expired sessions and cleans them up from database', async () => {
      // Create session expired 1 hour ago
      const expiredToken = 'expired-token-' + Date.now();
      await prisma.session.create({
        data: {
          sessionToken: expiredToken,
          userId: userA.id,
          expiresAt: new Date(Date.now() - 3600 * 1000),
        },
      });

      const session = await getSession(expiredToken);
      expect(session).toBeNull();

      // Verify session was purged from database
      const inDb = await prisma.session.findUnique({
        where: { sessionToken: expiredToken },
      });
      expect(inDb).toBeNull();
    });

    it('invalidates server-side session completely on logout', async () => {
      // Create a temporary session for testing logout
      const tempSession = await createSession(userA.id);
      expect(await getSession(tempSession.token)).not.toBeNull();

      // Execute logout with this session token
      const req = makeReq('http://localhost:3000/api/v1/auth/logout', {
        method: 'POST',
        token: tempSession.token,
      });
      const res = await logoutHandler(req);
      expect(res.status).toBe(200);

      // Verify session was removed from database and cannot be re-used
      expect(await getSession(tempSession.token)).toBeNull();
    });
  });

  // =========================================================================
  // 5. Zero Sensitive Data Exposure & Metadata Sanitization
  // =========================================================================
  describe('5. Zero Sensitive Data Exposure in API Responses & Logs', () => {
    it('never includes passwordHash in /api/v1/auth/me response', async () => {
      const req = makeReq('http://localhost:3000/api/v1/auth/me', {
        token: sessionTokenA,
      });
      const res = await meHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.user.passwordHash).toBeUndefined();
      expect(json.data.user.email).toBe(userA.email);
    });

    it('never includes passwordHash in /api/v1/admin/users response', async () => {
      const req = makeReq('http://localhost:3000/api/v1/admin/users', {
        token: adminSessionToken,
      });
      const res = await getAdminUsers(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.users.length).toBeGreaterThan(0);
      for (const u of json.data.users) {
        expect(u.passwordHash).toBeUndefined();
      }
    });

    it('sanitizes activity metadata and strips sensitive tokens, secrets, and credentials', () => {
      const recorded = activityService.recordEvent({
        type: 'REPORT_EXPORTED',
        userId: userA.id,
        summary: 'Settings test',
        metadata: {
          safeProperty: 'safe-value',
          api_key: 'super-secret-key-123',
          password: 'secret-password',
          authToken: 'sensitive-token',
          session_cookie: 'secret-cookie-val',
        },
      });

      expect(recorded.metadata?.safeProperty).toBe('safe-value');
      expect(recorded.metadata?.['api_key']).toBeUndefined();
      expect(recorded.metadata?.['password']).toBeUndefined();
      expect(recorded.metadata?.['authToken']).toBeUndefined();
      expect(recorded.metadata?.['session_cookie']).toBeUndefined();
    });
  });

  // =========================================================================
  // 6. Database Email Uniqueness & Normalization Enforcement
  // =========================================================================
  describe('6. Email Normalization & Duplicate Registration Defense', () => {
    it('rejects duplicate registration with same email in different case', async () => {
      resetAuthRateLimits();
      const upperEmail = userA.email.toUpperCase();

      const req = makeReq('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'x-forwarded-for': '127.0.0.99' },
        body: {
          email: upperEmail,
          password: 'Password123!',
        },
      });
      const res = await registerHandler(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('enforces database-level unique constraint on users table', async () => {
      // Direct insertion attempt into prisma.user with duplicate email must throw P2002
      let threwP2002 = false;
      try {
        await prisma.user.create({
          data: {
            email: userA.email.toLowerCase(),
            passwordHash: hashPassword('AnotherPass123!'),
            role: 'USER',
          },
        });
      } catch (err: any) {
        if (err.code === 'P2002') {
          threwP2002 = true;
        }
      }
      expect(threwP2002).toBe(true);
    });
  });
});
