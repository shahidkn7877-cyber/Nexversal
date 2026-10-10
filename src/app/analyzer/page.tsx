'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ContentAnalyzerWorkspace } from '@/components/analyzer/ContentAnalyzerWorkspace';

export default function AnalyzerPage() {
  return (
    <AppShell showSidebar={true}>
      <ContentAnalyzerWorkspace showHeader={true} />
    </AppShell>
  );
}
