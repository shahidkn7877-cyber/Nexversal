import * as cheerio from 'cheerio';
import { isSafeExternalUrl, safeFetchHtml } from '@/lib/security/ssrf';
import { MultiPageCrawlSummary, MultiPageCrawlPage } from '@/types/audit';
import { seoAuditService } from '@/services/audit.service';

export interface CrawlOptions {
  startUrl: string;
  maxPages?: number;
  maxDepth?: number;
  targetKeyword?: string;
}

export class MultiPageCrawlerService {
  /**
   * Performs an SSRF-protected multi-page crawl restricted strictly to the same domain.
   */
  public async crawlDomain(options: CrawlOptions): Promise<MultiPageCrawlSummary> {
    const rawStart = options.startUrl.trim();
    const safety = isSafeExternalUrl(rawStart);
    if (!safety.safe) {
      throw new Error(safety.reason || 'Starting URL failed security validation.');
    }

    const startParsed = new URL(rawStart);
    const rootHostname = startParsed.hostname.toLowerCase();
    const maxPages = Math.max(1, Math.min(25, options.maxPages || 5));
    const maxDepth = Math.max(1, Math.min(3, options.maxDepth || 2));
    const targetKeyword = options.targetKeyword || '';

    const visited = new Set<string>();
    const discovered = new Set<string>();
    const queue: Array<{ url: string; depth: number }> = [{ url: this.normalizeUrl(rawStart), depth: 1 }];
    discovered.add(this.normalizeUrl(rawStart));

    const pages: MultiPageCrawlPage[] = [];

    while (queue.length > 0 && pages.length < maxPages) {
      const current = queue.shift();
      if (!current) break;

      const currentUrl = current.url;
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      // Re-verify SSRF for each candidate URL
      const currentSafety = isSafeExternalUrl(currentUrl);
      if (!currentSafety.safe) {
        continue;
      }

      try {
        const fetchResult = await safeFetchHtml(currentUrl, 7000);
        const audit = seoAuditService.auditHtml(fetchResult.html, currentUrl, targetKeyword);

        pages.push({
          url: currentUrl,
          status: fetchResult.status,
          score: audit.score,
          passedCount: audit.passedCount,
          warningCount: audit.warningCount,
          criticalCount: audit.criticalCount,
          title: audit.pageData?.title,
          h1Text: audit.pageData?.h1Text,
          wordCount: audit.pageData?.wordCount || 0,
        });

        // If we haven't reached maxDepth, extract next internal links
        if (current.depth < maxDepth && pages.length + queue.length < maxPages * 2) {
          const $ = cheerio.load(fetchResult.html);
          $('a[href]').each((_, el) => {
            const rawHref = $(el).attr('href')?.trim();
            if (!rawHref) return;

            const resolved = this.resolveAndFilterUrl(rawHref, currentUrl, rootHostname);
            if (resolved && !discovered.has(resolved) && !visited.has(resolved)) {
              discovered.add(resolved);
              queue.push({ url: resolved, depth: current.depth + 1 });
            }
          });
        }
      } catch (err: unknown) {
        pages.push({
          url: currentUrl,
          status: 0,
          score: 0,
          passedCount: 0,
          warningCount: 0,
          criticalCount: 1,
          wordCount: 0,
          error: err instanceof Error ? err.message : 'Failed to crawl page',
        });
      }
    }

    const validScores = pages.filter((p) => p.status === 200).map((p) => p.score);
    const averageScore =
      validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;

    return {
      totalPages: pages.length,
      averageScore,
      maxDepth,
      totalLinksDiscovered: discovered.size,
      pages,
    };
  }

  private resolveAndFilterUrl(rawHref: string, baseUrl: string, allowedHostname: string): string | null {
    if (
      rawHref.startsWith('#') ||
      rawHref.startsWith('javascript:') ||
      rawHref.startsWith('mailto:') ||
      rawHref.startsWith('tel:')
    ) {
      return null;
    }

    try {
      const parsed = new URL(rawHref, baseUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }
      if (parsed.hostname.toLowerCase() !== allowedHostname) {
        return null;
      }
      // Filter out media/document binary files
      const pathname = parsed.pathname.toLowerCase();
      if (/\.(pdf|zip|tar|gz|jpg|jpeg|png|gif|svg|webp|mp4|mp3|exe|dmg|css|js)$/i.test(pathname)) {
        return null;
      }

      return this.normalizeUrl(parsed.toString());
    } catch {
      return null;
    }
  }

  public normalizeUrl(inputUrl: string): string {
    try {
      const u = new URL(inputUrl);
      // Strip hashes
      u.hash = '';
      // Remove marketing query params
      const searchParams = new URLSearchParams(u.search);
      const trackingKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
      trackingKeys.forEach((k) => searchParams.delete(k));
      u.search = searchParams.toString();

      // Normalize trailing slash (keep root '/')
      if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
        u.pathname = u.pathname.slice(0, -1);
      }
      return u.toString();
    } catch {
      return inputUrl.trim();
    }
  }
}

export const multiPageCrawlerService = new MultiPageCrawlerService();
