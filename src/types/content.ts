export interface ContentMetrics {
  wordCount: number;
  charCount: number;
  sentenceCount: number;
  paragraphCount: number;
  readingTimeMinutes: number;
  speakingTimeMinutes: number;
  avgWordsPerSentence: number;
  keywordCount: number;
  keywordDensity: number;
}

export type ContentType =
  | 'article'
  | 'blog_post'
  | 'landing_page'
  | 'guide'
  | 'product_page';

export type SearchIntent =
  | 'informational'
  | 'commercial'
  | 'transactional'
  | 'navigational';

export interface SeoDocument {
  id?: string;
  title: string;
  slug: string;
  url?: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  focusKeyword: string;
  secondaryKeywords: string;
  language: string;
  contentType?: ContentType;
  searchIntent?: SearchIntent;
  updatedAt?: string;
}

export interface RoboticPatternMatch {
  id: string;
  phrase: string;
  category: "cliche" | "filler" | "academic" | "ai_opener";
  suggestedReplacement: string;
  occurrences: number;
}

export interface PatternAnalysisResult {
  patternCount: number | null;
  humanScore: number | null;
  detectedPatterns: RoboticPatternMatch[];
}

