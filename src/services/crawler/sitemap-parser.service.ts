import * as cheerio from 'cheerio';
import { safeFetchResource } from '@/lib/security/ssrf';

export interface SitemapResult {
  exists: boolean;
  url: string;
  totalUrls: number;
  containsTargetUrl: boolean;
  sampleUrls: string[];
  isSitemapIndex: boolean;
  subSitemapsCount: number;
  errorMessage?: string;
}

export class SitemapParserService {
  /**
   * Safely retrieves and parses an XML sitemap or sitemap index.
   * Checks whether the target URL is indexed inside the sitemap.
   */
  public async fetchAndParse(sitemapUrl: string, targetUrl?: string): Promise<SitemapResult> {
    try {
      const fetchRes = await safeFetchResource(sitemapUrl, 5000);
      if (fetchRes.status < 200 || fetchRes.status >= 300 || !fetchRes.text.trim()) {
        return {
          exists: false,
          url: sitemapUrl,
          totalUrls: 0,
          containsTargetUrl: false,
          sampleUrls: [],
          isSitemapIndex: false,
          subSitemapsCount: 0,
          errorMessage: `Sitemap returned HTTP ${fetchRes.status}`,
        };
      }

      return await this.parseXml(fetchRes.text, sitemapUrl, targetUrl);
    } catch (err: unknown) {
      return {
        exists: false,
        url: sitemapUrl,
        totalUrls: 0,
        containsTargetUrl: false,
        sampleUrls: [],
        isSitemapIndex: false,
        subSitemapsCount: 0,
        errorMessage: err instanceof Error ? err.message : 'Failed to retrieve XML sitemap',
      };
    }
  }

  /**
   * Parses XML content for <urlset> or <sitemapindex>.
   */
  public async parseXml(xmlContent: string, sitemapUrl: string, targetUrl?: string): Promise<SitemapResult> {
    const $ = cheerio.load(xmlContent, { xmlMode: true });

    // Check for Sitemap Index
    const sitemapNodes = $('sitemapindex > sitemap > loc');
    if (sitemapNodes.length > 0) {
      const subSitemapUrls: string[] = [];
      sitemapNodes.each((_, el) => {
        const text = $(el).text().trim();
        if (text) subSitemapUrls.push(text);
      });

      // Safely crawl up to 3 sub-sitemaps
      const crawledUrls: string[] = [];
      const inspectLimit = Math.min(3, subSitemapUrls.length);

      for (let i = 0; i < inspectLimit; i++) {
        try {
          const subRes = await safeFetchResource(subSitemapUrls[i], 3500);
          if (subRes.status === 200 && subRes.text) {
            const sub$ = cheerio.load(subRes.text, { xmlMode: true });
            sub$('urlset > url > loc').each((_, el) => {
              const url = sub$(el).text().trim();
              if (url) crawledUrls.push(url);
            });
          }
        } catch {
          // ignore individual sub-sitemap failure
        }
      }

      const containsTarget = targetUrl ? this.checkUrlContained(crawledUrls, targetUrl) : false;

      return {
        exists: true,
        url: sitemapUrl,
        totalUrls: crawledUrls.length,
        containsTargetUrl: containsTarget,
        sampleUrls: crawledUrls.slice(0, 10),
        isSitemapIndex: true,
        subSitemapsCount: subSitemapUrls.length,
      };
    }

    // Standard <urlset>
    const urlList: string[] = [];
    $('urlset > url > loc').each((_, el) => {
      const text = $(el).text().trim();
      if (text) urlList.push(text);
    });

    const containsTarget = targetUrl ? this.checkUrlContained(urlList, targetUrl) : false;

    return {
      exists: urlList.length > 0 || $('urlset').length > 0,
      url: sitemapUrl,
      totalUrls: urlList.length,
      containsTargetUrl: containsTarget,
      sampleUrls: urlList.slice(0, 10),
      isSitemapIndex: false,
      subSitemapsCount: 0,
    };
  }

  private checkUrlContained(urls: string[], targetUrl: string): boolean {
    const normalizedTarget = this.normalizeUrl(targetUrl);
    return urls.some((u) => this.normalizeUrl(u) === normalizedTarget);
  }

  private normalizeUrl(input: string): string {
    try {
      const u = new URL(input);
      let path = u.pathname;
      if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
      }
      return `${u.protocol}//${u.host}${path}`;
    } catch {
      return input.trim().toLowerCase();
    }
  }
}

export const sitemapParserService = new SitemapParserService();
