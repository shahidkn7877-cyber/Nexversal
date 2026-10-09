import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface SeoScoreCardProps {
  score?: number | null;
  statusText?: string;
}

export function SeoScoreCard({
  score = null,
  statusText = "Not analyzed yet",
}: SeoScoreCardProps) {
  const hasScore = score !== null;

  return (
    <Card className="relative overflow-hidden border-border bg-gradient-to-br from-card via-card to-brand-500/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            SEO Optimization Score
          </CardTitle>
          <Badge variant={hasScore ? "success" : "muted"}>
            {hasScore ? "Analyzed" : "Ready for Analysis"}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Comprehensive on-page quality and technical structure rating
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-center gap-6">
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-4 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <div className="text-center">
              <span className="text-2xl font-extrabold text-foreground">
                {hasScore ? score : "—"}
              </span>
              <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                {hasScore ? "/ 100" : "No score"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-foreground">
              {hasScore ? `Current Score: ${score}/100` : statusText}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {hasScore
                ? "On-page elements analyzed against technical search guidelines."
                : "Enter or load content in the Content Analyzer to evaluate on-page factors, title formatting, and headings."}
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-brand-500" />
              <span>Evaluates technical structure, readability, and content quality</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
