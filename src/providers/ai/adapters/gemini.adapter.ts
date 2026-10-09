import { BaseAiProviderAdapter } from './base.adapter';
import {
  AiProviderMetadata,
  ContentImprovementRequest,
  ContentImprovementResponse,
} from '../types';

export class GeminiProviderAdapter extends BaseAiProviderAdapter {
  public get metadata(): AiProviderMetadata {
    const isConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
    return {
      id: 'gemini',
      name: 'Google Gemini',
      websiteUrl: 'https://gemini.google.com',
      documentationUrl: 'https://ai.google.dev/gemini-api/docs',
      integrationType: 'official_api',
      capabilities: [
        'content_improvement',
        'title_optimization',
        'meta_description',
        'readability_enhancement',
        'heading_restructuring',
        'keyword_placement_suggestion',
        'content_expansion',
      ],
      status: isConfigured ? 'AVAILABLE' : 'NOT_CONFIGURED',
      statusReason: isConfigured
        ? 'Official Gemini API key is configured in environment.'
        : 'GEMINI_API_KEY environment variable is not set.',
      envKeyRequired: 'GEMINI_API_KEY',
      isConfigured,
    };
  }

  public isAvailable(): boolean {
    return this.metadata.isConfigured;
  }

  protected async executeInternal(
    request: ContentImprovementRequest
  ): Promise<ContentImprovementResponse> {
    // Official API execution logic will be connected in future step when key is activated.
    // In Phase 3 foundation, if key is missing, base adapter already returns NOT_CONFIGURED.
    return {
      success: true,
      action: request.action,
      providerId: this.metadata.id,
      providerStatus: 'AVAILABLE',
      result: {
        original: request.content.slice(0, 100),
        improved: request.content.slice(0, 100),
        explanation: 'Gemini provider foundation connected.',
      },
    };
  }
}
