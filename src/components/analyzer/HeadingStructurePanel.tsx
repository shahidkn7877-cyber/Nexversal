"use client";

import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Heading, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { extractHeadings } from "@/lib/markdown-parser";

interface HeadingStructurePanelProps {
  content: string;
}

export function HeadingStructurePanel({ content }: HeadingStructurePanelProps) {
  const headings = useMemo(() => extractHeadings(content), [content]);

  const h1Count = headings.filter((h) => h.level === 1).length;
  const h2Count = headings.filter((h) => h.level === 2).length;
  const h3Count = headings.filter((h) => h.level === 3).length;

  // Real-time hierarchy skips detection (e.g. H1 jumping to H3 without H2)
  const hierarchySkips = useMemo(() => {
    const issues: { text: string; from: number; to: number; line: number }[] = [];
    let prevLevel = 0;
    for (const h of headings) {
      if (prevLevel > 0 && h.level > prevLevel + 1) {
        issues.push({
          text: h.text,
          from: prevLevel,
          to: h.level,
          line: h.lineIndex + 1,
        });
      }
      prevLevel = h.level;
    }
    return issues;
  }, [headings]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden space-y-3 p-3.5">
      {/* Header with Heading Count Badges */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
          <Heading className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>Heading Hierarchy ({headings.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge
            variant={h1Count === 1 ? "success" : h1Count > 1 ? "warning" : "danger"}
            className="text-[9px] px-1.5 py-0 h-4 font-bold"
          >
            {h1Count} H1
          </Badge>
          <Badge
            variant={h2Count >= 1 ? "success" : "warning"}
            className="text-[9px] px-1.5 py-0 h-4 font-bold"
          >
            {h2Count} H2
          </Badge>
          {h3Count > 0 && (
            <Badge variant="muted" className="text-[9px] px-1.5 py-0 h-4 font-bold">
              {h3Count} H3
            </Badge>
          )}
        </div>
      </div>

      {/* Diagnostics Alerts */}
      {h1Count === 0 && (
        <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 text-[11px] text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
          <span>Missing primary title. Add exactly one # H1 heading.</span>
        </div>
      )}

      {h1Count > 1 && (
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>Multiple H1 tags ({h1Count}) detected. Keep only one main article H1.</span>
        </div>
      )}

      {hierarchySkips.length > 0 && (
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
          <div className="flex items-center gap-1 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span>Heading Level Skip Detected:</span>
          </div>
          {hierarchySkips.map((skip, idx) => (
            <p key={idx} className="pl-4 text-[10px]">
              Skipped from H{skip.from} to H{skip.to} on line {skip.line}: &quot;{skip.text}&quot;
            </p>
          ))}
        </div>
      )}

      {/* Heading Tree Items */}
      {headings.length > 0 ? (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {headings.map((h, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between gap-2 ${
                h.level === 1
                  ? "bg-blue-50/40 dark:bg-blue-950/20 font-bold border-blue-200 dark:border-blue-900"
                  : h.level === 2
                  ? "bg-slate-50 dark:bg-slate-900/60 font-semibold"
                  : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400"
              }`}
              style={{
                paddingLeft: `${Math.max(8, (h.level - 1) * 12 + 8)}px`,
              }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Badge
                  variant={
                    h.level === 1 ? "info" : h.level === 2 ? "secondary" : "muted"
                  }
                  className="text-[9px] px-1 py-0 h-3.5 font-bold shrink-0"
                >
                  H{h.level}
                </Badge>
                <span className="truncate text-slate-800 dark:text-slate-200 text-[11px]">
                  {h.text}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">
                L{h.lineIndex + 1}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-6 text-center text-slate-400 text-xs space-y-1">
          <HelpCircle className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-600" />
          <p>No headings detected yet.</p>
          <p className="text-[10px] text-slate-500">
            Structure your article with # H1, ## H2, and ### H3.
          </p>
        </div>
      )}
    </div>
  );
}

