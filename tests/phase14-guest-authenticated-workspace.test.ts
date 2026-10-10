import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { userRepository } from '@/repositories/user.repository';
import { createSession, deleteSession, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { sanitizeRedirectUrl } from '@/lib/security/safe-redirect';
import { GET as getAuthMe } from '@/app/api/v1/auth/me/route';
import { GET as getUserDashboard } from '@/app/api/v1/dashboard/user/route';
import { GET as getSettings } from '@/app/api/v1/user/settings/route';
import { GET as exportReport } from '@/app/api/v1/reports/export/route';

describe('NEXVERSAL — Guest Experience & Authenticated Workspace', () => {
  const timestamp = Date.now();
  const testUserEmail = `workspace_user_${timestamp}@example.com`;
  const adminUserEmail = `workspace_admin_${timestamp}@example.com`;
  const testPassword = 'Password123!Secure';

  let testUser: any;
  let testUserToken: string;
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    // 1. Create Normal Test User
    testUser = await userRepository.create({
      email: testUserEmail,
      passwordHash: hashPassword(testPassword),
      name: 'Workspace Tester',
      role: 'USER',
    });
    const s1 = await createSession(testUser.id);
    testUserToken = s1.token;

    // 2. Create Admin Test User
    adminUser = await userRepository.create({
      email: adminUserEmail,
      passwordHash: hashPassword(testPassword),
      name: 'Admin Workspace',
      role: 'ADMIN',
    });
    const s2 = await createSession(adminUser.id);
    adminToken = s2.token;
  });

  afterAll(async () => {
    try {
      if (testUser?.id) {
        await prisma.session.deleteMany({ where: { userId: testUser.id } });
        await prisma.userSettings.deleteMany({ where: { userId: testUser.id } });
        await prisma.user.deleteMany({ where: { id: testUser.id } });
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

  function makeReq(url: string, token?: string) {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (token) {
      headers['cookie'] = `${SESSION_COOKIE_NAME}=${token}`;
    }
    return new NextRequest(url, { headers });
  }

  describe('1. Static File & Code Architecture Verification', () => {
    const headerPath = path.resolve(process.cwd(), 'src/components/layout/Header.tsx');
    const headerContent = fs.readFileSync(headerPath, 'utf8');

    const sidebarPath = path.resolve(process.cwd(), 'src/components/layout/Sidebar.tsx');
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

    const appShellPath = path.resolve(process.cwd(), 'src/components/layout/AppShell.tsx');
    const appShellContent = fs.readFileSync(appShellPath, 'utf8');

    const pagePath = path.resolve(process.cwd(), 'src/app/page.tsx');
    const pageContent = fs.readFileSync(pagePath, 'utf8');

    const dashboardPagePath = path.resolve(process.cwd(), 'src/app/dashboard/page.tsx');
    const dashboardPageContent = fs.readFileSync(dashboardPagePath, 'utf8');

    const settingsLayoutPath = path.resolve(process.cwd(), 'src/app/settings/layout.tsx');
    const settingsLayoutContent = fs.readFileSync(settingsLayoutPath, 'utf8');

    it('verifies Header provides distinct Guest vs Authenticated experience', () => {
      // Guest Dashboard redirection link
      expect(headerContent).toContain('/login?redirect=/dashboard');
      // Sign In button link
      expect(headerContent).toContain('href="/login"');
      // Full authenticated routes are defined
      expect(headerContent).toContain('/dashboard');
      expect(headerContent).toContain('/analyzer');
      expect(headerContent).toContain('/crawler');
      expect(headerContent).toContain('/keywords');
      expect(headerContent).toContain('/reports');
      expect(headerContent).toContain('/settings');
    });

    it('verifies AppShell suppresses sidebar when user is unauthenticated', () => {
      expect(appShellContent).toContain('useAuth()');
      expect(appShellContent).toContain('shouldRenderSidebar');
      expect(appShellContent).toContain('showSidebar && !!user');
    });

    it('verifies Sidebar links to dedicated /dashboard', () => {
      expect(sidebarContent).toContain("href: '/dashboard', label: 'Dashboard'");
      expect(sidebarContent).toContain("href: '/analyzer', label: 'Content Analyzer'");
      expect(sidebarContent).toContain("href: '/crawler', label: 'Live SEO Audit'");
      expect(sidebarContent).toContain("href: '/keywords', label: 'Keyword Research'");
      expect(sidebarContent).toContain("href: '/reports', label: 'Audit Reports'");
      expect(sidebarContent).toContain("href: '/settings', label: 'Settings'");
    });

    it('verifies homepage renders Content Analyzer as the primary hero experience', () => {
      expect(pageContent).toContain('ContentAnalyzerWorkspace');
      expect(pageContent).toContain('Article Writing &amp; Workspace Overview');
      expect(pageContent).toContain('Primary Workspace');
    });

    it('verifies /dashboard implements server-side auth guard', () => {
      expect(dashboardPageContent).toContain('getCurrentUserServer');
      expect(dashboardPageContent).toContain("redirect('/login?redirect=/dashboard')");
      expect(dashboardPageContent).toContain('userDashboardService.getDashboardData');
    });

    it('verifies /settings implements server-side auth guard', () => {
      expect(settingsLayoutContent).toContain('getCurrentUserServer');
      expect(settingsLayoutContent).toContain("redirect('/login?redirect=/settings')");
    });
  });

  describe('2. Guest Experience & Anti-Exposure Verification', () => {
    it('returns unauthenticated state for guest requests on /api/v1/auth/me', async () => {
      const req = makeReq('http://localhost:3000/api/v1/auth/me');
      const res = await getAuthMe(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.authenticated).toBe(false);
      expect(json.data).toBeNull();
    });

    it('strictly denies guest access to user dashboard data with 401', async () => {
      const req = makeReq('http://localhost:3000/api/v1/dashboard/user');
      const res = await getUserDashboard(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('strictly denies guest access to user settings with 401', async () => {
      const req = makeReq('http://localhost:3000/api/v1/user/settings');
      const res = await getSettings(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('strictly denies guest access to report exports with 401', async () => {
      const req = makeReq('http://localhost:3000/api/v1/reports/export?auditId=123&format=html');
      const res = await exportReport(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('3. Authenticated Workspace Access & Data Isolation', () => {
    it('returns authenticated user profile on /api/v1/auth/me for logged-in user', async () => {
      const req = makeReq('http://localhost:3000/api/v1/auth/me', testUserToken);
      const res = await getAuthMe(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.authenticated).toBe(true);
      expect(json.data.user).toBeDefined();
      expect(json.data.user.email).toBe(testUserEmail);
      expect(json.data.user.role).toBe('USER');
    });

    it('allows authenticated user to fetch isolated dashboard metrics on /api/v1/dashboard/user', async () => {
      const req = makeReq('http://localhost:3000/api/v1/dashboard/user', testUserToken);
      const res = await getUserDashboard(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(typeof json.data.totalAudits).toBe('number');
      expect(typeof json.data.keywordSearchesCount).toBe('number');
      expect(typeof json.data.contentAnalysesCount).toBe('number');
      expect(typeof json.data.reportsCount).toBe('number');
      expect(Array.isArray(json.data.recentActivity)).toBe(true);
    });

    it('identifies ADMIN role on /api/v1/auth/me for admin user', async () => {
      const req = makeReq('http://localhost:3000/api/v1/auth/me', adminToken);
      const res = await getAuthMe(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.authenticated).toBe(true);
      expect(json.data.user.role).toBe('ADMIN');
    });
  });

  describe('4. Safe Redirect & Destination Sanitization', () => {
    it('sanitizes guest Dashboard redirect to /dashboard', () => {
      expect(sanitizeRedirectUrl('/dashboard')).toBe('/dashboard');
      expect(sanitizeRedirectUrl('/dashboard', 'USER')).toBe('/dashboard');
    });

    it('rejects open-redirect attempts with external URLs', () => {
      expect(sanitizeRedirectUrl('https://malicious-site.com/steal')).toBe('/');
      expect(sanitizeRedirectUrl('//evil.org')).toBe('/');
      expect(sanitizeRedirectUrl('/\\phishing.com')).toBe('/');
      expect(sanitizeRedirectUrl('javascript:alert(1)')).toBe('/');
    });

    it('blocks unauthenticated and normal users from redirecting to /admin', () => {
      expect(sanitizeRedirectUrl('/admin/dashboard', undefined)).toBe('/');
      expect(sanitizeRedirectUrl('/admin/dashboard', 'USER')).toBe('/');
      expect(sanitizeRedirectUrl('/admin/dashboard', 'ADMIN')).toBe('/admin/dashboard');
    });
  });
});

