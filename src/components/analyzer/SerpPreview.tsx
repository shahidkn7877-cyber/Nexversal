"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Globe,
  Monitor,
  Smartphone,
} from "lucide-react";
import { SEO_LIMITS } from "@/lib/constants";

interface SerpPreviewProps {
  metaTitle: string;
  onMetaTitleChange: (val: string) => void;
  metaDescription: string;
  onMetaDescriptionChange: (val: string) => void;
  slug: string;
  baseUrl?: string;
}

export function SerpPreview({
  metaTitle,
  onMetaTitleChange,
  metaDescription,
  onMetaDescriptionChange,
  slug,
  baseUrl = "https://yourwebsite.com",
}: SerpPreviewProps) {
  const [isMobile, setIsMobile] = useState(false);

  const titleLength = metaTitle.length;
  const descLength = metaDescription.length;

  const isTitleOptimal =
    titleLength >= SEO_LIMITS.title.min && titleLength <= SEO_LIMITS.title.max;
  const isDescOptimal =
    descLength >= SEO_LIMITS.description.min &&
    descLength <= SEO_LIMITS.description.max;

  return (
    <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <span>Search Engine Result Simulator (Google SERP)</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Preview how your webpage appears in desktop and mobile search rankings
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsMobile(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !isMobile
                ? "bg-white dark:bg-slate-700 text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setIsMobile(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isMobile
                ? "bg-white dark:bg-slate-700 text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Mobile</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold uppercase tracking-wider text-muted-foreground">
              SEO Title Tag
            </label>
            <span
              className={`font-mono font-bold text-[11px] ${
                isTitleOptimal
                  ? "text-emerald-600 dark:text-emerald-400"
                  : titleLength > SEO_LIMITS.title.max
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {titleLength} / {SEO_LIMITS.title.max} chars{" "}
              {isTitleOptimal ? "(Optimal)" : ""}
            </span>
          </div>
          <Input
            value={metaTitle}
            onChange={(e) => onMetaTitleChange(e.target.value)}
            placeholder="e.g. Complete Technical SEO Checklist for Modern Web Apps (2026)"
            className="text-xs font-medium"
          />
          <Progress
            value={titleLength}
            max={SEO_LIMITS.title.max}
            indicatorClassName={
              isTitleOptimal
                ? "bg-emerald-500"
                : titleLength > SEO_LIMITS.title.max
                ? "bg-rose-500"
                : "bg-amber-500"
            }
            className="h-1.5"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold uppercase tracking-wider text-muted-foreground">
              SEO Meta Description Tag
            </label>
            <span
              className={`font-mono font-bold text-[11px] ${
                isDescOptimal
                  ? "text-emerald-600 dark:text-emerald-400"
                  : descLength > SEO_LIMITS.description.max
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {descLength} / {SEO_LIMITS.description.max} chars{" "}
              {isDescOptimal ? "(Optimal)" : ""}
            </span>
          </div>
          <Textarea
            value={metaDescription}
            onChange={(e) => onMetaDescriptionChange(e.target.value)}
            placeholder="e.g. Discover actionable technical SEO best practices for 2026. Audit indexing, crawlability, core web vitals, and structured data with real examples."
            className="min-h-[80px] text-xs font-normal"
          />
          <Progress
            value={descLength}
            max={SEO_LIMITS.description.max}
            indicatorClassName={
              isDescOptimal
                ? "bg-emerald-500"
                : descLength > SEO_LIMITS.description.max
                ? "bg-rose-500"
                : "bg-amber-500"
            }
            className="h-1.5"
          />
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Live Search Snippet Preview:
        </span>
        <div
          className={`rounded-2xl border border-border p-4 transition-all duration-300 ${
            isMobile
              ? "max-w-sm mx-auto bg-card shadow-md"
              : "w-full bg-card shadow-sm"
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
              G
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
              <span className="font-semibold text-foreground">yourwebsite.com</span>
              <span className="mx-1 text-slate-400">›</span>
              <span className="font-mono text-slate-500">{slug || "guide"}</span>
            </div>
          </div>

          <h4 className="text-base sm:text-lg font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer leading-snug break-words">
            {metaTitle || "Your Optimized Page Title Will Appear Here"}
          </h4>

          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words line-clamp-3">
            {metaDescription ||
              "Your compelling meta description will be shown here. Make sure to clearly state your value proposition and target audience to maximize organic click-through rate (CTR)."}
          </p>
        </div>
      </div>
    </div>
  );
}
