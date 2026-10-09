export type IssueSeverity = "critical" | "warning" | "info" | "pass";

export type IssueCategory =
  | "basic"
  | "title"
  | "headings"
  | "readability"
  | "technical"
  | "schema";

export interface SeoIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  recommendation?: string;
  passed: boolean;
}

export interface SeoScoreBreakdown {
  basicSeo: number | null;
  contentReadability: number | null;
  titleAndMeta: number | null;
  overall: number | null;
}

export interface SeoAnalysisResult {
  score: number | null;
  status: "idle" | "analyzing" | "completed" | "error";
  breakdown: SeoScoreBreakdown;
  issues: SeoIssue[];
  analyzedAt?: string;
}

export interface SerpPreviewData {
  title: string;
  metaDescription: string;
  slug: string;
  baseUrl?: string;
  device?: "desktop" | "mobile";
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface SchemaData {
  type: "FAQPage" | "Article" | "WebPage";
  jsonLd: Record<string, unknown>;
}
