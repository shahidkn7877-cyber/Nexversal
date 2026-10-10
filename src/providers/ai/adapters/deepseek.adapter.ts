import { BaseAiProviderAdapter } from './base.adapter';
import {
  AiProviderMetadata,
  ContentImprovementRequest,
  ContentImprovementResponse,
  ProviderTestResult,
} from '../types';

export class DeepSeekProviderAdapter extends BaseAiProviderAdapter {
  public get metadata(): AiProviderMetadata {
    const isConfigured = Boolean(
      process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.trim().length > 0
    );
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
        'humanize_tone',
        'translation',
        'targeted_rewrite',
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

  public async testConnection(): Promise<ProviderTestResult> {
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) {
      return {
        ok: false,
        testResult: 'FAILED_UNCONFIGURED',
        message: 'DEEPSEEK_API_KEY is missing from server environment.',
        recommendation: 'Add DEEPSEEK_API_KEY to your .env file.',
      };
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch('https://api.deepseek.com/models', {
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
          message: 'DeepSeek rejected the API key as invalid.',
          latencyMs,
          recommendation: 'Verify DEEPSEEK_API_KEY at platform.deepseek.com.',
        };
      }

      if (!res.ok) {
        return {
          ok: false,
          testResult: 'ERROR',
          message: `DeepSeek returned HTTP ${res.status}.`,
          latencyMs,
        };
      }

      const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
      return {
        ok: true,
        testResult: 'READY',
        message: 'DeepSeek connection verified successfully.',
        latencyMs,
        model,
      };
    } catch {
      return {
        ok: false,
        testResult: 'UNREACHABLE',
        message: 'Could not connect to DeepSeek API endpoint.',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  protected async executeInternal(
    request: ContentImprovementRequest
  ): Promise<ContentImprovementResponse> {
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) {
      return {
        success: false,
        action: request.action,
        providerId: this.metadata.id,
        providerStatus: 'NOT_CONFIGURED',
        error: {
          code: 'DEEPSEEK_KEY_MISSING',
          message: 'DEEPSEEK_API_KEY is not configured in server environment.',
          requiresConfiguration: true,
          configuredProviders: [],
        },
      };
    }

    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    let systemPrompt =
      'You are a professional article editor. Return ONLY the improved content in Markdown without commentary.';
    let userPrompt = request.content;

    if (request.action === 'humanize_tone') {
      systemPrompt =
        'You are an expert editorial writer. Rewrite the content to eliminate robotic phrasing and clichés. Preserve all Markdown headings, lists, tables, and links. Return ONLY the improved content.';
      userPrompt = `Article:\n\n${request.content}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const res = await fetch('https://api.deepseek.com/chat/completions', {
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
            message: `DeepSeek returned error (HTTP ${res.status}).`,
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
          explanation: `Enhanced using DeepSeek (${model}).`,
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
          message: 'Could not connect to DeepSeek API.',
          requiresConfiguration: false,
          configuredProviders: [this.metadata.name],
        },
      };
    }
  }
}
