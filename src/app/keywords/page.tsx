'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { KeywordResearchResponse } from '@/types/keywords';
import {
  Search,
  ArrowRight,
  TrendingUp,
  Minus,
  Copy,
  Check,
  Target,
  BarChart2,
  DollarSign,
  AlertTriangle,
  Settings,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

export default function KeywordsPage() {
  const [seedKeyword, setSeedKeyword] = useState('');
  const [location, setLocation] = useState('US');
  const [language, setLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUnconfigured, setIsUnconfigured] = useState(false);
  const [response, setResponse] = useState<KeywordResearchResponse | null>(null);
  const [copiedKw, setCopiedKw] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/v1/keywords/history');
      const json = await res.json();
      if (json.success && json.data?.history) {
        setHistory(json.data.history);
      }
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    fetchHistory();
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!seedKeyword.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/keywords/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedKeyword: seedKeyword.trim(),
          location,
          language,
        }),
      });

      const json = await res.json();

      // Check if provider is unconfigured
      if (
        json.code === 'KEYWORD_PROVIDER_NOT_CONFIGURED' ||
        json.data?.status === 'NOT_CONFIGURED'
      ) {
        setIsUnconfigured(true);
        setResponse(null);
      } else if (!res.ok || !json.success) {
        setIsUnconfigured(false);
        setErrorMsg(json.error?.message || 'Keyword search failed.');
        setResponse(null);
      } else {
        setIsUnconfigured(false);
        setResponse(json.data);
        fetchHistory();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error during keyword lookup.');
      setResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKw(text);
    setTimeout(() => setCopiedKw(null), 2000);
  };

  return (
    <AppShell showSidebar={true}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Keyword Explorer
              </h1>
              <Badge variant={isUnconfigured ? 'warning' : 'info'} className="text-xs font-bold">
                {isUnconfigured ? 'Provider: Not Configured' : 'Live Metrics'}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Official keyword discovery, monthly search volumes, CPC, and competition metrics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Settings className="h-3.5 w-3.5" />
                Provider Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Unconfigured Alert Notice */}
        {isUnconfigured && (
          <div
            data-testid="unconfigured-notice"
            className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/30 space-y-3"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-1.5">
                <h2 className="text-base font-bold text-foreground">
                  Live Keyword Research Unavailable
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The live keyword research provider is not configured yet. No keyword metrics are being shown because displaying estimated or demo data as real data would be misleading.
                </p>
                <p className="text-xs text-muted-foreground">
                  Google Ads Keyword Planner credentials are required to fetch real search volume, CPC, and competition data.
                </p>
                <div className="pt-1">
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    Admins can configure Google Ads credentials in Admin Settings.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 flex items-center gap-3 text-destructive text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Search Card */}
        <Card className="border-border bg-card">
          <CardHeader className="p-5 border-b border-border">
            <CardTitle as="h2" className="text-sm font-bold uppercase tracking-wider text-foreground">
              Search Target Keywords
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Enter a seed keyword or query to discover related keyword ideas and volume metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="e.g. digital marketing strategy, cloud architecture..."
                  value={seedKeyword}
                  onChange={(e) => setSeedKeyword(e.target.value)}
                  className="pl-10 h-10 text-sm bg-background border-border"
                  disabled={isLoading}
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isLoading}
                  className="h-10 px-3 py-1 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="PK">Pakistan (PK)</option>
                  <option value="US">United States (US)</option>
                  <option value="UK">United Kingdom (UK)</option>
                  <option value="CA">Canada (CA)</option>
                  <option value="AU">Australia (AU)</option>
                  <option value="DE">Germany (DE)</option>
                </select>

                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={isLoading}
                  className="h-10 px-3 py-1 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="en">English (en)</option>
                  <option value="ur">Urdu (ur)</option>
                  <option value="de">German (de)</option>
                  <option value="es">Spanish (es)</option>
                  <option value="fr">French (fr)</option>
                </select>

                <Button
                  type="submit"
                  disabled={isLoading || !seedKeyword.trim()}
                  className="h-10 px-5 gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Recent Search History Chips */}
        {history.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground font-semibold">Recent Searches:</span>
            {history.slice(0, 6).map((item, idx) => (
              <button
                key={item.id || idx}
                type="button"
                onClick={() => {
                  setSeedKeyword(item.query);
                  if (item.location) setLocation(item.location);
                  if (item.language) setLanguage(item.language);
                }}
                className="px-2.5 py-1 rounded-lg bg-card border border-border hover:border-brand-500/50 hover:bg-muted text-foreground transition-all flex items-center gap-1.5 font-medium"
              >
                <span>{item.query}</span>
                <span className="text-[10px] text-muted-foreground">({item.location})</span>
              </button>
            ))}
          </div>
        )}

        {/* Results Area */}
        {isUnconfigured ? (
          <Card className="border-border bg-card">
            <CardContent className="p-12 text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-foreground">
                  No Search Metrics Displayed
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Live keyword metrics are unavailable because Google Ads credentials are not configured. The application does not substitute fake or simulated numbers.
                </p>
              </div>
              <div className="pt-2">
                <Link href="/admin">
                  <Button variant="outline" size="sm" className="gap-2 text-xs">
                    <Settings className="h-3.5 w-3.5" />
                    Configure in Admin Settings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : response && response.results.length > 0 ? (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-border bg-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                    <BarChart2 className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">Keyword Ideas</span>
                    <span className="text-xl font-bold text-foreground">{response.totalResults}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">Provider</span>
                    <span className="text-xl font-bold text-foreground uppercase">{response.provider}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block font-medium">Location</span>
                    <span className="text-xl font-bold text-foreground">{response.location}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Keyword Table */}
            <Card className="border-border bg-card overflow-hidden">
              <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    Keyword Results for &ldquo;{response.seedKeyword || response.seedUrl}&rdquo;
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Real search metrics from {response.provider}
                  </CardDescription>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Keyword</th>
                      <th className="py-3 px-4">Monthly Searches</th>
                      <th className="py-3 px-4">Competition</th>
                      <th className="py-3 px-4">Low Top Bid</th>
                      <th className="py-3 px-4">High Top Bid</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {response.results.map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {row.keyword}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {row.averageMonthlySearches != null
                            ? row.averageMonthlySearches.toLocaleString()
                            : '—'}
                        </td>
                        <td className="py-3 px-4">
                          {row.competition ? (
                            <Badge
                              variant={
                                row.competition === 'HIGH'
                                  ? 'destructive'
                                  : row.competition === 'MEDIUM'
                                  ? 'warning'
                                  : 'success'
                              }
                              className="text-[10px] uppercase font-bold"
                            >
                              {row.competition}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {row.lowTopOfPageBid != null ? `$${row.lowTopOfPageBid.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {row.highTopOfPageBid != null ? `$${row.highTopOfPageBid.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(row.keyword)}
                            className="h-7 px-2 text-xs"
                          >
                            {copiedKw === row.keyword ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ) : !isLoading && (
          <Card className="border-border bg-card">
            <CardContent className="p-10 text-center space-y-2">
              <Search className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">
                Ready to Explore Keywords
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Enter a target search query above to fetch official search metrics and keyword ideas.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
