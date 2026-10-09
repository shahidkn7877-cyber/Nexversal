import { describe, it, expect, beforeEach } from 'vitest';
import { seoAuditService } from '../src/services/audit.service';
import { robotsParserService } from '../src/services/crawler/robots-parser.service';
import { sitemapParserService } from '../src/services/crawler/sitemap-parser.service';
import { multiPageCrawlerService } from '../src/services/crawler/multi-page-crawler.service';
import { auditRepository } from '../src/repositories/audit.repository';
import { AuditResult } from '../src/types/audit';

describe('Phase 7 — Advanced SEO Audit Platform', () => {
  beforeEach(() => {
    auditRepository.clear();
  });

  describe('1. Comprehensive On-Page and Technical Analysis', () => {
    const fullOptimizedHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Professional Cloud Computing Architecture Guide 2026</title>
        <meta name="description" content="Master cloud computing architecture in 2026. Detailed best practices, security patterns, scalability frameworks, and multi-cloud strategies.">
        <link rel="canonical" href="https://cloudtech.example.com/guide/architecture">
        <link rel="icon" href="/favicon.ico">
        <meta property="og:title" content="Professional Cloud Computing Architecture Guide 2026">
        <meta property="og:description" content="Master cloud computing architecture in 2026.">
        <meta property="og:image" content="https://cloudtech.example.com/og-image.jpg">
        <meta property="og:url" content="https://cloudtech.example.com/guide/architecture">
        <meta property="og:type" content="article">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="Professional Cloud Computing Architecture Guide 2026">
        <meta name="twitter:description" content="Master cloud computing architecture in 2026.">
        <meta name="twitter:image" content="https://cloudtech.example.com/twitter-image.jpg">
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "TechArticle",
          "headline": "Professional Cloud Computing Architecture Guide 2026",
          "author": {
            "@type": "Person",
            "name": "Jane Doe"
          }
        }
        </script>
      </head>
      <body>
        <h1>Professional Cloud Computing Architecture Guide 2026</h1>
        <p>Welcome to the ultimate guide on cloud computing architecture. Modern enterprise applications require robust fault tolerance and elasticity.</p>
        
        <h2>Core Principles of Resilient Infrastructure</h2>
        <p>${'Enterprise architecture patterns emphasize stateless microservices and isolated failure domains. '.repeat(40)}</p>
        
        <h2>Security and Zero-Trust Identity</h2>
        <p>${'Role-based access controls and encrypted service meshes guarantee zero trust compliance across all VPCs. '.repeat(45)}</p>
        
        <h3>Automated CI/CD Deployment Strategies</h3>
        <p>${'Canary rollouts and blue-green deployments minimize blast radius during infrastructure migrations. '.repeat(30)}</p>

        <img src="/infra.png" alt="Cloud architecture topology diagram" width="800" height="600" loading="lazy">
        <img src="/security.png" alt="Zero-trust security mesh flowchart" width="800" height="450" loading="lazy">

        <a href="/guide/networking">Internal: Cloud Networking Guide</a>
        <a href="/guide/storage">Internal: Object Storage Patterns</a>
        <a href="https://aws.amazon.com/architecture" rel="noopener">External Reference: AWS Architecture</a>
      </body>
      </html>
    `;

    it('scores an expertly optimized page with high health score and zero critical issues', () => {
      const result = seoAuditService.auditHtml(
        fullOptimizedHtml,
        'https://cloudtech.example.com/guide/architecture',
        'cloud computing architecture'
      );

      expect(result.status).toBe('completed');
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.criticalCount).toBe(0);
      expect(result.passedCount).toBeGreaterThanOrEqual(15);

      // Verify Page Data extraction
      expect(result.pageData?.title).toContain('Professional Cloud Computing');
      expect(result.pageData?.h1Count).toBe(1);
      expect(result.pageData?.h2Count).toBe(2);
      expect(result.pageData?.h3Count).toBe(1);
      expect(result.pageData?.headingHierarchyValid).toBe(true);
      expect(result.pageData?.hasHttps).toBe(true);
      expect(result.pageData?.charset).toBe('UTF-8');
      expect(result.pageData?.language).toBe('en');
      expect(result.pageData?.hasStructuredData).toBe(true);
      expect(result.pageData?.structuredDataTypes).toContain('TechArticle');
      expect(result.pageData?.imagesWithAlt).toBe(2);
      expect(result.pageData?.imagesMissingAlt).toBe(0);
      expect(result.pageData?.imagesMissingDimensions).toBe(0);
      expect(result.pageData?.brokenLinksCount).toBe(0);
    });

    it('detects skipped heading hierarchy (H1 jumping straight to H3)', () => {
      const skippedHierarchyHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Proper Length Title for Hierarchy Test 2026</title></head>
        <body>
          <h1>Main Topic Title</h1>
          <h3>Skipped Straight to Sub-Sub Topic</h3>
        </body>
        </html>
      `;

      const result = seoAuditService.auditHtml(skippedHierarchyHtml, 'https://example.com/test');
      const hierarchyCheck = result.checks.find((c) => c.id === 'heading_hierarchy');

      expect(hierarchyCheck).toBeDefined();
      expect(hierarchyCheck?.status).toBe('warning');
      expect(hierarchyCheck?.severity).toBe('MEDIUM');
      expect(result.pageData?.headingHierarchyValid).toBe(false);
    });

    it('detects broken/placeholder links (href="#" and href="")', () => {
      const brokenLinksHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Page with Multiple Broken Placeholder Anchors</title></head>
        <body>
          <h1>Heading with Links</h1>
          <a href="#">Dead Link 1</a>
          <a href="">Empty Link 2</a>
          <a href="javascript:void(0)">JS Void Link 3</a>
          <a href="#">Dead Link 4</a>
        </body>
        </html>
      `;

      const result = seoAuditService.auditHtml(brokenLinksHtml, 'https://example.com/links');
      const brokenCheck = result.checks.find((c) => c.id === 'broken_links');

      expect(brokenCheck).toBeDefined();
      expect(brokenCheck?.status).toBe('warning');
      expect(brokenCheck?.severity).toBe('HIGH');
      expect(result.pageData?.brokenLinksCount).toBeGreaterThanOrEqual(4);
    });

    it('validates structured data JSON-LD and detects syntax errors', () => {
      const malformedJsonLdHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Page with Malformed Structured Data Tag</title>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Article"
            "missing_comma": true
          }
          </script>
        </head>
        <body>
          <h1>Headline</h1>
        </body>
        </html>
      `;

      const result = seoAuditService.auditHtml(malformedJsonLdHtml, 'https://example.com/schema-err');
      const schemaCheck = result.checks.find((c) => c.id === 'structured_data');

      expect(schemaCheck).toBeDefined();
      expect(schemaCheck?.status).toBe('critical');
      expect(schemaCheck?.severity).toBe('HIGH');
      expect(result.pageData?.structuredDataValid).toBe(false);
      expect(result.pageData?.structuredDataErrors?.length).toBeGreaterThan(0);
    });

    it('flags unindexed pages with robots meta "noindex"', () => {
      const noindexHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Staging Site Not for Public Indexing</title>
          <meta name="robots" content="noindex, nofollow">
        </head>
        <body>
          <h1>Staging Environment</h1>
        </body>
        </html>
      `;

      const result = seoAuditService.auditHtml(noindexHtml, 'https://example.com/staging');
      const robotsCheck = result.checks.find((c) => c.id === 'robots_meta');

      expect(robotsCheck).toBeDefined();
      expect(robotsCheck?.status).toBe('critical');
      expect(robotsCheck?.severity).toBe('CRITICAL');
      expect(result.pageData?.isIndexable).toBe(false);
      expect(result.pageData?.noindex).toBe(true);
      expect(result.pageData?.nofollow).toBe(true);
    });
  });

  describe('2. Deterministic Severity & Transparent Scoring System', () => {
    it('calculates score transparently using documented deduction rules', () => {
      const flawedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <!-- Missing Title Tag: -15 (CRITICAL) -->
          <!-- Missing Meta Description: -8 (HIGH) -->
          <!-- Insecure HTTP: -15 (CRITICAL) -->
        </head>
        <body>
          <!-- Missing H1: -15 (CRITICAL) -->
          <p>Thin content.</p>
        </body>
        </html>
      `;

      const result = seoAuditService.auditHtml(flawedHtml, 'http://insecure-site.org/page');

      expect(result.scoreBreakdown).toBeDefined();
      expect(result.scoreBreakdown?.baseScore).toBe(100);
      expect(result.scoreBreakdown?.totalDeductions).toBeGreaterThan(40);
      expect(result.score).toBeLessThanOrEqual(50);

      // Verify that every deduction corresponds to an explicit check failure
      result.scoreBreakdown?.deductions.forEach((d) => {
        expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).toContain(d.severity);
        expect(d.penalty).toBeGreaterThan(0);
        expect(d.reason.length).toBeGreaterThan(5);
      });
    });
  });

  describe('3. Robots.txt and XML Sitemap Parsers', () => {
    it('parses robots.txt directives and detects blocked paths', () => {
      const robotsContent = `
        # robots.txt file
        User-agent: *
        Disallow: /admin
        Disallow: /private/
        Allow: /admin/public
        
        Sitemap: https://example.com/sitemap.xml
        Sitemap: https://example.com/sitemap-news.xml
      `;

      // Path blocked by Disallow
      const resBlocked = robotsParserService.parseRobotsTxt(robotsContent, '/admin/settings', 'https://example.com/robots.txt');
      expect(resBlocked.exists).toBe(true);
      expect(resBlocked.allowed).toBe(false);
      expect(resBlocked.matchedRule).toBe('Disallow: /admin');
      expect(resBlocked.sitemaps).toHaveLength(2);

      // Path allowed by more specific Allow
      const resAllowed = robotsParserService.parseRobotsTxt(robotsContent, '/admin/public', 'https://example.com/robots.txt');
      expect(resAllowed.allowed).toBe(true);

      // Path unaffected
      const resPublic = robotsParserService.parseRobotsTxt(robotsContent, '/blog/article-1', 'https://example.com/robots.txt');
      expect(resPublic.allowed).toBe(true);
    });

    it('parses standard XML sitemaps and verifies target URL coverage', async () => {
      const sitemapXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url>
            <loc>https://example.com/home</loc>
          </url>
          <url>
            <loc>https://example.com/guide/technical-seo</loc>
          </url>
          <url>
            <loc>https://example.com/pricing</loc>
          </url>
        </urlset>
      `;

      const result = await sitemapParserService.parseXml(
        sitemapXml,
        'https://example.com/sitemap.xml',
        'https://example.com/guide/technical-seo/'
      );

      expect(result.exists).toBe(true);
      expect(result.totalUrls).toBe(3);
      expect(result.containsTargetUrl).toBe(true);
      expect(result.sampleUrls).toContain('https://example.com/pricing');
    });
  });

  describe('4. Multi-Page Domain Crawler Capabilities', () => {
    it('normalizes crawl URLs by removing hashes, tracking query params, and trailing slashes', () => {
      const normalized = multiPageCrawlerService.normalizeUrl(
        'https://example.com/blog/seo-guide/?utm_source=twitter&utm_medium=social#section-1'
      );
      expect(normalized).toBe('https://example.com/blog/seo-guide');
    });

    it('strictly restricts crawling to the initial domain', async () => {
      const domainCrawlSummary = await multiPageCrawlerService.crawlDomain({
        startUrl: 'https://example.com/start',
        maxPages: 3,
        maxDepth: 1,
      });

      expect(domainCrawlSummary.maxDepth).toBe(1);
      expect(domainCrawlSummary.totalPages).toBeLessThanOrEqual(3);
      // All crawled URLs must belong to example.com
      domainCrawlSummary.pages.forEach((p) => {
        const u = new URL(p.url);
        expect(u.hostname).toBe('example.com');
      });
    });
  });

  describe('5. Multi-Tenant Database Isolation & No Demo Data', () => {
    it('stores audits in repository and never returns hardcoded demo records', async () => {
      const user1 = `test_user_p7_1_${Date.now()}`;
      const user2 = `test_user_p7_2_${Date.now()}`;

      // Clean repository has zero audits initially
      const userAudits = await auditRepository.getByUserIdAsync(user1, 10);
      expect(userAudits).toEqual([]);

      const sampleAudit: AuditResult = {
        id: `audit-user-p7-${Date.now()}`,
        url: 'https://testsite.com/phase7',
        targetKeyword: 'phase 7 test',
        timestamp: new Date().toISOString(),
        score: 85,
        status: 'completed',
        passedCount: 15,
        warningCount: 2,
        criticalCount: 0,
        checks: [],
        userId: user1,
      };

      await auditRepository.saveAsync(sampleAudit);

      // User 1 sees their audit
      const retrievedUser1 = await auditRepository.getByUserIdAsync(user1, 10);
      expect(retrievedUser1).toHaveLength(1);
      expect(retrievedUser1[0].id).toBe(sampleAudit.id);

      // User 2 cannot see User 1's audit (strict isolation)
      const retrievedUser2 = await auditRepository.getByUserIdAsync(user2, 10);
      expect(retrievedUser2).toHaveLength(0);

      // findByIdAsync verifies ownership
      const forbiddenFetch = await auditRepository.findByIdAsync(sampleAudit.id, user2);
      expect(forbiddenFetch).toBeNull();

      const authorizedFetch = await auditRepository.findByIdAsync(sampleAudit.id, user1);
      expect(authorizedFetch).toBeDefined();
      expect(authorizedFetch?.id).toBe(sampleAudit.id);
    });
  });
});
