export type ActivityEventType =
  | 'AUDIT_CREATED'
  | 'KEYWORD_RESEARCH'
  | 'CONTENT_ANALYSIS'
  | 'REPORT_CREATED'
  | 'REPORT_EXPORTED'
  | 'AI_IMPROVEMENT_REQUESTED'
  | 'USER_LOGIN'
  | 'ADMIN_LOGIN';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  userId: string;
  timestamp: string;
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ActivityStats {
  totalEvents: number;
  totalAudits: number;
  totalKeywordSearches: number;
  totalContentAnalyses: number;
  totalReports: number;
  totalAiImprovements: number;
  byType: Record<ActivityEventType, number>;
}
