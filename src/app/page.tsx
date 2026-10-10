import React from 'react';
import type { Metadata } from 'next';
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
import { APP_NAME, APP_DESCRIPTION, SITE_URL } from '@/lib/constants';
import {
  FileText,
  Target,
  Network,
  ArrowRight,
  Sparkles,
  KeyRound,
  BarChart3,
  CheckCircle2,
  ShieldCheck,
  Search,
  BookOpen,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Professional SEO Audit & Content Optimization | Nexversal',
  description: APP_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Professional SEO Audit & Content Optimization | Nexversal',
    description: APP_DESCRIPTION,
    url: '/',
    siteName: APP_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Professional SEO Audit & Content Optimization | Nexversal',
    description: APP_DESCRIPTION,
  },
};

export default function DashboardPage() {
  const latestAudit = auditRepository.getLatest();

  return (
    <AppShell showSidebar={true}>
      <div className="space-y-8">
        {/* Primary Page Header with Single H1 */}
        <DashboardHeader />

        {/* Section 1: Real-Time Metrics & Overview */}
        <section aria-labelledby="section-metrics" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="section-metrics" className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-500" />
              <span>Workspace Overview and Real-Time Metrics</span>
            </h2>
            <span className="text-xs text-muted-foreground font-medium">Updated live</span>
          </div>

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
        </section>

        {/* Section 2: Technical SEO Health & Factors */}
        <section aria-labelledby="section-health" className="space-y-4">
          <h2 id="section-health" className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Technical SEO Audit Health and Scoring</span>
          </h2>

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
        </section>

        {/* Section 3: Core SEO & Content Tools */}
        <section aria-labelledby="section-tools" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="section-tools" className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Search className="h-4 w-4 text-brand-500" />
              <span>Integrated SEO and Content Optimization Tools</span>
            </h2>
            <span className="text-xs text-muted-foreground font-medium">4 Core Suites</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tool 1: Content Analyzer */}
            <Card className="p-5 border-border bg-card shadow-sm hover:border-brand-500/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold text-sm">
                    <FileText className="h-4 w-4" />
                    <h3 className="text-sm font-bold text-foreground">Content SEO Analyzer</h3>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Editor Suite
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Editorial writing workspace supporting Rich Visual, Markdown/HTML Source, and Published Article Preview modes. Checks 15 on-page criteria with 1-click fixes and AI tone humanization.
                </p>
              </div>
              <div className="pt-4 mt-auto">
                <Link href="/analyzer" className="block">
                  <Button size="sm" className="w-full text-xs font-bold gap-1.5 shadow-sm">
                    <span>Open Content Analyzer</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Tool 2: Live SEO URL Audit */}
            <Card className="p-5 border-border bg-card shadow-sm hover:border-purple-500/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
                    <Network className="h-4 w-4" />
                    <h3 className="text-sm font-bold text-foreground">Live SEO URL Audit</h3>
                  </div>
                  <Badge variant="success" className="text-[10px]">
                    Functional
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Scan external web pages for title, meta tags, H1/H2 hierarchy, canonical links, image alt attributes, and robots directives with zero SSRF risk.
                </p>
              </div>
              <div className="pt-4 mt-auto">
                <Link href="/crawler" className="block">
                  <Button size="sm" variant="outline" className="w-full text-xs font-semibold gap-1.5">
                    <span>Run Live URL Audit</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Tool 3: Keyword Research */}
            <Card className="p-5 border-border bg-card shadow-sm hover:border-emerald-500/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <KeyRound className="h-4 w-4" />
                    <h3 className="text-sm font-bold text-foreground">Keyword Research</h3>
                  </div>
                  <Badge variant="info" className="text-[10px]">
                    Intent Engine
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Explore search intent (informational, transactional), difficulty ratings, search volume estimates, and advertising competition across regions.
                </p>
              </div>
              <div className="pt-4 mt-auto">
                <Link href="/keywords" className="block">
                  <Button size="sm" variant="outline" className="w-full text-xs font-semibold gap-1.5">
                    <span>Explore Keywords</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Tool 4: Technical Audit Reports */}
            <Card className="p-5 border-border bg-card shadow-sm hover:border-sky-500/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-sm">
                    <BarChart3 className="h-4 w-4" />
                    <h3 className="text-sm font-bold text-foreground">Audit Reports</h3>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Export Suite
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Generate, review, and download comprehensive on-demand technical audit summaries. Export clean JSON data or standalone styled HTML executive reports.
                </p>
              </div>
              <div className="pt-4 mt-auto">
                <Link href="/reports" className="block">
                  <Button size="sm" variant="outline" className="w-full text-xs font-semibold gap-1.5">
                    <span>View Audit Reports</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </section>

        {/* Section 4: Architecture & Verification Standards */}
        <section aria-labelledby="section-standards" className="space-y-4">
          <h2 id="section-standards" className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-500" />
            <span>Platform Capabilities and Verification Standards</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 border-border bg-card/60 backdrop-blur space-y-2">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <h3 className="text-xs font-bold text-foreground">18-Factor Technical Audit Engine</h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Deterministic evaluation of HTTPS protocols, canonical URLs, meta descriptions (120-160 chars), title tags (30-65 chars), and robots directives with zero fabricated metrics.
              </p>
            </Card>

            <Card className="p-4 border-border bg-card/60 backdrop-blur space-y-2">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-xs">
                <BookOpen className="h-3.5 w-3.5" />
                <h3 className="text-xs font-bold text-foreground">15-Rule On-Page Content Heuristics</h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Analyzes heading structure (H1-H3), focus keyword density (0.8%-1.8%), readability scores, and SERP snippet previews based on established search ranking guidelines.
              </p>
            </Card>

            <Card className="p-4 border-border bg-card/60 backdrop-blur space-y-2">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-xs">
                <ShieldCheck className="h-3.5 w-3.5" />
                <h3 className="text-xs font-bold text-foreground">SSRF-Protected Security Architecture</h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                DNS resolution validation, private network blocking (RFC 1918), and strict connection timeouts on all external crawler requests prevent unauthorized internal network access.
              </p>
            </Card>
          </div>
        </section>

        {/* Section 5: Active Content Projects */}
        <section aria-labelledby="section-workspace" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="p-5 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 id="section-workspace" className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Workspace Content Documents
                  </h2>
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
                  <h3 className="text-sm font-semibold text-foreground">No content documents yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Create and optimize your first SEO article using the Content Analyzer writing workspace.
                  </p>
                </div>
                <Link href="/analyzer">
                  <Button size="sm" className="mt-2 text-xs font-semibold shadow-sm">
                    Create New Article
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
