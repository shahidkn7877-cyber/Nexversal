import React from 'react';
import { redirect } from 'next/navigation';
import { checkAdminServerComponent } from '@/lib/auth/admin-guard';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, CheckCircle } from 'lucide-react';

export default async function AdminSecurityPage() {
  const isAuthorized = await checkAdminServerComponent();
  if (!isAuthorized) redirect('/admin/login');

  return (
    <div className="space-y-6 p-6">
      <AdminHeader
        title="Security & Isolation Architecture"
        description="SSRF filters, client secret isolation, and admin authorization audits."
      />
      <Card className="border-border bg-card">
        <CardHeader className="p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-sm font-bold text-foreground">
                Zero Client Key Exposure Policy
              </CardTitle>
            </div>
            <Badge variant="success">Hardened</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle className="h-4 w-4" />
            <span>AI Provider keys remain 100% server-side in process.env. Zero client bundle leaks.</span>
          </div>
          <p>
            SSRF defense engine blocks loopback (127.0.0.1, ::1), private subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), and link-local cloud metadata (169.254.169.254).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
