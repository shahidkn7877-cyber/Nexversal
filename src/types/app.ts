export type AppTheme = 'light' | 'dark' | 'system';

export type EditorViewMode = 'editor' | 'inspector' | 'diff' | 'preview';

export type AnalyzerTabKey =
  | 'seo'
  | 'serp'
  | 'ai'
  | 'patterns'
  | 'faq'
  | 'schema'
  | 'export';

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
