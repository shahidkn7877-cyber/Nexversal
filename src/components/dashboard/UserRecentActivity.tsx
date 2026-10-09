'use client';

import React from 'react';
import { ActivityEvent } from '@/types/activity';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Network,
  KeyRound,
  FileSearch,
  BarChart3,
  Sparkles,
  Clock,
  Activity,
} from 'lucide-react';

interface UserRecentActivityProps {
  activities: ActivityEvent[];
}

function getActivityIcon(type: ActivityEvent['type']) {
  switch (type) {
    case 'AUDIT_CREATED':
      return <Network className="h-4 w-4 text-brand-500" />;
    case 'KEYWORD_RESEARCH':
      return <KeyRound className="h-4 w-4 text-emerald-500" />;
    case 'CONTENT_ANALYSIS':
      return <FileSearch className="h-4 w-4 text-purple-500" />;
    case 'REPORT_CREATED':
    case 'REPORT_EXPORTED':
      return <BarChart3 className="h-4 w-4 text-blue-500" />;
    case 'AI_IMPROVEMENT_REQUESTED':
      return <Sparkles className="h-4 w-4 text-amber-500" />;
    default:
      return <Activity className="h-4 w-4 text-slate-400" />;
  }
}

function getActivityBadge(type: ActivityEvent['type']) {
  switch (type) {
    case 'AUDIT_CREATED':
      return <Badge variant="secondary" className="text-[10px]">SEO Audit</Badge>;
    case 'KEYWORD_RESEARCH':
      return <Badge variant="success" className="text-[10px]">Keyword</Badge>;
    case 'CONTENT_ANALYSIS':
      return <Badge variant="outline" className="text-[10px]">Content</Badge>;
    case 'REPORT_CREATED':
    case 'REPORT_EXPORTED':
      return <Badge variant="info" className="text-[10px]">Report</Badge>;
    case 'AI_IMPROVEMENT_REQUESTED':
      return <Badge variant="warning" className="text-[10px]">AI Action</Badge>;
    default:
      return <Badge variant="muted" className="text-[10px]">Event</Badge>;
  }
}

export function UserRecentActivity({ activities }: UserRecentActivityProps) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="p-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
              Recent Activity
            </CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">
            {activities.length} {activities.length === 1 ? 'event' : 'events'} logged
          </span>
        </div>
        <CardDescription className="text-xs">
          Your personal audit executions, keyword queries, and content optimizations
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5">
        {activities.length === 0 ? (
          <div className="p-8 text-center space-y-2 rounded-2xl border border-dashed border-border bg-muted/20">
            <Clock className="h-7 w-7 text-muted-foreground mx-auto opacity-40" />
            <p className="text-xs font-bold text-foreground">No activity yet.</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              Run a live URL audit, explore keyword suggestions, or analyze content in your workspace to begin tracking activity.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activities.map((item) => (
              <div
                key={item.id}
                className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-muted border border-border mt-0.5 shrink-0">
                    {getActivityIcon(item.type)}
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground leading-snug">
                      {item.summary}
                    </p>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  {getActivityBadge(item.type)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
