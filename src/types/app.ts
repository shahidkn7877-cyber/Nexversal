export type AppTheme = 'light' | 'dark' | 'system';

export type EditorViewMode = 'visual' | 'source' | 'preview' | 'editor' | 'inspector' | 'diff';

export type AnalyzerTabKey =
  | 'seo'
  | 'serp'
  | 'ai'
  | 'patterns'
  | 'faq'
  | 'schema'
  | 'export'
  | 'style_review';

export interface ProjectSummary {
  id: string;
  name: string;
  url: string;
  lastAuditDate?: string;
  totalDocuments: number;
  averageScore: number | null;
}

export interface NavigationItem {
  title: string;
  href: string;
  icon?: string;
  badge?: string;
}
