import React from 'react';
import { redirect } from 'next/navigation';
import { checkAdminServerComponent } from '@/lib/auth/admin-guard';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key } from 'lucide-react';

export default async function AdminKeywordSystemPage() {
  const isAuthorized = await checkAdminServerComponent();
  if (!isAuthorized) redirect('/admin/login');

  return (
    <div className="space-y-6 p-6">
      <AdminHeader
        title="Keyword Intelligence Engine"
        description="Search volume indexing, difficulty heuristics, and intent classification pipelines."
      />
      <Card className="border-border bg-card">
        <CardHeader className="p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-brand-500" />
              <CardTitle className="text-sm font-bold text-foreground">
                Keyword Provider Pipeline
              </CardTitle>
            </div>
            <Badge variant="outline">Demo Engine</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-3 text-xs text-muted-foreground">
          <p>
            Current active provider is the deterministic demonstration keyword generator, supporting CPC, difficulty, search intent classification, and volume modeling.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
