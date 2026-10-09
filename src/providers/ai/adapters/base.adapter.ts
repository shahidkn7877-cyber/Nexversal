import {
  AiProviderMetadata,
  ContentImprovementRequest,
  ContentImprovementResponse,
  IAiProviderAdapter,
} from '../types';

export abstract class BaseAiProviderAdapter implements IAiProviderAdapter {
  public abstract readonly metadata: AiProviderMetadata;

  public abstract isAvailable(): boolean;

  public async execute(
    request: ContentImprovementRequest
  ): Promise<ContentImprovementResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        action: request.action,
        providerId: this.metadata.id,
        providerStatus: 'NOT_CONFIGURED',
        error: {
          code: 'AI_PROVIDER_NOT_CONFIGURED',
          message:
            'No AI provider is configured. Connect an official AI provider to use AI-powered improvements.',
          requiresConfiguration: true,
          configuredProviders: [],
        },
      };
    }

    return this.executeInternal(request);
  }

  protected abstract executeInternal(
    request: ContentImprovementRequest
  ): Promise<ContentImprovementResponse>;
}
