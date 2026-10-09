import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export function HumanizerPanel() {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Style & Tone Humanizer Settings
            </CardTitle>
          </div>
          <Badge variant="muted">Tone Engine</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4 text-xs">
        <p className="text-muted-foreground leading-relaxed">
          Fine-tune the rhythm, sentence burstiness, and natural conversational cadence of your content while preserving exact SEO keywords.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/40 space-y-1">
            <span className="font-bold text-foreground">Tone Preset</span>
            <p className="text-[11px] text-muted-foreground">Conversational & Authoritative</p>
          </div>
          <div className="p-3 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/40 space-y-1">
            <span className="font-bold text-foreground">Target Dialect</span>
            <p className="text-[11px] text-muted-foreground">US English (American spelling)</p>
          </div>
        </div>
        <div className="pt-2">
          <Button disabled variant="outline" className="w-full text-xs">
            <span>Configure AI Humanizer Service</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
