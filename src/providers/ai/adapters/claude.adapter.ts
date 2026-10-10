import { BaseAiProviderAdapter } from './base.adapter';
import {
  AiProviderMetadata,
  ContentImprovementRequest,
  ContentImprovementResponse,
  ProviderTestResult,
} from '../types';

export class ClaudeProviderAdapter extends BaseAiProviderAdapter {
  public get metadata(): AiProviderMetadata {
    const isConfigured = Boolean(
      process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 0
    );
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
        'humanize_tone',
        'translation',
        'targeted_rewrite',
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

  public async testConnection(): Promise<ProviderTestResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      return {
        ok: false,
        testResult: 'FAILED_UNCONFIGURED',
        message: 'ANTHROPIC_API_KEY is missing from server environment.',
        recommendation: 'Add ANTHROPIC_API_KEY=sk-ant-... to your .env file.',
      };
    }

    const startTime = Date.now();
    const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Ping' }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (res.status === 401) {
        return {
          ok: false,
          testResult: 'INVALID_KEY',
          message: 'Anthropic rejected the API key.',
          latencyMs,
          recommendation: 'Verify ANTHROPIC_API_KEY at console.anthropic.com.',
        };
      }

      if (!res.ok) {
        return {
          ok: false,
          testResult: 'ERROR',
          message: `Anthropic returned HTTP ${res.status}.`,
          latencyMs,
        };
      }

      return {
        ok: true,
        testResult: 'READY',
        message: 'Anthropic connection verified successfully.',
        latencyMs,
        model,
      };
    } catch {
      return {
        ok: false,
        testResult: 'UNREACHABLE',
        message: 'Could not connect to Anthropic API endpoint.',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  protected async executeInternal(
    request: ContentImprovementRequest
  ): Promise<ContentImprovementResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      return {
        success: false,
        action: request.action,
        providerId: this.metadata.id,
        providerStatus: 'NOT_CONFIGURED',
        error: {
          code: 'ANTHROPIC_KEY_MISSING',
          message: 'ANTHROPIC_API_KEY is not configured in server environment.',
          requiresConfiguration: true,
          configuredProviders: [],
        },
      };
    }

    const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
    const systemPrompt =
      'You are a professional article editor. Return ONLY the improved content in Markdown without commentary.';
    const userPrompt = request.content;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          system: systemPrompt,
          max_tokens: 4096,
          messages: [{ role: 'user', content: userPrompt }],
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
            message: `Anthropic returned error (HTTP ${res.status}).`,
            requiresConfiguration: false,
            configuredProviders: [this.metadata.name],
          },
        };
      }

      const data = await res.json();
      const outputText = data.content?.[0]?.text?.trim();

      return {
        success: true,
        action: request.action,
        providerId: this.metadata.id,
        providerStatus: 'AVAILABLE',
        result: {
          original: request.targetPassage || request.content,
          improved: outputText,
          explanation: `Enhanced using Claude (${model}).`,
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
          message: 'Could not connect to Anthropic API.',
          requiresConfiguration: false,
          configuredProviders: [this.metadata.name],
        },
      };
    }
  }
}
