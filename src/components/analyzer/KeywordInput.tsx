"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  KeyRound,
  Globe2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
  ExternalLink,
} from "lucide-react";
import { SEO_LIMITS, SITE_URL } from "@/lib/constants";

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
  metaTitle?: string;
  onMetaTitleChange?: (val: string) => void;
  metaDescription?: string;
  onMetaDescriptionChange?: (val: string) => void;
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
  metaTitle = "",
  onMetaTitleChange,
  metaDescription = "",
  onMetaDescriptionChange,
}: KeywordInputProps) {
  const [showMetadata, setShowMetadata] = useState(false);

  const titleLength = metaTitle.length;
  const descLength = metaDescription.length;
  const isTitleOptimal =
    titleLength >= SEO_LIMITS.title.min && titleLength <= SEO_LIMITS.title.max;
  const isDescOptimal =
    descLength >= SEO_LIMITS.description.min &&
    descLength <= SEO_LIMITS.description.max;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all">
      {/* Top Bar: Focus Keyword & Metadata Toggle */}
      <div className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2.5 flex-1 max-w-xl">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0">
            <Target className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Focus Keyword:</span>
          </label>
          <div className="relative flex-1">
            <Input
              value={focusKeyword}
              onChange={(e) => onFocusKeywordChange(e.target.value)}
              placeholder="e.g. technical seo checklist"
              className="h-8 text-xs font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 rounded-lg"
            />
          </div>
          {focusKeyword && (
            <Badge
              variant={keywordMatchCount > 0 ? "success" : "muted"}
              className="text-[10px] font-bold shrink-0 h-6 px-2"
            >
              {keywordMatchCount} {keywordMatchCount === 1 ? "occurrence" : "occurrences"}
            </Badge>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowMetadata(!showMetadata)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 self-start sm:self-center transition-colors px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30"
          aria-expanded={showMetadata}
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search Preview & Metadata</span>
          {showMetadata ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Collapsible Search Preview & Metadata Section */}
      {showMetadata && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Optional SEO Title */}
            {onMetaTitleChange && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    SEO Title Tag
                  </label>
                  <span
                    className={`font-mono text-[10px] font-bold ${
                      isTitleOptimal
                        ? "text-emerald-600 dark:text-emerald-400"
                        : titleLength > SEO_LIMITS.title.max
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-500"
                    }`}
                  >
                    {titleLength}/{SEO_LIMITS.title.max} chars
                  </span>
                </div>
                <Input
                  value={metaTitle}
                  onChange={(e) => onMetaTitleChange(e.target.value)}
                  placeholder="Optional meta title for search results..."
                  className="h-8 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
            )}

            {/* URL Slug */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>URL Slug / Permalink</span>
                </label>
                {onSyncSlug && (
                  <button
                    type="button"
                    onClick={onSyncSlug}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                    title="Sync slug with focus keyword"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                    <span>Sync from Keyword</span>
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <Input
                  value={slug}
                  onChange={(e) => onSlugChange(e.target.value)}
                  placeholder="article-url-slug"
                  className="h-8 text-xs font-mono bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Optional Meta Description */}
          {onMetaDescriptionChange && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Meta Description
                </label>
                <span
                  className={`font-mono text-[10px] font-bold ${
                    isDescOptimal
                      ? "text-emerald-600 dark:text-emerald-400"
                      : descLength > SEO_LIMITS.description.max
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-500"
                  }`}
                >
                  {descLength}/{SEO_LIMITS.description.max} chars
                </span>
              </div>
              <Textarea
                value={metaDescription}
                onChange={(e) => onMetaDescriptionChange(e.target.value)}
                placeholder="Optional meta description summarizing the article for search snippets..."
                className="text-xs h-16 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg resize-none"
              />
            </div>
          )}

          {/* Secondary Keywords & Target Language */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <KeyRound className="h-3 w-3 text-slate-400" />
                  <span>Secondary Keywords</span>
                </label>
                <span className="text-[10px] text-slate-400">Comma separated</span>
              </div>
              <Input
                value={secondaryKeywords}
                onChange={(e) => onSecondaryKeywordsChange(e.target.value)}
                placeholder="e.g. crawl budget, site speed, schema markup"
                className="h-8 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Globe2 className="h-3 w-3 text-slate-400" />
                  <span>Target Language & Dialect</span>
                </label>
              </div>
              <select
                value={language}
                onChange={(e) => onLanguageChange(e.target.value)}
                className="flex h-8 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="en-US">🇺🇸 English (US)</option>
                <option value="en-GB">🇬🇧 English (UK / British)</option>
                <option value="en-CA">🇨🇦 English (Canada)</option>
                <option value="en-AU">🇦🇺 English (Australia)</option>
                <option value="es">🇪🇸 Spanish (Español)</option>
                <option value="fr">🇫🇷 French (Français)</option>
                <option value="de">🇩🇪 German (Deutsch)</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
