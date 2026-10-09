"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Target, KeyRound, Globe2, RefreshCw } from "lucide-react";

interface KeywordInputProps {
  focusKeyword: string;
  onFocusKeywordChange: (val: string) => void;
  secondaryKeywords: string;
  onSecondaryKeywordsChange: (val: string) => void;
  slug: string;
  onSlugChange: (val: string) => void;
  keywordMatchCount: number;
  language: string;
  onLanguageChange: (val: string) => void;
  onSyncSlug?: () => void;
}

export function KeywordInput({
  focusKeyword,
  onFocusKeywordChange,
  secondaryKeywords,
  onSecondaryKeywordsChange,
  slug,
  onSlugChange,
  keywordMatchCount,
  language,
  onLanguageChange,
  onSyncSlug,
}: KeywordInputProps) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
              <span>Focus Keyword</span>
            </label>
            <Badge variant={keywordMatchCount > 0 ? "success" : "muted"}>
              {keywordMatchCount} matches
            </Badge>
          </div>
          <Input
            value={focusKeyword}
            onChange={(e) => onFocusKeywordChange(e.target.value)}
            placeholder="e.g. technical seo checklist"
            className="text-xs font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Secondary Keywords</span>
            </label>
            <span className="text-[10px] text-muted-foreground">Comma separated</span>
          </div>
          <Input
            value={secondaryKeywords}
            onChange={(e) => onSecondaryKeywordsChange(e.target.value)}
            placeholder="e.g. crawl budget, site speed, schema markup"
            className="text-xs font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span>URL Slug / Permalink</span>
            </label>
            {onSyncSlug && (
              <button
                type="button"
                onClick={onSyncSlug}
                className="text-[10px] font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1"
                title="Sync slug with focus keyword"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Sync</span>
              </button>
            )}
          </div>
          <Input
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            placeholder="technical-seo-checklist"
            className="text-xs font-medium font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Target Language</span>
            </label>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              US English
            </span>
          </div>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="en-US">🇺🇸 USA English (US)</option>
            <option value="en-GB">🇬🇧 UK English (British)</option>
            <option value="en-CA">🇨🇦 Canadian English</option>
            <option value="en-AU">🇦🇺 Australian English</option>
            <option value="es">🇪🇸 Spanish (Español)</option>
            <option value="fr">🇫🇷 French (Français)</option>
            <option value="de">🇩🇪 German (Deutsch)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
