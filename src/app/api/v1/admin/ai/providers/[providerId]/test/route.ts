import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { aiProviderRegistry } from '@/providers/ai/registry';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ providerId: string }> }
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { providerId } = await context.params;
  const adapter = aiProviderRegistry.get(providerId);

  if (!adapter) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PROVIDER_NOT_FOUND',
          message: `AI Provider "${providerId}" is not registered in the system.`,
        },
      },
      { status: 404 }
    );
  }

  const isAvailable = adapter.isAvailable();
  const envVarName = adapter.metadata.envKeyRequired;
  const isEnvPresent = Boolean(process.env[envVarName]);

  if (!isAvailable || !isEnvPresent) {
    return NextResponse.json({
      success: false,
      data: {
        providerId,
        providerName: adapter.metadata.name,
        status: adapter.metadata.status,
        envKeyRequired: envVarName,
        serverEnvDetected: false,
        testResult: 'FAILED_UNCONFIGURED',
        message: `Provider "${adapter.metadata.name}" is currently inactive. Server environment variable "${envVarName}" is missing in the server environment.`,
        recommendation: `Set ${envVarName}=<your_api_key> in .env.local and restart the server to activate.`,
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      providerId,
      providerName: adapter.metadata.name,
      status: adapter.metadata.status,
      envKeyRequired: envVarName,
      serverEnvDetected: true,
      testResult: 'READY',
      message: `Provider "${adapter.metadata.name}" environment credentials are detected and ready for service calls.`,
    },
  });
}
