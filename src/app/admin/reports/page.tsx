import React from 'react';
import { redirect } from 'next/navigation';
import { checkAdminServerComponent } from '@/lib/auth/admin-guard';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';

export default async function AdminReportsPage() {
  const isAuthorized = await checkAdminServerComponent();
  if (!isAuthorized) redirect('/admin/login');

  return (
    <div className="space-y-6 p-6">
      <AdminHeader
        title="Audit Reports Telemetry"
        description="Historic audit aggregation and export format telemetry."
      />
      <Card className="border-border bg-card">
        <CardHeader className="p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-brand-500" />
              <CardTitle className="text-sm font-bold text-foreground">
                Report Generation Engine
              </CardTitle>
            </div>
            <Badge variant="success">Online</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 text-xs text-muted-foreground">
          <p>
            Supports CSV, JSON, and print-ready structured audit summaries.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
