'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AuditResult } from '@/types/audit';
import { BarChart3, FileDown, Check, Globe } from 'lucide-react';

export default function ReportsPage() {
  const [latestAudit, setLatestAudit] = useState<AuditResult | null>(null);
  const [downloaded, setDownloaded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/audit')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.audits?.length > 0) {
          setLatestAudit(data.data.audits[0]);
        }
      })
      .catch(() => {});
  }, []);

  const handleExportJson = () => {
    if (!latestAudit) return;
    const blob = new Blob([JSON.stringify(latestAudit, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seo-audit-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded('json');
    setTimeout(() => setDownloaded(null), 2000);
  };

  const handleExportHtml = () => {
    if (!latestAudit) return;
    const htmlReport = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SEO Technical Audit Report - ${latestAudit.url}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; color: #1e293b; }
    h1 { color: #0f172a; }
    .score { font-size: 2rem; font-weight: bold; color: ${latestAudit.score >= 80 ? '#10b981' : '#f59e0b'}; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .status-passed { color: #10b981; font-weight: bold; }
    .status-warning { color: #f59e0b; font-weight: bold; }
    .status-critical { color: #ef4444; font-weight: bold; }
  </style>
</head>
<body>
  <h1>SEO Technical Audit Report</h1>
  <p><strong>URL:</strong> ${latestAudit.url}</p>
  <p><strong>Keyword:</strong> ${latestAudit.targetKeyword || 'None specified'}</p>
  <p><strong>Timestamp:</strong> ${new Date(latestAudit.timestamp).toLocaleString()}</p>
  <div class="card">
    <div class="score">Overall Score: ${latestAudit.score}/100</div>
    <p>Passed: ${latestAudit.passedCount} | Warnings: ${latestAudit.warningCount} | Critical: ${latestAudit.criticalCount}</p>
  </div>
  <h2>Audit Checks Evaluated</h2>
  ${latestAudit.checks
    .map(
      (c) => `<div class="card">
        <h3>${c.title} - <span class="status-${c.status}">${c.status.toUpperCase()}</span></h3>
        <p>${c.description}</p>
        ${c.recommendation ? `<p><em>Recommendation: ${c.recommendation}</em></p>` : ''}
      </div>`
    )
    .join('')}
</body>
</html>`;

    const blob = new Blob([htmlReport], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seo-audit-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded('html');
    setTimeout(() => setDownloaded(null), 2000);
  };

  return (
    <AppShell showSidebar={true}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Technical Audit Reports
              </h1>
              <Badge variant="success" className="text-xs font-bold">
                Export Ready
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Download and share comprehensive technical audit summaries and diagnostics.
            </p>
          </div>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="p-5 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Available Audit Exports
                </CardTitle>
                <CardDescription className="text-xs">
                  Export live audit results for clients, developers, and team members.
                </CardDescription>
              </div>
              {latestAudit && (
                <Badge variant="secondary" className="text-xs">
                  Latest: {latestAudit.url}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <div className="p-4 sm:px-5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-foreground">
                      Technical URL Audit Summary (HTML)
                    </span>
                    <Badge variant="success" className="text-[10px]">
                      Interactive
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Complete breakdown of 18 on-page factors, critical warnings, and actionable recommendations.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportHtml}
                  disabled={!latestAudit}
                  className="text-xs gap-1.5 h-8 font-semibold"
                >
                  {downloaded === 'html' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <FileDown className="h-3.5 w-3.5" />
                  )}
                  <span>{downloaded === 'html' ? 'Exported!' : 'Export HTML'}</span>
                </Button>
              </div>

              <div className="p-4 sm:px-5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-foreground">
                      Raw Audit Data Archive (JSON)
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      Developer JSON
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Full structured JSON payload including page metadata, structured data, and checks.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportJson}
                  disabled={!latestAudit}
                  className="text-xs gap-1.5 h-8 font-semibold"
                >
                  {downloaded === 'json' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <FileDown className="h-3.5 w-3.5" />
                  )}
                  <span>{downloaded === 'json' ? 'Exported!' : 'Export JSON'}</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
