'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
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
  structure: { title: 'Structure & Headings', order: 1 },
  keyword: { title: 'Target Keyword', order: 2 },
  title: { title: 'SEO Title Tag', order: 3 },
  meta: { title: 'Meta Description', order: 4 },
  readability: { title: 'Readability & Scannability', order: 5 },
  links: { title: 'Links & Topology', order: 6 },
  images: { title: 'Image Alt Text', order: 7 },
  intent: { title: 'Search Intent', order: 8 },
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
          category: (r.category === 'basic'
            ? 'keyword'
            : r.category === 'serp'
            ? 'title'
            : r.category) as ChecklistCategory,
          status: (r.status === 'passed'
            ? 'PASS'
            : r.status === 'warning'
            ? 'WARNING'
            : 'FAIL') as ChecklistStatus,
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
    <div className="space-y-3">
      {/* Category Accordion / Groups */}
      {presentCategories.map((catKey) => {
        const catItems = checklistItems.filter((i) => i.category === catKey);
        if (catItems.length === 0) return null;

        const evaluatedInCat = catItems.filter((i) => i.status !== 'NOT_CHECKED');
        const passedInCat = catItems.filter((i) => i.status === 'PASS').length;

        return (
          <div
            key={catKey}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden"
          >
            <div className="py-2.5 px-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {CATEGORY_METADATA[catKey]?.title || catKey}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {evaluatedInCat.length > 0
                  ? `${passedInCat}/${evaluatedInCat.length} Passed`
                  : 'Optional'}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {catItems.map((item) => {
                let StatusIcon = CheckCircle2;
                let iconColor = 'text-emerald-500';
                let badgeVariant: 'success' | 'warning' | 'danger' | 'muted' =
                  'success';
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
                  statusLabel = 'OPTIONAL';
                }

                const isExpanded = expandedId === item.id;
                const hasDetails = Boolean(
                  item.whyItMatters ||
                    (item.examples && item.examples.length > 0) ||
                    item.recommendation
                );

                return (
                  <div
                    key={item.id}
                    className="p-3 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        <StatusIcon className={`h-4 w-4 ${iconColor}`} />
                      </div>

                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                            {item.title}
                          </h5>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge
                              variant={badgeVariant}
                              className="text-[9px] px-1.5 py-0 h-4 font-bold"
                            >
                              {statusLabel}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          {item.explanation}
                        </p>

                        {/* Detected Value Tag */}
                        {item.detectedValue !== undefined &&
                          item.detectedValue !== null &&
                          item.detectedValue !== '' && (
                            <div className="pt-0.5">
                              <span className="inline-block text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700/60">
                                Value: <span className="font-semibold">{String(item.detectedValue)}</span>
                              </span>
                            </div>
                          )}

                        {/* Recommendation */}
                        {item.recommendation &&
                          item.status !== 'PASS' &&
                          item.status !== 'NOT_CHECKED' && (
                            <div className="mt-1 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded-md p-2 font-medium border border-amber-200/50 dark:border-amber-900/40">
                              💡 <span className="font-semibold">Fix:</span> {item.recommendation}
                            </div>
                          )}

                        {/* Toggle button for details */}
                        {hasDetails && (
                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={() => toggleExpand(item.id)}
                              className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-0.5"
                            >
                              <span>{isExpanded ? 'Hide info' : 'Why it matters'}</span>
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
                          <div className="mt-1.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]">
                            {item.whyItMatters && (
                              <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  Why it matters:
                                </span>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
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
                                    <li
                                      key={eIdx}
                                      className="p-1 rounded bg-white dark:bg-slate-950 font-mono text-[10px] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                                    >
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
