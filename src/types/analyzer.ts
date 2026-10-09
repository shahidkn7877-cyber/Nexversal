export type RuleCategory = 'basic' | 'structure' | 'readability' | 'serp';
export type RuleStatus = 'passed' | 'warning' | 'failed';

export type ChecklistStatus = 'PASS' | 'WARNING' | 'FAIL' | 'NOT_CHECKED';
export type ChecklistCategory =
  | 'structure'
  | 'keyword'
  | 'title'
  | 'meta'
  | 'readability'
  | 'links'
  | 'images'
  | 'intent';

export interface SeoCheckItem {
  id: string;
  category: ChecklistCategory;
  title: string;
  description: string;
  status: ChecklistStatus;
  explanation: string;
  detectedValue: string | number;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
  pointsAwarded: number;
  maxPoints: number;
  examples?: string[];
  whyItMatters?: string;
}

export interface ContentAnalysisRule {
  id: string;
  category: RuleCategory;
  title: string;
  description: string;
  status: RuleStatus;
  pointsAwarded: number;
  maxPoints: number;
  feedback: string;
  recommendation?: string;
}

export interface ParagraphAnalysis {
  index: number;
  wordCount: number;
  isOverLimit: boolean;
  preview: string;
}

export interface HeadingMetrics {
  total: number;
  h1: number;
  h2: number;
  h3: number;
  hierarchyIssues: string[];
}

export interface ReadabilityMetrics {
  longSentenceCount: number;
  repeatedPhrasesCount: number;
}

export interface LinkMetrics {
  total: number;
  empty: number;
  internal: number;
  external: number;
}

export interface ImageMetrics {
  total: number;
  emptyAlt: number;
  genericAlt: number;
  optimized: number;
}

export interface ContentMetricsDetailed {
  wordCount: number;
  characterCount: number;
  sentenceCount: number;
  paragraphCount: number;
  longParagraphsCount: number;
  paragraphs: {
    total: number;
    longForMobile: number;
  };
  keywordCount: number;
  keywordDensity: number;
  readingEaseScore: number;
  readingEaseLabel: string;
  avgWordsPerSentence: number;
  headings: HeadingMetrics;
  readability: ReadabilityMetrics;
  links: LinkMetrics;
  images: ImageMetrics;
}

export interface ContentAnalysisResult {
  score: number; // 0 - 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  scoreCategory: 'Strong' | 'Needs Improvement' | 'Weak';
  metrics: ContentMetricsDetailed;
  rules: ContentAnalysisRule[];
  checklist: SeoCheckItem[];
  longParagraphs: ParagraphAnalysis[];
  issuesSummary: {
    passed: number;
    warnings: number;
    failed: number;
    notChecked?: number;
  };
  recommendations: string[];
  analyzedKeyword?: string;
  analyzedAt?: string;
}
