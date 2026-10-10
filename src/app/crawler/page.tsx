'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AuditResult, AuditCheck } from '@/types/audit';
import {
  Globe,
  ArrowRight,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Lock,
  FileCode,
  LayoutTemplate,
  Layers,
  Search,
  ExternalLink,
  RotateCw,
} from 'lucide-react';

export default function CrawlerPage() {
  const [url, setUrl] = useState('');
  const [targetKeyword, setTargetKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'critical' | 'warning' | 'passed' | 'data'>('all');

  const handleRunAudit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          targetKeyword: targetKeyword.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.error?.message || 'Failed to complete SEO audit.');
      } else {
        setAuditResult(json.data);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error while contacting audit service.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreset = (presetUrl: string, presetKw: string) => {
    setUrl(presetUrl);
    setTargetKeyword(presetKw);
  };

  const filteredChecks: AuditCheck[] = React.useMemo(() => {
    if (!auditResult || !auditResult.checks) return [];
    if (filterTab === 'critical') return auditResult.checks.filter((c) => c.status === 'critical');
    if (filterTab === 'warning') return auditResult.checks.filter((c) => c.status === 'warning');
    if (filterTab === 'passed') return auditResult.checks.filter((c) => c.status === 'passed');
    return auditResult.checks;
  }, [auditResult, filterTab]);

  return (
    <AppShell showSidebar={true}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Live URL SEO Audit Tool
              </h1>
              <Badge variant="success" className="text-xs font-bold">
                SSRF-Protected
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Deep technical audit analyzing 18 on-page factors, robots directives, schema, and keyword distribution.
            </p>
          </div>
        </div>

        {/* Audit Form Card */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="p-5 border-b border-border">
            <CardTitle as="h2" className="text-sm font-bold uppercase tracking-wider text-foreground">
              Audit Any Webpage URL
            </CardTitle>
            <CardDescription className="text-xs">
              Enter an external public webpage to analyze its live DOM, metadata, headings, and schema structured data.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <form onSubmit={handleRunAudit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-7 relative">
                  <Input
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/blog/article"
                    className="pl-9 text-xs sm:text-sm font-medium"
                  />
                  <Globe className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                </div>
                <div className="md:col-span-5 relative">
                  <Input
                    value={targetKeyword}
                    onChange={(e) => setTargetKeyword(e.target.value)}
                    placeholder="Target Focus Keyword (e.g. enterprise cloud seo)"
                    className="pl-9 text-xs sm:text-sm font-medium"
                  />
                  <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() =>
                      loadPreset('https://nexversal.com/', 'nexversal')
                    }
                    className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
                  >
                    Nexversal.com
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() =>
                      loadPreset('https://en.wikipedia.org/wiki/Search_engine_optimization', 'search engine optimization')
                    }
                    className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
                  >
                    Wikipedia SEO
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="gap-2 font-bold text-xs sm:text-sm h-10 px-5 shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <RotateCw className="h-4 w-4 animate-spin" />
                      <span>Auditing Webpage...</span>
                    </>
                  ) : (
                    <>
                      <span>Run SEO Audit</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-sm">Audit Could Not Complete</span>
                  <p className="leading-relaxed">{errorMsg}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit Results View */}
        {auditResult && (
          <div className="space-y-6">
            {/* Score & Summary Banner */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
              <Card className="md:col-span-4 p-5 border-border bg-card flex flex-col justify-between items-center text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  SEO Audit Health Score
                </span>

                <div className="my-4 relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                  <div className="text-center">
                    <span
                      className={`text-3xl font-black ${
                        auditResult.score >= 80
                          ? 'text-emerald-500'
                          : auditResult.score >= 60
                          ? 'text-amber-500'
                          : 'text-rose-500'
                      }`}
                    >
                      {auditResult.score}
                    </span>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                      / 100
                    </span>
                  </div>
                </div>

                <Badge
                  variant={
                    auditResult.score >= 80
                      ? 'success'
                      : auditResult.score >= 60
                      ? 'warning'
                      : 'danger'
                  }
                  className="font-bold"
                >
                  {auditResult.score >= 80
                    ? 'Excellent Optimization'
                    : auditResult.score >= 60
                    ? 'Moderate Issues Found'
                    : 'Critical Fixes Required'}
                </Badge>
              </Card>

              <Card className="md:col-span-8 p-5 border-border bg-card flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Target Audit URL
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(auditResult.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground break-all">
                    {auditResult.url}
                  </h3>
                  {auditResult.targetKeyword && (
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <span className="text-muted-foreground">Target Keyword:</span>
                      <Badge variant="secondary" className="font-semibold">
                        &quot;{auditResult.targetKeyword}&quot;
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                    <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                      {auditResult.criticalCount}
                    </span>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                      Critical
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                      {auditResult.warningCount}
                    </span>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                      Warnings
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {auditResult.passedCount}
                    </span>
                    <span className="block text-[10px] font-bold text-muted-foreground uppercase">
                      Passed
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
              <Button
                size="sm"
                variant={filterTab === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterTab('all')}
                className="text-xs font-bold h-8"
              >
                All Checks ({auditResult.checks.length})
              </Button>
              <Button
                size="sm"
                variant={filterTab === 'critical' ? 'default' : 'outline'}
                onClick={() => setFilterTab('critical')}
                className="text-xs font-bold h-8 gap-1.5"
              >
                <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                <span>Critical ({auditResult.criticalCount})</span>
              </Button>
              <Button
                size="sm"
                variant={filterTab === 'warning' ? 'default' : 'outline'}
                onClick={() => setFilterTab('warning')}
                className="text-xs font-bold h-8 gap-1.5"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>Warnings ({auditResult.warningCount})</span>
              </Button>
              <Button
                size="sm"
                variant={filterTab === 'passed' ? 'default' : 'outline'}
                onClick={() => setFilterTab('passed')}
                className="text-xs font-bold h-8 gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Passed ({auditResult.passedCount})</span>
              </Button>
              <Button
                size="sm"
                variant={filterTab === 'data' ? 'default' : 'outline'}
                onClick={() => setFilterTab('data')}
                className="text-xs font-bold h-8 gap-1.5 ml-auto"
              >
                <FileCode className="h-3.5 w-3.5 text-brand-500" />
                <span>Page Inspector</span>
              </Button>
            </div>

            {/* Checks List */}
            {filterTab !== 'data' ? (
              <div className="space-y-3">
                {filteredChecks.map((check) => {
                  let StatusIcon = CheckCircle2;
                  let iconColor = 'text-emerald-500';
                  let cardBorder = 'hover:border-emerald-500/40';

                  if (check.status === 'warning') {
                    StatusIcon = AlertTriangle;
                    iconColor = 'text-amber-500';
                    cardBorder = 'border-amber-500/20 hover:border-amber-500/40';
                  } else if (check.status === 'critical') {
                    StatusIcon = AlertCircle;
                    iconColor = 'text-rose-500';
                    cardBorder = 'border-rose-500/30 hover:border-rose-500/50';
                  }

                  return (
                    <Card key={check.id} className={`p-4 border-border bg-card shadow-sm transition-all ${cardBorder}`}>
                      <div className="flex items-start gap-3.5">
                        <div className="mt-0.5 shrink-0">
                          <StatusIcon className={`h-5 w-5 ${iconColor}`} />
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-foreground">
                              {check.title}
                            </h4>
                            <Badge
                              variant={
                                check.status === 'passed'
                                  ? 'success'
                                  : check.status === 'warning'
                                  ? 'warning'
                                  : 'danger'
                              }
                              className="text-[10px] font-bold uppercase tracking-wider"
                            >
                              {check.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {check.description}
                          </p>
                          {check.value !== undefined && check.value !== null && (
                            <div className="text-[11px] font-mono bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-md text-foreground truncate max-w-2xl">
                              Found: {String(check.value)}
                            </div>
                          )}
                          {check.recommendation && check.status !== 'passed' && (
                            <div className="pt-1.5 text-xs text-amber-800 dark:text-amber-200 bg-amber-500/10 rounded-xl p-2.5 font-medium leading-relaxed">
                              🎯 <span className="font-bold">Recommendation:</span> {check.recommendation}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* Page Inspector View */
              auditResult.pageData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <Card className="p-4 border-border bg-card space-y-3">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground block text-[11px]">
                      Metadata & Headlines
                    </span>
                    <div className="space-y-2">
                      <div>
                        <span className="font-semibold text-foreground">Title Tag:</span>
                        <p className="text-muted-foreground mt-0.5 break-words">
                          {auditResult.pageData.title || '(None detected)'} ({auditResult.pageData.titleLength} chars)
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">Meta Description:</span>
                        <p className="text-muted-foreground mt-0.5 break-words">
                          {auditResult.pageData.metaDescription || '(None detected)'} ({auditResult.pageData.metaDescriptionLength} chars)
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">H1 Headline:</span>
                        <p className="text-muted-foreground mt-0.5 break-words">
                          {auditResult.pageData.h1Text || '(None detected)'} ({auditResult.pageData.h1Count} tags)
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">H2 Subheadings ({auditResult.pageData.h2Count}):</span>
                        <ul className="list-disc pl-4 text-muted-foreground mt-1 space-y-1">
                          {auditResult.pageData.h2Headings.slice(0, 6).map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 border-border bg-card space-y-3">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground block text-[11px]">
                      Technical & Links Overview
                    </span>
                    <div className="space-y-2">
                      <div className="flex justify-between py-1 border-b border-border">
                        <span className="font-semibold text-foreground">Total Words:</span>
                        <span className="text-muted-foreground">{auditResult.pageData.wordCount} words</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border">
                        <span className="font-semibold text-foreground">Internal Links:</span>
                        <span className="text-muted-foreground">{auditResult.pageData.internalLinksCount} links</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border">
                        <span className="font-semibold text-foreground">External Links:</span>
                        <span className="text-muted-foreground">{auditResult.pageData.externalLinksCount} links</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border">
                        <span className="font-semibold text-foreground">Images with Alt Text:</span>
                        <span className="text-muted-foreground">
                          {auditResult.pageData.imagesWithAlt} / {auditResult.pageData.imagesTotal}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border">
                        <span className="font-semibold text-foreground">HTTPS Active:</span>
                        <span className="text-emerald-500 font-bold">
                          {auditResult.pageData.hasHttps ? 'Yes (Encrypted)' : 'No (Insecure HTTP)'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border">
                        <span className="font-semibold text-foreground">Mobile Viewport:</span>
                        <span className="text-muted-foreground">
                          {auditResult.pageData.hasViewport ? 'Configured' : 'Missing'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="font-semibold text-foreground">Structured Data:</span>
                        <span className="text-muted-foreground">
                          {auditResult.pageData.structuredDataTypes.join(', ') || 'None'}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
