import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

interface IssueSummaryProps {
  criticalCount?: number;
  warningCount?: number;
  infoCount?: number;
  passedCount?: number;
}

export function IssueSummary({
  criticalCount = 0,
  warningCount = 0,
  infoCount = 0,
  passedCount = 0,
}: IssueSummaryProps) {
  const total = criticalCount + warningCount + infoCount + passedCount;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Audit Checklist Overview
          </CardTitle>
          <span className="text-xs font-semibold text-muted-foreground">
            {total === 0 ? "Not analyzed" : `${total} Checks Evaluated`}
          </span>
        </div>
        <CardDescription className="text-xs">
          High-level breakdown of critical errors, warnings, and passed rules
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1">
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase">Critical</span>
            </div>
            <div className="text-xl font-extrabold text-foreground">
              {criticalCount}
            </div>
            <p className="text-[10px] text-muted-foreground">Action required</p>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase">Warnings</span>
            </div>
            <div className="text-xl font-extrabold text-foreground">
              {warningCount}
            </div>
            <p className="text-[10px] text-muted-foreground">Optimization tips</p>
          </div>

          <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 space-y-1">
            <div className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400">
              <Info className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase">Info</span>
            </div>
            <div className="text-xl font-extrabold text-foreground">
              {infoCount}
            </div>
            <p className="text-[10px] text-muted-foreground">Best practices</p>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase">Passed</span>
            </div>
            <div className="text-xl font-extrabold text-foreground">
              {passedCount}
            </div>
            <p className="text-[10px] text-muted-foreground">Meets criteria</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
