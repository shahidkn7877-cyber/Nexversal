import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { sanitizeRedirectUrl } from '@/lib/security/safe-redirect';
import {
  checkLoginRateLimit,
  checkRegisterRateLimit,
  checkAdminAuthRateLimit,
  resetAuthRateLimits,
  getClientIp,
} from '@/lib/security/auth-rate-limit';
import { POST as loginHandler } from '@/app/api/v1/auth/login/route';
import { POST as registerHandler } from '@/app/api/v1/auth/register/route';
import { POST as adminAuthHandler } from '@/app/api/v1/admin/auth/route';
import { userDashboardService } from '@/services/dashboard/user-dashboard.service';
import { auditRepository } from '@/repositories/audit.repository';
import { AuditResult } from '@/types/audit';

describe('Phase 9.1 — Security & User Data Isolation Hardening', () => {
  beforeEach(() => {
    resetAuthRateLimits();
  });

  // =========================================================================
  // 1. Dashboard Data Isolation Between Users
  // =========================================================================
  describe('1. Dashboard Data Isolation Between Users', () => {
    const userA_id = 'test-isolated-user-a-' + Date.now();
    const userB_id = 'test-isolated-user-b-' + Date.now();

    it('isolates audits strictly to the owner and prevents cross-user exposure', async () => {
      // Create a private audit for User A
      const auditA: AuditResult = {
        id: 'audit-user-a-' + Date.now(),
        url: 'https://user-a-private-domain.com/',
        targetKeyword: 'private kw',
        score: 95,
        status: 'completed',
        passedCount: 20,
        warningCount: 2,
        criticalCount: 0,
        checks: [],
        timestamp: new Date().toISOString(),
        userId: userA_id,
      };
      await auditRepository.saveAsync(auditA);

      // Verify User A dashboard sees their audit
      const dashboardA = await userDashboardService.getDashboardData(userA_id);
      expect(dashboardA.totalAudits).toBeGreaterThanOrEqual(1);
      expect(dashboardA.latestAudit).not.toBeNull();
      expect(dashboardA.latestAudit?.url).toBe('https://user-a-private-domain.com/');

      // Verify User B dashboard has ZERO exposure to User A audit
      const dashboardB = await userDashboardService.getDashboardData(userB_id);
      expect(dashboardB.totalAudits).toBe(0);
      expect(dashboardB.latestAudit).toBeNull();
      expect(dashboardB.recentAudits).toHaveLength(0);

      // Verify an unauthenticated guest (no user ID) cannot access User A audit via user methods
      const guestAudit = auditRepository.getLatestByUserId('non-existent-guest-id');
      expect(guestAudit).toBeNull();
    });
  });

  // =========================================================================
  // 2. Unsafe Post-Login Redirect Handling (Open Redirect Prevention)
  // =========================================================================
  describe('2. Unsafe Post-Login Redirect Handling', () => {
    it('rejects external absolute URLs', () => {
      expect(sanitizeRedirectUrl('https://evil.com')).toBe('/');
      expect(sanitizeRedirectUrl('http://attacker.com/steal-creds')).toBe('/');
      expect(sanitizeRedirectUrl('ftp://malicious.org')).toBe('/');
    });

    it('rejects protocol-relative URLs (//evil.com)', () => {
      expect(sanitizeRedirectUrl('//evil.com')).toBe('/');
      expect(sanitizeRedirectUrl('//phishing.net/login')).toBe('/');
      expect(sanitizeRedirectUrl('///attacker.com')).toBe('/');
    });

    it('rejects backslash evasion attempts', () => {
      expect(sanitizeRedirectUrl('/\\evil.com')).toBe('/');
      expect(sanitizeRedirectUrl('\\evil.com')).toBe('/');
      expect(sanitizeRedirectUrl('/path\\to\\somewhere')).toBe('/');
    });

    it('rejects script and pseudo-protocol schemes', () => {
      expect(sanitizeRedirectUrl('javascript:alert(document.cookie)')).toBe('/');
      expect(sanitizeRedirectUrl('/javascript:void(0)')).toBe('/');
      expect(sanitizeRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe('/');
    });

    it('rejects CR/LF and null byte control character injections', () => {
      expect(sanitizeRedirectUrl('/path\r\nevil.com')).toBe('/');
      expect(sanitizeRedirectUrl('/dashboard\0')).toBe('/');
    });

    it('blocks normal users and guests from redirecting into /admin', () => {
      expect(sanitizeRedirectUrl('/admin', 'USER')).toBe('/');
      expect(sanitizeRedirectUrl('/admin/users', 'USER')).toBe('/');
      expect(sanitizeRedirectUrl('/admin', undefined)).toBe('/');
      expect(sanitizeRedirectUrl('/admin/ai-providers', '')).toBe('/');
    });

    it('allows authenticated ADMIN users to redirect to /admin', () => {
      expect(sanitizeRedirectUrl('/admin', 'ADMIN')).toBe('/admin');
      expect(sanitizeRedirectUrl('/admin/users', 'ADMIN')).toBe('/admin/users');
      expect(sanitizeRedirectUrl('/admin/ai-providers', 'ADMIN')).toBe('/admin/ai-providers');
    });

    it('allows valid local relative paths for all users', () => {
      expect(sanitizeRedirectUrl('/analyzer')).toBe('/analyzer');
      expect(sanitizeRedirectUrl('/crawler')).toBe('/crawler');
      expect(sanitizeRedirectUrl('/keywords')).toBe('/keywords');
      expect(sanitizeRedirectUrl('/reports')).toBe('/reports');
      expect(sanitizeRedirectUrl('/settings')).toBe('/settings');
      expect(sanitizeRedirectUrl('/')).toBe('/');
      expect(sanitizeRedirectUrl('')).toBe('/');
      expect(sanitizeRedirectUrl(null)).toBe('/');
    });
  });

  // =========================================================================
  // 3. Rate Limiting on Login and Registration Endpoints
  // =========================================================================
  describe('3. Rate Limiting on Authentication Endpoints', () => {
    it('throttles rapid login attempts per IP and per target email with 429 status', async () => {
      const testIp = '198.51.100.1';
      const targetEmail = 'victim_' + Date.now() + '@example.com';

      // First attempts should pass through to credential validation
      for (let i = 0; i < 5; i++) {
        const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': testIp,
          },
          body: JSON.stringify({ email: targetEmail, password: 'wrong-password' }),
        });
        const res = await loginHandler(req);
        // Either 401 (invalid credentials) or 400 (if invalid), but NOT 429 yet
        expect(res.status).not.toBe(429);
      }

      // The 6th attempt targeting the same email must trigger 429 RATE_LIMITED
      const blockedReq = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': testIp,
        },
        body: JSON.stringify({ email: targetEmail, password: 'wrong-password' }),
      });
      const blockedRes = await loginHandler(blockedReq);
      expect(blockedRes.status).toBe(429);

      const json = await blockedRes.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('RATE_LIMITED');
      expect(json.error.message).toMatch(/too many login attempts/i);
    });

    it('throttles rapid registration attempts from the same IP with 429 status', async () => {
      const testIp = '203.0.113.42';

      // Make 5 registration attempts
      for (let i = 0; i < 5; i++) {
        const req = new NextRequest('http://localhost:3000/api/v1/auth/register', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': testIp,
          },
          body: JSON.stringify({
            email: `user_${i}_${Date.now()}@example.com`,
            password: 'ValidPassword123!',
          }),
        });
        const res = await registerHandler(req);
        expect(res.status).not.toBe(429);
      }

      // 6th registration attempt from the same IP must be rejected with 429
      const throttledReq = new NextRequest('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': testIp,
        },
        body: JSON.stringify({
          email: `overflow_${Date.now()}@example.com`,
          password: 'ValidPassword123!',
        }),
      });
      const throttledRes = await registerHandler(throttledReq);
      expect(throttledRes.status).toBe(429);

      const json = await throttledRes.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('RATE_LIMITED');
      expect(json.error.message).toMatch(/too many registration attempts/i);
    });

    it('throttles rapid admin authentication attempts with 429 status', async () => {
      const testIp = '192.0.2.99';

      // 5 attempts with invalid admin key
      for (let i = 0; i < 5; i++) {
        const req = new NextRequest('http://localhost:3000/api/v1/admin/auth', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': testIp,
          },
          body: JSON.stringify({ adminKey: 'invalid-key-' + i }),
        });
        const res = await adminAuthHandler(req);
        expect(res.status).not.toBe(429);
      }

      // 6th attempt must be rejected with 429
      const throttledReq = new NextRequest('http://localhost:3000/api/v1/admin/auth', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': testIp,
        },
        body: JSON.stringify({ adminKey: 'invalid-key-overflow' }),
      });
      const throttledRes = await adminAuthHandler(throttledReq);
      expect(throttledRes.status).toBe(429);
    });

    it('getClientIp correctly handles multi-proxy x-forwarded-for header', () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        headers: {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
        },
      });
      expect(getClientIp(req)).toBe('203.0.113.195');
    });

    it('resetAuthRateLimits restores access immediately', () => {
      const ip = '10.0.0.1';
      // Saturate register limit
      for (let i = 0; i < 5; i++) {
        checkRegisterRateLimit(ip);
      }
      expect(checkRegisterRateLimit(ip).allowed).toBe(false);

      // Reset
      resetAuthRateLimits();
      expect(checkRegisterRateLimit(ip).allowed).toBe(true);
    });
  });
});

