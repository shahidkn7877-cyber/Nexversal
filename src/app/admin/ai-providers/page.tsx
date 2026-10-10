import React from 'react';
import { redirect } from 'next/navigation';
import { checkAdminServerComponent } from '@/lib/auth/admin-guard';
import { AdminHeader } from '@/components/admin/AdminHeader';
import {
  AdminProviderManager,
  AdminProviderItem,
} from '@/components/admin/AdminProviderManager';
import { aiProviderRegistry } from '@/providers/ai/registry';

export default async function AdminAiProvidersPage() {
  const isAuthorized = await checkAdminServerComponent();
  if (!isAuthorized) {
    redirect('/admin/login');
  }

  const metadata = aiProviderRegistry.getAllMetadata();
  const initialProviders: AdminProviderItem[] = metadata.map((m) => ({
    id: m.id,
    name: m.name,
    websiteUrl: m.websiteUrl,
    documentationUrl: m.documentationUrl,
    integrationType: m.integrationType,
    capabilities: m.capabilities,
    status: m.status,
    envKeyRequired: m.envKeyRequired,
    isConfigured: m.isConfigured,
    serverEnvDetected: Boolean(process.env[m.envKeyRequired]),
  }));

  return (
    <div className="space-y-6 p-6">
      <AdminHeader
        title="AI Providers Vault Management"
        description="Protected administration of Groq, Ollama, Gemini, OpenAI, Claude, and DeepSeek server adapters."
      />

      <AdminProviderManager initialProviders={initialProviders} />
    </div>
  );
}
