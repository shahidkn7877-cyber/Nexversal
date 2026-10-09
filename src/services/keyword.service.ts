import {
  KeywordResearchRequest,
  KeywordResearchResponse,
  KeywordResearchResult,
  KeywordItem,
  SearchIntent,
} from '@/types/keywords';
import { IKeywordProvider } from '@/providers/keywords/keyword-provider.interface';
import { GoogleAdsKeywordProvider } from '@/providers/keywords/google-ads.provider';
import { keywordResearchRepository } from '@/repositories/keyword-research.repository';
import { activityService } from '@/services/activity/activity.service';

export interface ExecuteResearchOptions extends KeywordResearchRequest {
  userId: string;
}

export class KeywordService {
  private activeProvider: IKeywordProvider;

  constructor(provider?: IKeywordProvider) {
    // Production default is GoogleAdsKeywordProvider ONLY.
    // DemoKeywordProvider is NEVER used as default or production fallback.
    this.activeProvider = provider || new GoogleAdsKeywordProvider();
  }

  public getProvider(): IKeywordProvider {
    return this.activeProvider;
  }

  public setProvider(provider: IKeywordProvider): void {
    this.activeProvider = provider;
  }

  public isConfigured(): boolean {
    return this.activeProvider.isConfigured();
  }

  /**
   * Primary Production Keyword Research Flow:
   * 1. If Google Ads is NOT configured -> Return NOT_CONFIGURED with ZERO fake results.
   * 2. NO fallback to DemoKeywordProvider in production.
   * 3. If configured -> Execute official Google Ads Keyword Planner provider.
   * 4. Persist real results to PostgreSQL and record activity.
   */
  public async executeResearch(options: ExecuteResearchOptions): Promise<KeywordResearchResponse> {
    const { userId, seedKeyword, seedUrl, location = 'US', language = 'en' } = options;

    // Strict configuration check: NO SILENT FALLBACK TO DEMO DATA
    if (!this.activeProvider.isConfigured()) {
      return {
        provider: this.activeProvider.id,
        status: 'NOT_CONFIGURED',
        seedKeyword: seedKeyword || null,
        seedUrl: seedUrl || null,
        location,
        language,
        totalResults: 0,
        results: [],
        message:
          'Keyword research provider is not configured. Connect a supported keyword data provider to retrieve live metrics.',
        disclaimer:
          'No keyword metrics are being shown because displaying estimated or demo data as real data would be misleading.',
        createdAt: new Date().toISOString(),
      };
    }

    const providerResult = await this.activeProvider.generateKeywordIdeas({
      seedKeyword,
      seedUrl,
      location,
      language,
    });

    if (providerResult.status === 'ERROR') {
      return {
        provider: this.activeProvider.id,
        status: 'ERROR',
        seedKeyword: seedKeyword || null,
        seedUrl: seedUrl || null,
        location,
        language,
        totalResults: 0,
        results: [],
        message: providerResult.message || 'Keyword provider temporarily failed. Please try again later.',
        disclaimer: providerResult.disclaimer || 'Provider request encountered an error.',
        createdAt: new Date().toISOString(),
      };
    }

    // Persist real research session to PostgreSQL (if not DEMO)
    let savedResearchId: string | undefined;
    if (providerResult.status !== 'NOT_CONFIGURED') {
      try {
        const persisted = await keywordResearchRepository.create({
          userId,
          provider: providerResult.provider,
          seedKeyword,
          seedUrl,
          location,
          language,
          results: providerResult.results,
        });
        savedResearchId = persisted.id;
      } catch {
        // Safe fallback if persistence encounters transient database error
      }

      // Record activity with sanitized metadata
      try {
        activityService.recordEvent({
          type: 'KEYWORD_RESEARCH',
          userId,
          summary: `Keyword research for "${seedKeyword || seedUrl}" (${location})`,
          metadata: {
            provider: providerResult.provider,
            seedKeyword: seedKeyword || null,
            seedUrl: seedUrl || null,
            location,
            language,
            resultCount: providerResult.results.length,
            status: providerResult.status,
          },
        });
      } catch {
        // Activity logging safe fallback
      }
    }

    return {
      id: savedResearchId,
      provider: providerResult.provider,
      status: providerResult.status,
      seedKeyword: seedKeyword || null,
      seedUrl: seedUrl || null,
      location,
      language,
      totalResults: providerResult.results.length,
      results: providerResult.results,
      message: providerResult.message,
      disclaimer: providerResult.disclaimer,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Legacy method: Enforces strict no-fake-data policy.
   * If provider is not configured, returns 0 items and honest notice.
   * Only executes if provider was explicitly configured or injected for an isolated test.
   */
  public async getKeywords(query: string, country = 'US'): Promise<KeywordResearchResult> {
    const rawQuery = query.trim().toLowerCase();

    // If provider is not configured (production state without Google Ads credentials)
    if (!this.activeProvider.isConfigured()) {
      return {
        query: rawQuery,
        country,
        provider: this.activeProvider.id as any,
        totalResults: 0,
        averageDifficulty: 0,
        totalVolume: 0,
        averageCpc: 0,
        items: [],
        disclaimer:
          'Keyword research provider is not configured. Connect a supported keyword data provider to retrieve live metrics.',
        timestamp: new Date().toISOString(),
      };
    }

    // Intent detection helper for mapped items
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

    // If an explicit provider was injected (e.g. DemoKeywordProvider in a unit test) or configured
    const providerRes = await this.activeProvider.generateKeywordIdeas({
      seedKeyword: rawQuery,
      location: country,
    });

    const items: KeywordItem[] = providerRes.results.map((r) => ({
      keyword: r.keyword,
      intent: detectIntent(r.keyword),
      difficulty: r.competitionIndex ?? 30,
      volume: r.averageMonthlySearches ?? 0,
      cpc: r.lowTopOfPageBid ?? 0,
      competition: parseFloat(((r.competitionIndex ?? 30) / 100).toFixed(2)),
      trend: 'stable',
    }));

    const totalVolume = items.reduce((acc, curr) => acc + curr.volume, 0);
    const avgDiff = items.length
      ? Math.round(items.reduce((acc, curr) => acc + curr.difficulty, 0) / items.length)
      : 0;
    const avgCpc = items.length
      ? parseFloat((items.reduce((acc, curr) => acc + curr.cpc, 0) / items.length).toFixed(2))
      : 0;

    return {
      query: rawQuery,
      country,
      provider: providerRes.provider as any,
      totalResults: items.length,
      averageDifficulty: avgDiff,
      totalVolume,
      averageCpc: avgCpc,
      items,
      disclaimer: providerRes.disclaimer || 'Live search engine metrics.',
      timestamp: new Date().toISOString(),
    };
  }
}

export const keywordService = new KeywordService();

// Export interfaces for explicit testing only
export type { IKeywordProvider } from '@/providers/keywords/keyword-provider.interface';
export { DemoKeywordProvider } from '@/providers/keywords/demo-keyword.provider';
export { GoogleAdsKeywordProvider } from '@/providers/keywords/google-ads.provider';
