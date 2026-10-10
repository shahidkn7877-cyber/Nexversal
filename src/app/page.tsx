import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ContentAnalyzerWorkspace } from '@/components/analyzer/ContentAnalyzerWorkspace';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants';
import {
  FileText,
  Network,
  ArrowRight,
  Sparkles,
  KeyRound,
  BarChart3,
  CheckCircle2,
  ShieldCheck,
  Search,
  BookOpen,
  Zap,
  Globe,
  Lock,
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

export default function HomePage() {
  return (
    <AppShell showSidebar={true}>
      <div className="space-y-8">
        {/* Primary Page Header with Single H1 */}
        <DashboardHeader />

        {/* Section 1: Content Analyzer Primary Hero Workspace */}
        <section aria-labelledby="section-analyzer" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2
              id="section-analyzer"
              className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
            >
              <FileText className="h-4 w-4 text-brand-500" />
              <span>Article Writing &amp; Workspace Overview</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">
                Live Editorial Mode
              </span>
              <Badge variant="outline" className="text-[10px]">
                Primary Workspace
              </Badge>
            </div>
          </div>

          {/* Full Interactive Content Analyzer Experience */}
          <ContentAnalyzerWorkspace showHeader={false} />
        </section>

        {/* Section 2: Integrated SEO and Content Optimization Tools */}
        <section aria-labelledby="section-tools" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2
              id="section-tools"
              className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
            >
              <Search className="h-4 w-4 text-brand-500" />
              <span>Integrated SEO and Content Optimization Tools</span>
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              4 Core Suites
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tool 1: Content Analyzer */}
            <Card className="p-5 border-border bg-card shadow-sm hover:border-brand-500/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold text-sm">
                    <FileText className="h-4 w-4" />
                    <h3 className="text-sm font-bold text-foreground">
                      Content SEO Analyzer
                    </h3>
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
                    <h3 className="text-sm font-bold text-foreground">
                      Live SEO URL Audit
                    </h3>
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
                    <h3 className="text-sm font-bold text-foreground">
                      Keyword Research
                    </h3>
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
                    <h3 className="text-sm font-bold text-foreground">
                      Audit Reports
                    </h3>
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

        {/* Section 3: Technical SEO Audit Health and Publishing Workflow */}
        <section aria-labelledby="section-workflow" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2
              id="section-workflow"
              className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4 text-brand-500" />
              <span>Technical SEO Audit Health &amp; Publishing Workflow</span>
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              5 Steps
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Card className="p-4 border-border bg-card/60 backdrop-blur space-y-2">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-xs">
                <FileText className="h-3.5 w-3.5" />
                <h3 className="text-xs font-bold text-foreground">
                  1. Write Article
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Draft directly in Visual, Markdown Source, or Preview mode with live word counts.
              </p>
            </Card>

            <Card className="p-4 border-border bg-card/60 backdrop-blur space-y-2">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-xs">
                <Zap className="h-3.5 w-3.5" />
                <h3 className="text-xs font-bold text-foreground">
                  2. Live Analysis
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Instant score calculation checking 15 on-page heuristics, keyword density, and headings.
              </p>
            </Card>

            <Card className="p-4 border-border bg-card/60 backdrop-blur space-y-2">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-xs">
                <Sparkles className="h-3.5 w-3.5" />
                <h3 className="text-xs font-bold text-foreground">
                  3. Polish &amp; Humanize
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Refine with 1-click SEO fix, style rhythm analysis, dialect adaptation, and AI tone polish.
              </p>
            </Card>

            <Card className="p-4 border-border bg-card/60 backdrop-blur space-y-2">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-xs">
                <Globe className="h-3.5 w-3.5" />
                <h3 className="text-xs font-bold text-foreground">
                  4. Audit Live URL
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Deep crawl any webpage DOM against 18 technical factors with zero SSRF vulnerability.
              </p>
            </Card>

            <Card className="p-4 border-border bg-card/60 backdrop-blur space-y-2">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-xs">
                <Lock className="h-3.5 w-3.5" />
                <h3 className="text-xs font-bold text-foreground">
                  5. Secure Download
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Sign in to link and export standalone styled HTML reports or developer JSON payloads.
              </p>
            </Card>
          </div>
        </section>

        {/* Section 4: Architecture & Verification Standards */}
        <section aria-labelledby="section-standards" className="space-y-4">
          <h2
            id="section-standards"
            className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
          >
            <ShieldCheck className="h-4 w-4 text-brand-500" />
            <span>Platform Capabilities and Verification Standards</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 border-border bg-card/60 backdrop-blur space-y-2">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <h3 className="text-xs font-bold text-foreground">
                  18-Factor Technical Audit Engine
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Deterministic evaluation of HTTPS protocols, canonical URLs, meta descriptions (120-160 chars), title tags (30-65 chars), and robots directives with zero fabricated metrics.
              </p>
            </Card>

            <Card className="p-4 border-border bg-card/60 backdrop-blur space-y-2">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-xs">
                <BookOpen className="h-3.5 w-3.5" />
                <h3 className="text-xs font-bold text-foreground">
                  15-Rule On-Page Content Heuristics
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Analyzes heading structure (H1-H3), focus keyword density (0.8%-1.8%), readability scores, and SERP snippet previews based on established search ranking guidelines.
              </p>
            </Card>

            <Card className="p-4 border-border bg-card/60 backdrop-blur space-y-2">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-xs">
                <ShieldCheck className="h-3.5 w-3.5" />
                <h3 className="text-xs font-bold text-foreground">
                  SSRF-Protected Security Architecture
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                DNS resolution validation, private network blocking (RFC 1918), and strict connection timeouts on all external crawler requests prevent unauthorized internal network access.
              </p>
            </Card>
          </div>
        </section>

        {/* Section 5: Workspace Content Documents */}
        <section aria-labelledby="section-documents" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="p-5 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2
                    id="section-documents"
                    className="text-sm font-bold uppercase tracking-wider text-foreground"
                  >
                    Workspace Content Documents &amp; Guidelines
                  </h2>
                  <CardDescription className="text-xs">
                    Editorial optimization standards and publishing guidelines
                  </CardDescription>
                </div>
                <Badge variant="success">Rank Math Guideline Matched</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-6 space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    Active Content Writing Workspace
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Write, inspect, and optimize your article directly in the primary workspace above, or open the focused full-screen writer.
                  </p>
                </div>
                <Link href="/analyzer">
                  <Button size="sm" className="mt-2 text-xs font-semibold shadow-sm">
                    Open Dedicated Editor View
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
