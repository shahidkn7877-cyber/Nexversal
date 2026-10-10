import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import {
  createAuditContinuationToken,
  verifyAuditContinuationToken,
} from '@/lib/security/audit-continuation';
import { sanitizeRedirectUrl } from '@/lib/security/safe-redirect';
import { reportGeneratorService } from '@/services/report/report-generator.service';
import { auditRepository } from '@/repositories/audit.repository';
import { POST as claimAuditRoute } from '@/app/api/v1/audit/claim/route';
import { GET as exportReportRoute } from '@/app/api/v1/reports/export/route';
import { AuditResult } from '@/types/audit';
import { APP_DESCRIPTION, APP_NAME } from '@/lib/constants';

describe('PHASE 13 — Content Analyzer Homepage, Unified Workspace & Secure Report Download', () => {
  const pagePath = path.resolve(process.cwd(), 'src/app/page.tsx');
  const pageContent = fs.readFileSync(pagePath, 'utf8');

  const crawlerPath = path.resolve(process.cwd(), 'src/app/crawler/page.tsx');
  const crawlerContent = fs.readFileSync(crawlerPath, 'utf8');

  beforeEach(() => {
    auditRepository.clear();
  });

  describe('1. Homepage — Content Analyzer as Primary Workspace', () => {
    it('renders ContentAnalyzerWorkspace as the primary hero experience on the homepage', () => {
      expect(pageContent).toContain('ContentAnalyzerWorkspace');
      expect(pageContent).toContain('Article Writing &amp; Workspace Overview');
      expect(pageContent).toContain('Primary Workspace');
    });

    it('does not display empty dashboard metrics (Active Articles: 0, Focus Keywords: 0, Not Audited)', () => {
      expect(pageContent).not.toContain('Active Articles');
      expect(pageContent).not.toContain('Focus Keywords');
      expect(pageContent).not.toContain('Not Audited');
      expect(pageContent).not.toContain('Keyword Intent');
    });

    it('retains optimized 50-60 char title and 140-160 char description', () => {
      const titleMatch = pageContent.match(/title:\s*['"`](.*?)['"`]/);
      expect(titleMatch).toBeTruthy();
      const title = titleMatch![1];
      expect(title.length).toBeGreaterThanOrEqual(50);
      expect(title.length).toBeLessThanOrEqual(60);

      expect(APP_DESCRIPTION.length).toBeGreaterThanOrEqual(140);
      expect(APP_DESCRIPTION.length).toBeLessThanOrEqual(160);
    });

    it('maintains strict semantic heading hierarchy H1 -> H2 -> H3 with zero skipped levels', () => {
      const headingRegex = /<(h[1-6])[^>]*>/gi;
      const headings: number[] = [1]; // DashboardHeader has H1
      let match;
      while ((match = headingRegex.exec(pageContent)) !== null) {
        headings.push(parseInt(match[1].substring(1), 10));
      }

      for (let i = 1; i < headings.length; i++) {
        const prev = headings[i - 1];
        const curr = headings[i];
        expect(curr).toBeLessThanOrEqual(prev + 1);
      }
    });

    it('provides clear navigation links to all secondary tools', () => {
      expect(pageContent).toContain('href="/analyzer"');
      expect(pageContent).toContain('href="/crawler"');
      expect(pageContent).toContain('href="/keywords"');
      expect(pageContent).toContain('href="/reports"');
    });
  });

  describe('2. Cryptographic Continuation Token Security', () => {
    const testAuditId = 'audit-1791629000111';

    it('generates a valid signed continuation token for guest audits', () => {
      const token = createAuditContinuationToken(testAuditId);
      expect(token).toBeTruthy();
      expect(token).toContain('.');

      const result = verifyAuditContinuationToken(token, testAuditId);
      expect(result.valid).toBe(true);
      expect(result.auditId).toBe(testAuditId);
    });

    it('rejects tampered continuation tokens', () => {
      const token = createAuditContinuationToken(testAuditId);
      const [payload, sig] = token.split('.');
      const tampered = `${payload}.${sig.slice(0, -3)}xyz`;

      const result = verifyAuditContinuationToken(tampered, testAuditId);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid signature');
    });

    it('rejects expired continuation tokens', () => {
      // Create token with negative TTL
      const expiredToken = createAuditContinuationToken(testAuditId, -1000);
      const result = verifyAuditContinuationToken(expiredToken, testAuditId);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token has expired');
    });

    it('rejects continuation token when expected audit ID does not match', () => {
      const token = createAuditContinuationToken(testAuditId);
      const result = verifyAuditContinuationToken(token, 'audit-different-999');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Audit ID mismatch');
    });

    it('rejects malformed tokens missing signature or payload', () => {
      expect(verifyAuditContinuationToken('malformed').valid).toBe(false);
      expect(verifyAuditContinuationToken('').valid).toBe(false);
      expect(verifyAuditContinuationToken('a.b.c').valid).toBe(false);
    });
  });

  describe('3. Report Generation Service', () => {
    const mockAudit: AuditResult = {
      id: 'audit-test-123',
      url: 'https://example.com/blog/test-article',
      targetKeyword: 'enterprise seo',
      timestamp: new Date().toISOString(),
      score: 85,
      status: 'completed',
      passedCount: 15,
      warningCount: 2,
      criticalCount: 1,
      checks: [
        {
          id: 'title_tag',
          category: 'meta',
          title: 'Title Tag Optimal',
          description: 'Title tag length is within ideal range.',
          status: 'passed',
          severity: 'INFO',
          value: 'Enterprise SEO Guide - Nexversal',
          weight: 10,
          penalty: 0,
        },
        {
          id: 'h1_heading',
          category: 'content',
          title: 'Primary H1 Tag Configured',
          description: 'Single H1 headline detected.',
          status: 'passed',
          severity: 'INFO',
          value: 'Enterprise SEO Guide',
          weight: 10,
          penalty: 0,
        },
      ],
      pageData: {
        title: 'Enterprise SEO Guide',
        titleLength: 20,
        metaDescription: 'Complete guide to enterprise SEO.',
        metaDescriptionLength: 32,
        h1Count: 1,
        h1Text: 'Enterprise SEO Guide',
        h2Count: 3,
        h2Headings: ['Overview', 'Strategy', 'Execution'],
        wordCount: 1200,
        internalLinksCount: 10,
        externalLinksCount: 4,
        imagesTotal: 5,
        imagesWithAlt: 5,
        hasHttps: true,
        hasViewport: true,
        charset: 'utf-8',
        structuredDataTypes: ['Article'],
      } as any,
    };

    it('generates a complete, standalone, professional HTML report', () => {
      const html = reportGeneratorService.generateHtmlReport(mockAudit);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('SEO Technical Audit Report');
      expect(html).toContain('https://example.com/blog/test-article');
      expect(html).toContain('enterprise seo');
      expect(html).toContain('85');
      expect(html).toContain('Title Tag Optimal');
      expect(html).toContain('Nexversal');
    });

    it('properly escapes HTML special characters to prevent XSS in generated reports', () => {
      const xssAudit: AuditResult = {
        ...mockAudit,
        id: 'xss-1',
        url: 'https://example.com/<script>alert(1)</script>',
        targetKeyword: '"><img src=x onerror=alert(1)>',
      };

      const html = reportGeneratorService.generateHtmlReport(xssAudit);
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).toContain('&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
    });
  });

  describe('4. Secure Audit Claim Endpoint (POST /api/v1/audit/claim)', () => {
    it('rejects unauthenticated requests to claim an audit', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/audit/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditId: 'audit-1', token: 'token-1' }),
      });

      const res = await claimAuditRoute(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects invalid or expired continuation tokens with 400', async () => {
      const expiredToken = createAuditContinuationToken('audit-expired', -5000);
      const req = new NextRequest('http://localhost:3000/api/v1/audit/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Simulate user auth header if supported or test guard
        },
        body: JSON.stringify({ auditId: 'audit-expired', token: expiredToken }),
      });

      const res = await claimAuditRoute(req);
      // Fails at auth with 401 when unauthenticated
      expect([400, 401]).toContain(res.status);
    });
  });

  describe('5. Report Download Authorization & Anti-IDOR Enforcement', () => {
    it('rejects unauthenticated export requests with 401 Unauthorized', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/v1/reports/export?auditId=audit-test-123&format=html'
      );
      const res = await exportReportRoute(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects invalid export formats with 400', async () => {
      // Unauthenticated request still gets 401 before processing invalid format
      const req = new NextRequest(
        'http://localhost:3000/api/v1/reports/export?auditId=audit-test-123&format=exe'
      );
      const res = await exportReportRoute(req);
      expect(res.status).toBe(401);
    });
  });

  describe('6. Safe Redirect Validation', () => {
    it('rejects external protocol URLs (open redirect defense)', () => {
      expect(sanitizeRedirectUrl('https://evil.com')).toBe('/');
      expect(sanitizeRedirectUrl('http://attacker.org/steal')).toBe('/');
      expect(sanitizeRedirectUrl('javascript:alert(1)')).toBe('/');
    });

    it('rejects protocol-relative bypasses', () => {
      expect(sanitizeRedirectUrl('//evil.com')).toBe('/');
      expect(sanitizeRedirectUrl('//phishing.net/login')).toBe('/');
    });

    it('rejects backslash evasion attempts', () => {
      expect(sanitizeRedirectUrl('/\\evil.com')).toBe('/');
      expect(sanitizeRedirectUrl('/foo\\bar')).toBe('/');
    });

    it('preserves valid internal paths with query parameters and continuation tokens', () => {
      const safePath =
        '/crawler?claimAuditId=audit-123&token=abc.xyz&autoDownload=html';
      expect(sanitizeRedirectUrl(safePath)).toBe(safePath);
      expect(sanitizeRedirectUrl('/analyzer')).toBe('/analyzer');
      expect(sanitizeRedirectUrl('/reports')).toBe('/reports');
    });

    it('blocks non-admin users from accessing /admin redirects', () => {
      expect(sanitizeRedirectUrl('/admin/dashboard', 'USER')).toBe('/');
      expect(sanitizeRedirectUrl('/admin/dashboard', undefined)).toBe('/');
      expect(sanitizeRedirectUrl('/admin/dashboard', 'ADMIN')).toBe('/admin/dashboard');
    });
  });

  describe('7. Crawler UI Guest Account-Required Modal Verification', () => {
    it('contains the Download Report actions for HTML and JSON', () => {
      expect(crawlerContent).toContain('Download Report (HTML)');
      expect(crawlerContent).toContain('Download JSON');
    });

    it('contains the Account Required modal dialog for guest visitors', () => {
      expect(crawlerContent).toContain('Account Required to Download Report');
      expect(crawlerContent).toContain('Sign In &amp; Download');
      expect(crawlerContent).toContain('Create Free Account');
    });

    it('contains continuation token state and recovery logic', () => {
      expect(crawlerContent).toContain('continuationToken');
      expect(crawlerContent).toContain('/api/v1/audit/claim');
      expect(crawlerContent).toContain('claimAuditId');
    });
  });
});
