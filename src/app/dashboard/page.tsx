import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUserServer } from '@/lib/auth/user-guard';
import { userDashboardService } from '@/services/dashboard/user-dashboard.service';
import { DashboardClient } from './DashboardClient';

export const metadata: Metadata = {
  title: 'Workspace Dashboard | Nexversal',
  description: 'Overview of domain audit health, keyword tracking, active article writing, and technical reports.',
};

export default async function DashboardPage() {
  const user = await getCurrentUserServer();
  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

  const dashboardData = await userDashboardService.getDashboardData(user.id);

  return <DashboardClient user={user} initialData={dashboardData} />;
}

