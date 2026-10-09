import React from 'react';
import { checkAdminServerComponent } from '@/lib/auth/admin-guard';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthorized = await checkAdminServerComponent();

  if (!isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-background text-foreground">
        {children}
      </div>
    </div>
  );
}
