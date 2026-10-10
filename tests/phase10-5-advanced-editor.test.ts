import { describe, it, expect } from 'vitest';
import {
  markdownToVisualHtml,
  visualHtmlToMarkdown,
  sanitizeHtml,
} from '@/lib/html-converter';
import {
  LANGUAGE_REGISTRY,
  getLanguageByCode,
  isRtlLanguage,
  filterLanguages,
} from '@/lib/languages';
import { styleReviewService } from '@/services/style-review.service';
import { contentImprovementService } from '@/services/content-improvement.service';
import { contentImprovementSchema } from '@/lib/validation/ai-improvement.schema';
import { POST as translateRoute } from '@/app/api/v1/content/translate/route';
import { POST as styleReviewRoute } from '@/app/api/v1/content/style-review/route';
import { NextRequest } from 'next/server';

describe('PHASE 10.5 — Advanced Article Editor, Languages & AI Workflow', () => {
  // =========================================================================
  // 1. Editor Modes & Bidirectional Conversion
  // =========================================================================
  describe('1. Editor Modes: Visual, Source, and Preview Bidirectional Conversion', () => {
    const originalMarkdown = `# Comprehensive Guide to Core Web Vitals
## Why Page Speed Matters
Fast websites rank higher and retain visitors. According to [web.dev](https://web.dev), latency degrades conversions.

## Key Recommendations
- Optimize Largest Contentful Paint
- Minimize Cumulative Layout Shift
- Prioritize critical CSS

> A fast website is essential for user trust and organic traffic.

![Speed Dashboard](https://images.unsplash.com/speed.jpg)`;

    it('converts Canonical Markdown to Visual HTML without raw # characters', () => {
      const visualHtml = markdownToVisualHtml(originalMarkdown);

      // Must render semantic HTML headings
      expect(visualHtml).toContain('<h1>Comprehensive Guide to Core Web Vitals</h1>');
      expect(visualHtml).toContain('<h2>Why Page Speed Matters</h2>');
      expect(visualHtml).toContain('<h2>Key Recommendations</h2>');

      // Must NOT display raw # or ## as literal text inside tags
      expect(visualHtml).not.toContain('# Comprehensive');
      expect(visualHtml).not.toContain('## Why');

      // Must render links and lists
      expect(visualHtml).toContain('<a href="https://web.dev" target="_blank" rel="noopener noreferrer">web.dev</a>');
      expect(visualHtml).toContain('<ul>');
      expect(visualHtml).toContain('<li>Optimize Largest Contentful Paint</li>');

      // Must render blockquote
      expect(visualHtml).toContain('<blockquote><p>A fast website is essential for user trust and organic traffic.</p></blockquote>');

      // Must render images
      expect(visualHtml).toContain('<img src="https://images.unsplash.com/speed.jpg" alt="Speed Dashboard"');
    });

    it('converts Visual HTML back to Canonical Markdown preserving structure (Visual -> Source)', () => {
      const visualHtml = markdownToVisualHtml(originalMarkdown);
      const convertedBack = visualHtmlToMarkdown(visualHtml);

      // Structure must be 100% intact
      expect(convertedBack).toContain('# Comprehensive Guide to Core Web Vitals');
      expect(convertedBack).toContain('## Why Page Speed Matters');
      expect(convertedBack).toContain('## Key Recommendations');
      expect(convertedBack).toContain('[web.dev](https://web.dev)');
      expect(convertedBack).toContain('- Optimize Largest Contentful Paint');
      expect(convertedBack).toContain('- Minimize Cumulative Layout Shift');
      expect(convertedBack).toContain('> A fast website is essential for user trust and organic traffic.');
      expect(convertedBack).toContain('![Speed Dashboard](https://images.unsplash.com/speed.jpg)');
    });

    it('sanitizes unsafe scripts and XSS payloads in HTML source view', () => {
      const maliciousHtml = `
        <h1>Safe Article Title</h1>
        <script>alert("XSS")</script>
        <p onclick="stealCookies()">Normal looking text <a href="javascript:void(0)">Click here</a></p>
        <iframe src="https://evil.com"></iframe>
      `;

      const sanitized = sanitizeHtml(maliciousHtml);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert("XSS")');
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).toContain('<h1>Safe Article Title</h1>');
      expect(sanitized).toContain('Normal looking text');
    });

    it('preserves bold and italic formatting across conversions', () => {
      const formatted = 'Here is **bold emphasis** and *italic nuance* in content.';
      const html = markdownToVisualHtml(formatted);
      expect(html).toContain('<strong>bold emphasis</strong>');
      expect(html).toContain('<em>italic nuance</em>');

      const md = visualHtmlToMarkdown(html);
      expect(md).toContain('**bold emphasis**');
      expect(md).toContain('*italic nuance*');
    });
  });

  // =========================================================================
  // 2. Comprehensive Alphabetical Language Registry & RTL
  // =========================================================================
  describe('2. Comprehensive Language Registry & RTL Direction', () => {
    it('contains over 50 world languages sorted alphabetically by English name by default', () => {
      expect(LANGUAGE_REGISTRY.length).toBeGreaterThanOrEqual(50);

      // Verify alphabetical order
      for (let i = 0; i < LANGUAGE_REGISTRY.length - 1; i++) {
        expect(
          LANGUAGE_REGISTRY[i].name.localeCompare(LANGUAGE_REGISTRY[i + 1].name, 'en')
        ).toBeLessThanOrEqual(0);
      }
    });

    it('includes major languages and regional variants with native names', () => {
      const arabic = getLanguageByCode('ar');
      expect(arabic).toBeDefined();
      expect(arabic?.name).toBe('Arabic');
      expect(arabic?.nativeName).toBe('العربية');

      const urdu = getLanguageByCode('ur');
      expect(urdu).toBeDefined();
      expect(urdu?.name).toBe('Urdu');
      expect(urdu?.nativeName).toBe('اردو');

      const spanish = getLanguageByCode('es');
      expect(spanish).toBeDefined();
      expect(spanish?.name).toBe('Spanish');
      expect(spanish?.nativeName).toBe('Español');

      const japanese = getLanguageByCode('ja');
      expect(japanese).toBeDefined();
      expect(japanese?.name).toBe('Japanese');
      expect(japanese?.nativeName).toBe('日本語');
    });

    it('correctly identifies right-to-left (RTL) scripts for Arabic, Urdu, Persian, and Hebrew', () => {
      expect(isRtlLanguage('ar')).toBe(true);
      expect(isRtlLanguage('ar-SA')).toBe(true);
      expect(isRtlLanguage('ur')).toBe(true);
      expect(isRtlLanguage('fa')).toBe(true);
      expect(isRtlLanguage('he')).toBe(true);

      // Left-to-right languages
      expect(isRtlLanguage('en')).toBe(false);
      expect(isRtlLanguage('en-US')).toBe(false);
      expect(isRtlLanguage('es')).toBe(false);
      expect(isRtlLanguage('fr')).toBe(false);
      expect(isRtlLanguage('de')).toBe(false);
      expect(isRtlLanguage('zh-CN')).toBe(false);
    });

    it('filters languages by search query across English name, native name, and code', () => {
      const frenchResults = filterLanguages('french');
      expect(frenchResults.some((l) => l.code === 'fr')).toBe(true);

      const arabicNative = filterLanguages('العربية');
      expect(arabicNative.some((l) => l.code.startsWith('ar'))).toBe(true);

      const codeMatch = filterLanguages('pt-BR');
      expect(codeMatch.some((l) => l.code === 'pt-BR')).toBe(true);
    });
  });

  // =========================================================================
  // 3. Translation Workflow & Zod Validation
  // =========================================================================
  describe('3. Translation Workflow & API Validation', () => {
    it('validates translation input schema requiring content and targetLanguage', () => {
      const valid = contentImprovementSchema.safeParse({
        content: '# Title\n\nArticle body to translate.',
        action: 'translate',
        targetLanguage: 'Spanish',
      });
      expect(valid.success).toBe(true);

      const invalid = contentImprovementSchema.safeParse({
        content: '',
        action: 'translate',
      });
      expect(invalid.success).toBe(false);
    });

    it('handles translation API request rejecting malformed JSON with 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/content/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json{',
      });

      const res = await translateRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_JSON');
    });

    it('handles translation API request rejecting empty content with 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/content/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '',
          targetLanguage: 'Spanish',
        }),
      });

      const res = await translateRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // =========================================================================
  // 4. Writing Style Review
  // =========================================================================
  describe('4. Writing Style Review: Pattern Detection & Selective Loop', () => {
    it('returns 0 findings for clean, natural human prose', () => {
      const naturalText = `
        Search engine rankings depend on fast loading speeds and reliable content structure.
        Every web developer should audit their server response times periodically.
        When web pages load under one second, visitor bounce rates decline sharply.
      `;

      const result = styleReviewService.analyzeStyle(naturalText);
      expect(result.totalFindings).toBe(0);
      expect(result.summary).toContain('No formulaic or repetitive passages detected');
    });

    it('identifies cliché filler phrases with exact sentence passages and recommendations', () => {
      const clicheText = `
        # Optimization Guide
        It is important to remember that web performance is vital.
        In order to improve performance, we must delve into image compression techniques.
        This serves as a testament to our ongoing development efforts.
      `;

      const result = styleReviewService.analyzeStyle(clicheText);
      expect(result.totalFindings).toBeGreaterThan(0);

      const delveFinding = result.findings.find((f) => f.passage.toLowerCase().includes('delve into'));
      expect(delveFinding).toBeDefined();
      expect(delveFinding?.issueType).toBe('cliche_filler');
      expect(delveFinding?.suggestion).toMatch(/explore|examine/i);

      const rememberFinding = result.findings.find((f) => f.passage.toLowerCase().includes('important to remember'));
      expect(rememberFinding).toBeDefined();
    });

    it('identifies repeated sentence openings in consecutive statements', () => {
      const repetitiveOpenings = `
        This tool provides automated crawling metrics.
        This tool provides detailed keyword metrics.
      `;

      const result = styleReviewService.analyzeStyle(repetitiveOpenings);
      const openingFinding = result.findings.find((f) => f.issueType === 'repeated_opening');
      expect(openingFinding).toBeDefined();
      expect(openingFinding?.explanation).toContain('this tool');
    });

    it('handles empty content gracefully', () => {
      const result = styleReviewService.analyzeStyle('');
      expect(result.totalFindings).toBe(0);
      expect(result.findings).toHaveLength(0);
    });

    it('handles style review API endpoint safely', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/content/style-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'In order to succeed, we must delve into testing our code thoroughly.',
        }),
      });

      const res = await styleReviewRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.totalFindings).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 5. Real AI Provider & Fallback Handling
  // =========================================================================
  describe('5. Real AI Provider & Error Resilience', () => {
    it('executes through provider abstraction and handles unconfigured provider safely', async () => {
      const result = await contentImprovementService.improveContent({
        content: 'Some test article content for verification.',
        action: 'humanize_tone',
        preferredProviderId: 'deepseek', // unconfigured in this environment
      });

      // Provider was unconfigured, must return safe honest response without crashing
      expect(result.success).toBe(false);
      expect(result.error?.message).toMatch(/No AI provider is configured|AI improvements are currently unavailable/i);
    });

    it('never leaks server credentials or raw database stack traces in improvement responses', async () => {
      const result = await contentImprovementService.improveContent({
        content: 'Some test article content.',
        action: 'improve_readability',
        preferredProviderId: 'non_existent_provider_id',
      });

      const strResult = JSON.stringify(result);
      expect(strResult).not.toContain('DATABASE_URL');
      expect(strResult).not.toContain('ADMIN_SECRET_KEY');
      expect(strResult).not.toContain('passwordHash');
    });
  });
});

