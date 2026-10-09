import { BaseAiProviderAdapter } from './base.adapter';
import {
  AiProviderMetadata,
  ContentImprovementRequest,
  ContentImprovementResponse,
} from '../types';

export class ClaudeProviderAdapter extends BaseAiProviderAdapter {
  public get metadata(): AiProviderMetadata {
    const isConfigured = Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 0);
    return {
      id: 'claude',
      name: 'Anthropic Claude',
      websiteUrl: 'https://claude.ai',
      documentationUrl: 'https://docs.anthropic.com',
      integrationType: 'official_api',
      capabilities: [
        'content_improvement',
        'readability_enhancement',
        'heading_restructuring',
      ],
      status: isConfigured ? 'AVAILABLE' : 'NOT_CONFIGURED',
      statusReason: isConfigured
        ? 'Anthropic API key configured.'
        : 'ANTHROPIC_API_KEY environment variable is not set.',
      envKeyRequired: 'ANTHROPIC_API_KEY',
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
        message: 'Claude integration foundation ready. Awaiting connection phase.',
        requiresConfiguration: true,
        configuredProviders: [],
      },
    };
  }
}
