import { aiProviderRegistry, AiProviderRegistry } from './registry';
import {
  ContentImprovementRequest,
  ContentImprovementResponse,
  IAiProviderAdapter,
} from './types';

export class AiService {
  private registry: AiProviderRegistry;

  constructor(registry: AiProviderRegistry = aiProviderRegistry) {
    this.registry = registry;
  }

  public async execute(
    request: ContentImprovementRequest
  ): Promise<ContentImprovementResponse> {
    let targetAdapter: IAiProviderAdapter | undefined;

    if (request.preferredProviderId) {
      targetAdapter = this.registry.get(request.preferredProviderId);
    }

    if (!targetAdapter) {
      const available = this.registry.getAvailable();
      if (available.length > 0) {
        targetAdapter = available[0];
      } else {
        targetAdapter = this.registry.getDefaultProvider();
      }
    }

    if (!targetAdapter || !targetAdapter.isAvailable()) {
      return {
        success: false,
        action: request.action,
        providerId: targetAdapter ? targetAdapter.metadata.id : undefined,
        providerStatus: 'NOT_CONFIGURED',
        error: {
          code: 'AI_PROVIDER_NOT_CONFIGURED',
          message:
            'No AI provider is configured. Connect an official AI provider to use AI-powered improvements.',
          requiresConfiguration: true,
          configuredProviders: this.registry.getAvailable().map((a) => a.metadata.name),
        },
      };
    }

    return targetAdapter.execute(request);
  }
}

export const aiService = new AiService();
