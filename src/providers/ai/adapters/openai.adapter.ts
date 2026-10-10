import { BaseAiProviderAdapter } from './base.adapter';
import {
  AiProviderMetadata,
  ContentImprovementRequest,
  ContentImprovementResponse,
  ProviderTestResult,
} from '../types';

export class OpenAiProviderAdapter extends BaseAiProviderAdapter {
  public get metadata(): AiProviderMetadata {
    const isConfigured = Boolean(
      process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0
    );
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
        'heading_restructuring',
        'keyword_placement_suggestion',
        'content_expansion',
        'humanize_tone',
        'translation',
        'style_review',
        'targeted_rewrite',
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

  public async testConnection(): Promise<ProviderTestResult> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return {
        ok: false,
        testResult: 'FAILED_UNCONFIGURED',
        message: 'OPENAI_API_KEY is missing from server environment.',
        recommendation: 'Add OPENAI_API_KEY=sk-... to your .env file.',
      };
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (res.status === 401) {
        return {
          ok: false,
          testResult: 'INVALID_KEY',
          message: 'OpenAI rejected the API key as invalid.',
          latencyMs,
          recommendation: 'Verify OPENAI_API_KEY at platform.openai.com/api-keys.',
        };
      }

      if (!res.ok) {
        return {
          ok: false,
          testResult: 'ERROR',
          message: `OpenAI returned HTTP ${res.status}.`,
          latencyMs,
        };
      }

      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      return {
        ok: true,
        testResult: 'READY',
        message: `OpenAI connection verified successfully.`,
        latencyMs,
        model,
      };
    } catch {
      return {
        ok: false,
        testResult: 'UNREACHABLE',
        message: 'Could not connect to OpenAI API endpoint.',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  protected async executeInternal(
    request: ContentImprovementRequest
  ): Promise<ContentImprovementResponse> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return {
        success: false,
        action: request.action,
        providerId: this.metadata.id,
        providerStatus: 'NOT_CONFIGURED',
        error: {
          code: 'OPENAI_KEY_MISSING',
          message: 'OPENAI_API_KEY is not configured in server environment.',
          requiresConfiguration: true,
          configuredProviders: [],
        },
      };
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    let systemPrompt =
      'You are a professional article editor and content optimizer. Return ONLY the improved content text in Markdown without commentary.';
    let userPrompt = request.content;

    if (request.action === 'humanize_tone') {
      systemPrompt =
        'You are an expert editorial writer. Rewrite the content to eliminate robotic cadence and AI clichés. Preserve all Markdown headings, lists, tables, and links. Return ONLY the improved content.';
      userPrompt = `Article:\n\n${request.content}`;
    } else if (request.action === 'translate') {
      systemPrompt = `Translate the article faithfully into ${request.targetLanguage || 'English'}. Preserve all Markdown headings, lists, tables, and links. Return ONLY the translated article.`;
      userPrompt = request.content;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: request.action === 'humanize_tone' ? 0.7 : 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          success: false,
          action: request.action,
          providerId: this.metadata.id,
          providerStatus: 'ERROR',
          error: {
            code: 'AI_PROVIDER_ERROR',
            message: `OpenAI returned error (HTTP ${res.status}).`,
            requiresConfiguration: false,
            configuredProviders: [this.metadata.name],
          },
        };
      }

      const data = await res.json();
      const outputText = data.choices?.[0]?.message?.content?.trim();

      return {
        success: true,
        action: request.action,
        providerId: this.metadata.id,
        providerStatus: 'AVAILABLE',
        result: {
          original: request.targetPassage || request.content,
          improved: outputText,
          explanation: `Enhanced using OpenAI (${model}).`,
        },
      };
    } catch {
      return {
        success: false,
        action: request.action,
        providerId: this.metadata.id,
        providerStatus: 'ERROR',
        error: {
          code: 'CONNECTION_FAILED',
          message: 'Could not connect to OpenAI API.',
          requiresConfiguration: false,
          configuredProviders: [this.metadata.name],
        },
      };
    }
  }
}
