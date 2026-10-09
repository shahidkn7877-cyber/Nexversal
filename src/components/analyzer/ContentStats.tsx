import React from "react";
import { ContentMetrics } from "@/types/content";
import {
  FileText,
  Clock,
  Mic,
  AlignLeft,
  Percent,
  Sparkles,
} from "lucide-react";

interface ContentStatsProps {
  metrics: ContentMetrics;
  score?: number | null;
  scoreCategory?: 'Strong' | 'Needs Improvement' | 'Weak' | null;
}

export function ContentStats({
  metrics,
  score = null,
  scoreCategory = null,
}: ContentStatsProps) {
  const statItems = [
    {
      label: "SEO Score",
      value: score !== null ? `${score}/100` : "0/100",
      subtext:
        score !== null
          ? (scoreCategory || (score >= 80 ? "Strong" : score >= 50 ? "Needs Improvement" : "Weak"))
          : "Paste or write article",
      icon: Sparkles,
      color: "text-brand-600 dark:text-brand-400",
      bg: "bg-brand-500/10",
    },
    {
      label: "Word Count",
      value: metrics.wordCount.toLocaleString(),
      subtext: `${metrics.charCount.toLocaleString()} characters`,
      icon: FileText,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Keyword Density",
      value: `${metrics.keywordDensity}%`,
      subtext: `${metrics.keywordCount} matches`,
      icon: Percent,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Paragraphs",
      value: metrics.paragraphCount.toString(),
      subtext: `${metrics.sentenceCount} sentences`,
      icon: AlignLeft,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      label: "Reading Time",
      value: `~${metrics.readingTimeMinutes} min`,
      subtext: "Based on 200 WPM",
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Speaking Time",
      value: `~${metrics.speakingTimeMinutes} min`,
      subtext: "Based on 130 WPM",
      icon: Mic,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {statItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className="p-3.5 rounded-2xl border border-border bg-card shadow-sm space-y-1 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                {item.label}
              </span>
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-lg ${item.bg} ${item.color}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-lg font-extrabold text-foreground truncate">
              {item.value}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {item.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
}
