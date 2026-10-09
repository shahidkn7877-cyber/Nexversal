import { BaseAiProviderAdapter } from './base.adapter';
import {
  AiProviderMetadata,
  ContentImprovementRequest,
  ContentImprovementResponse,
} from '../types';

export class OpenAiProviderAdapter extends BaseAiProviderAdapter {
  public get metadata(): AiProviderMetadata {
    const isConfigured = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0);
    return {
      id: 'openai',
      name: 'OpenAI ChatGPT',
      websiteUrl: 'https://chatgpt.com',
      documentationUrl: 'https://platform.openai.com/docs',
      integrationType: 'official_api',
      capabilities: [
        'content_improvement',
        'title_optimization',
        'meta_description',
        'readability_enhancement',
      ],
      status: isConfigured ? 'AVAILABLE' : 'NOT_CONFIGURED',
      statusReason: isConfigured
        ? 'OpenAI API key configured.'
        : 'OPENAI_API_KEY environment variable is not set.',
      envKeyRequired: 'OPENAI_API_KEY',
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
        message: 'OpenAI integration foundation ready. Awaiting connection phase.',
        requiresConfiguration: true,
        configuredProviders: [],
      },
    };
  }
}
