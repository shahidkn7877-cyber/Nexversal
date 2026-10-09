'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ContentAnalysisResult,
  ContentAnalysisRule,
  SeoCheckItem,
  ChecklistCategory,
  ChecklistStatus,
} from '@/types/analyzer';

interface SeoChecklistProps {
  rules?: ContentAnalysisRule[];
  analysisResult?: ContentAnalysisResult | null;
  isAnalyzed?: boolean;
}

const CATEGORY_METADATA: Record<
  ChecklistCategory,
  { title: string; order: number }
> = {
  structure: { title: 'Content Structure & Headings', order: 1 },
  keyword: { title: 'Target Keyword Optimization', order: 2 },
  title: { title: 'SEO Title Analysis', order: 3 },
  meta: { title: 'Meta Description Tag', order: 4 },
  readability: { title: 'Readability & Scannability', order: 5 },
  links: { title: 'Link Diagnostics & Topology', order: 6 },
  images: { title: 'Image Alt Text Diagnostics', order: 7 },
  intent: { title: 'Search Intent Alignment', order: 8 },
};

export function SeoChecklist({
  rules = [],
  analysisResult = null,
  isAnalyzed = true,
}: SeoChecklistProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const checklistItems: SeoCheckItem[] =
    analysisResult?.checklist && analysisResult.checklist.length > 0
      ? analysisResult.checklist
      : rules.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          category: (r.category === 'basic' ? 'keyword' : r.category === 'serp' ? 'title' : r.category) as ChecklistCategory,
          status: (r.status === 'passed' ? 'PASS' : r.status === 'warning' ? 'WARNING' : 'FAIL') as ChecklistStatus,
          explanation: r.feedback || r.description,
          detectedValue: '',
          recommendation: r.recommendation || '',
          impact: 'medium' as const,
          pointsAwarded: r.pointsAwarded,
          maxPoints: r.maxPoints,
        }));

  // Unique categories in presentation order
  const presentCategories = Array.from(
    new Set(checklistItems.map((item) => item.category))
  ).sort(
    (a, b) =>
      (CATEGORY_METADATA[a]?.order ?? 99) - (CATEGORY_METADATA[b]?.order ?? 99)
  );

  return (
    <div className="space-y-4">
      {/* Top Banner with Score Category and Summary Badges */}
      <div className="p-3.5 rounded-2xl border border-brand-500/20 bg-brand-50/40 dark:bg-brand-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400 shrink-0" />
          <div>
            <span className="font-bold text-foreground">Content SEO Checklist</span>
            {analysisResult && (
              <span className="ml-2 font-semibold text-muted-foreground">
                Rating: <span className="font-bold text-foreground">{analysisResult.scoreCategory}</span> ({analysisResult.score}/100)
              </span>
            )}
          </div>
        </div>

        {analysisResult && (
          <div className="flex flex-wrap items-center gap-1.5 font-bold">
            <Badge variant="success" className="text-[10px]">
              {analysisResult.issuesSummary.passed} Passed
            </Badge>
            {analysisResult.issuesSummary.warnings > 0 && (
              <Badge variant="warning" className="text-[10px]">
                {analysisResult.issuesSummary.warnings} Warnings
              </Badge>
            )}
            {analysisResult.issuesSummary.failed > 0 && (
              <Badge variant="danger" className="text-[10px]">
                {analysisResult.issuesSummary.failed} Action Needed
              </Badge>
            )}
            {analysisResult.issuesSummary.notChecked !== undefined && analysisResult.issuesSummary.notChecked > 0 && (
              <Badge variant="muted" className="text-[10px]">
                {analysisResult.issuesSummary.notChecked} Not Checked
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Render by Category */}
      {presentCategories.map((catKey) => {
        const catItems = checklistItems.filter((i) => i.category === catKey);
        if (catItems.length === 0) return null;

        const evaluatedInCat = catItems.filter((i) => i.status !== 'NOT_CHECKED');
        const passedInCat = catItems.filter((i) => i.status === 'PASS').length;

        return (
          <Card key={catKey} className="border-border bg-card shadow-sm">
            <CardHeader className="py-3 px-4 sm:px-5 border-b border-border bg-slate-50/50 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {CATEGORY_METADATA[catKey]?.title || catKey}
                </CardTitle>
                <span className="text-[11px] text-muted-foreground font-semibold">
                  {evaluatedInCat.length > 0 ? `${passedInCat}/${evaluatedInCat.length} Met` : 'Optional Context'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              {catItems.map((item) => {
                let StatusIcon = CheckCircle2;
                let iconColor = 'text-emerald-500';
                let badgeVariant: 'success' | 'warning' | 'danger' | 'muted' = 'success';
                let statusLabel = 'PASS';

                if (item.status === 'WARNING') {
                  StatusIcon = AlertTriangle;
                  iconColor = 'text-amber-500';
                  badgeVariant = 'warning';
                  statusLabel = 'WARNING';
                } else if (item.status === 'FAIL') {
                  StatusIcon = XCircle;
                  iconColor = 'text-rose-500';
                  badgeVariant = 'danger';
                  statusLabel = 'ACTION NEEDED';
                } else if (item.status === 'NOT_CHECKED') {
                  StatusIcon = HelpCircle;
                  iconColor = 'text-slate-400';
                  badgeVariant = 'muted';
                  statusLabel = 'NOT CHECKED';
                }

                const isExpanded = expandedId === item.id;
                const hasDetailedRecommendation =
                  Boolean(item.whyItMatters || (item.examples && item.examples.length > 0));

                return (
                  <div
                    key={item.id}
                    className="p-3.5 sm:px-5 flex flex-col gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        <StatusIcon className={`h-4 w-4 ${iconColor}`} />
                      </div>

                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="text-xs font-bold text-foreground leading-snug">
                            {item.title}
                          </h5>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge
                              variant={badgeVariant}
                              className="text-[10px] font-bold"
                            >
                              {statusLabel}
                            </Badge>
                            {item.status !== 'NOT_CHECKED' && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                +{item.pointsAwarded}/{item.maxPoints} pts
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {item.explanation}
                        </p>

                        {/* Detected Value Tag */}
                        {item.detectedValue !== undefined && item.detectedValue !== null && (
                          <div className="pt-0.5">
                            <span className="inline-block text-[10px] font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-border">
                              Detected: <span className="font-bold">{String(item.detectedValue)}</span>
                            </span>
                          </div>
                        )}

                        {/* Quick Tip / Recommendation */}
                        {item.recommendation && item.status !== 'PASS' && item.status !== 'NOT_CHECKED' && (
                          <div className="pt-1 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-500/10 rounded-lg p-2 font-medium">
                            💡 <span className="font-semibold">Recommendation:</span> {item.recommendation}
                          </div>
                        )}

                        {/* Toggle button for details */}
                        {hasDetailedRecommendation && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => toggleExpand(item.id)}
                              className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1"
                            >
                              <span>{isExpanded ? 'Hide Details' : 'Why it matters & Examples'}</span>
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        )}

                        {/* Expanded details container */}
                        {isExpanded && (
                          <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border space-y-2 text-[11px]">
                            {item.whyItMatters && (
                              <div>
                                <span className="font-bold text-foreground">Why It Matters:</span>
                                <p className="text-muted-foreground leading-relaxed mt-0.5">
                                  {item.whyItMatters}
                                </p>
                              </div>
                            )}

                            {item.examples && item.examples.length > 0 && (
                              <div>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  Examples:
                                </span>
                                <ul className="mt-0.5 space-y-1">
                                  {item.examples.map((ex, eIdx) => (
                                    <li key={eIdx} className="p-1.5 rounded-lg bg-white dark:bg-slate-950 font-mono text-[10px] border border-border text-foreground">
                                      {ex}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

