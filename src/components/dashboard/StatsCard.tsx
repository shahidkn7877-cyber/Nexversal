import React from "react";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  className?: string;
  badge?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  badge,
}: StatsCardProps) {
  return (
    <Card className={cn("p-5 border-border bg-card shadow-sm hover:border-brand-500/30 transition-all", className)}>
      <div className="flex items-center justify-between pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400">
              {badge}
            </span>
          )}
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-2xl font-extrabold text-foreground tracking-tight">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        {trend && (
          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
            {trend}
          </p>
        )}
      </div>
    </Card>
  );
}
