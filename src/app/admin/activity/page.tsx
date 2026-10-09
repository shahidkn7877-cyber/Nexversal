import React from 'react';
import { redirect } from 'next/navigation';
import { checkAdminServerComponent } from '@/lib/auth/admin-guard';
import { activityService } from '@/services/activity/activity.service';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActivityEventType, ActivityEvent } from '@/types/activity';
import { Activity, Clock } from 'lucide-react';

function getEventBadge(type: ActivityEventType) {
  switch (type) {
    case 'AUDIT_CREATED':
      return <Badge variant="secondary" className="font-mono text-[10px]">AUDIT_CREATED</Badge>;
    case 'KEYWORD_RESEARCH':
      return <Badge variant="success" className="font-mono text-[10px]">KEYWORD_RESEARCH</Badge>;
    case 'CONTENT_ANALYSIS':
      return <Badge variant="outline" className="font-mono text-[10px]">CONTENT_ANALYSIS</Badge>;
    case 'REPORT_CREATED':
    case 'REPORT_EXPORTED':
      return <Badge variant="info" className="font-mono text-[10px]">{type}</Badge>;
    case 'AI_IMPROVEMENT_REQUESTED':
      return <Badge variant="warning" className="font-mono text-[10px]">AI_IMPROVEMENT</Badge>;
    case 'ADMIN_LOGIN':
      return <Badge variant="destructive" className="font-mono text-[10px]">ADMIN_LOGIN</Badge>;
    default:
      return <Badge variant="muted" className="font-mono text-[10px]">{type}</Badge>;
  }
}

export default async function AdminActivityPage() {
  const isAuthorized = await checkAdminServerComponent();
  if (!isAuthorized) {
    redirect('/admin/login');
  }

  const activities: ActivityEvent[] = activityService.getRecentPlatformActivity(100);
  const stats = activityService.getActivityStats();

  return (
    <div className="space-y-6 p-6">
      <AdminHeader
        title="Platform Activity Audit Trail"
        description="Immutable chronological log of all user operations, SEO audits, and optimizer invocations."
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3 border-border bg-card">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Events</span>
          <p className="text-xl font-black text-foreground">{stats.totalEvents}</p>
        </Card>
        <Card className="p-3 border-border bg-card">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">SEO Audits</span>
          <p className="text-xl font-black text-brand-600 dark:text-brand-400">{stats.totalAudits}</p>
        </Card>
        <Card className="p-3 border-border bg-card">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Keywords</span>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.totalKeywordSearches}</p>
        </Card>
        <Card className="p-3 border-border bg-card">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Content</span>
          <p className="text-xl font-black text-purple-600 dark:text-purple-400">{stats.totalContentAnalyses}</p>
        </Card>
        <Card className="p-3 border-border bg-card">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Reports</span>
          <p className="text-xl font-black text-blue-600 dark:text-blue-400">{stats.totalReports}</p>
        </Card>
        <Card className="p-3 border-border bg-card">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">AI Requests</span>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400">{stats.totalAiImprovements}</p>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-500" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                Audit Trail Log
              </CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              Showing last {activities.length} recorded events
            </span>
          </div>
          <CardDescription className="text-xs">
            Privacy Policy Enforced: Private article bodies, customer drafts, and API credentials are automatically excluded from logs.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {activities.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
              <p className="text-xs font-bold text-foreground">No platform activity recorded yet.</p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                Activity events are generated automatically as users execute audits, search keywords, or optimize articles.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase">
                  <tr>
                    <th className="p-3.5 pl-5">Timestamp</th>
                    <th className="p-3.5">Event Type</th>
                    <th className="p-3.5">User Session</th>
                    <th className="p-3.5">Summary</th>
                    <th className="p-3.5 pr-5">Metadata Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activities.map((act: ActivityEvent) => (
                    <tr
                      key={act.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-3.5 pl-5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(act.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {getEventBadge(act.type)}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-foreground font-semibold whitespace-nowrap">
                        {act.userId}
                      </td>
                      <td className="p-3.5 font-medium text-foreground max-w-xs sm:max-w-md truncate">
                        {act.summary}
                      </td>
                      <td className="p-3.5 pr-5 max-w-xs truncate text-[11px] text-muted-foreground font-mono">
                        {act.metadata && Object.keys(act.metadata).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(act.metadata).map(([k, v]) => (
                              <span
                                key={k}
                                className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px]"
                              >
                                {k}: {String(v)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
