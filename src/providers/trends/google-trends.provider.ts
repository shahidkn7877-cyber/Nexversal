import { ITrendsProvider, TrendsRequest, TrendsResponse } from './trends-provider.interface';

/**
 * Google Trends Provider abstraction.
 * Follows strict compliance rules: Does NOT scrape Google Trends pages or use unofficial reverse-engineered scrapers.
 * Returns NOT_CONFIGURED by default until an official enterprise API connector or authorized provider is provided.
 */
export class GoogleTrendsProvider implements ITrendsProvider {
  public readonly id = 'google-trends';
  public readonly name = 'Google Trends (Official Connector)';

  public isConfigured(): boolean {
    return Boolean(process.env.GOOGLE_TRENDS_API_KEY && process.env.GOOGLE_TRENDS_API_KEY.trim());
  }

  public async getTrendData(input: TrendsRequest): Promise<TrendsResponse> {
    if (!this.isConfigured()) {
      return {
        provider: this.id,
        status: 'NOT_CONFIGURED',
        keyword: input.keyword,
        message:
          'Official Google Trends API provider is not configured. Google Trends scraping is strictly prohibited by platform security policy.',
      };
    }

    return {
      provider: this.id,
      status: 'NOT_CONFIGURED',
      keyword: input.keyword,
      message: 'Configured trends provider connector is currently inactive.',
    };
  }
}
