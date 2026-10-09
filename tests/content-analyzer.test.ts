import { describe, it, expect } from 'vitest';
import { contentAnalyzerService } from '../src/services/content-analyzer.service';

describe('ContentAnalyzerService', () => {
  it('accurately identifies focus keyword at start of title', () => {
    const result = contentAnalyzerService.analyze({
      title: 'Complete Technical SEO Checklist for Modern Web Apps',
      focusKeyword: 'technical SEO checklist',
      content: '# Complete Technical SEO Checklist\n\nWhen implementing a technical SEO checklist, engineering teams prioritize crawl efficiency and core web vitals.',
      slug: 'technical-seo-checklist',
    });

    const titleRule = result.rules.find((r) => r.id === 'keyword_in_title');
    expect(titleRule).toBeDefined();
    expect(titleRule?.status).toBe('passed');
    expect(titleRule?.pointsAwarded).toBe(10);
  });

  it('detects missing keyword in title and issues warning or failure', () => {
    const result = contentAnalyzerService.analyze({
      title: 'A Random Article About Modern Web Design',
      focusKeyword: 'technical SEO checklist',
      content: 'This article talks about generic web design.',
      slug: 'random-article',
    });

    const titleRule = result.rules.find((r) => r.id === 'keyword_in_title');
    expect(titleRule?.status).toBe('failed');
    expect(titleRule?.pointsAwarded).toBe(0);
  });

  it('flags long paragraphs exceeding 80 words for mobile readability', () => {
    const longParagraph = 'word '.repeat(95); // 95 words
    const shortParagraph = 'This is a short, punchy paragraph for mobile screens.';

    const result = contentAnalyzerService.analyze({
      title: 'Guide to Web Indexing',
      focusKeyword: 'indexing',
      content: `${longParagraph}\n\n${shortParagraph}`,
      slug: 'guide',
    });

    expect(result.longParagraphs.length).toBe(1);
    expect(result.longParagraphs[0].wordCount).toBe(95);
    const paraRule = result.rules.find((r) => r.id === 'paragraph_length');
    expect(paraRule?.status).toBe('warning');
  });

  it('calculates keyword density accurately', () => {
    // 100 words total, keyword repeated 1 time = 1.0% density
    const keyword = 'crawl efficiency';
    const body = `${keyword} ` + 'informative content '.repeat(49); // ~100 words

    const result = contentAnalyzerService.analyze({
      title: 'Crawl Efficiency in 2026',
      focusKeyword: keyword,
      content: body,
      slug: 'crawl-efficiency',
    });

    expect(result.metrics.keywordCount).toBe(1);
    expect(result.metrics.keywordDensity).toBeGreaterThanOrEqual(0.8);
    expect(result.metrics.keywordDensity).toBeLessThanOrEqual(1.2);
  });
});
