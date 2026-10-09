import * as cheerio from 'cheerio';
import { safeFetchHtml, isSafeExternalUrl, SafeFetchHtmlResult } from '@/lib/security/ssrf';
import {
  AuditCheck,
  AuditResult,
  PageMetadata,
  ScoreBreakdown,
  ScoreDeduction,
  AuditSeverity,
  AuditCheckStatus,
} from '@/types/audit';
import { robotsParserService, RobotsTxtResult } from './crawler/robots-parser.service';
import { sitemapParserService, SitemapResult } from './crawler/sitemap-parser.service';

export interface AuditUrlOptions {
  checkRobotsTxt?: boolean;
  checkSitemap?: boolean;
}

export class SeoAuditService {
  /**
   * Performs a comprehensive, SSRF-protected technical and on-page SEO audit of a live URL.
   */
  public async auditUrl(
    rawUrl: string,
    rawKeyword = '',
    options: AuditUrlOptions = { checkRobotsTxt: true, checkSitemap: true }
  ): Promise<AuditResult> {
    const url = rawUrl.trim();
    const keyword = rawKeyword.trim().toLowerCase();

    // 1. SSRF Safety check on URL
    const safety = isSafeExternalUrl(url);
    if (!safety.safe) {
      return {
        id: 'audit-' + Date.now(),
        url,
        targetKeyword: rawKeyword,
        timestamp: new Date().toISOString(),
        score: 0,
        status: 'failed',
        passedCount: 0,
        warningCount: 0,
        criticalCount: 1,
        checks: [
          {
            id: 'ssrf_security',
            category: 'technical',
            title: 'Security / SSRF Violation',
            description: safety.reason || 'URL was rejected by security filters.',
            status: 'critical',
            severity: 'CRITICAL',
            value: 'Blocked',
            recommendation: 'Specify a public, routable web address.',
            weight: 15,
            penalty: 15,
          },
        ],
        errorMessage: safety.reason || 'URL was rejected by SSRF security filter.',
      };
    }

    // 2. Fetch HTML & measure network performance
    let fetchResult: SafeFetchHtmlResult;
    try {
      fetchResult = await safeFetchHtml(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve website HTML.';
      return {
        id: 'audit-' + Date.now(),
        url,
        targetKeyword: rawKeyword,
        timestamp: new Date().toISOString(),
        score: 0,
        status: 'failed',
        passedCount: 0,
        warningCount: 0,
        criticalCount: 1,
        checks: [
          {
            id: 'http_fetch',
            category: 'technical',
            title: 'HTTP Connection Failure',
            description: msg,
            status: 'critical',
            severity: 'CRITICAL',
            value: 'Error',
            recommendation: 'Verify the server is online, accessible, and returns HTML content.',
            weight: 15,
            penalty: 15,
          },
        ],
        errorMessage: msg,
      };
    }

    // 3. Optional server-side checks for robots.txt and sitemap
    let robotsResult: RobotsTxtResult | undefined;
    let sitemapResult: SitemapResult | undefined;

    if (options.checkRobotsTxt) {
      try {
        robotsResult = await robotsParserService.fetchAndParse(url);
      } catch {
        // Safe fallback
      }
    }

    if (options.checkSitemap) {
      try {
        // Use sitemap discovered in robots.txt or default to /sitemap.xml
        const sitemapCandidate =
          robotsResult && robotsResult.sitemaps.length > 0
            ? robotsResult.sitemaps[0]
            : `${new URL(url).origin}/sitemap.xml`;
        sitemapResult = await sitemapParserService.fetchAndParse(sitemapCandidate, url);
      } catch {
        // Safe fallback
      }
    }

    return this.auditHtml(
      fetchResult.html,
      url,
      rawKeyword,
      fetchResult,
      robotsResult,
      sitemapResult
    );
  }

  /**
   * Deterministic HTML and DOM SEO analyzer.
   */
  public auditHtml(
    html: string,
    rawUrl: string,
    rawKeyword = '',
    networkMeta?: Partial<SafeFetchHtmlResult>,
    robotsMeta?: RobotsTxtResult,
    sitemapMeta?: SitemapResult
  ): AuditResult {
    const url = rawUrl.trim();
    const keyword = rawKeyword.trim().toLowerCase();

    // Parse DOM with Cheerio
    const $ = cheerio.load(html);

    // =========================================================================
    // 1. DATA EXTRACTION
    // =========================================================================

    // On-Page Meta
    const title = $('title').first().text().trim() || '';
    const metaDescription =
      $('meta[name="description" i]').attr('content')?.trim() ||
      $('meta[property="og:description" i]').attr('content')?.trim() ||
      '';
    const canonicalUrl = $('link[rel="canonical" i]').attr('href')?.trim() || '';
    const rawRobotsContent = $('meta[name="robots" i]').attr('content')?.toLowerCase() || '';
    const xRobotsTag = networkMeta?.xRobotsTag ? networkMeta.xRobotsTag.toLowerCase() : '';
    const combinedRobots = [rawRobotsContent, xRobotsTag].filter(Boolean).join(', ');
    const noindex = combinedRobots.includes('noindex');
    const nofollow = combinedRobots.includes('nofollow');
    const isIndexable = !noindex;

    // Viewport & Charset
    const hasViewport = $('meta[name="viewport" i]').length > 0;
    const charset =
      $('meta[charset]').attr('charset')?.trim() ||
      $('meta[http-equiv="Content-Type" i]').attr('content')?.trim() ||
      '';
    const language = $('html').attr('lang')?.trim() || '';
    const favicon = $('link[rel*="icon" i]').attr('href')?.trim() || '';

    // Headings Analysis & Hierarchy
    const h1Elements = $('h1');
    const h1Count = h1Elements.length;
    const h1Text = h1Count > 0 ? $(h1Elements[0]).text().trim().replace(/\s+/g, ' ') : '';

    const h2Headings: string[] = [];
    $('h2').each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text) h2Headings.push(text);
    });
    const h2Count = h2Headings.length;
    const h3Count = $('h3').length;

    // Heading hierarchy validation: H1 -> H2 -> H3
    let headingHierarchyValid = true;
    let hierarchyIssueReason = '';
    const headingOrder: number[] = [];
    $(':header').each((_, el) => {
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      const level = parseInt(tag.replace('h', ''), 10);
      if (!isNaN(level) && level >= 1 && level <= 6) {
        headingOrder.push(level);
      }
    });

    if (headingOrder.length > 0) {
      if (headingOrder[0] !== 1) {
        headingHierarchyValid = false;
        hierarchyIssueReason = `Page begins with <H${headingOrder[0]}> instead of <H1>`;
      } else {
        for (let i = 1; i < headingOrder.length; i++) {
          const prev = headingOrder[i - 1];
          const curr = headingOrder[i];
          if (curr > prev + 1) {
            headingHierarchyValid = false;
            hierarchyIssueReason = `Heading level skipped: jumped from <H${prev}> to <H${curr}>`;
            break;
          }
        }
      }
    }

    // Structured Data (JSON-LD)
    const structuredDataTypes: string[] = [];
    const structuredDataErrors: string[] = [];
    let structuredDataCount = 0;
    let structuredDataValid = true;

    $('script[type="application/ld+json"]').each((_, el) => {
      structuredDataCount++;
      try {
        const rawJson = $(el).html();
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          const extractTypes = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;
            if (Array.isArray(obj)) {
              obj.forEach(extractTypes);
            } else {
              if (obj['@type']) {
                if (Array.isArray(obj['@type'])) {
                  obj['@type'].forEach((t: any) => structuredDataTypes.push(String(t)));
                } else {
                  structuredDataTypes.push(String(obj['@type']));
                }
              }
              if (obj['@graph'] && Array.isArray(obj['@graph'])) {
                obj['@graph'].forEach(extractTypes);
              }
            }
          };
          extractTypes(parsed);
        }
      } catch (err: unknown) {
        structuredDataValid = false;
        structuredDataErrors.push(err instanceof Error ? err.message : 'Invalid JSON format in JSON-LD script');
      }
    });
    const hasStructuredData = structuredDataTypes.length > 0;

    // Body Text & Word Count
    const clone$ = cheerio.load(html);
    clone$('script, style, noscript, nav, footer, header').remove();
    const bodyText = clone$('body').text().replace(/\s+/g, ' ').trim();
    const words = bodyText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Images Analysis
    const allImages = $('img');
    const imagesTotal = allImages.length;
    let imagesWithAlt = 0;
    let imagesEmptyAlt = 0;
    let imagesMissingAlt = 0;
    let imagesMissingDimensions = 0;
    let imagesLazyLoaded = 0;

    allImages.each((_, el) => {
      const altAttr = $(el).attr('alt');
      if (altAttr === undefined) {
        imagesMissingAlt++;
      } else if (altAttr.trim() === '') {
        imagesEmptyAlt++;
      } else {
        imagesWithAlt++;
      }

      const width = $(el).attr('width');
      const height = $(el).attr('height');
      if (!width || !height) {
        imagesMissingDimensions++;
      }

      const loading = $(el).attr('loading')?.toLowerCase();
      if (loading === 'lazy') {
        imagesLazyLoaded++;
      }
    });
    const imagesWithoutAlt = imagesMissingAlt + imagesEmptyAlt;

    // Links Analysis
    let internalLinksCount = 0;
    let externalLinksCount = 0;
    let brokenLinksCount = 0;
    let nofollowLinksCount = 0;
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      urlObj = new URL('https://example.com');
    }

    $('a[href]').each((_, el) => {
      const rawHref = $(el).attr('href')?.trim();
      const rel = $(el).attr('rel')?.toLowerCase() || '';

      if (rel.includes('nofollow')) {
        nofollowLinksCount++;
      }

      if (!rawHref || rawHref === '#' || rawHref.startsWith('javascript:void') || rawHref === 'javascript:;') {
        brokenLinksCount++;
        return;
      }

      if (rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
        return;
      }

      try {
        const linkUrl = new URL(rawHref, url);
        if (linkUrl.hostname === urlObj.hostname) {
          internalLinksCount++;
        } else {
          externalLinksCount++;
        }
      } catch {
        internalLinksCount++;
      }
    });

    const totalLinks = internalLinksCount + externalLinksCount + brokenLinksCount;
    const nofollowRatio = totalLinks > 0 ? parseFloat((nofollowLinksCount / totalLinks).toFixed(2)) : 0;

    // Technical Details
    const hasHttps = urlObj.protocol === 'https:';
    const httpStatus = networkMeta?.status || 200;
    const finalUrl = networkMeta?.finalUrl || url;
    const isRedirected = Boolean(networkMeta?.redirected);
    const responseTimeMs = networkMeta?.responseTimeMs || 0;
    const htmlSizeBytes = networkMeta?.contentSizeBytes || Buffer.byteLength(html, 'utf8');

    // Social Meta (Open Graph & Twitter Cards)
    const ogTitle = $('meta[property="og:title" i]').attr('content')?.trim();
    const ogDescription = $('meta[property="og:description" i]').attr('content')?.trim();
    const ogImage = $('meta[property="og:image" i]').attr('content')?.trim();
    const ogUrl = $('meta[property="og:url" i]').attr('content')?.trim();
    const ogType = $('meta[property="og:type" i]').attr('content')?.trim();

    const twitterCard = $('meta[name="twitter:card" i]').attr('content')?.trim();
    const twitterTitle = $('meta[name="twitter:title" i]').attr('content')?.trim();
    const twitterDescription = $('meta[name="twitter:description" i]').attr('content')?.trim();
    const twitterImage = $('meta[name="twitter:image" i]').attr('content')?.trim();

    // Keyword Analysis
    let keywordInTitle = false;
    let keywordInH1 = false;
    let keywordInDescription = false;
    let keywordInFirstParagraph = false;
    let keywordCountInBody = 0;
    let keywordDensity = 0;

    if (keyword) {
      keywordInTitle = title.toLowerCase().includes(keyword);
      keywordInH1 = h1Text.toLowerCase().includes(keyword);
      keywordInDescription = metaDescription.toLowerCase().includes(keyword);

      const firstParagraph = $('p').first().text().toLowerCase();
      keywordInFirstParagraph = firstParagraph.includes(keyword);

      const escapedKw = keyword.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const matches = bodyText.match(new RegExp('\\b' + escapedKw + '\\b', 'gi'));
      keywordCountInBody = matches ? matches.length : 0;
      if (wordCount > 0) {
        keywordDensity = parseFloat(((keywordCountInBody / wordCount) * 100).toFixed(2));
      }
    }

    // =========================================================================
    // 2. DETERMINISTIC SCORING & SEVERITY EVALUATION
    // =========================================================================

    const checks: AuditCheck[] = [];
    const deductions: ScoreDeduction[] = [];

    const addCheck = (check: {
      id: string;
      category: AuditCheck['category'];
      title: string;
      description: string;
      status: AuditCheckStatus;
      severity: AuditSeverity;
      value?: string | number | boolean | null;
      recommendation?: string;
      weight: number;
      penalty: number;
      deductionReason?: string;
    }) => {
      checks.push({
        id: check.id,
        category: check.category,
        title: check.title,
        description: check.description,
        status: check.status,
        severity: check.severity,
        value: check.value,
        recommendation: check.recommendation,
        weight: check.weight,
        penalty: check.penalty,
      });

      if (check.penalty > 0 && check.deductionReason) {
        deductions.push({
          checkId: check.id,
          checkTitle: check.title,
          severity: check.severity,
          penalty: check.penalty,
          reason: check.deductionReason,
        });
      }
    };

    // --- CHECK: HTTP Status & Connectivity ---
    if (httpStatus >= 400) {
      addCheck({
        id: 'http_status',
        category: 'technical',
        title: `HTTP Status Error (${httpStatus})`,
        description: `Server returned error status code ${httpStatus}.`,
        status: 'critical',
        severity: 'CRITICAL',
        value: httpStatus,
        recommendation: 'Ensure the page returns a 200 OK status code.',
        weight: 15,
        penalty: 15,
        deductionReason: `Server returned error status code ${httpStatus}`,
      });
    } else {
      addCheck({
        id: 'http_status',
        category: 'technical',
        title: `HTTP Status Code 200 OK`,
        description: `Server responded with healthy status code ${httpStatus}.`,
        status: 'passed',
        severity: 'INFO',
        value: `${httpStatus} OK`,
        weight: 10,
        penalty: 0,
      });
    }

    // --- CHECK: HTTPS Security ---
    if (!hasHttps) {
      addCheck({
        id: 'https_protocol',
        category: 'technical',
        title: 'Not Serving Over HTTPS',
        description: 'The URL uses unencrypted HTTP protocol.',
        status: 'critical',
        severity: 'CRITICAL',
        value: 'HTTP',
        recommendation: 'Migrate to HTTPS with an active SSL certificate to protect visitor data and SEO ranking.',
        weight: 10,
        penalty: 15,
        deductionReason: 'Site is served over insecure HTTP instead of HTTPS',
      });
    } else {
      addCheck({
        id: 'https_protocol',
        category: 'technical',
        title: 'Secure HTTPS Connection',
        description: 'Site is served securely over HTTPS protocol.',
        status: 'passed',
        severity: 'INFO',
        value: 'HTTPS Active',
        weight: 10,
        penalty: 0,
      });
    }

    // --- CHECK: Title Tag ---
    if (!title) {
      addCheck({
        id: 'title_tag',
        category: 'meta',
        title: 'Title Tag Missing',
        description: 'No <title> tag was found on the page.',
        status: 'critical',
        severity: 'CRITICAL',
        value: 'Missing',
        recommendation: 'Add a descriptive <title> tag between 50 and 60 characters.',
        weight: 10,
        penalty: 15,
        deductionReason: 'Missing <title> tag on page',
      });
    } else if (title.length < 30 || title.length > 65) {
      addCheck({
        id: 'title_tag',
        category: 'meta',
        title: 'Title Tag Suboptimal Length',
        description: `Title length is ${title.length} characters (recommended 30-65 chars).`,
        status: 'warning',
        severity: 'HIGH',
        value: `${title} (${title.length} chars)`,
        recommendation: 'Adjust title length between 50 and 60 characters to avoid SERP snippet truncation.',
        weight: 10,
        penalty: 8,
        deductionReason: `Title tag length (${title.length} chars) is outside optimal 30-65 character range`,
      });
    } else {
      addCheck({
        id: 'title_tag',
        category: 'meta',
        title: 'Title Tag Length Optimal',
        description: `Title tag is ${title.length} characters, well within optimal length.`,
        status: 'passed',
        severity: 'INFO',
        value: title,
        weight: 10,
        penalty: 0,
      });
    }

    // --- CHECK: Meta Description ---
    if (!metaDescription) {
      addCheck({
        id: 'meta_description',
        category: 'meta',
        title: 'Meta Description Missing',
        description: 'No meta description tag was detected.',
        status: 'critical',
        severity: 'HIGH',
        value: 'Missing',
        recommendation: 'Add a compelling meta description between 120 and 160 characters to maximize organic CTR.',
        weight: 10,
        penalty: 8,
        deductionReason: 'Missing meta description tag',
      });
    } else if (metaDescription.length < 70 || metaDescription.length > 165) {
      addCheck({
        id: 'meta_description',
        category: 'meta',
        title: 'Meta Description Suboptimal Length',
        description: `Meta description is ${metaDescription.length} characters (ideal: 120-160 chars).`,
        status: 'warning',
        severity: 'LOW',
        value: `${metaDescription} (${metaDescription.length} chars)`,
        recommendation: 'Refine meta description length between 120 and 160 characters.',
        weight: 10,
        penalty: 1,
        deductionReason: `Meta description length (${metaDescription.length} chars) is outside optimal 120-160 range`,
      });
    } else {
      addCheck({
        id: 'meta_description',
        category: 'meta',
        title: 'Meta Description Optimal',
        description: `Meta description is ${metaDescription.length} characters.`,
        status: 'passed',
        severity: 'INFO',
        value: metaDescription,
        weight: 10,
        penalty: 0,
      });
    }

    // --- CHECK: Primary H1 Heading ---
    if (h1Count === 0) {
      addCheck({
        id: 'h1_heading',
        category: 'content',
        title: 'Primary H1 Tag Missing',
        description: 'Page does not contain an <h1> headline.',
        status: 'critical',
        severity: 'CRITICAL',
        value: 0,
        recommendation: 'Add exactly one <h1> headline containing your primary topic.',
        weight: 10,
        penalty: 15,
        deductionReason: 'Page lacks an H1 heading',
      });
    } else if (h1Count > 1) {
      addCheck({
        id: 'h1_heading',
        category: 'content',
        title: 'Multiple H1 Tags Detected',
        description: `Found ${h1Count} <h1> tags. Best practice is exactly one primary H1 headline per page.`,
        status: 'warning',
        severity: 'MEDIUM',
        value: h1Count,
        recommendation: 'Consolidate down to a single <h1> heading and convert secondary headers to <h2>.',
        weight: 10,
        penalty: 4,
        deductionReason: `Multiple H1 headlines detected (${h1Count} found)`,
      });
    } else {
      addCheck({
        id: 'h1_heading',
        category: 'content',
        title: 'Single H1 Heading Present',
        description: 'Page has exactly one clear <h1> headline.',
        status: 'passed',
        severity: 'INFO',
        value: h1Text,
        weight: 10,
        penalty: 0,
      });
    }

    // --- CHECK: Heading Hierarchy ---
    if (!headingHierarchyValid) {
      addCheck({
        id: 'heading_hierarchy',
        category: 'content',
        title: 'Heading Hierarchy Skipped',
        description: hierarchyIssueReason,
        status: 'warning',
        severity: 'MEDIUM',
        value: hierarchyIssueReason,
        recommendation: 'Ensure heading levels step down logically (H1 -> H2 -> H3) without skipping levels.',
        weight: 5,
        penalty: 4,
        deductionReason: hierarchyIssueReason,
      });
    } else {
      addCheck({
        id: 'heading_hierarchy',
        category: 'content',
        title: 'Heading Hierarchy Ordered',
        description: 'Headings follow logical sequential order (H1 to H2 to H3).',
        status: 'passed',
        severity: 'INFO',
        value: 'Sequential Order',
        weight: 5,
        penalty: 0,
      });
    }

    // --- CHECK: H2 Subheadings ---
    if (h2Count < 2) {
      addCheck({
        id: 'h2_headings',
        category: 'content',
        title: 'Few or No H2 Subheadings',
        description: `Found ${h2Count} <h2> subheadings. Structured content should break topics with H2s.`,
        status: 'warning',
        severity: 'MEDIUM',
        value: h2Count,
        recommendation: 'Add at least 2 to 4 <h2> subheadings to improve scannability.',
        weight: 5,
        penalty: 4,
        deductionReason: `Too few H2 subheadings found (${h2Count} found)`,
      });
    } else {
      addCheck({
        id: 'h2_headings',
        category: 'content',
        title: 'Well-Structured H2 Subheadings',
        description: `Found ${h2Count} <h2> subheadings providing clear content hierarchy.`,
        status: 'passed',
        severity: 'INFO',
        value: `${h2Count} H2s`,
        weight: 5,
        penalty: 0,
      });
    }

    // --- CHECK: Mobile Viewport ---
    if (!hasViewport) {
      addCheck({
        id: 'mobile_viewport',
        category: 'technical',
        title: 'Mobile Viewport Tag Missing',
        description: 'No <meta name="viewport"> tag detected.',
        status: 'critical',
        severity: 'HIGH',
        value: 'Missing',
        recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> for responsive mobile display.',
        weight: 5,
        penalty: 8,
        deductionReason: 'Missing responsive viewport meta tag',
      });
    } else {
      addCheck({
        id: 'mobile_viewport',
        category: 'technical',
        title: 'Mobile Viewport Configured',
        description: 'Responsive viewport meta tag is present.',
        status: 'passed',
        severity: 'INFO',
        value: 'Present',
        weight: 5,
        penalty: 0,
      });
    }

    // --- CHECK: Robots Meta Directives ---
    if (noindex) {
      addCheck({
        id: 'robots_meta',
        category: 'technical',
        title: 'Page Blocked from Indexing (noindex)',
        description: `Robots directive contains 'noindex': ${combinedRobots}`,
        status: 'critical',
        severity: 'CRITICAL',
        value: combinedRobots,
        recommendation: 'Remove noindex directive if you want search engines to crawl and index this page.',
        weight: 5,
        penalty: 15,
        deductionReason: "Page has 'noindex' directive blocking search engines",
      });
    } else if (nofollow) {
      addCheck({
        id: 'robots_meta',
        category: 'technical',
        title: 'Robots Nofollow Active',
        description: "Robots directive specifies 'nofollow', preventing link authority pass-through.",
        status: 'warning',
        severity: 'MEDIUM',
        value: combinedRobots,
        recommendation: 'Review nofollow directive to ensure search engines can follow internal references.',
        weight: 5,
        penalty: 4,
        deductionReason: "Page has 'nofollow' robots directive",
      });
    } else {
      addCheck({
        id: 'robots_meta',
        category: 'technical',
        title: 'Search Engine Indexable',
        description: 'Page allows indexing and search engine crawl bots.',
        status: 'passed',
        severity: 'INFO',
        value: combinedRobots || 'Indexable (default)',
        weight: 5,
        penalty: 0,
      });
    }

    // --- CHECK: Robots.txt Disallow ---
    if (robotsMeta && robotsMeta.exists && !robotsMeta.allowed) {
      addCheck({
        id: 'robots_txt_status',
        category: 'technical',
        title: 'Blocked by robots.txt',
        description: `URL path is blocked by robots.txt rule: ${robotsMeta.matchedRule || 'Disallow'}`,
        status: 'critical',
        severity: 'CRITICAL',
        value: robotsMeta.matchedRule || 'Disallowed',
        recommendation: 'Update your robots.txt file to allow search bots to crawl this URL.',
        weight: 10,
        penalty: 15,
        deductionReason: 'Target URL is blocked by robots.txt',
      });
    } else if (robotsMeta && robotsMeta.exists) {
      addCheck({
        id: 'robots_txt_status',
        category: 'technical',
        title: 'Robots.txt Allows Crawling',
        description: `robots.txt is active and allows crawling for this URL path.`,
        status: 'passed',
        severity: 'INFO',
        value: 'Allowed',
        weight: 5,
        penalty: 0,
      });
    }

    // --- CHECK: Canonical Tag ---
    if (!canonicalUrl) {
      addCheck({
        id: 'canonical_tag',
        category: 'technical',
        title: 'Canonical Tag Missing',
        description: 'No <link rel="canonical"> tag found.',
        status: 'warning',
        severity: 'MEDIUM',
        value: 'None',
        recommendation: 'Add a self-referencing canonical URL tag to prevent duplicate content indexing.',
        weight: 5,
        penalty: 4,
        deductionReason: 'Missing canonical URL link tag',
      });
    } else {
      addCheck({
        id: 'canonical_tag',
        category: 'technical',
        title: 'Canonical Tag Present',
        description: 'Canonical URL is properly declared.',
        status: 'passed',
        severity: 'INFO',
        value: canonicalUrl,
        weight: 5,
        penalty: 0,
      });
    }

    // --- CHECK: Image Alt Attributes ---
    if (imagesTotal > 0 && imagesWithoutAlt > 0) {
      const missingRatio = imagesWithoutAlt / imagesTotal;
      if (missingRatio > 0.4) {
        addCheck({
          id: 'image_alt',
          category: 'content',
          title: 'Missing Image Alt Attributes',
          description: `${imagesWithoutAlt} of ${imagesTotal} images lack alt attributes.`,
          status: 'warning',
          severity: 'HIGH',
          value: `${imagesWithoutAlt} missing alt`,
          recommendation: 'Add descriptive alt text to all informative images for accessibility and image search.',
          weight: 5,
          penalty: 8,
          deductionReason: `High proportion of images (${imagesWithoutAlt}/${imagesTotal}) missing alt text`,
        });
      } else {
        addCheck({
          id: 'image_alt',
          category: 'content',
          title: 'Some Images Missing Alt Text',
          description: `${imagesWithoutAlt} of ${imagesTotal} images lack alt text.`,
          status: 'warning',
          severity: 'MEDIUM',
          value: `${imagesWithAlt}/${imagesTotal} with alt`,
          recommendation: 'Review remaining images and add descriptive alt text.',
          weight: 5,
          penalty: 4,
          deductionReason: `Some images (${imagesWithoutAlt}/${imagesTotal}) missing alt text`,
        });
      }
    } else {
      addCheck({
        id: 'image_alt',
        category: 'content',
        title: 'Image Alt Text Complete',
        description: imagesTotal === 0 ? 'No images on page.' : `All ${imagesTotal} images have alt attributes.`,
        status: 'passed',
        severity: 'INFO',
        value: imagesTotal === 0 ? 'No images' : `${imagesTotal}/${imagesTotal} alt tags`,
        weight: 5,
        penalty: 0,
      });
    }

    // --- CHECK: Image Dimensions (Layout Shift / CLS) ---
    if (imagesMissingDimensions > 0) {
      addCheck({
        id: 'image_dimensions',
        category: 'images',
        title: 'Images Missing Width/Height Dimensions',
        description: `${imagesMissingDimensions} images lack explicit width or height attributes, risking layout shifts.`,
        status: 'warning',
        severity: 'LOW',
        value: `${imagesMissingDimensions} unconstrained`,
        recommendation: 'Specify explicit width and height attributes on <img> tags to reduce Cumulative Layout Shift (CLS).',
        weight: 3,
        penalty: 1,
        deductionReason: `${imagesMissingDimensions} images lack explicit dimensions`,
      });
    } else {
      addCheck({
        id: 'image_dimensions',
        category: 'images',
        title: 'Image Dimensions Specified',
        description: imagesTotal === 0 ? 'No images on page.' : 'All images specify width and height dimensions.',
        status: 'passed',
        severity: 'INFO',
        value: 'Dimensions Specified',
        weight: 3,
        penalty: 0,
      });
    }

    // --- CHECK: Content Word Count ---
    if (wordCount < 300) {
      addCheck({
        id: 'word_count',
        category: 'content',
        title: 'Thin Content Detected',
        description: `Body text has only ${wordCount} words (minimum recommended: 600+ words).`,
        status: 'critical',
        severity: 'HIGH',
        value: `${wordCount} words`,
        recommendation: 'Expand content with authoritative explanations, FAQs, and step-by-step guidance.',
        weight: 10,
        penalty: 8,
        deductionReason: `Thin body content (${wordCount} words; recommended >= 600)`,
      });
    } else if (wordCount < 600) {
      addCheck({
        id: 'word_count',
        category: 'content',
        title: 'Moderate Content Depth',
        description: `Page has ${wordCount} words. Authoritative articles typically reach 1,000+ words.`,
        status: 'warning',
        severity: 'MEDIUM',
        value: `${wordCount} words`,
        recommendation: 'Consider adding more depth and sub-topics to compete with top-ranking competitors.',
        weight: 10,
        penalty: 4,
        deductionReason: `Moderate content length (${wordCount} words)`,
      });
    } else {
      addCheck({
        id: 'word_count',
        category: 'content',
        title: 'Strong Content Depth',
        description: `Page contains ${wordCount} words of readable body text.`,
        status: 'passed',
        severity: 'INFO',
        value: `${wordCount} words`,
        weight: 10,
        penalty: 0,
      });
    }

    // --- CHECK: Keyword Placement ---
    if (keyword) {
      if (!keywordInTitle) {
        addCheck({
          id: 'keyword_title',
          category: 'meta',
          title: 'Target Keyword Missing from Title',
          description: `The title does not include the target keyword '${rawKeyword}'.`,
          status: 'warning',
          severity: 'MEDIUM',
          value: 'Not in title',
          recommendation: `Incorporate '${rawKeyword}' near the beginning of your <title> tag.`,
          weight: 5,
          penalty: 4,
          deductionReason: `Target keyword '${rawKeyword}' not found in <title>`,
        });
      } else {
        addCheck({
          id: 'keyword_title',
          category: 'meta',
          title: 'Target Keyword in Title',
          description: `Target keyword '${rawKeyword}' found in page title.`,
          status: 'passed',
          severity: 'INFO',
          value: 'Found in title',
          weight: 5,
          penalty: 0,
        });
      }

      if (!keywordInH1) {
        addCheck({
          id: 'keyword_h1',
          category: 'content',
          title: 'Target Keyword Missing from H1',
          description: `The primary H1 does not include '${rawKeyword}'.`,
          status: 'warning',
          severity: 'LOW',
          value: 'Not in H1',
          recommendation: `Include '${rawKeyword}' in the main H1 headline.`,
          weight: 5,
          penalty: 1,
          deductionReason: `Target keyword '${rawKeyword}' not in H1 heading`,
        });
      } else {
        addCheck({
          id: 'keyword_h1',
          category: 'content',
          title: 'Target Keyword in H1 Headline',
          description: `Primary H1 headline features '${rawKeyword}'.`,
          status: 'passed',
          severity: 'INFO',
          value: 'Found in H1',
          weight: 5,
          penalty: 0,
        });
      }
    } else {
      addCheck({
        id: 'keyword_check',
        category: 'content',
        title: 'Target Keyword Not Specified',
        description: 'Provide a target keyword in the audit input for keyword placement analysis.',
        status: 'passed',
        severity: 'INFO',
        value: 'None specified',
        weight: 10,
        penalty: 0,
      });
    }

    // --- CHECK: Internal Links ---
    if (internalLinksCount === 0) {
      addCheck({
        id: 'internal_links',
        category: 'links',
        title: 'No Internal Links Found',
        description: 'Page does not link to any internal site pages.',
        status: 'warning',
        severity: 'HIGH',
        value: '0 internal links',
        recommendation: 'Add relevant internal links to help users navigate and distribute PageRank authority.',
        weight: 5,
        penalty: 8,
        deductionReason: 'Zero internal links found on page',
      });
    } else {
      addCheck({
        id: 'internal_links',
        category: 'links',
        title: 'Internal Links Present',
        description: `Found ${internalLinksCount} internal links and ${externalLinksCount} external links.`,
        status: 'passed',
        severity: 'INFO',
        value: `${internalLinksCount} internal, ${externalLinksCount} external`,
        weight: 5,
        penalty: 0,
      });
    }

    // --- CHECK: Broken / Empty Links ---
    if (brokenLinksCount > 3) {
      addCheck({
        id: 'broken_links',
        category: 'links',
        title: 'Multiple Broken / Empty Links Detected',
        description: `Found ${brokenLinksCount} empty or placeholder links (href="#" or href="").`,
        status: 'warning',
        severity: 'HIGH',
        value: `${brokenLinksCount} empty/placeholder`,
        recommendation: 'Replace placeholder anchor tags with valid destination URLs.',
        weight: 5,
        penalty: 8,
        deductionReason: `Detected ${brokenLinksCount} empty or broken placeholder links`,
      });
    } else if (brokenLinksCount > 0) {
      addCheck({
        id: 'broken_links',
        category: 'links',
        title: 'Some Placeholder Links Detected',
        description: `Found ${brokenLinksCount} links with empty or '#' targets.`,
        status: 'warning',
        severity: 'MEDIUM',
        value: `${brokenLinksCount} links`,
        recommendation: 'Review and update placeholder anchor href attributes.',
        weight: 5,
        penalty: 4,
        deductionReason: `Detected ${brokenLinksCount} placeholder links`,
      });
    } else {
      addCheck({
        id: 'broken_links',
        category: 'links',
        title: 'Link Integrity Valid',
        description: 'No broken, empty, or void placeholder links detected.',
        status: 'passed',
        severity: 'INFO',
        value: 'All Links Valid',
        weight: 5,
        penalty: 0,
      });
    }

    // --- CHECK: Social Open Graph Tags ---
    if (!ogTitle || !ogImage) {
      addCheck({
        id: 'social_tags',
        category: 'social',
        title: 'Incomplete Open Graph Metadata',
        description: 'Missing og:title or og:image meta tags.',
        status: 'warning',
        severity: 'MEDIUM',
        value: !ogTitle ? 'Missing og:title' : 'Missing og:image',
        recommendation: 'Add complete Open Graph (og:title, og:description, og:image) tags for social media sharing.',
        weight: 5,
        penalty: 4,
        deductionReason: 'Incomplete Open Graph social meta tags (missing title or image)',
      });
    } else {
      addCheck({
        id: 'social_tags',
        category: 'social',
        title: 'Open Graph Metadata Configured',
        description: 'og:title and og:image tags are present for rich sharing snippets.',
        status: 'passed',
        severity: 'INFO',
        value: 'OG Tags Configured',
        weight: 5,
        penalty: 0,
      });
    }

    // --- CHECK: Twitter Cards ---
    if (!twitterCard) {
      addCheck({
        id: 'twitter_cards',
        category: 'social',
        title: 'Twitter Card Tags Missing',
        description: 'No twitter:card meta tag found for Twitter/X sharing previews.',
        status: 'warning',
        severity: 'LOW',
        value: 'Missing',
        recommendation: 'Add <meta name="twitter:card" content="summary_large_image"> for rich cards on X/Twitter.',
        weight: 3,
        penalty: 1,
        deductionReason: 'Missing twitter:card meta tag',
      });
    } else {
      addCheck({
        id: 'twitter_cards',
        category: 'social',
        title: 'Twitter Card Configured',
        description: `Twitter card configured (${twitterCard}).`,
        status: 'passed',
        severity: 'INFO',
        value: twitterCard,
        weight: 3,
        penalty: 0,
      });
    }

    // --- CHECK: Structured Data (JSON-LD) ---
    if (!structuredDataValid) {
      addCheck({
        id: 'structured_data',
        category: 'structured-data',
        title: 'Malformed JSON-LD Script',
        description: `Structured data contains syntax errors: ${structuredDataErrors.join('; ')}`,
        status: 'critical',
        severity: 'HIGH',
        value: 'Syntax Error',
        recommendation: 'Fix JSON syntax in your application/ld+json script tags.',
        weight: 5,
        penalty: 8,
        deductionReason: 'Malformed JSON-LD structured data script',
      });
    } else if (!hasStructuredData) {
      addCheck({
        id: 'structured_data',
        category: 'structured-data',
        title: 'No Schema Structured Data Found',
        description: 'No JSON-LD structured data script found.',
        status: 'warning',
        severity: 'LOW',
        value: 'None detected',
        recommendation: 'Add JSON-LD schema (e.g. Article, Organization, or FAQPage) to earn Google rich results.',
        weight: 5,
        penalty: 2,
        deductionReason: 'No JSON-LD structured data schema detected',
      });
    } else {
      addCheck({
        id: 'structured_data',
        category: 'structured-data',
        title: 'Structured Data (JSON-LD) Detected',
        description: `Detected Schema entities: ${structuredDataTypes.join(', ')}`,
        status: 'passed',
        severity: 'INFO',
        value: structuredDataTypes.join(', '),
        weight: 5,
        penalty: 0,
      });
    }

    // --- CHECK: Charset & HTML Language ---
    if (!charset) {
      addCheck({
        id: 'charset_meta',
        category: 'technical',
        title: 'Character Encoding Declaration Missing',
        description: 'No <meta charset="UTF-8"> tag found.',
        status: 'warning',
        severity: 'LOW',
        value: 'Missing',
        recommendation: 'Add <meta charset="UTF-8"> at the top of the <head> element.',
        weight: 3,
        penalty: 1,
        deductionReason: 'Missing charset character encoding declaration',
      });
    } else {
      addCheck({
        id: 'charset_meta',
        category: 'technical',
        title: 'Character Encoding Declared',
        description: `Character encoding declared: ${charset}`,
        status: 'passed',
        severity: 'INFO',
        value: charset,
        weight: 3,
        penalty: 0,
      });
    }

    if (!language) {
      addCheck({
        id: 'html_language',
        category: 'on-page',
        title: 'HTML Lang Attribute Missing',
        description: 'The root <html> element is missing a lang attribute (e.g. lang="en").',
        status: 'warning',
        severity: 'LOW',
        value: 'Missing',
        recommendation: 'Specify language on the <html> tag to aid search engines and screen readers.',
        weight: 3,
        penalty: 1,
        deductionReason: 'Missing lang attribute on root <html> tag',
      });
    } else {
      addCheck({
        id: 'html_language',
        category: 'on-page',
        title: 'HTML Lang Attribute Present',
        description: `Language specified: ${language}`,
        status: 'passed',
        severity: 'INFO',
        value: language,
        weight: 3,
        penalty: 0,
      });
    }

    // --- CHECK: Favicon ---
    if (!favicon) {
      addCheck({
        id: 'favicon_check',
        category: 'on-page',
        title: 'Favicon Missing',
        description: 'No favicon link tag (<link rel="icon">) was found.',
        status: 'warning',
        severity: 'LOW',
        value: 'Missing',
        recommendation: 'Add a high-resolution favicon for Google mobile search results and browser tabs.',
        weight: 2,
        penalty: 1,
        deductionReason: 'Missing favicon link tag',
      });
    } else {
      addCheck({
        id: 'favicon_check',
        category: 'on-page',
        title: 'Favicon Detected',
        description: 'Favicon is properly declared in page head.',
        status: 'passed',
        severity: 'INFO',
        value: favicon,
        weight: 2,
        penalty: 0,
      });
    }

    // --- CHECK: Server Response Time ---
    if (responseTimeMs > 2500) {
      addCheck({
        id: 'response_time',
        category: 'technical',
        title: 'Slow Server Response Time',
        description: `Initial HTML response took ${responseTimeMs}ms (recommended < 800ms).`,
        status: 'warning',
        severity: 'HIGH',
        value: `${responseTimeMs}ms`,
        recommendation: 'Enable edge caching, CDN, and optimize backend query times.',
        weight: 5,
        penalty: 8,
        deductionReason: `Server response time is slow (${responseTimeMs}ms)`,
      });
    } else if (responseTimeMs > 1000) {
      addCheck({
        id: 'response_time',
        category: 'technical',
        title: 'Moderate Response Time',
        description: `HTML responded in ${responseTimeMs}ms.`,
        status: 'warning',
        severity: 'LOW',
        value: `${responseTimeMs}ms`,
        recommendation: 'Aim for Time to First Byte (TTFB) under 800ms.',
        weight: 5,
        penalty: 1,
        deductionReason: `Moderate server response time (${responseTimeMs}ms)`,
      });
    } else if (responseTimeMs > 0) {
      addCheck({
        id: 'response_time',
        category: 'technical',
        title: 'Fast Server Response Time',
        description: `Server responded rapidly in ${responseTimeMs}ms.`,
        status: 'passed',
        severity: 'INFO',
        value: `${responseTimeMs}ms`,
        weight: 5,
        penalty: 0,
      });
    }

    // --- CHECK: XML Sitemap Coverage (Informational / Diagnosis) ---
    if (sitemapMeta && sitemapMeta.exists) {
      addCheck({
        id: 'sitemap_coverage',
        category: 'technical',
        title: sitemapMeta.containsTargetUrl ? 'URL Present in XML Sitemap' : 'XML Sitemap Detected',
        description: sitemapMeta.containsTargetUrl
          ? `Target URL is confirmed indexed inside XML sitemap (${sitemapMeta.totalUrls} URLs indexed).`
          : `XML sitemap found with ${sitemapMeta.totalUrls} URLs, but target URL was not in initial sample.`,
        status: 'passed',
        severity: 'INFO',
        value: `${sitemapMeta.totalUrls} URLs in sitemap`,
        weight: 5,
        penalty: 0,
      });
    }

    // =========================================================================
    // 3. FINAL SCORE CALCULATION
    // =========================================================================

    const baseScore = 100;
    const totalDeductions = deductions.reduce((sum, d) => sum + d.penalty, 0);
    const finalScore = Math.max(0, Math.min(100, Math.round(baseScore - totalDeductions)));

    const passedCount = checks.filter((c) => c.status === 'passed').length;
    const warningCount = checks.filter((c) => c.status === 'warning').length;
    const criticalCount = checks.filter((c) => c.status === 'critical').length;

    const scoreBreakdown: ScoreBreakdown = {
      baseScore,
      totalDeductions,
      finalScore,
      deductions,
    };

    const pageData: PageMetadata = {
      title,
      titleLength: title.length,
      metaDescription,
      metaDescriptionLength: metaDescription.length,
      canonicalUrl,
      isSelfCanonical: canonicalUrl === url,
      robotsDirectives: combinedRobots,
      isIndexable,
      noindex,
      nofollow,
      h1Count,
      h1Text,
      h2Count,
      h2Headings,
      h3Count,
      headingHierarchyValid,
      wordCount,
      imagesTotal,
      imagesWithAlt,
      imagesWithoutAlt,
      imagesMissingAlt,
      imagesEmptyAlt,
      imagesMissingDimensions,
      imagesLazyLoaded,
      internalLinksCount,
      externalLinksCount,
      brokenLinksCount,
      nofollowLinksCount,
      nofollowRatio,
      hasHttps,
      hasViewport,
      charset,
      language,
      favicon,
      httpStatus,
      finalUrl,
      isRedirected,
      responseTimeMs,
      htmlSizeBytes,
      robotsTxtFound: robotsMeta?.exists,
      robotsTxtAllowed: robotsMeta?.allowed,
      robotsTxtSitemaps: robotsMeta?.sitemaps,
      sitemapFound: sitemapMeta?.exists,
      sitemapUrlCount: sitemapMeta?.totalUrls,
      inSitemap: sitemapMeta?.containsTargetUrl,
      ogTitle,
      ogDescription,
      ogImage,
      ogUrl,
      ogType,
      twitterCard,
      twitterTitle,
      twitterDescription,
      twitterImage,
      hasStructuredData,
      structuredDataCount,
      structuredDataTypes,
      structuredDataValid,
      structuredDataErrors,
      keywordInTitle,
      keywordInH1,
      keywordInDescription,
      keywordInFirstParagraph,
      keywordCountInBody,
      keywordDensity,
    };

    return {
      id: 'audit-' + Date.now(),
      url,
      targetKeyword: rawKeyword,
      timestamp: new Date().toISOString(),
      score: finalScore,
      status: 'completed',
      passedCount,
      warningCount,
      criticalCount,
      checks,
      pageData,
      scoreBreakdown,
    };
  }
}

export const seoAuditService = new SeoAuditService();
