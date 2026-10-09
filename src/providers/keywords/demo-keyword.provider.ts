import { KeywordResearchRequest, KeywordResult, SearchIntent } from '@/types/keywords';
import { IKeywordProvider, KeywordProviderResult } from './keyword-provider.interface';

export class DemoKeywordProvider implements IKeywordProvider {
  public readonly id = 'demo';
  public readonly name = 'Development Demo Provider';

  public isConfigured(): boolean {
    return true;
  }

  public async generateKeywordIdeas(params: KeywordResearchRequest): Promise<KeywordProviderResult> {
    const rawQuery = (params.seedKeyword || (params.seedUrl ? new URL(params.seedUrl).pathname : 'seo')).trim().toLowerCase();

    // Intent detection helper
    const detectIntent = (kw: string): SearchIntent => {
      if (/\b(buy|price|pricing|cheap|cost|discount|coupon|deal|order)\b/i.test(kw)) {
        return 'transactional';
      }
      if (/\b(best|top|vs|versus|review|reviews|comparison|alternative|alternatives)\b/i.test(kw)) {
        return 'commercial';
      }
      if (/\b(how to|what is|guide|tutorial|why|tips|steps|examples|definition)\b/i.test(kw)) {
        return 'informational';
      }
      return 'navigational';
    };

    // Deterministic modifier expansion
    const modifiers = [
      { prefix: 'best ', suffix: ' in 2026', intent: 'commercial', diffMod: 5, volMod: 1.2 },
      { prefix: 'how to use ', suffix: ' for beginners', intent: 'informational', diffMod: -15, volMod: 0.7 },
      { prefix: 'free ', suffix: ' software', intent: 'transactional', diffMod: 8, volMod: 1.8 },
      { prefix: '', suffix: ' pricing and plans', intent: 'transactional', diffMod: -10, volMod: 0.5 },
      { prefix: '', suffix: ' alternatives open source', intent: 'commercial', diffMod: -12, volMod: 0.6 },
      { prefix: 'top 10 ', suffix: ' tools', intent: 'commercial', diffMod: 10, volMod: 1.5 },
      { prefix: '', suffix: ' review & tutorial', intent: 'commercial', diffMod: -5, volMod: 0.8 },
      { prefix: 'can you use ', suffix: ' for enterprise workflow', intent: 'informational', diffMod: -20, volMod: 0.4 },
      { prefix: '', suffix: ' limits and drawbacks', intent: 'informational', diffMod: -18, volMod: 0.3 },
      { prefix: 'cheap ', suffix: ' vs enterprise solutions', intent: 'commercial', diffMod: -8, volMod: 0.9 },
    ];

    let hash = 0;
    for (let i = 0; i < rawQuery.length; i++) {
      hash = (hash << 5) - hash + rawQuery.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash);

    const baseVolume = 1200 + (positiveHash % 8500);
    const baseCpc = parseFloat((0.85 + (positiveHash % 420) / 100).toFixed(2));
    const baseDiff = 25 + (positiveHash % 55);

    const results: KeywordResult[] = [];

    // 1. Primary seed
    results.push({
      keyword: rawQuery,
      averageMonthlySearches: baseVolume,
      competition: baseDiff > 60 ? 'HIGH' : baseDiff > 35 ? 'MEDIUM' : 'LOW',
      competitionIndex: baseDiff,
      lowTopOfPageBid: parseFloat((baseCpc * 0.8).toFixed(2)),
      highTopOfPageBid: parseFloat((baseCpc * 1.5).toFixed(2)),
      currency: 'USD',
    });

    // 2. Modifiers
    modifiers.forEach((m) => {
      const kw = `${m.prefix}${rawQuery}${m.suffix}`.trim();
      const diff = Math.min(95, Math.max(12, baseDiff + m.diffMod));
      const vol = Math.max(150, Math.round(baseVolume * m.volMod));
      const cpc = parseFloat((Math.max(0.4, baseCpc * (m.volMod > 1 ? 1.15 : 0.85))).toFixed(2));

      results.push({
        keyword: kw,
        averageMonthlySearches: vol,
        competition: diff > 60 ? 'HIGH' : diff > 35 ? 'MEDIUM' : 'LOW',
        competitionIndex: diff,
        lowTopOfPageBid: parseFloat((cpc * 0.75).toFixed(2)),
        highTopOfPageBid: parseFloat((cpc * 1.4).toFixed(2)),
        currency: 'USD',
      });
    });

    return {
      provider: this.id,
      status: 'DEMO',
      results,
      totalResults: results.length,
      disclaimer:
        'DEVELOPMENT / DEMO DATA (Non-production algorithmic heuristics for isolated testing; estimated algorithmic demo metrics).',
    };
  }
}
