import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  GoogleAdsKeywordProvider,
  GOOGLE_ADS_GEO_TARGETS,
  GOOGLE_ADS_LANGUAGES,
} from '../src/providers/keywords/google-ads.provider';
import { DemoKeywordProvider } from '../src/providers/keywords/demo-keyword.provider';
import { GoogleTrendsProvider } from '../src/providers/trends/google-trends.provider';
import { KeywordService, keywordService } from '../src/services/keyword.service';
import { keywordResearchRepository } from '../src/repositories/keyword-research.repository';
import { userRepository } from '../src/repositories/user.repository';
import { createSession, SESSION_COOKIE_NAME } from '../src/lib/auth/session';
import { hashPassword } from '../src/lib/auth/password';
import { checkKeywordRateLimit, resetKeywordRateLimit } from '../src/lib/security/keyword-rate-limit';
import { POST as researchRoute } from '../src/app/api/v1/keywords/research/route';
import { GET as legacyKeywordsRoute } from '../src/app/api/v1/keywords/route';
import { GET as historyRoute } from '../src/app/api/v1/keywords/history/route';
import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/db';

describe('Phase 6: Real Keyword Research Provider Architecture', () => {
  let userA: any;
  let userB: any;
  let sessionTokenA: string;
  let sessionTokenB: string;

  beforeAll(async () => {
    // Create test user A
    userA = await userRepository.create({
      email: `kw_user_a_${Date.now()}@example.com`,
      name: 'Keyword Tester A',
      passwordHash: hashPassword('SecurePass2026!'),
      role: 'USER',
    });
    const sA = await createSession(userA.id);
    sessionTokenA = sA.token;

    // Create test user B for isolation testing
    userB = await userRepository.create({
      email: `kw_user_b_${Date.now()}@example.com`,
      name: 'Keyword Tester B',
      passwordHash: hashPassword('SecurePass2026!'),
      role: 'USER',
    });
    const sB = await createSession(userB.id);
    sessionTokenB = sB.token;
  }, 20000);

  afterAll(async () => {
    try {
      if (userA) await userRepository.delete(userA.id);
      if (userB) await userRepository.delete(userB.id);
    } catch {
      // ignore
    }
  }, 20000);

  describe('1. Google Ads Keyword Planner Provider Abstraction', () => {
    it('detects unconfigured credentials safely without crashing', () => {
      const provider = new GoogleAdsKeywordProvider({
        developerToken: '',
        clientId: '',
        clientSecret: '',
        refreshToken: '',
        customerId: '',
      });

      expect(provider.isConfigured()).toBe(false);
    });

    it('detects configured credentials correctly', () => {
      const provider = new GoogleAdsKeywordProvider({
        developerToken: 'dummy_token',
        clientId: 'dummy_client_id.apps.googleusercontent.com',
        clientSecret: 'dummy_secret',
        refreshToken: 'dummy_refresh_token',
        customerId: '1234567890',
      });

      expect(provider.isConfigured()).toBe(true);
    });

    it('returns honest NOT_CONFIGURED state without fake data when credentials missing', async () => {
      const provider = new GoogleAdsKeywordProvider({
        developerToken: '',
        clientId: '',
        clientSecret: '',
        refreshToken: '',
        customerId: '',
      });

      const res = await provider.generateKeywordIdeas({
        seedKeyword: 'ai seo tools',
        location: 'US',
        language: 'en',
      });

      expect(res.status).toBe('NOT_CONFIGURED');
      expect(res.provider).toBe('google-ads');
      expect(res.totalResults).toBe(0);
      expect(res.results).toEqual([]);
      expect(res.message).toContain('Keyword research provider is not configured');
      expect(res.message).toContain('Connect a supported keyword data provider to retrieve live metrics');
    });

    it('normalizes Google Ads raw response into strongly typed KeywordResult with null for missing metrics', () => {
      const provider = new GoogleAdsKeywordProvider();

      const rawItem = {
        text: 'best seo audit software',
        keywordIdeaMetrics: {
          avgMonthlySearches: '14800',
          competition: 'MEDIUM',
          competitionIndex: '42',
          lowTopOfPageBidMicros: '1250000', // $1.25
          highTopOfPageBidMicros: '3800000', // $3.80
        },
      };

      const normalized = provider.normalizeItem(rawItem);
      expect(normalized.keyword).toBe('best seo audit software');
      expect(normalized.averageMonthlySearches).toBe(14800);
      expect(normalized.competition).toBe('MEDIUM');
      expect(normalized.competitionIndex).toBe(42);
      expect(normalized.lowTopOfPageBid).toBe(1.25);
      expect(normalized.highTopOfPageBid).toBe(3.8);
      expect(normalized.currency).toBe('USD');

      // Test with missing/unavailable metrics -> must normalize to null, never fake values
      const incompleteItem = {
        text: 'long tail obscure query',
        keywordIdeaMetrics: {},
      };

      const normalizedIncomplete = provider.normalizeItem(incompleteItem);
      expect(normalizedIncomplete.keyword).toBe('long tail obscure query');
      expect(normalizedIncomplete.averageMonthlySearches).toBeNull();
      expect(normalizedIncomplete.competition).toBeNull();
      expect(normalizedIncomplete.competitionIndex).toBeNull();
      expect(normalizedIncomplete.lowTopOfPageBid).toBeNull();
      expect(normalizedIncomplete.highTopOfPageBid).toBeNull();
    });

    it('maps official geoTargetConstants and languageConstants accurately', () => {
      expect(GOOGLE_ADS_GEO_TARGETS.US).toBe('geoTargetConstants/2840');
      expect(GOOGLE_ADS_GEO_TARGETS.UK).toBe('geoTargetConstants/2826');
      expect(GOOGLE_ADS_GEO_TARGETS.CA).toBe('geoTargetConstants/2124');
      expect(GOOGLE_ADS_GEO_TARGETS.AU).toBe('geoTargetConstants/2036');

      expect(GOOGLE_ADS_LANGUAGES.en).toBe('languageConstants/1000');
      expect(GOOGLE_ADS_LANGUAGES.de).toBe('languageConstants/1001');
      expect(GOOGLE_ADS_LANGUAGES.es).toBe('languageConstants/1003');
    });
  });

  describe('2. Google Trends Provider Abstraction (Compliance & No-Scraping)', () => {
    it('returns NOT_CONFIGURED honestly and never attempts to scrape Google Trends', async () => {
      const trendsProvider = new GoogleTrendsProvider();
      const res = await trendsProvider.getTrendData({ keyword: 'ai seo' });

      expect(res.status).toBe('NOT_CONFIGURED');
      expect(res.keyword).toBe('ai seo');
      expect(res.message).toContain('scraping is strictly prohibited');
    });
  });

  describe('3. PostgreSQL Persistence & Strict Multi-Tenant Isolation', () => {
    let researchRecordAId: string;
    let researchRecordBId: string;

    it('persists keyword research session and results to PostgreSQL for User A', async () => {
      const createdA = await keywordResearchRepository.create({
        userId: userA.id,
        provider: 'google-ads',
        seedKeyword: 'saas seo strategy',
        location: 'US',
        language: 'en',
        results: [
          {
            keyword: 'best saas seo strategy',
            averageMonthlySearches: 5400,
            competition: 'MEDIUM',
            competitionIndex: 45,
            lowTopOfPageBid: 1.1,
            highTopOfPageBid: 3.5,
            currency: 'USD',
          },
          {
            keyword: 'b2b saas organic growth',
            averageMonthlySearches: 12000,
            competition: 'HIGH',
            competitionIndex: 78,
            lowTopOfPageBid: 0.85,
            highTopOfPageBid: 2.2,
            currency: 'USD',
          },
        ],
      });

      expect(createdA.id).toBeDefined();
      expect(createdA.userId).toBe(userA.id);
      expect(createdA.totalResults).toBe(2);
      expect(createdA.results).toHaveLength(2);
      researchRecordAId = createdA.id;

      // Verify in database directly
      const dbRecord = await prisma.keywordResearch.findUnique({
        where: { id: createdA.id },
        include: { results: true },
      });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.results).toHaveLength(2);
      expect(dbRecord?.results[0].keyword).toBe('best saas seo strategy');
    }, 15000);

    it('persists keyword research session for User B', async () => {
      const createdB = await keywordResearchRepository.create({
        userId: userB.id,
        provider: 'google-ads',
        seedKeyword: 'ecommerce seo strategy',
        location: 'UK',
        language: 'en',
        results: [
          {
            keyword: 'shopify seo tips',
            averageMonthlySearches: 3200,
            competition: 'LOW',
            competitionIndex: 25,
            lowTopOfPageBid: 1.5,
            highTopOfPageBid: 4.2,
            currency: 'USD',
          },
        ],
      });

      researchRecordBId = createdB.id;
      expect(createdB.userId).toBe(userB.id);
    }, 15000);

    it('strictly isolates User A research from User B in getByUserId', async () => {
      const userAHistory = await keywordResearchRepository.getByUserId(userA.id);
      const userBHistory = await keywordResearchRepository.getByUserId(userB.id);

      expect(userAHistory.some((h) => h.id === researchRecordAId)).toBe(true);
      expect(userAHistory.some((h) => h.id === researchRecordBId)).toBe(false);

      expect(userBHistory.some((h) => h.id === researchRecordBId)).toBe(true);
      expect(userBHistory.some((h) => h.id === researchRecordAId)).toBe(false);
    }, 15000);

    it('forbids User B from reading User A record in getById', async () => {
      // User A can access their own record
      const ownerAccess = await keywordResearchRepository.getById(researchRecordAId, userA.id);
      expect(ownerAccess).not.toBeNull();
      expect(ownerAccess?.id).toBe(researchRecordAId);

      // User B cannot access User A's record
      const unauthorizedAccess = await keywordResearchRepository.getById(researchRecordAId, userB.id);
      expect(unauthorizedAccess).toBeNull();
    }, 15000);

    it('cascades delete when research is deleted', async () => {
      const deleted = await keywordResearchRepository.delete(researchRecordAId, userA.id);
      expect(deleted).toBe(true);

      const dbCheck = await prisma.keywordResearch.findUnique({
        where: { id: researchRecordAId },
      });
      expect(dbCheck).toBeNull();

      // Check results were cascaded
      const orphanedResults = await prisma.keywordResearchResult.findMany({
        where: { researchId: researchRecordAId },
      });
      expect(orphanedResults).toHaveLength(0);
    }, 15000);
  });

  describe('4. KeywordService & Provider Orchestration', () => {
    it('returns honest NOT_CONFIGURED state in production mode when credentials missing', async () => {
      const service = new KeywordService(
        new GoogleAdsKeywordProvider({
          developerToken: '',
          clientId: '',
          clientSecret: '',
          refreshToken: '',
          customerId: '',
        })
      );

      const res = await service.executeResearch({
        userId: userA.id,
        seedKeyword: 'ai writing software',
      });

      expect(res.status).toBe('NOT_CONFIGURED');
      expect(res.totalResults).toBe(0);
      expect(res.results).toEqual([]);
      expect(res.message).toContain('Keyword research provider is not configured');
    });

    it('supports isolated development demo mode when explicitly requested via constructor injection', async () => {
      const service = new KeywordService(new DemoKeywordProvider());

      const res = await service.executeResearch({
        userId: userA.id,
        seedKeyword: 'marketing automation',
      });

      expect(res.status).toBe('DEMO');
      expect(res.totalResults).toBeGreaterThan(0);
      expect(res.disclaimer).toContain('DEVELOPMENT / DEMO DATA');
      expect(res.id).toBeDefined(); // Persisted in PostgreSQL
    });

    it('defaults to GoogleAdsKeywordProvider and never DemoKeywordProvider', () => {
      const defaultService = new KeywordService();
      expect(defaultService.getProvider().id).toBe('google-ads');
      expect(keywordService.getProvider().id).toBe('google-ads');
    });
  });

  describe('5. Keyword Research API Routes & Security', () => {
    it('rejects unauthenticated requests to POST /api/v1/keywords/research with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/keywords/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedKeyword: 'test keyword',
        }),
      });

      const res = await researchRoute(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects invalid payload without seed keyword or URL with 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/keywords/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${sessionTokenA}`,
        },
        body: JSON.stringify({
          seedKeyword: '',
          seedUrl: '',
        }),
      });

      const res = await researchRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_REQUEST');
    });

    it('enforces rate limiting on excessive repeated requests', () => {
      resetKeywordRateLimit(userA.id);

      // Make 15 requests (allowed)
      for (let i = 0; i < 15; i++) {
        const check = checkKeywordRateLimit(userA.id);
        expect(check.allowed).toBe(true);
      }

      // 16th request must be blocked
      const blocked = checkKeywordRateLimit(userA.id);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.resetInSeconds).toBeGreaterThan(0);

      resetKeywordRateLimit(userA.id);
    });

    it('rejects unauthenticated requests to GET /api/v1/keywords/history with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/keywords/history');
      const res = await historyRoute(req);
      expect(res.status).toBe(401);
    });

    it('allows authenticated requests to GET /api/v1/keywords/history and returns user records', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/keywords/history', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionTokenA}`,
        },
      });

      const res = await historyRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.history)).toBe(true);
    });
  });

  describe('6. Regression Tests: Strict No Fake Data Policy', () => {
    it('verifies KeywordService.executeResearch returns NOT_CONFIGURED, 0 totalResults, and empty results when credentials missing', async () => {
      const service = new KeywordService();
      const res = await service.executeResearch({
        userId: userA.id,
        seedKeyword: 'ai seo tools',
      });

      expect(res.status).toBe('NOT_CONFIGURED');
      expect(res.totalResults).toBe(0);
      expect(res.results).toEqual([]);
      expect(res.message).toContain('Keyword research provider is not configured');
      expect(res.disclaimer).toContain('No keyword metrics are being shown');
    });

    it('verifies POST /api/v1/keywords/research returns KEYWORD_PROVIDER_NOT_CONFIGURED and 0 results when unconfigured', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/keywords/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${sessionTokenA}`,
        },
        body: JSON.stringify({
          seedKeyword: 'saas seo strategy',
          location: 'US',
          language: 'en',
        }),
      });

      const res = await researchRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.code).toBe('KEYWORD_PROVIDER_NOT_CONFIGURED');
      expect(json.error.code).toBe('KEYWORD_PROVIDER_NOT_CONFIGURED');
      expect(json.data.status).toBe('NOT_CONFIGURED');
      expect(json.data.totalResults).toBe(0);
      expect(json.data.results).toEqual([]);
    });

    it('verifies GET /api/v1/keywords returns KEYWORD_PROVIDER_NOT_CONFIGURED and empty items without fake metrics', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/keywords?query=best+ai+tools&country=US');
      const res = await legacyKeywordsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.code).toBe('KEYWORD_PROVIDER_NOT_CONFIGURED');
      expect(json.data.totalResults).toBe(0);
      expect(json.data.items).toEqual([]);
      expect(json.data.totalVolume).toBe(0);
      expect(json.data.averageCpc).toBe(0);
    });

    it('verifies keywordService.getKeywords returns empty items and 0 metrics when unconfigured', async () => {
      const res = await keywordService.getKeywords('testing keywords', 'US');
      expect(res.totalResults).toBe(0);
      expect(res.items).toEqual([]);
      expect(res.totalVolume).toBe(0);
      expect(res.averageCpc).toBe(0);
      expect(res.averageDifficulty).toBe(0);
      expect(res.disclaimer).toContain('Keyword research provider is not configured');
    });

    it('verifies DemoKeywordProvider is NEVER used as fallback in production service', () => {
      expect(keywordService.getProvider() instanceof GoogleAdsKeywordProvider).toBe(true);
      expect(keywordService.getProvider() instanceof DemoKeywordProvider).toBe(false);
    });
  });
});
