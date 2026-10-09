import { KeywordResearchRequest, KeywordResult } from '@/types/keywords';

export interface KeywordProviderResult {
  provider: string;
  status: 'LIVE' | 'NOT_CONFIGURED' | 'ERROR' | 'DEMO';
  errorCode?: string;
  results: KeywordResult[];
  totalResults: number;
  message?: string;
  disclaimer?: string;
}

export interface IKeywordProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  generateKeywordIdeas(params: KeywordResearchRequest): Promise<KeywordProviderResult>;
}
