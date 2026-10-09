import React from 'react';
import { redirect } from 'next/navigation';
import { checkAdminServerComponent } from '@/lib/auth/admin-guard';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, ShieldCheck } from 'lucide-react';

export default async function AdminAuditSystemPage() {
  const isAuthorized = await checkAdminServerComponent();
  if (!isAuthorized) redirect('/admin/login');

  return (
    <div className="space-y-6 p-6">
      <AdminHeader
        title="Audit & Crawler System"
        description="Live URL crawling engine, HTTP client timeouts, and SSRF security firewall."
      />
      <Card className="border-border bg-card">
        <CardHeader className="p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-sm font-bold text-foreground">
                Live URL Crawler Engine
              </CardTitle>
            </div>
            <Badge variant="success">Protected</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-3 text-xs text-muted-foreground">
          <p>
            The live audit engine fetches target HTML with an 8-second circuit-breaker timeout. SSRF filtering rejects private IPv4/IPv6 address blocks and cloud metadata endpoints.
          </p>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold pt-2">
            <ShieldCheck className="h-4 w-4" />
            <span>SSRF sandbox validation active across all crawler requests.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
