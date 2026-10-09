import { BaseAiProviderAdapter } from './base.adapter';
import {
  AiProviderMetadata,
  ContentImprovementRequest,
  ContentImprovementResponse,
} from '../types';

export class DeepSeekProviderAdapter extends BaseAiProviderAdapter {
  public get metadata(): AiProviderMetadata {
    const isConfigured = Boolean(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.trim().length > 0);
    return {
      id: 'deepseek',
      name: 'DeepSeek',
      websiteUrl: 'https://chat.deepseek.com',
      documentationUrl: 'https://platform.deepseek.com/docs',
      integrationType: 'official_api',
      capabilities: [
        'content_improvement',
        'readability_enhancement',
        'title_optimization',
      ],
      status: isConfigured ? 'AVAILABLE' : 'NOT_CONFIGURED',
      statusReason: isConfigured
        ? 'DeepSeek API key configured.'
        : 'DEEPSEEK_API_KEY environment variable is not set.',
      envKeyRequired: 'DEEPSEEK_API_KEY',
      isConfigured,
    };
  }

  public isAvailable(): boolean {
    return this.metadata.isConfigured;
  }

  protected async executeInternal(
    request: ContentImprovementRequest
  ): Promise<ContentImprovementResponse> {
    return {
      success: false,
      action: request.action,
      providerId: this.metadata.id,
      providerStatus: this.metadata.status,
      error: {
        code: 'NOT_CONNECTED_YET',
        message: 'DeepSeek integration foundation ready. Awaiting connection phase.',
        requiresConfiguration: true,
        configuredProviders: [],
      },
    };
  }
}
