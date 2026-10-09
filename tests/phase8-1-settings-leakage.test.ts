import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { userRepository } from '@/repositories/user.repository';
import { createSession, deleteSession, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { GET as getSettings, PUT as updateSettings } from '@/app/api/v1/user/settings/route';
import { GET as getAdminDashboard } from '@/app/api/v1/admin/dashboard/route';
import { GET as getAdminUsers } from '@/app/api/v1/admin/users/route';
import { GET as getAdminActivity } from '@/app/api/v1/admin/activity/route';
import fs from 'fs';
import path from 'path';

describe('Phase 8.1 — Public Settings Information Leakage & Authorization Hardening', () => {
  const timestamp = Date.now();
  const normalEmailA = `normal_user_a_${timestamp}@example.com`;
  const normalEmailB = `normal_user_b_${timestamp}@example.com`;
  const adminEmail = `admin_tester_${timestamp}@example.com`;
  const testPassword = 'Password123!Secure';

  let userA: any;
  let tokenA: string;
  let userB: any;
  let tokenB: string;
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    // 1. Create Normal User A
    userA = await userRepository.create({
      email: normalEmailA,
      passwordHash: hashPassword(testPassword),
      name: 'Alice Normal',
      role: 'USER',
    });
    const sA = await createSession(userA.id);
    tokenA = sA.token;

    // 2. Create Normal User B
    userB = await userRepository.create({
      email: normalEmailB,
      passwordHash: hashPassword(testPassword),
      name: 'Bob Normal',
      role: 'USER',
    });
    const sB = await createSession(userB.id);
    tokenB = sB.token;

    // 3. Create Admin User
    adminUser = await userRepository.create({
      email: adminEmail,
      passwordHash: hashPassword(testPassword),
      name: 'Platform Administrator',
      role: 'ADMIN',
    });
    const sAdmin = await createSession(adminUser.id);
    adminToken = sAdmin.token;
  });

  afterAll(async () => {
    try {
      if (userA?.id) {
        await prisma.session.deleteMany({ where: { userId: userA.id } });
        await prisma.userSettings.deleteMany({ where: { userId: userA.id } });
        await prisma.user.deleteMany({ where: { id: userA.id } });
      }
      if (userB?.id) {
        await prisma.session.deleteMany({ where: { userId: userB.id } });
        await prisma.userSettings.deleteMany({ where: { userId: userB.id } });
        await prisma.user.deleteMany({ where: { id: userB.id } });
      }
      if (adminUser?.id) {
        await prisma.session.deleteMany({ where: { userId: adminUser.id } });
        await prisma.userSettings.deleteMany({ where: { userId: adminUser.id } });
        await prisma.user.deleteMany({ where: { id: adminUser.id } });
      }
    } catch {
      // Clean up fallback
    }
  });

  function makeReq(url: string, options?: { method?: string; body?: any; token?: string }) {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
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

  describe('1. Public Settings API Sanitize & Information Leakage Prevention', () => {
    it('returns only permitted personal user fields (email, name) and no internal identifiers', async () => {
      const req = makeReq('http://localhost:3000/api/v1/user/settings', { token: tokenA });
      const res = await getSettings(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify User Profile object is sanitized
      expect(json.data.user).toBeDefined();
      expect(json.data.user.email).toBe(normalEmailA);
      expect(json.data.user.name).toBe('Alice Normal');

      // CRITICAL: Ensure internal database identifiers and role are NEVER leaked
      expect(json.data.user.id).toBeUndefined();
      expect(json.data.user.role).toBeUndefined();
      expect(json.data.user.passwordHash).toBeUndefined();
      expect(json.data.user.createdAt).toBeUndefined();
      expect(json.data.user.updatedAt).toBeUndefined();

      // CRITICAL: Ensure settings object does NOT expose internal userId
      expect(json.data.settings).toBeDefined();
      expect(json.data.settings.userId).toBeUndefined();
      expect(json.data.settings.id).toBeUndefined();
      expect(json.data.settings.editorDialect).toBe('en-US');
      expect(json.data.settings.targetWordCount).toBe('1,500');
    });

    it('sanitizes PUT /api/v1/user/settings response to exclude internal database identifiers', async () => {
      const req = makeReq('http://localhost:3000/api/v1/user/settings', {
        method: 'PUT',
        token: tokenA,
        body: {
          editorDialect: 'en-GB',
          targetWordCount: '2,500',
          defaultDevice: 'mobile',
          autoSlug: false,
        },
      });
      const res = await updateSettings(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.settings.editorDialect).toBe('en-GB');
      expect(json.data.settings.targetWordCount).toBe('2,500');
      expect(json.data.settings.defaultDevice).toBe('mobile');
      expect(json.data.settings.autoSlug).toBe(false);

      // Verify no internal userId leaked in update response
      expect(json.data.settings.userId).toBeUndefined();
      expect(json.data.settings.id).toBeUndefined();
    });

    it('rejects unauthenticated settings requests with 401 Unauthorized', async () => {
      const req = makeReq('http://localhost:3000/api/v1/user/settings');
      const res = await getSettings(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('2. Multi-Tenant User Isolation & Zero Cross-User Leakage', () => {
    it('isolates user settings: User B cannot see User A identity or custom preferences', async () => {
      const reqB = makeReq('http://localhost:3000/api/v1/user/settings', { token: tokenB });
      const resB = await getSettings(reqB);
      expect(resB.status).toBe(200);

      const jsonB = await resB.json();
      expect(jsonB.success).toBe(true);
      // User B sees only their own details
      expect(jsonB.data.user.email).toBe(normalEmailB);
      expect(jsonB.data.user.name).toBe('Bob Normal');
      // User B does NOT see User A's custom settings (en-GB / 2,500)
      expect(jsonB.data.settings.editorDialect).toBe('en-US');
      expect(jsonB.data.settings.targetWordCount).toBe('1,500');

      // Zero admin leakage
      expect(jsonB.data.user.email).not.toBe(adminEmail);
      expect(jsonB.data.user.name).not.toBe('Platform Administrator');
    });

    it('isolates settings updates: User B updates do not overwrite User A preferences', async () => {
      const reqB = makeReq('http://localhost:3000/api/v1/user/settings', {
        method: 'PUT',
        token: tokenB,
        body: {
          editorDialect: 'en-US',
          targetWordCount: '1,200',
        },
      });
      const resB = await updateSettings(reqB);
      expect(resB.status).toBe(200);

      // Verify User A settings remain intact
      const reqA = makeReq('http://localhost:3000/api/v1/user/settings', { token: tokenA });
      const resA = await getSettings(reqA);
      const jsonA = await resA.json();
      expect(jsonA.data.settings.editorDialect).toBe('en-GB');
      expect(jsonA.data.settings.targetWordCount).toBe('2,500');
    });
  });

  describe('3. Server-Side RBAC Enforcement on Admin APIs (403 Forbidden for Normal Users)', () => {
    it('returns 403 Forbidden when normal user requests /api/v1/admin/dashboard', async () => {
      const req = makeReq('http://localhost:3000/api/v1/admin/dashboard', { token: tokenA });
      const res = await getAdminDashboard(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN_ADMIN_ACCESS');
      expect(json.error.message).toContain('USER');
    });

    it('returns 403 Forbidden when normal user requests /api/v1/admin/users', async () => {
      const req = makeReq('http://localhost:3000/api/v1/admin/users', { token: tokenA });
      const res = await getAdminUsers(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN_ADMIN_ACCESS');
    });

    it('returns 403 Forbidden when normal user requests /api/v1/admin/activity', async () => {
      const req = makeReq('http://localhost:3000/api/v1/admin/activity', { token: tokenA });
      const res = await getAdminActivity(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN_ADMIN_ACCESS');
    });

    it('returns 401 Unauthorized when unauthenticated user requests admin endpoints', async () => {
      const req = makeReq('http://localhost:3000/api/v1/admin/dashboard');
      const res = await getAdminDashboard(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED_ADMIN_ACCESS');
    });

    it('allows administrator to access /api/v1/admin/dashboard', async () => {
      const req = makeReq('http://localhost:3000/api/v1/admin/dashboard', { token: adminToken });
      const res = await getAdminDashboard(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
    });
  });

  describe('4. Public UI File Verification: Zero Leaked Architecture Internals', () => {
    it('verifies src/app/settings/page.tsx does not leak internal architecture or identifiers', () => {
      const filePath = path.resolve(process.cwd(), 'src/app/settings/page.tsx');
      const content = fs.readFileSync(filePath, 'utf8');

      // Must NOT contain Security Architecture tab
      expect(content).not.toContain('Security Architecture');
      expect(content).not.toContain('crypto.timingSafeEqual');
      expect(content).not.toContain('10.0.0.0/8');
      expect(content).not.toContain('169.254.169.254');
      expect(content).not.toContain('Zero Client Secrets');

      // Must NOT contain internal account identifier display
      expect(content).not.toContain('Account Identifier');
      expect(content).not.toContain('{user.id}');

      // Must NOT contain internal database persistence marketing/messages
      expect(content).not.toContain('Persisted');
      expect(content).not.toContain('Your audits, activities, and preferences are securely persisted in the database');
      expect(content).not.toContain('Saved to Database!');

      // Must NOT contain raw Platform Role badge for users
      expect(content).not.toContain('Platform Role');

      // Must NOT contain hardcoded admin credentials
      expect(content).not.toContain('admin@optemizer.com');
      expect(content).not.toContain('System Administrator');
    });

    it('verifies public components do not expose internal phase numbers', () => {
      const headerPath = path.resolve(process.cwd(), 'src/components/layout/Header.tsx');
      const headerContent = fs.readFileSync(headerPath, 'utf8');
      expect(headerContent).not.toContain('Phase 5 Architecture');

      const sidebarPath = path.resolve(process.cwd(), 'src/components/layout/Sidebar.tsx');
      const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
      expect(sidebarContent).not.toContain('Phase 2 Engine');
      expect(sidebarContent).not.toContain('Active (Phase 2)');

      const loginPath = path.resolve(process.cwd(), 'src/app/(auth)/login/page.tsx');
      const loginContent = fs.readFileSync(loginPath, 'utf8');
      expect(loginContent).not.toContain('Phase 5 Auth');

      const registerPath = path.resolve(process.cwd(), 'src/app/(auth)/register/page.tsx');
      const registerContent = fs.readFileSync(registerPath, 'utf8');
      expect(registerContent).not.toContain('Phase 5 Auth');
    });
  });
});
