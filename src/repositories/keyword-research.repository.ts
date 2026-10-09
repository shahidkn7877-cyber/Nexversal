import { prisma } from '@/lib/db';
import { KeywordResearchHistoryItem, KeywordResult } from '@/types/keywords';

export interface CreateKeywordResearchInput {
  userId: string;
  provider: string;
  seedKeyword?: string | null;
  seedUrl?: string | null;
  location?: string;
  language?: string;
  results: KeywordResult[];
}

export class KeywordResearchRepository {
  /**
   * Persists a keyword research session and all associated normalized keyword metrics to PostgreSQL.
   */
  public async create(input: CreateKeywordResearchInput): Promise<KeywordResearchHistoryItem> {
    const research = await prisma.keywordResearch.create({
      data: {
        userId: input.userId,
        provider: input.provider,
        seedKeyword: input.seedKeyword || null,
        seedUrl: input.seedUrl || null,
        location: input.location || 'US',
        language: input.language || 'en',
        results: {
          create: input.results.map((r) => ({
            keyword: r.keyword,
            averageMonthlySearches: r.averageMonthlySearches,
            competition: r.competition,
            competitionIndex: r.competitionIndex,
            lowTopOfPageBid: r.lowTopOfPageBid,
            highTopOfPageBid: r.highTopOfPageBid,
            currency: r.currency || 'USD',
          })),
        },
      },
      include: {
        results: true,
      },
    });

    return {
      id: research.id,
      userId: research.userId,
      provider: research.provider,
      seedKeyword: research.seedKeyword,
      seedUrl: research.seedUrl,
      location: research.location,
      language: research.language,
      totalResults: research.results.length,
      createdAt: research.createdAt.toISOString(),
      results: research.results.map((r) => ({
        keyword: r.keyword,
        averageMonthlySearches: r.averageMonthlySearches,
        competition: r.competition,
        competitionIndex: r.competitionIndex,
        lowTopOfPageBid: r.lowTopOfPageBid,
        highTopOfPageBid: r.highTopOfPageBid,
        currency: r.currency,
      })),
    };
  }

  /**
   * Returns paginated research history strictly isolated to the specified userId.
   */
  public async getByUserId(userId: string, limit = 20): Promise<KeywordResearchHistoryItem[]> {
    const records = await prisma.keywordResearch.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        results: {
          take: 50,
        },
      },
    });

    return records.map((record) => ({
      id: record.id,
      userId: record.userId,
      provider: record.provider,
      seedKeyword: record.seedKeyword,
      seedUrl: record.seedUrl,
      location: record.location,
      language: record.language,
      totalResults: record.results.length,
      createdAt: record.createdAt.toISOString(),
      results: record.results.map((r) => ({
        keyword: r.keyword,
        averageMonthlySearches: r.averageMonthlySearches,
        competition: r.competition,
        competitionIndex: r.competitionIndex,
        lowTopOfPageBid: r.lowTopOfPageBid,
        highTopOfPageBid: r.highTopOfPageBid,
        currency: r.currency,
      })),
    }));
  }

  /**
   * Retrieves a single research record by ID, enforcing user isolation unless bypassAuth is true (e.g. admin).
   */
  public async getById(id: string, userId?: string): Promise<KeywordResearchHistoryItem | null> {
    const record = await prisma.keywordResearch.findUnique({
      where: { id },
      include: {
        results: true,
      },
    });

    if (!record) return null;

    // Strict user isolation check
    if (userId && record.userId !== userId) {
      return null;
    }

    return {
      id: record.id,
      userId: record.userId,
      provider: record.provider,
      seedKeyword: record.seedKeyword,
      seedUrl: record.seedUrl,
      location: record.location,
      language: record.language,
      totalResults: record.results.length,
      createdAt: record.createdAt.toISOString(),
      results: record.results.map((r) => ({
        keyword: r.keyword,
        averageMonthlySearches: r.averageMonthlySearches,
        competition: r.competition,
        competitionIndex: r.competitionIndex,
        lowTopOfPageBid: r.lowTopOfPageBid,
        highTopOfPageBid: r.highTopOfPageBid,
        currency: r.currency,
      })),
    };
  }

  /**
   * Count research sessions for a user or across the platform.
   */
  public async count(userId?: string): Promise<number> {
    return prisma.keywordResearch.count({
      where: userId ? { userId } : undefined,
    });
  }

  /**
   * Deletes a research record owned by a specific user.
   */
  public async delete(id: string, userId: string): Promise<boolean> {
    const existing = await prisma.keywordResearch.findFirst({
      where: { id, userId },
    });

    if (!existing) return false;

    await prisma.keywordResearch.delete({
      where: { id },
    });

    return true;
  }
}

export const keywordResearchRepository = new KeywordResearchRepository();
