'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { SeoScoreCard } from '@/components/dashboard/SeoScoreCard';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { IssueSummary } from '@/components/dashboard/IssueSummary';
import { UserRecentActivity } from '@/components/dashboard/UserRecentActivity';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SafeUser } from '@/lib/auth/session';
import { UserDashboardData } from '@/services/dashboard/user-dashboard.service';
import {
  FileText,
  Network,
  Sparkles,
  KeyRound,
  BarChart3,
  Settings,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface DashboardClientProps {
  user: SafeUser;
  initialData: UserDashboardData;
}

export function DashboardClient({ user, initialData }: DashboardClientProps) {
  const data = initialData;

  return (
    <AppShell showSidebar={true}>
      <div className="space-y-8">
        {/* Workspace Dashboard Header */}
        <DashboardHeader
          title="SEO Operations & Workspace Dashboard"
          description={`Welcome back, ${user.name || user.email}. Monitor technical SEO health, domain audit metrics, keyword explorations, and active document optimizations.`}
        />

        {/* 1. Core Platform Metrics */}
        <section aria-labelledby="section-metrics" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              id="section-metrics"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4 text-brand-500" />
              <span>Workspace SEO Metrics</span>
            </h2>
            <Badge variant="outline" className="text-[10px]">
              Active Session
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Audits"
              value={data.totalAudits}
              subtitle="Crawled webpage analyses"
              icon={Network}
              badge="Audits"
            />
            <StatsCard
              title="Average SEO Health"
              value={data.averageScore ? `${data.averageScore}/100` : '—'}
              subtitle="Technical on-page rating"
              icon={Sparkles}
              badge="Health"
              trend={
                data.averageScore && data.averageScore >= 80
                  ? 'Optimal Search Health'
                  : undefined
              }
            />
            <StatsCard
              title="Keyword Queries"
              value={data.keywordSearchesCount}
              subtitle="Search intent explorations"
              icon={KeyRound}
              badge="Keywords"
            />
            <StatsCard
              title="Content Analyses"
              value={data.contentAnalysesCount}
              subtitle="Articles checked & scored"
              icon={FileText}
              badge="Editor"
            />
          </div>
        </section>

        {/* 2. SEO Health & Checklist Overview */}
        <section aria-labelledby="section-health" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              id="section-health"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
            >
              <ShieldCheck className="h-4 w-4 text-brand-500" />
              <span>Technical SEO Health & Checklist</span>
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              18 Audit Factors
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-5 flex flex-col">
              <SeoScoreCard
                score={
                  data.averageScore ||
                  (data.latestAudit ? data.latestAudit.score : null)
                }
                statusText={
                  data.latestAudit
                    ? `Latest: ${data.latestAudit.url}`
                    : 'No completed audits yet'
                }
              />
            </div>
            <div className="lg:col-span-7 flex flex-col">
              <IssueSummary
                criticalCount={data.latestAudit?.criticalCount || 0}
                warningCount={data.latestAudit?.warningCount || 0}
                infoCount={
                  data.latestAudit?.checks?.filter((c) => c.severity === 'INFO')
                    ?.length || 0
                }
                passedCount={data.latestAudit?.passedCount || 0}
              />
            </div>
          </div>
        </section>

        {/* 3. Core Workspace Modules Quick Launch */}
        <section aria-labelledby="section-workspace-tools" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              id="section-workspace-tools"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4 text-brand-500" />
              <span>Core Workspace Modules</span>
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              5 Dedicated Tools
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 border-border bg-card shadow-sm hover:border-brand-500/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold text-sm">
                    <FileText className="h-4 w-4" />
                    <h3 className="text-sm font-bold text-foreground">
                      Content Analyzer
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Editor
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Rich Visual, Markdown/HTML Source, and Published Article Preview modes. 15 on-page heuristics, 1-click fixes, and AI tone polish.
                </p>
              </div>
              <div className="pt-4 mt-auto">
                <Link href="/analyzer" className="block">
                  <Button size="sm" className="w-full text-xs font-bold gap-1.5 shadow-sm">
                    <span>Open Editor</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-5 border-border bg-card shadow-sm hover:border-purple-500/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
                    <Network className="h-4 w-4" />
                    <h3 className="text-sm font-bold text-foreground">
                      Live SEO URL Audit
                    </h3>
                  </div>
                  <Badge variant="success" className="text-[10px]">
                    Crawler
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Crawl public webpages against 18 deterministic factors: meta, headings, canonical, robots, and schema structured data.
                </p>
              </div>
              <div className="pt-4 mt-auto">
                <Link href="/crawler" className="block">
                  <Button size="sm" variant="outline" className="w-full text-xs font-semibold gap-1.5">
                    <span>Run URL Audit</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-5 border-border bg-card shadow-sm hover:border-emerald-500/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <KeyRound className="h-4 w-4" />
                    <h3 className="text-sm font-bold text-foreground">
                      Keyword Explorer
                    </h3>
                  </div>
                  <Badge variant="info" className="text-[10px]">
                    Intent
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Evaluate search intent, keyword difficulty ratings, estimated search volume, and CPC advertising competition.
                </p>
              </div>
              <div className="pt-4 mt-auto">
                <Link href="/keywords" className="block">
                  <Button size="sm" variant="outline" className="w-full text-xs font-semibold gap-1.5">
                    <span>Research Keywords</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-5 border-border bg-card shadow-sm hover:border-sky-500/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-sm">
                    <BarChart3 className="h-4 w-4" />
                    <h3 className="text-sm font-bold text-foreground">
                      Audit Reports
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Exports
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Export standalone executive HTML reports with client-ready styling or developer structured JSON payloads.
                </p>
              </div>
              <div className="pt-4 mt-auto">
                <Link href="/reports" className="block">
                  <Button size="sm" variant="outline" className="w-full text-xs font-semibold gap-1.5">
                    <span>View Reports</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </section>

        {/* 4. Recent Audits & Active Document Management */}
        <section aria-labelledby="section-recent-audits" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              id="section-recent-audits"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
            >
              <Network className="h-4 w-4 text-brand-500" />
              <span>Recent Webpage Audits &amp; Documents</span>
            </h2>
            <span className="text-xs text-muted-foreground">
              {data.recentAudits.length} recorded
            </span>
          </div>

          <Card className="border-border bg-card shadow-sm">
            {data.recentAudits.length === 0 ? (
              <CardContent className="p-8 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Network className="h-6 w-6 opacity-50" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">
                    No Webpage Audits Run Yet
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Audit your first public URL to evaluate meta tags, heading hierarchy, robots directives, and schema markup.
                  </p>
                </div>
                <Link href="/crawler">
                  <Button size="sm" className="text-xs font-bold gap-1.5 mt-2">
                    <span>Run Your First Audit</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardContent>
            ) : (
              <div className="divide-y divide-border">
                {data.recentAudits.map((audit) => (
                  <div
                    key={audit.id}
                    className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-foreground truncate max-w-lg">
                          {audit.url}
                        </span>
                        <Badge
                          variant={
                            audit.score >= 80
                              ? 'success'
                              : audit.score >= 60
                              ? 'warning'
                              : 'danger'
                          }
                          className="text-[10px] font-bold"
                        >
                          Score: {audit.score}/100
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        {audit.targetKeyword && (
                          <span>
                            Keyword: &quot;{audit.targetKeyword}&quot;
                          </span>
                        )}
                        <span>
                          Passed: {audit.passedCount} · Warnings:{' '}
                          {audit.warningCount} · Critical: {audit.criticalCount}
                        </span>
                        <span>{new Date(audit.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/crawler`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs font-semibold h-8 gap-1"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                      <Link href={`/api/v1/reports/export?auditId=${audit.id}&format=html`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs font-semibold h-8 text-brand-600 dark:text-brand-400"
                        >
                          Export HTML
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* 5. Recent Activity Timeline */}
        <section aria-labelledby="section-activity" className="space-y-3">
          <UserRecentActivity activities={data.recentActivity} />
        </section>
      </div>
    </AppShell>
  );
}

