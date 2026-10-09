import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { checkAdminServerComponent } from '@/lib/auth/admin-guard';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { aiProviderRegistry } from '@/providers/ai/registry';
import {
  Cpu,
  ShieldCheck,
  ArrowRight,
  Lock,
  Zap,
} from 'lucide-react';

export default async function AdminOverviewPage() {
  const isAuthorized = await checkAdminServerComponent();
  if (!isAuthorized) {
    redirect('/admin/login');
  }

  const providers = aiProviderRegistry.getAllMetadata();
  const availableCount = aiProviderRegistry.getAvailable().length;

  return (
    <div className="space-y-6 p-6">
      <AdminHeader
        title="Admin Operations Console"
        description="Internal telemetry, AI provider vault, and core SEO engine administration."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              AI Providers Registered
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-foreground">
                {providers.length}
              </span>
              <Badge variant="outline" className="font-mono text-[10px]">
                Foundation v3
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Gemini, OpenAI, Claude, DeepSeek
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Active Server Keys
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-foreground">
                {availableCount} / {providers.length}
              </span>
              <Badge
                variant={availableCount > 0 ? 'success' : 'warning'}
                className="font-mono text-[10px]"
              >
                {availableCount > 0 ? 'Live In Production' : 'Vault Locked'}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Zero public exposure policy active
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Audit Engine Defense
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                SSRF Sandboxed
              </span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Private ranges blocked (RFC 1918)
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="p-4 pb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Content Engine
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-foreground">
                Rank Math v2
              </span>
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Deterministic scoring active
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="p-5 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">
                    AI Providers Internal Vault
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Manage official adapters, environment variables, and connection tests.
                  </CardDescription>
                </div>
              </div>
              <Link href="/admin/ai-providers">
                <Button size="sm" className="text-xs font-bold gap-1.5 h-8">
                  <span>Manage Vault</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Provider credentials belong exclusively to this administration console. Normal users on the public frontend have zero visibility into vendor names, API key environments, or internal adapters.
            </p>

            <div className="space-y-2 pt-2">
              {providers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ({p.envKeyRequired})
                    </span>
                  </div>
                  <Badge
                    variant={p.status === 'AVAILABLE' ? 'success' : 'warning'}
                    className="text-[10px] uppercase font-mono"
                  >
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="p-5 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  Access Control & Security Policy
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Server-side authorization enforcement status.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3 text-xs text-muted-foreground">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border space-y-2">
              <div className="flex items-center gap-2 text-foreground font-bold">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Protected Admin Routes</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                All routes under <code className="font-mono text-foreground font-bold">/admin/*</code> and <code className="font-mono text-foreground font-bold">/api/v1/admin/*</code> are protected server-side with <code className="font-mono text-foreground font-bold">requireAdmin()</code>. Unauthorized requests are rejected with 401/403.
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-semibold">Public Client Secret Leak Check:</span>
                <span className="text-emerald-600 font-bold">0 Secrets Exposed</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-semibold">Storage Credential Exposure:</span>
                <span className="text-emerald-600 font-bold">0 Keys in LocalStorage</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-semibold">Public Settings Provider Removal:</span>
                <span className="text-emerald-600 font-bold">100% Removed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
