export interface TrendsRequest {
  keyword: string;
  geo?: string;
  timeframe?: string;
}

export interface InterestOverTimePoint {
  time: string;
  value: number;
}

export interface TrendsResponse {
  provider: string;
  status: 'LIVE' | 'NOT_CONFIGURED' | 'ERROR';
  keyword: string;
  trendDirection?: 'up' | 'stable' | 'down';
  interestOverTime?: InterestOverTimePoint[];
  relatedQueries?: string[];
  risingQueries?: string[];
  message?: string;
}

export interface ITrendsProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  getTrendData(input: TrendsRequest): Promise<TrendsResponse>;
}
