import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Columns } from "lucide-react";

interface DiffViewerProps {
  originalText: string;
  optimizedText?: string;
}

export function DiffViewer({
  originalText,
  optimizedText = "",
}: DiffViewerProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Columns className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
              Side-by-Side Revision Diff Viewer
            </CardTitle>
          </div>
          <Badge variant="muted">Revision Comparator</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Original Input Draft
              </span>
              <span className="text-[10px] text-muted-foreground">
                {originalText.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 min-h-[220px] max-h-[400px] overflow-y-auto text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {originalText || "No content entered in editor."}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Optimized Output
              </span>
              <Badge variant="muted" className="text-[9px]">
                Pending Run
              </Badge>
            </div>
            <div className="p-3.5 rounded-xl border border-dashed border-border bg-brand-50/20 dark:bg-brand-950/10 min-h-[220px] flex items-center justify-center text-center p-6 text-xs text-muted-foreground italic">
              When the optimization engine runs, the revision comparison with highlight diffs will appear here.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
