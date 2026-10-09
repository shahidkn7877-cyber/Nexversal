export type SearchIntent = 'informational' | 'commercial' | 'transactional' | 'navigational';

export interface KeywordItem {
  keyword: string;
  intent: SearchIntent;
  difficulty: number; // 0-100
  volume: number;
  cpc: number; // In USD
  competition: number; // 0.00 - 1.00
  trend: 'up' | 'stable' | 'down';
}

export interface KeywordResearchResult {
  query: string;
  country: string;
  provider: 'demo' | 'external' | 'google-ads';
  totalResults: number;
  averageDifficulty: number;
  totalVolume: number;
  averageCpc: number;
  items: KeywordItem[];
  disclaimer: string;
  timestamp: string;
}

export interface KeywordResult {
  keyword: string;
  averageMonthlySearches: number | null;
  competition: string | null;
  competitionIndex: number | null;
  lowTopOfPageBid: number | null;
  highTopOfPageBid: number | null;
  currency: string | null;
}

export interface KeywordResearchRequest {
  seedKeyword?: string;
  seedUrl?: string;
  location?: string;
  language?: string;
}

export interface KeywordResearchResponse {
  id?: string;
  provider: string;
  status: 'LIVE' | 'NOT_CONFIGURED' | 'ERROR' | 'DEMO';
  errorCode?: string;
  seedKeyword: string | null;
  seedUrl: string | null;
  location: string;
  language: string;
  totalResults: number;
  results: KeywordResult[];
  message?: string;
  disclaimer?: string;
  createdAt: string;
}

export interface KeywordResearchHistoryItem {
  id: string;
  userId: string;
  provider: string;
  seedKeyword: string | null;
  seedUrl: string | null;
  location: string;
  language: string;
  totalResults: number;
  createdAt: string;
  results: KeywordResult[];
}
