import React from 'react';
import { redirect } from 'next/navigation';
import { checkAdminServerComponent } from '@/lib/auth/admin-guard';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

export default async function AdminContentAnalyzerPage() {
  const isAuthorized = await checkAdminServerComponent();
  if (!isAuthorized) redirect('/admin/login');

  return (
    <div className="space-y-6 p-6">
      <AdminHeader
        title="Content Analyzer Telemetry"
        description="Paragraph length analyzers, heading hierarchy extraction, and reading grade calculators."
      />
      <Card className="border-border bg-card">
        <CardHeader className="p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-500" />
              <CardTitle className="text-sm font-bold text-foreground">
                In-Memory Analyzer Pipeline
              </CardTitle>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-3 text-xs text-muted-foreground">
          <p>
            Executes pure client/server analysis with zero persistent database writes. Handles markdown syntax, HTML tags, and burstiness paragraph limits.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
