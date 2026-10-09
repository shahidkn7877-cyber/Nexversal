import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight } from "lucide-react";

interface AiPatternPanelProps {
  patterns?: Array<{
    phrase: string;
    category: string;
    suggestion: string;
  }>;
}

export function AiPatternPanel({ patterns = [] }: AiPatternPanelProps) {
  const demoPatterns = [
    {
      phrase: "In today's fast-paced digital world",
      category: "Overused Cliché",
      suggestion: "Today / Right now",
    },
    {
      phrase: "It is paramount to understand",
      category: "Formal Stiff Filler",
      suggestion: "It is important to remember",
    },
    {
      phrase: "Delve into the nuances",
      category: "Generic AI Phrase",
      suggestion: "Explore / Examine",
    },
    {
      phrase: "A testament to the dedication",
      category: "Overused Metaphor",
      suggestion: "Shows the dedication",
    },
    {
      phrase: "A rich tapestry of ideas",
      category: "Hallmark Buzzword",
      suggestion: "A diverse collection",
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card">
        <CardHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Repetitive Pattern & Buzzword Cleaner
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Identifies overused phrases, academic filler, and clichéd transitions
                </p>
              </div>
            </div>
            <Badge variant="muted">Pattern Engine</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Clean, natural writing improves user engagement and dwell time.
            </span>
            <Button size="sm" variant="outline" className="text-xs" disabled>
              <span>Scan Patterns</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
          Catalog of Monitored Robotic Phrases:
        </span>
        <div className="space-y-2">
          {demoPatterns.map((p, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-sm hover:border-brand-500/30 transition-all"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-600 dark:text-rose-400 line-through">
                    &quot;{p.phrase}&quot;
                  </span>
                  <Badge variant="muted" className="text-[9px] py-0 px-1.5 font-medium">
                    {p.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span>Suggested: &quot;{p.suggestion}&quot;</span>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="text-xs self-end sm:self-auto h-7 px-2.5" disabled>
                <span>Replace</span>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
