'use client';

import React from 'react';
import { StyleFinding } from '@/services/style-review.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, X, RefreshCw, AlertCircle, Wand2, Info } from 'lucide-react';

interface StyleReviewPanelProps {
  findings: StyleFinding[];
  summary: string;
  isLoading: boolean;
  onRefreshReview: () => void;
  onRequestTargetedRewrite: (finding: StyleFinding) => void;
  onAcceptRewrite: (finding: StyleFinding) => void;
  onRejectRewrite: (finding: StyleFinding) => void;
  rewritingId?: string | null;
}

export function StyleReviewPanel({
  findings,
  summary,
  isLoading,
  onRefreshReview,
  onRequestTargetedRewrite,
  onAcceptRewrite,
  onRejectRewrite,
  rewritingId = null,
}: StyleReviewPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden space-y-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Writing Style Review
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Evaluates repetitive rhythm, filler phrases, and sentence cadence
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={onRefreshReview}
          disabled={isLoading}
          className="h-7 text-xs font-semibold gap-1 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          <span>{isLoading ? 'Analyzing...' : 'Scan Style'}</span>
        </Button>
      </div>

      {/* Honest Methodology Notice */}
      <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-300 flex items-start gap-2">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <p className="leading-relaxed">
          <strong>Editorial Style Analysis:</strong> Examines vocabulary patterns, sentence openings, and cliché phrases for natural human cadence. We do not use unreliable probabilistic AI detection percentages.
        </p>
      </div>

      {/* Summary message */}
      <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
        {summary}
      </div>

      {/* Findings List */}
      <div className="space-y-3 pt-1">
        {findings.map((item) => {
          const isRewriting = rewritingId === item.id;
          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 ${
                item.status === 'accepted'
                  ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : item.status === 'rejected'
                  ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 opacity-60'
                  : item.status === 'rewritten'
                  ? 'border-blue-300 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              {/* Top Issue Badge */}
              <div className="flex items-center justify-between gap-2">
                <Badge
                  variant={
                    item.status === 'accepted'
                      ? 'success'
                      : item.status === 'rewritten'
                      ? 'info'
                      : 'warning'
                  }
                  className="text-[10px] font-bold"
                >
                  {item.issueType === 'cliche_filler' && 'Cliché Phrase'}
                  {item.issueType === 'repeated_opening' && 'Repeated Opening'}
                  {item.issueType === 'overlong_sentence' && 'Run-on Sentence'}
                  {item.issueType === 'repetitive_transition' && 'Repeated Transition'}
                  {item.issueType === 'wordy_phrasing' && 'Wordy Phrasing'}
                </Badge>

                {item.status === 'accepted' && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    <span>Applied to Draft</span>
                  </span>
                )}
                {item.status === 'rejected' && (
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Dismissed
                  </span>
                )}
              </div>

              {/* Original Passage */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 font-serif text-[12px] text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 italic">
                &ldquo;{item.passage}&rdquo;
              </div>

              {/* Explanation & Suggestion */}
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.explanation}
              </p>
              <div className="text-[11px] text-slate-700 dark:text-slate-300">
                <strong>Suggested Improvement:</strong> {item.suggestion}
              </div>

              {/* Targeted Rewrite Preview if generated */}
              {item.status === 'rewritten' && item.rewrittenPassage && (
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Targeted Rewrite Proposal:
                  </div>
                  <p className="font-serif text-[12px] text-slate-900 dark:text-slate-100 leading-relaxed">
                    &ldquo;{item.rewrittenPassage}&rdquo;
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => onAcceptRewrite(item)}
                      className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                    >
                      <Check className="h-3 w-3" />
                      <span>Accept Rewrite</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRejectRewrite(item)}
                      className="h-7 text-xs text-slate-500 hover:text-rose-600 gap-1"
                    >
                      <X className="h-3 w-3" />
                      <span>Reject</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Initial Action Button: Rewrite Passage */}
              {item.status === 'pending' && (
                <div className="flex items-center justify-between pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRequestTargetedRewrite(item)}
                    disabled={isRewriting}
                    className="h-7 text-xs font-semibold gap-1 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 hover:bg-blue-50"
                  >
                    <Wand2 className={`h-3 w-3 ${isRewriting ? 'animate-spin' : ''}`} />
                    <span>{isRewriting ? 'Rewriting...' : 'Rewrite This Passage'}</span>
                  </Button>

                  <button
                    type="button"
                    onClick={() => onRejectRewrite(item)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

