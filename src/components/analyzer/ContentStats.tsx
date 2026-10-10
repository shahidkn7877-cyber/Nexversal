"use client";

import React from "react";
import { ContentMetrics } from "@/types/content";
import {
  FileText,
  Clock,
  Target,
  Percent,
  Type,
  AlertCircle,
} from "lucide-react";

interface ContentStatsProps {
  metrics: ContentMetrics;
  score?: number | null;
  scoreCategory?: 'Strong' | 'Needs Improvement' | 'Weak' | null;
  longParagraphsCount?: number;
  className?: string;
}

export function ContentStats({
  metrics,
  score = null,
  scoreCategory = null,
  longParagraphsCount = 0,
  className = "",
}: ContentStatsProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-5 gap-y-2 py-2 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-xs text-slate-600 dark:text-slate-400 ${className}`}
    >
      {/* Word Count */}
      <div className="flex items-center gap-1.5" title="Total words in article">
        <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        <span className="font-bold text-slate-900 dark:text-slate-100">
          {metrics.wordCount.toLocaleString()}
        </span>
        <span className="text-slate-500">words</span>
      </div>

      <div className="h-3 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

      {/* Character Count */}
      <div className="flex items-center gap-1.5" title="Total characters">
        <Type className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
        <span className="font-bold text-slate-900 dark:text-slate-100">
          {metrics.charCount.toLocaleString()}
        </span>
        <span className="text-slate-500">chars</span>
      </div>

      <div className="h-3 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

      {/* Reading Time */}
      <div className="flex items-center gap-1.5" title="Estimated reading time at 200 words per minute">
        <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
        <span className="font-bold text-slate-900 dark:text-slate-100">
          ~{metrics.readingTimeMinutes} min
        </span>
        <span className="text-slate-500">read</span>
      </div>

      <div className="h-3 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

      {/* Focus Keyword Occurrences */}
      <div className="flex items-center gap-1.5" title="Number of times focus keyword appears in body">
        <Target className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="font-bold text-slate-900 dark:text-slate-100">
          {metrics.keywordCount}
        </span>
        <span className="text-slate-500">
          {metrics.keywordCount === 1 ? "occurrence" : "occurrences"}
        </span>
      </div>

      <div className="h-3 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

      {/* Keyword Density */}
      <div className="flex items-center gap-1.5" title="Target keyword frequency relative to total words (optimal: 1.0% - 2.5%)">
        <Percent className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
        <span className="font-bold text-slate-900 dark:text-slate-100">
          {metrics.keywordDensity}%
        </span>
        <span className="text-slate-500">density</span>
      </div>

      {/* Mobile Scannability Alert Tag if any */}
      {longParagraphsCount > 0 && (
        <>
          <div className="h-3 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <div
            className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold"
            title={`${longParagraphsCount} paragraph(s) exceed 80 words`}
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{longParagraphsCount} long {longParagraphsCount === 1 ? 'paragraph' : 'paragraphs'} (&gt;80 words)</span>
          </div>
        </>
      )}
    </div>
  );
}
