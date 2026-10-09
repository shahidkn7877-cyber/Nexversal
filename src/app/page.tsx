import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { SeoScoreCard } from '@/components/dashboard/SeoScoreCard';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { IssueSummary } from '@/components/dashboard/IssueSummary';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { auditRepository } from '@/repositories/audit.repository';
import {
  FileText,
  Target,
  Network,
  ArrowRight,
  Sparkles,
  KeyRound,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';

export default function DashboardPage() {
  const latestAudit = auditRepository.getLatest();

  return (
    <AppShell showSidebar={true}>
      <div className="space-y-6">
        <DashboardHeader />

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Active Articles"
            value="0"
            subtitle="Start drafting in Analyzer"
            icon={FileText}
          />
          <StatsCard
            title="Focus Keywords"
            value="0"
            subtitle="Track focus keywords"
            icon={Target}
          />
          <StatsCard
            title="Latest Audit Health"
            value={latestAudit ? `${latestAudit.score}/100` : 'Not Audited'}
            subtitle={latestAudit ? 'Live URL Health Checked' : 'Run URL Audit'}
            icon={Network}
            badge={latestAudit && latestAudit.score >= 80 ? 'Healthy' : latestAudit ? 'Needs Review' : undefined}
          />
          <StatsCard
            title="Keyword Intent"
            value="N/A"
            subtitle="Explore in Keyword Research"
            icon={KeyRound}
          />
        </div>

        {/* Score & Issue Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SeoScoreCard
            score={latestAudit ? latestAudit.score : null}
            statusText={latestAudit ? 'Evaluated against 18 SEO factors' : 'No audits performed yet'}
          />
          <IssueSummary
            criticalCount={latestAudit ? latestAudit.criticalCount : 0}
            warningCount={latestAudit ? latestAudit.warningCount : 0}
            infoCount={0}
            passedCount={latestAudit ? latestAudit.passedCount : 0}
          />
        </div>

        {/* Action Modules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 border-border bg-card shadow-sm hover:border-brand-500/40 transition-all flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold text-sm">
                <FileText className="h-4 w-4" />
                <span>Content SEO Analyzer</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Analyze on-page headings, focus keyword distribution (0.8%-1.8%), mobile paragraph length, and SERP previews.
              </p>
            </div>
            <div className="pt-4">
              <Link href="/analyzer">
                <Button size="sm" className="w-full text-xs font-bold gap-1.5">
                  <span>Open Content Analyzer</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-5 border-border bg-card shadow-sm hover:border-purple-500/40 transition-all flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
                <Network className="h-4 w-4" />
                <span>Live SEO URL Audit</span>
                <Badge variant="success" className="text-[10px]">
                  Functional
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Scan external web pages for title, meta tags, H1/H2 hierarchy, canonical tags, images alt attributes, and robots directives.
              </p>
            </div>
            <div className="pt-4">
              <Link href="/crawler">
                <Button size="sm" variant="outline" className="w-full text-xs font-semibold gap-1.5">
                  <span>Run Live URL Audit</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-5 border-border bg-card shadow-sm hover:border-emerald-500/40 transition-all flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <KeyRound className="h-4 w-4" />
                <span>Keyword Research</span>
                <Badge variant="info" className="text-[10px]">
                  Intent Engine
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Explore search intent, keyword difficulty (KD), estimated monthly search volume, and CPC advertising competition.
              </p>
            </div>
            <div className="pt-4">
              <Link href="/keywords">
                <Button size="sm" variant="outline" className="w-full text-xs font-semibold gap-1.5">
                  <span>Explore Keywords</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Active Documents List */}
        <Card className="border-border bg-card">
          <CardHeader className="p-5 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Workspace Content Documents
                </CardTitle>
                <CardDescription className="text-xs">
                  Active content projects managed in this workspace
                </CardDescription>
              </div>
              <Badge variant="success">Rank Math Guideline Matched</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center py-8 space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <FileText className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">No content documents yet</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Create and optimize your first SEO article using the Content Analyzer.
                </p>
              </div>
              <Link href="/analyzer">
                <Button size="sm" className="mt-2 text-xs">
                  Create New Article
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
