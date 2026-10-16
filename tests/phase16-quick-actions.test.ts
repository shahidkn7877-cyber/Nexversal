import { describe, it, expect } from 'vitest';
import { editorActionsService } from '@/services/editor-actions.service';
import { styleReviewService, StyleFinding } from '@/services/style-review.service';
import { contentImprovementSchema } from '@/lib/validation/ai-improvement.schema';

describe('Phase 16 — Quick Actions Verification Suite', () => {
  describe('Action 1: 1-Click Fix (oneClickSeoFix)', () => {
    it('corrects punctuation, spacing, and sentence capitalization', () => {
      const input = 'here is a sentence .another sentence with  double spaces.and missing space?indeed !';
      const result = editorActionsService.oneClickSeoFix({
        content: input,
        focusKeyword: 'SEO tools',
      });

      expect(result.proposedContent).toContain('Here is a sentence.');
      expect(result.proposedContent).toContain('Another sentence with double spaces.');
      expect(result.proposedContent).toContain('And missing space?');
      expect(result.proposedContent).toContain('Indeed!');
      expect(result.changes.some((c) => c.toLowerCase().includes('punctuation'))).toBe(true);
    });

    it('corrects common spelling typos (teh, recieve, seperate)', () => {
      const input = 'Teh team will recieve seperate feedback to acheive success.';
      const result = editorActionsService.oneClickSeoFix({
        content: input,
        focusKeyword: 'SEO tips',
      });

      expect(result.proposedContent).toContain('The team will receive separate feedback to achieve success.');
      expect(result.changes.some((c) => c.toLowerCase().includes('spelling error'))).toBe(true);
    });

    it('splits bloated paragraphs exceeding 80 words for readability', () => {
      const longSentences = [
        'Content optimization is critical for scaling organic search visibility across answer engines and modern crawler indexing.',
        'High ranking articles provide structured information that directly satisfies search intent with high fidelity answers.',
        'When paragraphs stretch over eighty words without natural breathing room, reader comprehension drops sharply on mobile devices.',
        'Breaking long paragraphs into concise two to three sentence blocks drastically improves scan speed and lowers bounce rates.',
        'Every digital publication should maintain disciplined whitespace to ensure optimal reader engagement and on-page dwell time.',
      ].join(' ');

      const result = editorActionsService.oneClickSeoFix({
        content: longSentences,
        focusKeyword: 'Content optimization',
      });

      const paragraphs = result.proposedContent.split(/\n\s*\n/);
      expect(paragraphs.length).toBeGreaterThan(1);
      expect(result.changes.some((c) => c.toLowerCase().includes('split'))).toBe(true);
    });

    it('fills empty image alt tags with the focus keyword', () => {
      const input = 'Here is an image:\n\n![](https://example.com/chart.png)';
      const result = editorActionsService.oneClickSeoFix({
        content: input,
        focusKeyword: 'Keyword Strategy',
      });

      expect(result.proposedContent).toContain('![Keyword Strategy - visual diagram](https://example.com/chart.png)');
      expect(result.changes.some((c) => c.toLowerCase().includes('alt text'))).toBe(true);
    });

    it('preserves code blocks, links, blockquotes, and lists without corruption', () => {
      const input = `# My Guide

Here is [Nexversal](https://nexversal.com) for SEO.

\`\`\`json
{ "status": "ok" }
\`\`\`

> A quote to remember.

- Bullet item one
- Bullet item two`;

      const result = editorActionsService.oneClickSeoFix({
        content: input,
        focusKeyword: 'Guide',
      });

      expect(result.proposedContent).toContain('[Nexversal](https://nexversal.com)');
      expect(result.proposedContent).toContain('```json');
      expect(result.proposedContent).toContain('{ "status": "ok" }');
      expect(result.proposedContent).toContain('> A quote to remember.');
      expect(result.proposedContent).toContain('- Bullet item one');
    });
  });

  describe('Action 2: Auto Headings (autoHeadings)', () => {
    it('generates H1 and H2 subheadings for unstructured plain text', () => {
      const plainText = `Modern search optimization has evolved beyond simple keyword frequency into understanding topical entity graphs and answer intent.

Search intent analysis ensures articles directly address what users are asking before presenting supporting evidence.

On-page technical signals including fast loading times, clean HTML semantics, and mobile-responsive layout reinforce content quality.

Continuous performance tracking in Google Search Console allows content teams to identify decay early and update ranking content.`;

      const result = editorActionsService.autoHeadings({
        content: plainText,
        focusKeyword: 'Search Optimization',
        title: 'Modern Search Optimization',
      });

      expect(result.proposedContent).toContain('# Modern Search Optimization');
      expect(result.proposedContent).toMatch(/## /);
      expect(result.generatedHeadings.length).toBeGreaterThan(0);
    });

    it('detects 3+ unheaded consecutive paragraphs and inserts subheadings', () => {
      const input = `# SEO Masterclass

## Core Concepts

First paragraph discussing crawling and indexing basics.

Second paragraph explaining sitemaps and robots txt files.

Third paragraph covering canonical URLs and pagination rules for large websites.

Fourth paragraph exploring faceted navigation and duplicate content issues.`;

      const result = editorActionsService.autoHeadings({
        content: input,
        focusKeyword: 'SEO Masterclass',
      });

      // Should add a section subheading before the unheaded streak
      expect(result.proposedContent).toMatch(/## [A-Z]/);
      expect(result.generatedHeadings.some((h) => h.includes('subheading'))).toBe(true);
    });

    it('is idempotent: does not duplicate headings when re-run', () => {
      const structuredContent = `# Definitive Guide to SEO

## Fundamentals of Indexing
Understanding how crawlers process pages.

## Content Optimization
Crafting high-quality paragraphs.

## Technical Health
Maintaining server response times and Core Web Vitals.`;

      const result1 = editorActionsService.autoHeadings({
        content: structuredContent,
        focusKeyword: 'SEO',
      });

      expect(result1.proposedContent).toBe(structuredContent);
      expect(result1.generatedHeadings[0]).toContain('already well-organized');
    });
  });

  describe('Action 3: Humanize Tone (humanizeTone)', () => {
    it('detects and eliminates robotic formulaic clichés with clean replacements', () => {
      const input = "In today's digital landscape, it is important to remember that companies delve deeper into data in order to revolutionize the way work is done.";
      const result = editorActionsService.humanizeTone({ content: input });

      expect(result.replacedCount).toBeGreaterThan(0);
      expect(result.proposedContent.toLowerCase()).not.toContain("in today's digital landscape");
      expect(result.proposedContent.toLowerCase()).not.toContain("delve deeper into");
      expect(result.proposedContent.toLowerCase()).not.toContain("in order to");
      expect(result.replacements.length).toBe(result.replacedCount);
    });

    it('preserves clean human text without unwanted modifications', () => {
      const cleanInput = 'Search engines rank pages that provide accurate, helpful answers to user queries.';
      const result = editorActionsService.humanizeTone({ content: cleanInput });

      expect(result.replacedCount).toBe(0);
      expect(result.proposedContent).toBe(cleanInput);
    });
  });

  describe('Action 4: Style Review & Targeted Fallback Rewrite', () => {
    it('flags clichés, repeated openings, overlong sentences, and repetitive transitions', () => {
      const content = `We test algorithms. We test databases.

Furthermore, we evaluate ranking signals. Furthermore, we evaluate click-through metrics.

In today's digital landscape, teams must delve into comprehensive reporting to succeed.

This is an extraordinarily long sentence that contains an excessive number of consecutive words without any commas or periods or semicolons designed to push the word count well past thirty-eight words to verify that our style scanner reliably catches runaway clauses.`;

      const result = styleReviewService.analyzeStyle(content);
      expect(result.totalFindings).toBeGreaterThan(0);

      const types = result.findings.map((f) => f.issueType);
      expect(types).toContain('cliche_filler');
      expect(types).toContain('repeated_opening');
    });

    it('generates high quality deterministic fallback rewrites when external AI is offline', () => {
      const finding: StyleFinding = {
        id: 'f-1',
        passage: "In today's digital landscape, we must delve into user behavior in order to succeed.",
        issueType: 'cliche_filler',
        explanation: 'Contains formulaic clichés',
        suggestion: 'Simplify phrasing',
        status: 'pending',
      };

      const rewrite = styleReviewService.generateFallbackRewrite(finding);
      expect(rewrite.toLowerCase()).not.toContain("in today's digital landscape");
      expect(rewrite.toLowerCase()).not.toContain("delve into");
      expect(rewrite.toLowerCase()).not.toContain("in order to");
      expect(rewrite).toContain('explore');
    });

    it('generates fallback rewrite for repeated sentence openings', () => {
      const finding: StyleFinding = {
        id: 'f-2',
        passage: 'Search engines crawl pages. Search engines index content.',
        issueType: 'repeated_opening',
        explanation: 'Adjacent sentences start with identical words',
        suggestion: 'Vary openings',
        status: 'pending',
      };

      const rewrite = styleReviewService.generateFallbackRewrite(finding);
      expect(rewrite).toContain('Search engines crawl pages. Additionally, search engines index content.');
    });

    it('generates fallback rewrite for repetitive transitions', () => {
      const finding: StyleFinding = {
        id: 'f-3',
        passage: 'Furthermore, the page speed score improved.',
        issueType: 'repetitive_transition',
        explanation: 'Repeated transition word',
        suggestion: 'Use varied transition',
        status: 'pending',
      };

      const rewrite = styleReviewService.generateFallbackRewrite(finding);
      expect(rewrite).toBe('Additionally, the page speed score improved.');
    });
  });

  describe('Action 5: US ↔ UK Dialect Detection & Adaptation', () => {
    it('detects American English with high confidence and recommends UK', () => {
      const usText = 'We color and optimize the center to analyze our favorite behaviors.';
      const detection = editorActionsService.detectDialect(usText);

      expect(detection.detected).toBe('US');
      expect(detection.recommendedTarget).toBe('UK');
      expect(detection.usCount).toBeGreaterThan(0);
      expect(detection.ukCount).toBe(0);
    });

    it('detects British English with high confidence and recommends US', () => {
      const ukText = 'We colour and optimise the centre to analyse our favourite behaviours.';
      const detection = editorActionsService.detectDialect(ukText);

      expect(detection.detected).toBe('UK');
      expect(detection.recommendedTarget).toBe('US');
      expect(detection.ukCount).toBeGreaterThan(0);
      expect(detection.usCount).toBe(0);
    });

    it('adapts US English to UK English across suffixes and vocabulary', () => {
      const usText = 'We optimize organization and color in the elevator of the apartment.';
      const result = editorActionsService.adaptDialect({
        content: usText,
        targetVariant: 'UK',
      });

      expect(result.proposedContent).toContain('optimise');
      expect(result.proposedContent).toContain('organisation');
      expect(result.proposedContent).toContain('colour');
      expect(result.proposedContent).toContain('lift');
      expect(result.proposedContent).toContain('flat');
      expect(result.changeCount).toBeGreaterThanOrEqual(5);
    });

    it('adapts UK English to US English across suffixes and vocabulary', () => {
      const ukText = 'We analyse behaviour and recognise humour during autumn in the lorry.';
      const result = editorActionsService.adaptDialect({
        content: ukText,
        targetVariant: 'US',
      });

      expect(result.proposedContent).toContain('analyze');
      expect(result.proposedContent).toContain('behavior');
      expect(result.proposedContent).toContain('recognize');
      expect(result.proposedContent).toContain('humor');
      expect(result.proposedContent).toContain('fall');
      expect(result.proposedContent).toContain('truck');
      expect(result.changeCount).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Action 6: API Schema Validation for one_click_fix', () => {
    it('accepts one_click_fix as a valid improvementAction', () => {
      const payload = {
        content: '# Test Article\n\nContent here.',
        action: 'one_click_fix',
        focusKeyword: 'SEO',
      };

      const parseResult = contentImprovementSchema.safeParse(payload);
      expect(parseResult.success).toBe(true);
    });

    it('rejects unsupported actions', () => {
      const payload = {
        content: '# Test Article\n\nContent here.',
        action: 'unsupported_magic_action',
      };

      const parseResult = contentImprovementSchema.safeParse(payload);
      expect(parseResult.success).toBe(false);
    });
  });
});

