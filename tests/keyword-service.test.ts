import { describe, it, expect } from 'vitest';
import { DemoKeywordProvider, KeywordService } from '../src/services/keyword.service';

describe('KeywordService & DemoKeywordProvider', () => {
  const service = new KeywordService(new DemoKeywordProvider());

  it('returns structured keyword data with search intent and volume', async () => {
    const result = await service.getKeywords('seo audit software');

    expect(result.query).toBe('seo audit software');
    expect(result.provider).toBe('demo');
    expect(result.items.length).toBeGreaterThan(5);
    expect(result.disclaimer).toContain('estimated algorithmic demo metrics');

    // Check item attributes
    const first = result.items[0];
    expect(first.keyword).toBe('seo audit software');
    expect(['informational', 'commercial', 'transactional', 'navigational']).toContain(first.intent);
    expect(first.difficulty).toBeGreaterThanOrEqual(0);
    expect(first.difficulty).toBeLessThanOrEqual(100);
    expect(first.volume).toBeGreaterThan(0);
    expect(first.cpc).toBeGreaterThan(0);
  });

  it('categorizes transactional vs commercial intent heuristically', async () => {
    const buyResult = await service.getKeywords('buy seo audit software');
    expect(buyResult.items[0].intent).toBe('transactional');

    const reviewResult = await service.getKeywords('best seo audit software review');
    expect(reviewResult.items[0].intent).toBe('commercial');
  });
});
