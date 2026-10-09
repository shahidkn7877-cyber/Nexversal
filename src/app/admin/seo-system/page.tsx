import React from 'react';
import { redirect } from 'next/navigation';
import { checkAdminServerComponent } from '@/lib/auth/admin-guard';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle } from 'lucide-react';

export default async function AdminSeoSystemPage() {
  const isAuthorized = await checkAdminServerComponent();
  if (!isAuthorized) redirect('/admin/login');

  return (
    <div className="space-y-6 p-6">
      <AdminHeader
        title="SEO System Administration"
        description="Core SEO ranking heuristics, schema validators, and SERP simulator rules."
      />
      <Card className="border-border bg-card">
        <CardHeader className="p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-brand-500" />
              <CardTitle className="text-sm font-bold text-foreground">
                Rank Math Algorithm Engine v2.1
              </CardTitle>
            </div>
            <Badge variant="success">Operational</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-3 text-xs text-muted-foreground">
          <p>
            Deterministic rule engine evaluates title tags, headings (H1/H2/H3), paragraph length burstiness, focus keyword density (1.0%–1.2%), and Flesch reading ease scores.
          </p>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold pt-2">
            <CheckCircle className="h-4 w-4" />
            <span>All deterministic calculation pipelines active without external dependency.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
