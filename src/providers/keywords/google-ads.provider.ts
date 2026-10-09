import { KeywordResearchRequest, KeywordResult } from '@/types/keywords';
import { IKeywordProvider, KeywordProviderResult } from './keyword-provider.interface';

// Official Google Ads API geoTargetConstants for common countries
export const GOOGLE_ADS_GEO_TARGETS: Record<string, string> = {
  US: 'geoTargetConstants/2840', // United States
  UK: 'geoTargetConstants/2826', // United Kingdom
  CA: 'geoTargetConstants/2124', // Canada
  AU: 'geoTargetConstants/2036', // Australia
  DE: 'geoTargetConstants/2276', // Germany
  FR: 'geoTargetConstants/2250', // France
  ES: 'geoTargetConstants/2724', // Spain
  IT: 'geoTargetConstants/2380', // Italy
  NL: 'geoTargetConstants/2528', // Netherlands
  PK: 'geoTargetConstants/2586', // Pakistan
  IN: 'geoTargetConstants/2356', // India
  BR: 'geoTargetConstants/2076', // Brazil
  JP: 'geoTargetConstants/2392', // Japan
};

// Official Google Ads API languageConstants
export const GOOGLE_ADS_LANGUAGES: Record<string, string> = {
  en: 'languageConstants/1000', // English
  de: 'languageConstants/1001', // German
  es: 'languageConstants/1003', // Spanish
  fr: 'languageConstants/1002', // French
  it: 'languageConstants/1004', // Italian
  pt: 'languageConstants/1014', // Portuguese
  ja: 'languageConstants/1005', // Japanese
  ur: 'languageConstants/1041', // Urdu
};

export interface GoogleAdsCredentials {
  developerToken?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  customerId?: string;
  loginCustomerId?: string;
}

export class GoogleAdsKeywordProvider implements IKeywordProvider {
  public readonly id = 'google-ads';
  public readonly name = 'Google Ads Keyword Planner';

  private credentialsOverride?: GoogleAdsCredentials;

  constructor(credentialsOverride?: GoogleAdsCredentials) {
    this.credentialsOverride = credentialsOverride;
  }

  private getCredentials(): GoogleAdsCredentials {
    return {
      developerToken: this.credentialsOverride?.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      clientId: this.credentialsOverride?.clientId || process.env.GOOGLE_ADS_CLIENT_ID,
      clientSecret: this.credentialsOverride?.clientSecret || process.env.GOOGLE_ADS_CLIENT_SECRET,
      refreshToken: this.credentialsOverride?.refreshToken || process.env.GOOGLE_ADS_REFRESH_TOKEN,
      customerId:
        this.credentialsOverride?.customerId ||
        process.env.GOOGLE_ADS_CUSTOMER_ID ||
        process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
      loginCustomerId:
        this.credentialsOverride?.loginCustomerId ||
        process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ||
        process.env.GOOGLE_ADS_CUSTOMER_ID,
    };
  }

  /**
   * Check whether all required Google Ads API credentials are set in environment.
   */
  public isConfigured(): boolean {
    const creds = this.getCredentials();
    return Boolean(
      creds.developerToken &&
        creds.developerToken.trim() &&
        creds.clientId &&
        creds.clientId.trim() &&
        creds.clientSecret &&
        creds.clientSecret.trim() &&
        creds.refreshToken &&
        creds.refreshToken.trim() &&
        creds.customerId &&
        creds.customerId.trim()
    );
  }

  /**
   * Exchanges refresh token for an ephemeral OAuth2 access token.
   */
  private async getAccessToken(creds: GoogleAdsCredentials): Promise<string> {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      client_id: creds.clientId!,
      client_secret: creds.clientSecret!,
      refresh_token: creds.refreshToken!,
      grant_type: 'refresh_token',
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error(`OAuth2 token exchange failed with status ${res.status}`);
    }

    const json = await res.json();
    if (!json.access_token) {
      throw new Error('OAuth2 response did not contain an access_token');
    }

    return json.access_token;
  }

  /**
   * Normalizes raw Google Ads GenerateKeywordIdeas result items into KeywordResult.
   */
  public normalizeItem(raw: any): KeywordResult {
    const metrics = raw.keywordIdeaMetrics || {};

    const averageMonthlySearches =
      metrics.avgMonthlySearches !== undefined && metrics.avgMonthlySearches !== null
        ? parseInt(String(metrics.avgMonthlySearches), 10)
        : null;

    const competition = metrics.competition ? String(metrics.competition) : null;

    const competitionIndex =
      metrics.competitionIndex !== undefined && metrics.competitionIndex !== null
        ? Math.min(100, Math.max(0, parseInt(String(metrics.competitionIndex), 10)))
        : null;

    const lowTopOfPageBid =
      metrics.lowTopOfPageBidMicros !== undefined && metrics.lowTopOfPageBidMicros !== null
        ? parseFloat((parseInt(String(metrics.lowTopOfPageBidMicros), 10) / 1_000_000).toFixed(2))
        : null;

    const highTopOfPageBid =
      metrics.highTopOfPageBidMicros !== undefined && metrics.highTopOfPageBidMicros !== null
        ? parseFloat((parseInt(String(metrics.highTopOfPageBidMicros), 10) / 1_000_000).toFixed(2))
        : null;

    return {
      keyword: String(raw.text || '').trim(),
      averageMonthlySearches: isNaN(averageMonthlySearches as any) ? null : averageMonthlySearches,
      competition,
      competitionIndex: isNaN(competitionIndex as any) ? null : competitionIndex,
      lowTopOfPageBid: isNaN(lowTopOfPageBid as any) ? null : lowTopOfPageBid,
      highTopOfPageBid: isNaN(highTopOfPageBid as any) ? null : highTopOfPageBid,
      currency: 'USD',
    };
  }

  /**
   * Generates keyword ideas via the official Google Ads Keyword Planner API.
   */
  public async generateKeywordIdeas(params: KeywordResearchRequest): Promise<KeywordProviderResult> {
    if (!this.isConfigured()) {
      return {
        provider: this.id,
        status: 'NOT_CONFIGURED',
        results: [],
        totalResults: 0,
        message:
          'Keyword research provider is not configured. Connect a supported keyword data provider to retrieve live metrics.',
        disclaimer: 'Live metrics require configured Google Ads Keyword Planner credentials in server environment.',
      };
    }

    const creds = this.getCredentials();
    const customerId = creds.customerId!.replace(/-/g, '').trim();
    const loginCustomerId = creds.loginCustomerId ? creds.loginCustomerId.replace(/-/g, '').trim() : customerId;

    try {
      const accessToken = await this.getAccessToken(creds);

      const locationKey = (params.location || 'US').toUpperCase();
      const geoTargetConstant = GOOGLE_ADS_GEO_TARGETS[locationKey] || GOOGLE_ADS_GEO_TARGETS.US;

      const languageKey = (params.language || 'en').toLowerCase();
      const languageConstant = GOOGLE_ADS_LANGUAGES[languageKey] || GOOGLE_ADS_LANGUAGES.en;

      // Construct official seed payload
      const requestBody: Record<string, any> = {
        language: languageConstant,
        geoTargetConstants: [geoTargetConstant],
        keywordPlanNetwork: 'GOOGLE_SEARCH',
      };

      const seedKw = params.seedKeyword?.trim();
      const seedUrl = params.seedUrl?.trim();

      if (seedKw && seedUrl) {
        requestBody.keywordAndUrlSeed = {
          keywords: [seedKw],
          url: seedUrl,
        };
      } else if (seedKw) {
        requestBody.keywordSeed = {
          keywords: [seedKw],
        };
      } else if (seedUrl) {
        requestBody.urlSeed = {
          url: seedUrl,
        };
      }

      const apiUrl = `https://googleads.googleapis.com/v19/customers/${customerId}:generateKeywordIdeas`;

      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': creds.developerToken!,
        'Content-Type': 'application/json',
      };

      if (loginCustomerId) {
        headers['login-customer-id'] = loginCustomerId;
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        return {
          provider: this.id,
          status: 'ERROR',
          results: [],
          totalResults: 0,
          message: 'Google Ads Keyword Planner request failed.',
          disclaimer: 'Keyword provider temporarily failed. Please try again later.',
        };
      }

      const data = await res.json();
      const rawResults = Array.isArray(data.results) ? data.results : [];
      const normalizedResults: KeywordResult[] = rawResults.map((r: any) => this.normalizeItem(r));

      return {
        provider: this.id,
        status: 'LIVE',
        results: normalizedResults,
        totalResults: normalizedResults.length,
        disclaimer: 'Live search metrics sourced directly from Google Ads Keyword Planner.',
      };
    } catch {
      return {
        provider: this.id,
        status: 'ERROR',
        results: [],
        totalResults: 0,
        message: 'Google Ads Keyword Planner communication error.',
        disclaimer: 'Keyword provider temporarily failed. Please try again later.',
      };
    }
  }
}
