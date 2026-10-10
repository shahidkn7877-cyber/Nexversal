import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { APP_DESCRIPTION, APP_NAME } from '@/lib/constants';

describe('PHASE 11 & PHASE 12 — Controlled Premium UI/UX & Homepage SEO Fixes', () => {
  const pagePath = path.resolve(process.cwd(), 'src/app/page.tsx');
  const pageContent = fs.readFileSync(pagePath, 'utf8');

  const layoutPath = path.resolve(process.cwd(), 'src/app/layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');

  describe('1. Homepage SEO Title (Target: 50–60 characters)', () => {
    it('provides an optimized title between 50 and 60 characters on the homepage', () => {
      // Extract title string from page.tsx metadata
      const titleMatch = pageContent.match(/title:\s*['"`](.*?)['"`]/);
      expect(titleMatch).toBeTruthy();
      const title = titleMatch![1];
      
      expect(title.length).toBeGreaterThanOrEqual(50);
      expect(title.length).toBeLessThanOrEqual(60);
    });

    it('places primary product description first and naturally includes the Nexversal brand', () => {
      const titleMatch = pageContent.match(/title:\s*['"`](.*?)['"`]/);
      expect(titleMatch).toBeTruthy();
      const title = titleMatch![1];

      expect(title).toMatch(/^Professional SEO Audit/i);
      expect(title).toContain('Nexversal');
    });

    it('has layout default title matching optimal range (50-60 chars)', () => {
      const layoutTitleMatch = layoutContent.match(/default:\s*`([^`]+)`/);
      expect(layoutTitleMatch).toBeTruthy();
      const rawLayoutTitle = layoutTitleMatch![1].replace('${APP_NAME}', APP_NAME);
      
      expect(rawLayoutTitle.length).toBeGreaterThanOrEqual(50);
      expect(rawLayoutTitle.length).toBeLessThanOrEqual(60);
      expect(rawLayoutTitle).toContain('Nexversal');
    });
  });

  describe('2. Homepage Meta Description (Target: 140–160 characters)', () => {
    it('provides a descriptive meta description between 140 and 160 characters', () => {
      expect(APP_DESCRIPTION.length).toBeGreaterThanOrEqual(140);
      expect(APP_DESCRIPTION.length).toBeLessThanOrEqual(160);
    });

    it('accurately summarizes actual capabilities without fake claims', () => {
      expect(APP_DESCRIPTION).toContain('Audit web pages');
      expect(APP_DESCRIPTION).toContain('headings and readability');
      expect(APP_DESCRIPTION).toContain('research search keywords');
      expect(APP_DESCRIPTION).toContain('export SEO reports');
      expect(APP_DESCRIPTION).toContain('Nexversal');

      // Verify no fake promises
      expect(APP_DESCRIPTION).not.toMatch(/100% guaranteed/i);
      expect(APP_DESCRIPTION).not.toMatch(/10x traffic/i);
    });

    it('uses APP_DESCRIPTION in page.tsx metadata', () => {
      expect(pageContent).toContain('description: APP_DESCRIPTION');
    });
  });

  describe('3. Canonical & Social Graph Metadata Integrity', () => {
    it('includes canonical alternates and openGraph metadata in page.tsx', () => {
      expect(pageContent).toContain("canonical: '/'");
      expect(pageContent).toContain('openGraph:');
      expect(pageContent).toContain('twitter:');
      expect(pageContent).toContain("card: 'summary_large_image'");
    });
  });

  describe('4. Semantic Heading Hierarchy in Homepage JSX', () => {
    it('has exactly one primary H1 header describing Nexversal', () => {
      const headerPath = path.resolve(process.cwd(), 'src/components/dashboard/DashboardHeader.tsx');
      const headerContent = fs.readFileSync(headerPath, 'utf8');

      // Check DashboardHeader renders H1 with Nexversal
      expect(headerContent).toContain('<h1');
      expect(headerContent).toContain('Nexversal — SEO & Content Optimization Platform');

      // Ensure page.tsx uses DashboardHeader once
      const headerMatches = pageContent.match(/<DashboardHeader/g);
      expect(headerMatches?.length).toBe(1);

      // Ensure no other raw <h1 tags in page.tsx
      const otherH1Matches = pageContent.match(/<h1/g);
      expect(otherH1Matches).toBeNull();
    });

    it('has at least 4 semantic H2 section headings in page.tsx', () => {
      const h2Matches = pageContent.match(/<h2[^>]*>(.*?)<\/h2>/gs) || [];
      expect(h2Matches.length).toBeGreaterThanOrEqual(4);

      // Verify each H2 has clear topical descriptions
      const h2Text = h2Matches.join(' ');
      expect(h2Text).toContain('Workspace Overview');
      expect(h2Text).toContain('Technical SEO Audit Health');
      expect(h2Text).toContain('Integrated SEO and Content Optimization Tools');
      expect(h2Text).toContain('Platform Capabilities and Verification Standards');
      expect(h2Text).toContain('Workspace Content Documents');
    });

    it('maintains strict sequential hierarchy: H1 -> H2 -> H3 without skipping levels', () => {
      // Find all heading tags in pageContent in order
      const headingRegex = /<(h[1-6])[^>]*>/gi;
      const headings: number[] = [];
      let match;
      
      // First is DashboardHeader which renders H1
      headings.push(1);

      while ((match = headingRegex.exec(pageContent)) !== null) {
        headings.push(parseInt(match[1].substring(1), 10));
      }

      expect(headings[0]).toBe(1); // Starts with H1
      
      // Ensure no skipped heading levels (curr <= prev + 1)
      let hierarchyValid = true;
      let issue = '';

      for (let i = 1; i < headings.length; i++) {
        const prev = headings[i - 1];
        const curr = headings[i];
        if (curr > prev + 1) {
          hierarchyValid = false;
          issue = `Jumped from <H${prev}> to <H${curr}> at index ${i}`;
          break;
        }
      }

      expect(hierarchyValid).toBe(true);
      expect(issue).toBe('');
    });
  });

  describe('5. Verified Capabilities & Honest Content Integrity', () => {
    it('renders all four verified tool modules and verification standards on the homepage', () => {
      // 4 Core Tools Present
      expect(pageContent).toContain('Content SEO Analyzer');
      expect(pageContent).toContain('Live SEO URL Audit');
      expect(pageContent).toContain('Keyword Research');
      expect(pageContent).toContain('Audit Reports');

      // Links to working routes
      expect(pageContent).toContain('href="/analyzer"');
      expect(pageContent).toContain('href="/crawler"');
      expect(pageContent).toContain('href="/keywords"');
      expect(pageContent).toContain('href="/reports"');

      // Verified capabilities and security standards
      expect(pageContent).toContain('18-Factor Technical Audit Engine');
      expect(pageContent).toContain('15-Rule On-Page Content Heuristics');
      expect(pageContent).toContain('SSRF-Protected Security Architecture');

      // No fake testimonials or false claims
      expect(pageContent).not.toContain('Testimonials');
      expect(pageContent).not.toContain('Trusted by 50,000+');
    });
  });

  describe('6. SeoAuditService Evaluation on Rendered Production HTML', () => {
    it('passes all heading and metadata checks when evaluated by SeoAuditService', async () => {
      const { seoAuditService } = await import('@/services/audit.service');
      const indexPath = path.resolve(process.cwd(), '.next/server/app/index.html');
      if (fs.existsSync(indexPath)) {
        const indexHtml = fs.readFileSync(indexPath, 'utf8');
        const auditResult = seoAuditService.auditHtml(
          indexHtml,
          'https://nexversal.bond',
          'seo audit'
        );

        const h1Check = auditResult.checks.find((c: any) => c.id === 'h1_heading');
        expect(h1Check?.status).toBe('passed');

        const hierarchyCheck = auditResult.checks.find((c: any) => c.id === 'heading_hierarchy');
        expect(hierarchyCheck?.status).toBe('passed');

        const h2Check = auditResult.checks.find((c: any) => c.id === 'h2_headings');
        expect(h2Check?.status).toBe('passed');

        const titleCheck = auditResult.checks.find((c: any) => c.id === 'title_tag');
        expect(titleCheck?.status).toBe('passed');

        const metaDescCheck = auditResult.checks.find((c: any) => c.id === 'meta_description');
        expect(metaDescCheck?.status).toBe('passed');
      }
    });
  });
});


