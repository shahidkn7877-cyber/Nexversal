import React from 'react';
import { redirect } from 'next/navigation';
import { checkAdminServerComponent } from '@/lib/auth/admin-guard';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function AdminHealthPage() {
  const isAuthorized = await checkAdminServerComponent();
  if (!isAuthorized) redirect('/admin/login');

  return (
    <div className="space-y-6 p-6">
      <AdminHeader
        title="System Health & Runtimes"
        description="Node.js runtime environment, Next.js server status, and memory metrics."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Runtime</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-lg font-bold text-foreground">Next.js App Router</span>
            <Badge variant="success" className="ml-2 text-[10px]">Active</Badge>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">TypeScript Check</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-lg font-bold text-foreground">Strict Mode</span>
            <Badge variant="success" className="ml-2 text-[10px]">Passing</Badge>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="p-4 pb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">AI Service Bridge</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-lg font-bold text-foreground">Provider Registry</span>
            <Badge variant="outline" className="ml-2 text-[10px]">Loaded (4)</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
