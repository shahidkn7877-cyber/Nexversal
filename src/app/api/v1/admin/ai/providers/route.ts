import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { aiProviderRegistry } from '@/providers/ai/registry';

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const metadata = aiProviderRegistry.getAllMetadata();
  const availableCount = aiProviderRegistry.getAvailable().length;

  return NextResponse.json({
    success: true,
    data: {
      providers: metadata.map((m) => ({
        id: m.id,
        name: m.name,
        websiteUrl: m.websiteUrl,
        documentationUrl: m.documentationUrl,
        integrationType: m.integrationType,
        capabilities: m.capabilities,
        status: m.status,
        statusReason: m.statusReason,
        envKeyRequired: m.envKeyRequired,
        isConfigured: m.isConfigured,
        serverEnvDetected: Boolean(process.env[m.envKeyRequired]),
      })),
      totalRegistered: metadata.length,
      availableCount,
      hasConfiguredProvider: availableCount > 0,
      activeProvider: aiProviderRegistry.getDefaultProvider()?.metadata || null,
      adminPolicy: {
        serverSideOnly: true,
        vaultActive: true,
      },
    },
  });
}
