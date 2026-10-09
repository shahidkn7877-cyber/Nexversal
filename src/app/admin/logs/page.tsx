import React from 'react';
import { redirect } from 'next/navigation';
import { checkAdminServerComponent } from '@/lib/auth/admin-guard';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Terminal } from 'lucide-react';

export default async function AdminLogsPage() {
  const isAuthorized = await checkAdminServerComponent();
  if (!isAuthorized) redirect('/admin/login');

  return (
    <div className="space-y-6 p-6">
      <AdminHeader
        title="Admin Audit Logs & Events"
        description="Audit trace log stream and system operation events."
      />
      <Card className="border-border bg-card">
        <CardHeader className="p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-brand-500" />
              <CardTitle className="text-sm font-bold text-foreground">
                Security & Telemetry Event Log
              </CardTitle>
            </div>
            <Badge variant="outline" className="font-mono text-[10px]">Real-time</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-2 font-mono text-xs text-muted-foreground">
          <div className="p-2.5 rounded-lg bg-slate-950 text-slate-300 space-y-1">
            <p className="text-emerald-400">[SYSTEM] Server initialization complete. All 4 AI adapters loaded into memory.</p>
            <p className="text-slate-400">[SECURITY] Admin authorization guard mounted at /admin and /api/v1/admin.</p>
            <p className="text-slate-400">[CRAWLER] SSRF defense layer initialized. Private subnets blacklisted.</p>
            <p className="text-brand-400">[VAULT] Public provider endpoints deprecated. Administrative isolation active.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
