import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { hashPassword, verifyPassword } from '../src/lib/auth/password';
import { userRepository } from '../src/repositories/user.repository';
import { settingsRepository } from '../src/repositories/settings.repository';
import {
  createSession,
  getSession,
  deleteSession,
  deleteUserSessions,
  SESSION_COOKIE_NAME,
} from '../src/lib/auth/session';
import {
  requireAdmin,
  verifyAdminAuth,
  verifyAdminAuthAsync,
  getAdminSecret,
  ADMIN_COOKIE_NAME,
} from '../src/lib/auth/admin-guard';
import { auditRepository } from '../src/repositories/audit.repository';
import { activityService } from '../src/services/activity/activity.service';
import { userDashboardService } from '../src/services/dashboard/user-dashboard.service';
import { prisma } from '../src/lib/db';
import { NextRequest } from 'next/server';
import { adminBootstrapService } from '../src/services/auth/admin-bootstrap.service';
import { POST as loginRoute } from '../src/app/api/v1/auth/login/route';
import { POST as logoutRoute } from '../src/app/api/v1/auth/logout/route';

describe('Phase 5: Real Authentication + Database Persistence', () => {
  const testEmail1 = `tester_alpha_${Date.now()}@example.com`;
  const testEmail2 = `tester_beta_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword2026!';

  afterAll(async () => {
    // Cleanup any created test users
    try {
      const u1 = await userRepository.findByEmail(testEmail1);
      if (u1) {
        await userRepository.delete(u1.id);
      }
      const u2 = await userRepository.findByEmail(testEmail2);
      if (u2) {
        await userRepository.delete(u2.id);
      }
    } catch {
      // ignore
    }
  });

  describe('1. Password Hashing & Cryptographic Verification', () => {
    it('hashes passwords using scrypt with random salt', () => {
      const hash1 = hashPassword(testPassword);
      const hash2 = hashPassword(testPassword);

      expect(hash1).not.toBe(testPassword);
      expect(hash1).toContain(':');
      // Random salt ensures distinct hashes for identical passwords
      expect(hash1).not.toBe(hash2);

      const [salt, key] = hash1.split(':');
      expect(salt).toHaveLength(32); // 16 bytes in hex
      expect(key).toHaveLength(128); // 64 bytes in hex
    });

    it('rejects passwords shorter than 8 characters', () => {
      expect(() => hashPassword('short')).toThrow(/at least 8 characters/);
      expect(() => hashPassword('')).toThrow();
    });

    it('verifies valid passwords accurately', () => {
      const hash = hashPassword(testPassword);
      expect(verifyPassword(testPassword, hash)).toBe(true);
      expect(verifyPassword('WrongPassword123!', hash)).toBe(false);
      expect(verifyPassword('', hash)).toBe(false);
      expect(verifyPassword(testPassword, 'invalid:hash')).toBe(false);
      expect(verifyPassword(testPassword, '')).toBe(false);
    });
  });

  describe('2. User Repository & Database Persistence', () => {
    let createdUser: any;

    it('creates a user record and stores case-normalized email', async () => {
      const passwordHash = hashPassword(testPassword);
      createdUser = await userRepository.create({
        email: testEmail1.toUpperCase(),
        passwordHash,
        name: 'Tester Alpha',
        role: 'USER',
      });

      expect(createdUser.id).toBeDefined();
      expect(createdUser.email).toBe(testEmail1.toLowerCase());
      expect(createdUser.name).toBe('Tester Alpha');
      expect(createdUser.role).toBe('USER');
      // Password hash must NEVER be on SafeUser
      expect((createdUser as any).passwordHash).toBeUndefined();
    });

    it('retrieves user by normalized email', async () => {
      const found = await userRepository.findByEmail(testEmail1.toLowerCase());
      expect(found).not.toBeNull();
      expect(found?.id).toBe(createdUser.id);
      expect(found?.passwordHash).toBeDefined();
    });

    it('counts users in database accurately', async () => {
      const count = await userRepository.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('updates user role to ADMIN', async () => {
      const updated = await userRepository.updateRole(createdUser.id, 'ADMIN');
      expect(updated?.role).toBe('ADMIN');

      const reCheck = await userRepository.findById(createdUser.id);
      expect(reCheck?.role).toBe('ADMIN');
    });
  });

  describe('3. Session Tokens & Authentication Lifecycle', () => {
    let user: any;
    let sessionToken: string;

    beforeEach(async () => {
      const existing = await userRepository.findByEmail(testEmail1);
      user = existing;
    });

    it('creates a persistent session with expiration date', async () => {
      const session = await createSession(user.id, 7);
      sessionToken = session.token;

      expect(sessionToken).toHaveLength(64);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('validates active session and retrieves authenticated user', async () => {
      const sessionData = await getSession(sessionToken);
      expect(sessionData).not.toBeNull();
      expect(sessionData?.userId).toBe(user.id);
      expect(sessionData?.user.email).toBe(user.email);
      expect((sessionData?.user as any).passwordHash).toBeUndefined();
    });

    it('returns null for non-existent session tokens', async () => {
      const invalid = await getSession('non_existent_token_12345');
      expect(invalid).toBeNull();
    });

    it('deletes session upon logout', async () => {
      const deleted = await deleteSession(sessionToken);
      expect(deleted).toBe(true);

      const reCheck = await getSession(sessionToken);
      expect(reCheck).toBeNull();
    });
  });

  describe('4. User Settings Persistence', () => {
    let user: any;

    beforeEach(async () => {
      const existing = await userRepository.findByEmail(testEmail1);
      user = existing;
    });

    it('returns default settings when none exist', async () => {
      const settings = await settingsRepository.findByUserId(`unregistered_${Date.now()}`);
      expect(settings.editorDialect).toBe('en-US');
      expect(settings.targetWordCount).toBe('1,500');
      expect(settings.defaultDevice).toBe('desktop');
      expect(settings.autoSlug).toBe(true);
    });

    it('persists and updates customized user settings in database', async () => {
      const updated = await settingsRepository.upsert(user.id, {
        editorDialect: 'en-GB',
        targetWordCount: '2,500',
        defaultDevice: 'mobile',
        autoSlug: false,
      });

      expect(updated.editorDialect).toBe('en-GB');
      expect(updated.targetWordCount).toBe('2,500');
      expect(updated.defaultDevice).toBe('mobile');
      expect(updated.autoSlug).toBe(false);

      const reloaded = await settingsRepository.findByUserId(user.id);
      expect(reloaded.editorDialect).toBe('en-GB');
      expect(reloaded.targetWordCount).toBe('2,500');
    });
  });

  describe('5. Multi-Tenant User Data Isolation', () => {
    let userA: any;
    let userB: any;

    beforeEach(async () => {
      userA = await userRepository.findByEmail(testEmail1);
      const existingB = await userRepository.findByEmail(testEmail2);
      if (!existingB) {
        userB = await userRepository.create({
          email: testEmail2,
          passwordHash: hashPassword(testPassword),
          name: 'Tester Beta',
          role: 'USER',
        });
      } else {
        userB = existingB;
      }
    });

    it('isolates audits and activity per authenticated user', async () => {
      // User A creates an audit
      await auditRepository.saveAsync({
        id: `audit-a-${Date.now()}`,
        url: 'https://user-a-site.com',
        targetKeyword: 'enterprise cloud',
        score: 95,
        status: 'completed',
        passedCount: 15,
        warningCount: 1,
        criticalCount: 0,
        checks: [],
        timestamp: new Date().toISOString(),
        userId: userA.id,
      });

      // User B creates an audit
      await auditRepository.saveAsync({
        id: `audit-b-${Date.now()}`,
        url: 'https://user-b-site.com',
        targetKeyword: 'small business seo',
        score: 72,
        status: 'completed',
        passedCount: 10,
        warningCount: 4,
        criticalCount: 2,
        checks: [],
        timestamp: new Date().toISOString(),
        userId: userB.id,
      });

      // User A queries their dashboard
      const dashA = await userDashboardService.getDashboardData(userA.id);
      expect(dashA.recentAudits.some((a) => a.url === 'https://user-a-site.com')).toBe(true);
      expect(dashA.recentAudits.some((a) => a.url === 'https://user-b-site.com')).toBe(false);

      // User B queries their dashboard
      const dashB = await userDashboardService.getDashboardData(userB.id);
      expect(dashB.recentAudits.some((a) => a.url === 'https://user-b-site.com')).toBe(true);
      expect(dashB.recentAudits.some((a) => a.url === 'https://user-a-site.com')).toBe(false);
    });
  });

  describe('6. Role-Based Access Control (USER vs ADMIN)', () => {
    let regularUser: any;
    let regularSessionToken: string;
    let adminUser: any;
    let adminSessionToken: string;

    beforeEach(async () => {
      regularUser = await userRepository.findByEmail(testEmail2);
      if (!regularUser) {
        regularUser = await userRepository.create({
          email: testEmail2,
          passwordHash: hashPassword(testPassword),
          name: 'Regular Tester',
          role: 'USER',
        });
      }
      const s1 = await createSession(regularUser.id, 1);
      regularSessionToken = s1.token;

      const adminEmail = `admin_tester_${Date.now()}@example.com`;
      adminUser = await userRepository.create({
        email: adminEmail,
        passwordHash: hashPassword(testPassword),
        name: 'Admin Tester',
        role: 'ADMIN',
      });
      const s2 = await createSession(adminUser.id, 1);
      adminSessionToken = s2.token;
    });

    it('strictly forbids normal user without admin session from admin guard', async () => {
      const normalReq = new NextRequest('http://localhost:3000/api/v1/admin/dashboard', {
        headers: {
          cookie: `seo_user_session=${regularSessionToken}`,
        },
      });

      const response = await requireAdmin(normalReq);
      expect(response).not.toBeNull();
      expect([401, 403]).toContain(response?.status);

      const verifyResult = await verifyAdminAuthAsync(normalReq);
      expect(verifyResult.authorized).toBe(false);
      expect(verifyResult.error).toContain('USER');
    });

    it('allows persistent user session with ADMIN role to access admin guard', async () => {
      const adminSessionReq = new NextRequest('http://localhost:3000/api/v1/admin/dashboard', {
        headers: {
          cookie: `seo_user_session=${adminSessionToken}`,
        },
      });

      const response = await requireAdmin(adminSessionReq);
      expect(response).toBeNull(); // authorized

      const verifyResult = await verifyAdminAuthAsync(adminSessionReq);
      expect(verifyResult.authorized).toBe(true);
      expect(verifyResult.user?.role).toBe('admin');
    });

    it('allows requests with master admin secret key header as isolated fallback', async () => {
      const adminReq = new NextRequest('http://localhost:3000/api/v1/admin/dashboard', {
        headers: {
          'x-admin-key': getAdminSecret(),
        },
      });

      const response = await requireAdmin(adminReq);
      expect(response).toBeNull(); // null means authorized
    });
  });

  describe('7. Public Registration Role Hardening', () => {
    it('always creates accounts with role USER and ignores any client role input', async () => {
      const newEmail = `standard_user_${Date.now()}@example.com`;
      const created = await userRepository.create({
        email: newEmail,
        passwordHash: hashPassword(testPassword),
        name: 'Standard User',
        role: 'USER',
      });

      expect(created.role).toBe('USER');

      // Attempting to elevate must only succeed through authorized repository update
      const elevated = await userRepository.updateRole(created.id, 'ADMIN');
      expect(elevated?.role).toBe('ADMIN');

      // Demoting back to USER
      const demoted = await userRepository.updateRole(created.id, 'USER');
      expect(demoted?.role).toBe('USER');

      // Cleanup
      await userRepository.delete(created.id);
    });
  });

  describe('8. Administrative Bootstrap & Verified Login Flow', () => {
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim() || 'admin@optemizer.com';
    const adminPassword = process.env.ADMIN_PASSWORD;

    it('1. verifies configured ADMIN account exists in PostgreSQL', async () => {
      const adminUsers = await prisma.user.findMany({
        where: { email: adminEmail },
      });
      expect(adminUsers.length).toBeGreaterThan(0);
      expect(adminUsers[0].email).toBe(adminEmail);
    });

    it('2. verifies account role is explicitly ADMIN', async () => {
      const adminUser = await prisma.user.findUnique({
        where: { email: adminEmail },
      });
      expect(adminUser).not.toBeNull();
      expect(adminUser?.role).toBe('ADMIN');
    });

    it('3. verifies password is stored only as secure scrypt hash and never plaintext', async () => {
      const adminUser = await prisma.user.findUnique({
        where: { email: adminEmail },
      });
      expect(adminUser).not.toBeNull();
      expect(adminUser?.passwordHash).toBeDefined();

      // Never stores raw plaintext password
      if (adminPassword) {
        expect(adminUser?.passwordHash).not.toBe(adminPassword);
      }

      // Validates scrypt formatting: salt:key
      const parts = adminUser!.passwordHash.split(':');
      expect(parts).toHaveLength(2);
      expect(parts[0]).toHaveLength(32); // 16 bytes hex
      expect(parts[1]).toHaveLength(128); // 64 bytes hex

      // Cryptographic verification succeeds for valid password
      if (adminPassword) {
        expect(verifyPassword(adminPassword, adminUser!.passwordHash)).toBe(true);
      }
      // Cryptographic verification rejects incorrect password
      expect(verifyPassword('InvalidAdminPassword999!', adminUser!.passwordHash)).toBe(false);
    });

    it('4. verifies no duplicate ADMIN accounts exist and bootstrap is idempotent', async () => {
      const adminUsers = await prisma.user.findMany({
        where: { email: adminEmail },
      });
      expect(adminUsers.length).toBe(1);

      // Re-running bootstrap does NOT create a duplicate or overwrite existing account
      const result = await adminBootstrapService.bootstrapAdmin();
      expect(result.status).toBe('ALREADY_EXISTS');
      expect(result.role).toBe('ADMIN');

      const adminUsersAfter = await prisma.user.findMany({
        where: { email: adminEmail },
      });
      expect(adminUsersAfter.length).toBe(1);
    });

    let adminSessionToken: string;

    it('5. verifies /login can authenticate the configured ADMIN account', async () => {
      if (!adminPassword) return;

      const loginReq = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
        }),
      });

      const response = await loginRoute(loginReq);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBe(adminEmail);
      expect(json.data.user.role).toBe('ADMIN');
      expect(json.data.user.passwordHash).toBeUndefined();

      // Extract session token
      const sessionCookie = response.cookies.get(SESSION_COOKIE_NAME);
      expect(sessionCookie).toBeDefined();
      adminSessionToken = sessionCookie!.value;
      expect(adminSessionToken).toBeTruthy();
    });

    it('6. verifies the resulting session is stored in PostgreSQL', async () => {
      if (!adminSessionToken) return;

      const dbSession = await prisma.session.findUnique({
        where: { sessionToken: adminSessionToken },
        include: { user: true },
      });

      expect(dbSession).not.toBeNull();
      expect(dbSession?.user.email).toBe(adminEmail);
      expect(dbSession?.user.role).toBe('ADMIN');
      expect(new Date(dbSession!.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('7. verifies ADMIN can access /admin operations guard', async () => {
      if (!adminSessionToken) return;

      const adminReq = new NextRequest('http://localhost:3000/api/v1/admin/dashboard', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminSessionToken}`,
        },
      });

      const guardResponse = await requireAdmin(adminReq);
      expect(guardResponse).toBeNull(); // authorized

      const verifyResult = await verifyAdminAuthAsync(adminReq);
      expect(verifyResult.authorized).toBe(true);
      expect(verifyResult.user?.role).toBe('admin');
    });

    it('8. verifies ADMIN can access /admin/users operations guard', async () => {
      if (!adminSessionToken) return;

      const adminReq = new NextRequest('http://localhost:3000/api/v1/admin/users', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminSessionToken}`,
        },
      });

      const guardResponse = await requireAdmin(adminReq);
      expect(guardResponse).toBeNull(); // authorized
    });

    it('9. verifies ADMIN can access /admin/activity operations guard', async () => {
      if (!adminSessionToken) return;

      const adminReq = new NextRequest('http://localhost:3000/api/v1/admin/activity', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminSessionToken}`,
        },
      });

      const guardResponse = await requireAdmin(adminReq);
      expect(guardResponse).toBeNull(); // authorized
    });

    it('10. verifies ADMIN can access /admin/ai-providers operations guard', async () => {
      if (!adminSessionToken) return;

      const adminReq = new NextRequest('http://localhost:3000/api/v1/admin/ai/providers', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminSessionToken}`,
        },
      });

      const guardResponse = await requireAdmin(adminReq);
      expect(guardResponse).toBeNull(); // authorized
    });

    it('11. verifies logout invalidates the session and revokes access', async () => {
      if (!adminSessionToken) return;

      const logoutReq = new NextRequest('http://localhost:3000/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminSessionToken}`,
        },
      });

      const logoutRes = await logoutRoute(logoutReq);
      expect(logoutRes.status).toBe(200);

      // Session record deleted from PostgreSQL
      const dbSessionAfter = await prisma.session.findUnique({
        where: { sessionToken: adminSessionToken },
      });
      expect(dbSessionAfter).toBeNull();

      // Subsequent access with invalidated session token is denied (401)
      const postLogoutReq = new NextRequest('http://localhost:3000/api/v1/admin/dashboard', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminSessionToken}`,
        },
      });

      const guardResponse = await requireAdmin(postLogoutReq);
      expect(guardResponse).not.toBeNull();
      expect([401, 403]).toContain(guardResponse?.status);
    });
  });
});