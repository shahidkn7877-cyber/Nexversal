import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserServer } from '@/lib/auth/user-guard';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserServer();
  if (!user) {
    redirect('/login?redirect=/settings');
  }

  return <>{children}</>;
}

