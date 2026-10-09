export type AuditCheckStatus = 'passed' | 'warning' | 'critical';
export type AuditCategory =
  | 'meta'
  | 'content'
  | 'links'
  | 'technical'
  | 'social'
  | 'images'
  | 'structured-data'
  | 'on-page';

export type AuditSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | 'critical' | 'warning' | 'info';

export interface ScoreDeduction {
  checkId?: string;
  checkTitle?: string;
  severity: AuditSeverity | string;
  penalty: number;
  reason: string;
}

export interface ScoreBreakdown {
  baseScore: number;
  totalDeductions: number;
  finalScore?: number;
  deductions: ScoreDeduction[];
}

export interface MultiPageCrawlPage {
  url: string;
  status: number;
  score: number;
  passedCount: number;
  warningCount: number;
  criticalCount: number;
  title?: string;
  h1Text?: string;
  wordCount: number;
  error?: string;
}

export interface MultiPageCrawlSummary {
  totalPages: number;
  averageScore: number;
  maxDepth: number;
  totalLinksDiscovered: number;
  pages: MultiPageCrawlPage[];
}

export interface AuditCheck {
  id: string;
  category: AuditCategory;
  title: string;
  name?: string;
  description: string;
  status: AuditCheckStatus;
  value?: string | number | boolean | null;
  recommendation?: string;
  weight?: number;
  score?: number;
  severity?: AuditSeverity | string;
  penalty?: number;
}

export interface PageMetadata {
  title: string;
  titleLength: number;
  metaDescription: string;
  metaDescriptionLength: number;
  canonicalUrl?: string;
  isSelfCanonical: boolean;
  robotsDirectives?: string;
  isIndexable: boolean;
  h1Count: number;
  h1Text?: string;
  h2Count: number;
  h2Headings: string[];
  h3Count: number;
  wordCount: number;
  imagesTotal: number;
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  imagesMissingAlt?: number;
  imagesEmptyAlt?: number;
  imagesLazyLoaded?: number;
  imagesMissingDimensions?: number;
  internalLinksCount: number;
  externalLinksCount: number;
  brokenLinksCount?: number;
  nofollowLinksCount?: number;
  nofollowRatio?: number;
  hasHttps: boolean;
  hasViewport: boolean;
  charset?: string;
  language?: string;
  favicon?: string;
  httpStatus?: number;
  finalUrl?: string;
  isRedirected?: boolean;
  responseTimeMs?: number;
  htmlSizeBytes?: number;
  robotsTxtFound?: boolean;
  robotsTxtAllowed?: boolean;
  robotsTxtSitemaps?: string[];
  sitemapFound?: boolean;
  sitemapUrlCount?: number;
  inSitemap?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  hasStructuredData: boolean;
  structuredDataCount?: number;
  structuredDataTypes: string[];
  structuredDataValid?: boolean;
  structuredDataErrors?: string[];
  keywordInTitle: boolean;
  keywordInH1: boolean;
  keywordInDescription?: boolean;
  keywordInFirstParagraph: boolean;
  keywordCountInBody: number;
  keywordDensity: number;
  headingHierarchyValid?: boolean;
  noindex?: boolean;
  nofollow?: boolean;
}

export interface AuditResult {
  id: string;
  url: string;
  targetKeyword?: string;
  timestamp: string;
  score: number; // 0-100
  status: 'completed' | 'failed' | 'partial';
  passedCount: number;
  warningCount: number;
  criticalCount: number;
  checks: AuditCheck[];
  pageData?: PageMetadata;
  scoreBreakdown?: ScoreBreakdown;
  crawlSummary?: MultiPageCrawlSummary;
  errorMessage?: string;
  userId?: string;
}
