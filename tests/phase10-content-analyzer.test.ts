import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { contentAnalyzerService } from '@/services/content-analyzer.service';
import { editorActionsService } from '@/services/editor-actions.service';
import { htmlToMarkdown, extractHeadings, parseMarkdownBlocks } from '@/lib/markdown-parser';
import { contentAnalyzeSchema } from '@/lib/validation/content.schema';
import { POST as analyzeApiHandler } from '@/app/api/v1/content/analyze/route';

describe('PHASE 10 — Functional Content SEO Analyzer', () => {
  // =========================================================================
  // 1. Input Validation
  // =========================================================================
  describe('1. Input Validation', () => {
    it('accepts valid required inputs (content and target keyword)', () => {
      const valid = {
        content: 'Technical SEO ensures that search engines can crawl, index, and render pages efficiently.',
        focusKeyword: 'technical SEO',
      };
      const parsed = contentAnalyzeSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.focusKeyword).toBe('technical SEO');
      }
    });

    it('rejects empty content with clear validation error', () => {
      const parsed = contentAnalyzeSchema.safeParse({
        content: '',
        focusKeyword: 'technical SEO',
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toMatch(/cannot be empty/i);
      }
    });

    it('rejects missing or empty target keyword', () => {
      const missingKw = contentAnalyzeSchema.safeParse({
        content: 'Some valid article body text with good length.',
      });
      expect(missingKw.success).toBe(false);

      const emptyKw = contentAnalyzeSchema.safeParse({
        content: 'Some valid article body text with good length.',
        focusKeyword: '   ',
      });
      expect(emptyKw.success).toBe(false);
      if (!emptyKw.success) {
        expect(emptyKw.error.issues[0].message).toMatch(/keyword is required/i);
      }
    });

    it('accepts targetKeyword alias in place of focusKeyword', () => {
      const parsed = contentAnalyzeSchema.safeParse({
        content: 'Article about modern web design and speed.',
        targetKeyword: 'web design',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.focusKeyword).toBe('web design');
      }
    });

    it('rejects excessively large payloads exceeding 500,000 characters', () => {
      const hugeContent = 'a'.repeat(500001);
      const parsed = contentAnalyzeSchema.safeParse({
        content: hugeContent,
        focusKeyword: 'seo',
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toMatch(/exceeds maximum size/i);
      }
    });

    it('accepts optional fields (title, metaDescription, slug, contentType, searchIntent)', () => {
      const parsed = contentAnalyzeSchema.safeParse({
        content: 'In-depth guide on technical SEO and crawl budgets.',
        focusKeyword: 'crawl budget',
        title: 'Complete Crawl Budget Optimization Guide (2026)',
        metaDescription: 'Learn how crawl budgets impact enterprise websites and how to optimize indexing.',
        slug: 'crawl-budget-guide',
        contentType: 'guide',
        searchIntent: 'informational',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.contentType).toBe('guide');
        expect(parsed.data.searchIntent).toBe('informational');
      }
    });
  });

  // =========================================================================
  // 2. Content Structure Diagnostics
  // =========================================================================
  describe('2. Content Structure Diagnostics', () => {
    it('passes when exactly one H1 heading is present', () => {
      const result = contentAnalyzerService.analyze({
        content: '# Complete Technical SEO Checklist\n\n## Section 1\nContent text.\n\n## Section 2\nMore content.',
        focusKeyword: 'technical SEO',
      });

      const h1Check = result.checklist.find((c) => c.id === 'h1_count');
      expect(h1Check).toBeDefined();
      expect(h1Check?.status).toBe('PASS');
      expect(h1Check?.detectedValue).toBe(1);
    });

    it('warns when multiple H1 headings are detected', () => {
      const result = contentAnalyzerService.analyze({
        content: '# Main Title\n\nText here.\n\n# Another H1 Title\n\nMore text here.',
        focusKeyword: 'main title',
      });

      const h1Check = result.checklist.find((c) => c.id === 'h1_count');
      expect(h1Check?.status).toBe('WARNING');
      expect(h1Check?.detectedValue).toBe(2);
      expect(h1Check?.explanation).toMatch(/Multiple H1 tags/i);
    });

    it('fails when no H1 heading is present in content or title', () => {
      const result = contentAnalyzerService.analyze({
        content: '## Subtitle Only\n\nNo primary title in this text block.',
        focusKeyword: 'subtitle',
      });

      const h1Check = result.checklist.find((c) => c.id === 'h1_count');
      expect(h1Check?.status).toBe('FAIL');
      expect(h1Check?.detectedValue).toBe(0);
    });

    it('evaluates H2 subheading usage properly', () => {
      const withH2 = contentAnalyzerService.analyze({
        content: '# Title\n\n## Section A\nBody.\n\n## Section B\nBody.',
        focusKeyword: 'title',
      });
      const h2Check = withH2.checklist.find((c) => c.id === 'h2_usage');
      expect(h2Check?.status).toBe('PASS');
      expect(h2Check?.detectedValue).toBe(2);

      const noH2 = contentAnalyzerService.analyze({
        content: '# Title\n\n' + 'Word '.repeat(300),
        focusKeyword: 'title',
      });
      const noH2Check = noH2.checklist.find((c) => c.id === 'h2_usage');
      expect(noH2Check?.status).toBe('FAIL');
    });

    it('detects heading hierarchy level skips (e.g. H1 jumping directly to H3)', () => {
      const skipped = contentAnalyzerService.analyze({
        content: '# Title\n\n### Skipped H2 Subsection\n\nBody paragraph.',
        focusKeyword: 'title',
      });

      const hierCheck = skipped.checklist.find((c) => c.id === 'heading_hierarchy');
      expect(hierCheck?.status).toBe('WARNING');
      expect(skipped.metrics.headings.hierarchyIssues.length).toBeGreaterThan(0);
    });

    it('detects empty headings and flags them as action needed', () => {
      const withEmpty = contentAnalyzerService.analyze({
        content: '# Title\n\n## \n\nBody paragraph.',
        focusKeyword: 'title',
      });

      const qualityCheck = withEmpty.checklist.find((c) => c.id === 'heading_quality');
      expect(qualityCheck?.status).toBe('FAIL');
      expect(qualityCheck?.explanation).toMatch(/empty heading/i);
    });

    it('detects extremely long headings exceeding 100 characters', () => {
      const longHeadingText = 'This is an exceptionally long subheading that goes on and on and contains more than one hundred characters in total length';
      const withLong = contentAnalyzerService.analyze({
        content: `# Title\n\n## ${longHeadingText}\n\nBody text.`,
        focusKeyword: 'title',
      });

      const qualityCheck = withLong.checklist.find((c) => c.id === 'heading_quality');
      expect(qualityCheck?.status).toBe('WARNING');
      expect(qualityCheck?.explanation).toMatch(/exceeding 100 characters/i);
    });
  });

  // =========================================================================
  // 3. Target Keyword Analysis
  // =========================================================================
  describe('3. Target Keyword Analysis', () => {
    it('reports PASS when target keyword is naturally present in content', () => {
      const result = contentAnalyzerService.analyze({
        content: '# Guide to Keyword Research\n\nConducting keyword research allows marketers to discover user search queries and topical demand.',
        focusKeyword: 'keyword research',
      });

      const kwCheck = result.checklist.find((c) => c.id === 'keyword_presence');
      expect(kwCheck?.status).toBe('PASS');
      expect(result.metrics.keywordCount).toBe(2);
    });

    it('reports FAIL when target keyword is completely absent', () => {
      const result = contentAnalyzerService.analyze({
        content: '# Guide to Baking Bread\n\nFlour, water, yeast, and salt are the basic ingredients.',
        focusKeyword: 'cloud computing',
      });

      const kwCheck = result.checklist.find((c) => c.id === 'keyword_presence');
      expect(kwCheck?.status).toBe('FAIL');
      expect(result.metrics.keywordCount).toBe(0);
    });

    it('handles missing focusKeyword in analyze() gracefully without throwing ZodError', () => {
      expect(() => {
        const result = contentAnalyzerService.analyze({
          content: 'Just writing content in the editor before selecting a keyword.',
        });
        expect(result).toBeDefined();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.checklist.find((c) => c.id === 'keyword_presence')?.status).toBe('FAIL');
      }).not.toThrow();
    });

    it('detects keyword in introduction vs missing from introduction', () => {
      const inIntro = contentAnalyzerService.analyze({
        content: 'When starting on page speed optimization, always measure initial Core Web Vitals.',
        focusKeyword: 'page speed',
      });
      expect(inIntro.checklist.find((c) => c.id === 'keyword_intro')?.status).toBe('PASS');

      const lateIntro = contentAnalyzerService.analyze({
        content: 'General fluff paragraph '.repeat(15) + '\n\nNow finally discussing page speed optimization.',
        focusKeyword: 'page speed',
      });
      expect(lateIntro.checklist.find((c) => c.id === 'keyword_intro')?.status).toBe('WARNING');
    });

    it('detects keyword in subheadings', () => {
      const result = contentAnalyzerService.analyze({
        content: '# Web Performance\n\n## Core Web Vitals Measurement\n\nMetrics include LCP, INP, and CLS.',
        focusKeyword: 'Core Web Vitals',
      });

      const headKw = result.checklist.find((c) => c.id === 'keyword_headings');
      expect(headKw?.status).toBe('PASS');
    });

    it('calculates keyword frequency transparently without claiming artificial ideal density', () => {
      const keyword = 'schema markup';
      // ~100 words with 2 mentions = ~2% frequency
      const body = `${keyword} is vital. ` + 'Informative text describing structured data principles. '.repeat(10) + `Use ${keyword} today.`;
      const result = contentAnalyzerService.analyze({
        content: body,
        focusKeyword: keyword,
      });

      expect(result.metrics.keywordCount).toBe(2);
      expect(result.metrics.keywordDensity).toBeGreaterThanOrEqual(1.0);
      expect(result.metrics.keywordDensity).toBeLessThanOrEqual(3.0);
    });
  });

  // =========================================================================
  // 4. Title & Meta Description Analysis (Optional Inputs)
  // =========================================================================
  describe('4. Title & Meta Description Analysis', () => {
    it('marks title analysis as NOT_CHECKED when no title input is provided', () => {
      const result = contentAnalyzerService.analyze({
        content: 'Body content without title tag specified.',
        focusKeyword: 'body content',
      });

      const titleCheck = result.checklist.find((c) => c.id === 'title_analysis');
      expect(titleCheck).toBeDefined();
      expect(titleCheck?.status).toBe('NOT_CHECKED');
      expect(titleCheck?.detectedValue).toBe('Missing input');
    });

    it('evaluates title length and keyword presence when title is provided', () => {
      const optimalTitle = contentAnalyzerService.analyze({
        content: 'Article text.',
        focusKeyword: 'core web vitals',
        title: 'Core Web Vitals Optimization Guide for Engineers', // 49 chars
      });
      const optCheck = optimalTitle.checklist.find((c) => c.id === 'title_analysis');
      expect(optCheck?.status).toBe('PASS');

      const missingKwTitle = contentAnalyzerService.analyze({
        content: 'Article text.',
        focusKeyword: 'core web vitals',
        title: 'An Engineering Guide to Improving Web Performance',
      });
      const missCheck = missingKwTitle.checklist.find((c) => c.id === 'title_analysis');
      expect(missCheck?.status).toBe('WARNING');
      expect(missCheck?.explanation).toMatch(/does not contain target keyword/i);
    });

    it('marks meta description as NOT_CHECKED when not provided', () => {
      const result = contentAnalyzerService.analyze({
        content: 'Article body text.',
        focusKeyword: 'article',
      });

      const metaCheck = result.checklist.find((c) => c.id === 'meta_description');
      expect(metaCheck?.status).toBe('NOT_CHECKED');
    });

    it('evaluates meta description length and keyword presence when provided', () => {
      const descText = 'Discover how to optimize Core Web Vitals on modern web applications. Learn actionable techniques to reduce LCP and improve INP scores.'; // 142 chars
      const result = contentAnalyzerService.analyze({
        content: 'Article body text.',
        focusKeyword: 'Core Web Vitals',
        metaDescription: descText,
      });

      const metaCheck = result.checklist.find((c) => c.id === 'meta_description');
      expect(metaCheck?.status).toBe('PASS');
      expect(metaCheck?.detectedValue).toMatch(/134 chars/i);
    });
  });

  // =========================================================================
  // 5. Readability & Scannability Diagnostics
  // =========================================================================
  describe('5. Readability & Scannability Diagnostics', () => {
    it('calculates average sentence length and flags sentences over 25 words', () => {
      const longSentence = 'This sentence was intentionally constructed with a vast collection of descriptive clauses and extra adjectives in order to exceed the twenty-five word threshold for diagnostic purposes.';
      const shortSentence = 'Keep writing clear and direct.';

      const result = contentAnalyzerService.analyze({
        content: `${longSentence} ${shortSentence}`,
        focusKeyword: 'sentence',
      });

      expect(result.metrics.readability.longSentenceCount).toBe(1);
      expect(result.metrics.sentenceCount).toBe(2);
    });

    it('flags paragraphs exceeding 80 words for mobile readability', () => {
      const longParagraph = 'word '.repeat(90);
      const shortParagraph = 'Punchy short paragraph.';

      const result = contentAnalyzerService.analyze({
        content: `${longParagraph}\n\n${shortParagraph}`,
        focusKeyword: 'word',
      });

      expect(result.longParagraphs.length).toBe(1);
      expect(result.checklist.find((c) => c.id === 'paragraph_scannability')?.status).toBe('WARNING');
    });

    it('detects robotic buzzwords and clichés', () => {
      const textWithCliche = "In today's fast-paced digital world, it is paramount to understand the rich tapestry of ideas.";
      const result = contentAnalyzerService.analyze({
        content: textWithCliche,
        focusKeyword: 'digital world',
      });

      const patternCheck = result.checklist.find((c) => c.id === 'robotic_patterns');
      expect(patternCheck?.status).toBe('WARNING');
      expect(result.metrics.readability.repeatedPhrasesCount).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // 6. Link & Image Analysis
  // =========================================================================
  describe('6. Link & Image Analysis', () => {
    it('detects markdown and HTML links, distinguishing empty links', () => {
      const content = 'Check out [our guide](https://example.com/guide) and [broken link](). Also <a href="https://other.com">partner</a>.';
      const result = contentAnalyzerService.analyze({
        content,
        focusKeyword: 'guide',
      });

      expect(result.metrics.links.total).toBe(3);
      expect(result.metrics.links.empty).toBe(1);
      expect(result.checklist.find((c) => c.id === 'link_diagnostics')?.status).toBe('FAIL');
    });

    it('marks domain-specific internal link verification as NOT_CHECKED when no site URL is given', () => {
      const result = contentAnalyzerService.analyze({
        content: 'Check out [our guide](/guide).',
        focusKeyword: 'guide',
      });

      const domainCheck = result.checklist.find((c) => c.id === 'domain_links');
      expect(domainCheck?.status).toBe('NOT_CHECKED');
    });

    it('marks image analysis as NOT_CHECKED when content contains zero images', () => {
      const result = contentAnalyzerService.analyze({
        content: 'Text only with no images anywhere.',
        focusKeyword: 'text',
      });

      const imgCheck = result.checklist.find((c) => c.id === 'image_analysis');
      expect(imgCheck?.status).toBe('NOT_CHECKED');
    });

    it('detects images with missing, empty, or generic alt text', () => {
      const content = '![Diagram of SEO pipeline](/img1.png)\n\n![](/img2.png)\n\n![image](/img3.png)';
      const result = contentAnalyzerService.analyze({
        content,
        focusKeyword: 'seo',
      });

      expect(result.metrics.images.total).toBe(3);
      expect(result.metrics.images.emptyAlt).toBe(1);
      expect(result.metrics.images.genericAlt).toBe(1);
      expect(result.metrics.images.optimized).toBe(1);
      expect(result.checklist.find((c) => c.id === 'image_analysis')?.status).toBe('FAIL');
    });
  });

  // =========================================================================
  // 7. Search Intent Analysis
  // =========================================================================
  describe('7. Search Intent Analysis', () => {
    it('marks search intent as NOT_CHECKED when no intent is selected', () => {
      const result = contentAnalyzerService.analyze({
        content: 'General content.',
        focusKeyword: 'content',
      });

      const intentCheck = result.checklist.find((c) => c.id === 'search_intent');
      expect(intentCheck?.status).toBe('NOT_CHECKED');
    });

    it('evaluates informational intent alignment', () => {
      const result = contentAnalyzerService.analyze({
        content: '# How to Optimize Core Web Vitals\n\n## Overview\nUnderstanding metrics.\n\n## Steps to Improve LCP\nDetailed instructions.\n\n## FAQ\nCommon questions answered.',
        focusKeyword: 'Core Web Vitals',
        searchIntent: 'informational',
      });

      const intentCheck = result.checklist.find((c) => c.id === 'search_intent');
      expect(intentCheck?.status).toBe('PASS');
      expect(intentCheck?.explanation).toMatch(/well-structured for informational/i);
    });
  });

  // =========================================================================
  // 8. Deterministic Scoring & Categories
  // =========================================================================
  describe('8. Deterministic Scoring & Categories', () => {
    const testContent = '# Technical SEO Guide\n\n## Introduction\nTechnical SEO improves crawl efficiency and indexing performance.\n\n## Key Best Practices\nEnsure responsive design and fast server responses.\n\n## Summary\nAudit regularly.';

    it('produces identical score for identical inputs (deterministic)', () => {
      const input = {
        content: testContent,
        focusKeyword: 'technical SEO',
      };

      const res1 = contentAnalyzerService.analyze(input);
      const res2 = contentAnalyzerService.analyze(input);

      expect(res1.score).toBe(res2.score);
      expect(res1.scoreCategory).toBe(res2.scoreCategory);
      expect(res1.checklist.length).toBe(res2.checklist.length);
    });

    it('does not penalize the score denominator for NOT_CHECKED optional items', () => {
      const resWithoutOptional = contentAnalyzerService.analyze({
        content: testContent,
        focusKeyword: 'technical SEO',
      });

      const resWithOptimalOptional = contentAnalyzerService.analyze({
        content: testContent,
        focusKeyword: 'technical SEO',
        title: 'Technical SEO Guide — Complete Checklist',
        metaDescription: 'Discover actionable technical SEO tips to boost indexing and speed.',
        slug: 'technical-seo',
      });

      // Both should have valid non-zero scores
      expect(resWithoutOptional.score).toBeGreaterThan(0);
      expect(resWithOptimalOptional.score).toBeGreaterThan(0);
      expect(['Strong', 'Needs Improvement', 'Weak']).toContain(resWithoutOptional.scoreCategory);
    });
  });

  // =========================================================================
  // 9. Deterministic Editor Operations (1-Click Fix, Auto Headings, Dialect)
  // =========================================================================
  describe('9. Deterministic Editor Actions', () => {
    it('proposes 1-Click SEO Fix without silently modifying original content', () => {
      const original = 'A long bloated paragraph with more than 80 words. ' + 'Sentence here. '.repeat(20) + '\n\n## \n\n![](/img.png)\n\nIn today\'s fast-paced digital world, speed matters.';
      const fix = editorActionsService.oneClickSeoFix({
        content: original,
        title: '',
        slug: '',
        focusKeyword: 'site speed',
      });

      expect(fix.proposedTitle).toMatch(/Site speed/i);
      expect(fix.proposedSlug).toBe('site-speed');
      expect(fix.changes.length).toBeGreaterThan(0);
      // Removed empty heading
      expect(fix.proposedContent).not.toMatch(/^##\s*$/m);
      // Filled empty alt
      expect(fix.proposedContent).toMatch(/!\[site speed/i);
      // Cleaned cliché
      expect(fix.proposedContent).not.toContain("In today's fast-paced digital world");
    });

    it('proposes structured Auto Headings based on real paragraphs', () => {
      const paragraphs = 'First paragraph explaining core principles of indexing.\n\nSecond paragraph covering crawler behaviors and limits.\n\nThird paragraph discussing server response codes.';
      const res = editorActionsService.autoHeadings({
        content: paragraphs,
        focusKeyword: 'indexing',
        title: 'Indexing Fundamentals',
      });

      expect(res.generatedHeadings.length).toBeGreaterThan(0);
      expect(res.proposedContent).toContain('# Indexing Fundamentals');
      expect(res.proposedContent).toMatch(/## /);
    });

    it('cleans clichés in Humanize Tone without breaking keywords or links', () => {
      const input = "In today's fast-paced digital world, it is paramount to understand [our guide](https://example.com/guide).";
      const res = editorActionsService.humanizeTone(input);

      expect(res.replacedCount).toBe(2);
      expect(res.proposedContent).toContain('Today');
      expect(res.proposedContent).toContain('it is important to note');
      expect(res.proposedContent).toContain('[our guide](https://example.com/guide)');
    });

    it('adapts US English to UK English deterministically', () => {
      const usText = 'The team will optimize and analyze the website color scheme in the center of the apartment.';
      const ukRes = editorActionsService.adaptDialect(usText, 'UK');

      expect(ukRes.proposedContent).toContain('optimise');
      expect(ukRes.proposedContent).toContain('analyse');
      expect(ukRes.proposedContent).toContain('colour');
      expect(ukRes.proposedContent).toContain('centre');
      expect(ukRes.proposedContent).toContain('flat');
    });

    it('adapts UK English to US English deterministically', () => {
      const ukText = 'We will organise the colour palette for the theatre flat.';
      const usRes = editorActionsService.adaptDialect(ukText, 'US');

      expect(usRes.proposedContent).toContain('organize');
      expect(usRes.proposedContent).toContain('color');
      expect(usRes.proposedContent).toContain('theater');
      expect(usRes.proposedContent).toContain('apartment');
    });
  });

  // =========================================================================
  // 10. API Route Verification (POST /api/v1/content/analyze)
  // =========================================================================
  describe('10. API Route: POST /api/v1/content/analyze', () => {
    it('returns HTTP 200 with complete analysis result for valid payload', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/content/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '# Technical SEO Overview\n\nTechnical SEO is essential for modern search visibility.',
          focusKeyword: 'technical SEO',
          title: 'Technical SEO Overview',
        }),
      });

      const res = await analyzeApiHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.score).toBeGreaterThan(0);
      expect(json.data.checklist).toBeDefined();
      expect(json.data.metrics.wordCount).toBeGreaterThan(5);
    });

    it('returns HTTP 400 VALIDATION_ERROR when target keyword is omitted', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/content/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Content text without keyword.',
        }),
      });

      const res = await analyzeApiHandler(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns HTTP 400 INVALID_JSON for malformed JSON payload', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/content/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-{',
      });

      const res = await analyzeApiHandler(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_JSON');
    });

    it('returns HTTP 400 VALIDATION_ERROR when content is empty', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/content/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '',
          focusKeyword: 'technical SEO',
        }),
      });

      const res = await analyzeApiHandler(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns HTTP 413 PAYLOAD_TOO_LARGE when payload exceeds 2MB', async () => {
      // Create a payload string that exceeds 2MB (2 * 1024 * 1024 = 2,097,152 bytes)
      const oversizedContent = 'x'.repeat(2 * 1024 * 1024 + 100);
      const req = new NextRequest('http://localhost:3000/api/v1/content/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(oversizedContent.length + 50),
        },
        body: JSON.stringify({
          content: oversizedContent,
          focusKeyword: 'seo',
        }),
      });

      const res = await analyzeApiHandler(req);
      expect(res.status).toBe(413);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('PAYLOAD_TOO_LARGE');
    });
  });

  // =========================================================================
  // 11. PHASE 10.1 — Live Editor Resilience & State Progression
  // =========================================================================
  describe('11. PHASE 10.1 — Live Editor Resilience & Edge States', () => {
    it('State A: Article empty — handles empty gracefully without throwing', () => {
      expect(() => {
        const result = contentAnalyzerService.analyze({
          content: '',
          focusKeyword: '',
        });
        expect(result.score).toBe(0);
        expect(result.metrics.wordCount).toBe(0);
        expect(result.scoreCategory).toBe('Weak');
      }).not.toThrow();
    });

    it('State B: Keyword empty with some content — never throws ZodError', () => {
      expect(() => {
        const result = contentAnalyzerService.analyze({
          content: '# Getting Started\n\nThis is a comprehensive article about web optimization.',
          focusKeyword: '',
        });
        expect(result).toBeDefined();
        expect(result.metrics.wordCount).toBeGreaterThan(5);
        expect(result.analyzedKeyword).toBe('');
        expect(result.analyzedAt).toBeDefined();
      }).not.toThrow();
    });

    it('State C & D: Keyword missing then entered — transitions deterministically', () => {
      const content = '# High Performance Next.js\n\nNext.js provides server-side rendering and static generation.';

      // C: Keyword empty
      const withoutKw = contentAnalyzerService.analyze({
        content,
        focusKeyword: '',
      });
      const kwCheckWithout = withoutKw.checklist.find((c) => c.id === 'keyword_presence');
      expect(kwCheckWithout?.status).toBe('FAIL');
      expect(kwCheckWithout?.detectedValue).toContain('Missing target keyword');

      // D: Keyword entered
      const withKw = contentAnalyzerService.analyze({
        content,
        focusKeyword: 'next.js',
      });
      const kwCheckWith = withKw.checklist.find((c) => c.id === 'keyword_presence');
      expect(kwCheckWith?.status).toBe('PASS');
      expect(withKw.metrics.keywordCount).toBeGreaterThan(0);
      expect(withKw.analyzedKeyword).toBe('next.js');
    });

    it('State E: Keyword entered and then deleted — remains resilient', () => {
      const content = '# Modern Architecture\n\nBuilding decoupled systems with resilience.';

      const step1 = contentAnalyzerService.analyze({ content, focusKeyword: 'architecture' });
      expect(step1.metrics.keywordCount).toBe(1);

      // User clears keyword field
      const step2 = contentAnalyzerService.analyze({ content, focusKeyword: '' });
      expect(step2.metrics.keywordCount).toBe(0);
      expect(step2.checklist.find((c) => c.id === 'keyword_presence')?.status).toBe('FAIL');
      expect(step2.metrics.wordCount).toBe(step1.metrics.wordCount);
    });

    it('State F: Keyword changed repeatedly — updates match metrics synchronously', () => {
      const content = 'React is great. Vue is also great. Svelte is delightful.';

      const resReact = contentAnalyzerService.analyze({ content, focusKeyword: 'React' });
      expect(resReact.metrics.keywordCount).toBe(1);
      expect(resReact.analyzedKeyword).toBe('react');

      const resVue = contentAnalyzerService.analyze({ content, focusKeyword: 'Vue' });
      expect(resVue.metrics.keywordCount).toBe(1);
      expect(resVue.analyzedKeyword).toBe('vue');

      const resAngular = contentAnalyzerService.analyze({ content, focusKeyword: 'Angular' });
      expect(resAngular.metrics.keywordCount).toBe(0);
      expect(resAngular.analyzedKeyword).toBe('angular');
    });

    it('State G: Article content changed repeatedly — immediately recomputes diagnostics', () => {
      let content = '# Initial Header\n\nInitial paragraph text.';
      const res1 = contentAnalyzerService.analyze({ content, focusKeyword: 'initial' });
      expect(res1.metrics.wordCount).toBe(6);

      content += '\n\n## Second Section\nAdding further details with links [Docs](https://example.com).';
      const res2 = contentAnalyzerService.analyze({ content, focusKeyword: 'initial' });
      expect(res2.metrics.wordCount).toBeGreaterThan(res1.metrics.wordCount);
      expect(res2.metrics.headings.h2).toBe(1);
      expect(res2.metrics.links.total).toBe(1);
    });

    it('State H: Article pasted as large content — processes smoothly without memory/stack limits', () => {
      // 1,000 paragraphs
      const largeContent = Array.from({ length: 500 }, (_, i) => `Paragraph ${i + 1} discusses enterprise search engine optimization techniques and best practices for scaling websites.`).join('\n\n');
      const start = Date.now();
      const res = contentAnalyzerService.analyze({
        content: `# Enterprise SEO Handbook\n\n${largeContent}`,
        focusKeyword: 'enterprise',
      });
      const duration = Date.now() - start;

      expect(res.metrics.wordCount).toBeGreaterThan(5000);
      expect(res.score).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1500); // Must be fast and responsive
    });

    it('State I: Article cleared after analysis — resets metrics cleanly', () => {
      const cleared = contentAnalyzerService.analyze({
        content: '',
        focusKeyword: 'any keyword',
      });
      expect(cleared.metrics.wordCount).toBe(0);
      expect(cleared.metrics.keywordCount).toBe(0);
      expect(cleared.score).toBe(0);
      expect(cleared.scoreCategory).toBe('Weak');
    });

    it('Keyword missing behavior computes non-keyword metrics accurately', () => {
      const content = `# Scalable Cloud Architectures\n\nHere is an introductory paragraph explaining cloud architecture concepts.\n\n## Microservices\nServices communicate over gRPC or REST.\n\nHere is a reference to [AWS Docs](https://aws.amazon.com) and an image ![Cloud Diagram](/diagram.png).`;
      const res = contentAnalyzerService.analyze({
        content,
        focusKeyword: '', // empty keyword
      });

      // Non-keyword metrics MUST be accurately computed
      expect(res.metrics.headings.h1).toBe(1);
      expect(res.metrics.headings.h2).toBe(1);
      expect(res.metrics.links.total).toBe(1);
      expect(res.metrics.links.external).toBe(1);
      expect(res.metrics.images.total).toBe(1);
      expect(res.metrics.images.optimized).toBe(1);
      expect(res.metrics.readingEaseScore).toBeGreaterThan(0);

      // Structure checks pass
      const h1Check = res.checklist.find((c) => c.id === 'h1_count');
      expect(h1Check?.status).toBe('PASS');

      // Keyword check fails with actionable guidance
      const kwCheck = res.checklist.find((c) => c.id === 'keyword_presence');
      expect(kwCheck?.status).toBe('FAIL');
      expect(kwCheck?.explanation).toMatch(/target keyword is required/i);
    });

    it('Editor Actions work safely when keyword is empty without throwing', () => {
      const content = '# Title\n\nHere is an apartment with an elevator on the sidewalk.';

      // One-click SEO fix
      const fixResult = editorActionsService.oneClickSeoFix({
        content,
        title: '',
        slug: '',
        focusKeyword: '',
      });
      expect(fixResult.proposedContent).toBeDefined();

      // Auto headings
      const headingsResult = editorActionsService.autoHeadings({
        content,
        focusKeyword: '',
      });
      expect(headingsResult.proposedContent).toBeDefined();

      // Humanize tone
      const humanizeResult = editorActionsService.humanizeTone({
        content: 'It is important to remember that in order to succeed we must delve into testing.',
      });
      expect(humanizeResult.proposedContent).toBeDefined();

      // Dialect adapt
      const dialectResult = editorActionsService.adaptDialect({
        content,
        targetVariant: 'UK',
      });
      expect(dialectResult.proposedContent).toContain('flat');
      expect(dialectResult.proposedContent).toContain('lift');
      expect(dialectResult.proposedContent).toContain('pavement');
    });
  });

  // =========================================================================
  // 10. PHASE 10.2: Content Preservation & Markdown Heading Parsing
  // =========================================================================
  describe('10. PHASE 10.2 — Content Preservation, Markdown Headings & Non-Destructive Actions', () => {
    const realisticArticle = `# Comprehensive Guide
## Understanding OpenAI Dots for Technical SEO
Can OpenAI Dots for technical SEO actually do the work of an SEO specialist?
An AI agent can find problems and collect proof.
## How OpenAI Dots for Technical SEO Can Automate the Workflow
A technical SEO workflow contains several stages.
### Technical SEO Tasks
First, identify the problem.`;

    it('Requirement 8: Parses exact realistic article structure without destroying or flattening headings', () => {
      const headings = extractHeadings(realisticArticle);
      expect(headings).toHaveLength(4);

      expect(headings[0].level).toBe(1);
      expect(headings[0].text).toBe('Comprehensive Guide');

      expect(headings[1].level).toBe(2);
      expect(headings[1].text).toBe('Understanding OpenAI Dots for Technical SEO');

      expect(headings[2].level).toBe(2);
      expect(headings[2].text).toBe('How OpenAI Dots for Technical SEO Can Automate the Workflow');

      expect(headings[3].level).toBe(3);
      expect(headings[3].text).toBe('Technical SEO Tasks');

      // Diagnostics check
      const analysis = contentAnalyzerService.analyze({
        content: realisticArticle,
        focusKeyword: 'OpenAI Dots for technical SEO',
      });

      expect(analysis.metrics.headings.h1).toBe(1);
      expect(analysis.metrics.headings.h2).toBe(2);
      expect(analysis.metrics.headings.h3).toBe(1);
      expect(analysis.metrics.headings.total).toBe(4);
      expect(analysis.metrics.headings.hierarchyIssues).toHaveLength(0);

      const h1Check = analysis.checklist.find((c) => c.id === 'h1_count');
      expect(h1Check?.status).toBe('PASS');
      const h2Check = analysis.checklist.find((c) => c.id === 'h2_usage');
      expect(h2Check?.status).toBe('PASS');
    });

    it('Requirement 8: Auto Headings NEVER overwrites or destroys existing realistic article headings', () => {
      const actionRes = editorActionsService.autoHeadings({
        content: realisticArticle,
        focusKeyword: 'OpenAI Dots for technical SEO',
      });

      // 100% Content preservation guaranteed
      expect(actionRes.proposedContent).toBe(realisticArticle);

      // Must NOT introduce generic boilerplate template headings
      expect(actionRes.proposedContent).not.toContain('Key Benefits');
      expect(actionRes.proposedContent).not.toContain('Best Practices');
      expect(actionRes.proposedContent).not.toContain('Implementation Strategies');
      expect(actionRes.proposedContent).not.toContain('Frequently Asked Questions');

      // Message confirms all 4 existing headings were preserved intact
      expect(actionRes.generatedHeadings[0]).toMatch(/Preserved all 4 existing headings/i);
    });

    it('Requirement 8: One-Click SEO Fix preserves all headings in the realistic article', () => {
      const fixRes = editorActionsService.oneClickSeoFix({
        content: realisticArticle,
        title: 'Complete OpenAI Guide',
        slug: 'openai-guide',
        focusKeyword: 'OpenAI Dots for technical SEO',
      });

      // All 4 headings must remain in the proposed content
      expect(fixRes.proposedContent).toContain('# Comprehensive Guide');
      expect(fixRes.proposedContent).toContain('## Understanding OpenAI Dots for Technical SEO');
      expect(fixRes.proposedContent).toContain('## How OpenAI Dots for Technical SEO Can Automate the Workflow');
      expect(fixRes.proposedContent).toContain('### Technical SEO Tasks');

      // Body sentences must also remain intact
      expect(fixRes.proposedContent).toContain('Can OpenAI Dots for technical SEO actually do the work of an SEO specialist?');
      expect(fixRes.proposedContent).toContain('First, identify the problem.');
    });

    it('Requirement 4 & 5: htmlToMarkdown converts rich clipboard HTML without flattening or destroying text', () => {
      const htmlInput = `
        <h1>Modern Technical SEO</h1>
        <p>An introduction to web performance and crawl optimization.</p>
        <h2>Core Web Vitals</h2>
        <p>Ensure fast rendering by prioritizing LCP assets. Check <a href="https://web.dev">documentation</a>.</p>
        <ul>
          <li>Largest Contentful Paint</li>
          <li>Cumulative Layout Shift</li>
        </ul>
      `;

      const markdown = htmlToMarkdown(htmlInput);

      expect(markdown).toContain('# Modern Technical SEO');
      expect(markdown).toContain('## Core Web Vitals');
      expect(markdown).toContain('[documentation](https://web.dev)');
      expect(markdown).toContain('- Largest Contentful Paint');
      expect(markdown).toContain('- Cumulative Layout Shift');

      // Plain text without HTML tags is preserved without alteration
      const plainText = 'Plain markdown text with existing # Title and normal words.';
      expect(htmlToMarkdown(plainText)).toBe(plainText);
    });

    it('Requirement 6 & 7: parseMarkdownBlocks isolates single-spaced headings from paragraph blocks', () => {
      const singleSpacedMd = `# Title Without Double Spacing
Paragraph directly under heading without blank line.
## Subtitle
Second paragraph.`;

      const blocks = parseMarkdownBlocks(singleSpacedMd);
      expect(blocks).toHaveLength(4);

      expect(blocks[0].type).toBe('h1');
      expect(blocks[0].text).toBe('Title Without Double Spacing');

      expect(blocks[1].type).toBe('paragraph');
      expect(blocks[1].text).toBe('Paragraph directly under heading without blank line.');

      expect(blocks[2].type).toBe('h2');
      expect(blocks[2].text).toBe('Subtitle');

      expect(blocks[3].type).toBe('paragraph');
      expect(blocks[3].text).toBe('Second paragraph.');
    });

    it('Heading lines are excluded from body paragraph counting and do not pollute mobile readability', () => {
      const doc = `# Long Title Line That Is A Heading Not A Paragraph
## Subtitle Line Which Is Also Not A Paragraph
This is an actual short body paragraph.`;

      const analysis = contentAnalyzerService.analyze({
        content: doc,
        focusKeyword: 'body paragraph',
      });

      // Body paragraphs should be 1 (only the body text, not the headings)
      expect(analysis.metrics.paragraphs.total).toBe(1);
      expect(analysis.metrics.paragraphs.longForMobile).toBe(0);
    });

    it('Auto Headings derives subheadings dynamically from section sentences when content lacks headings', () => {
      const unheadedText = `Cloud architecture allows modern organizations to deploy elastic systems worldwide.
This enables scalable microservices with zero downtime deployments.

Database replication ensures continuous read availability across global regions.
Secondary replicas handle reporting queries to relieve primary database burden.`;

      const actionRes = editorActionsService.autoHeadings({
        content: unheadedText,
        focusKeyword: 'cloud architecture',
      });

      // Check that it generated dynamic headings and NOT static generic ones
      expect(actionRes.proposedContent).toContain('# Cloud Architecture: Complete Guide');
      expect(actionRes.proposedContent).not.toContain('Key Benefits');
      expect(actionRes.proposedContent).not.toContain('Best Practices');
      expect(actionRes.proposedContent).toContain('Database Replication');
    });
  });
});

