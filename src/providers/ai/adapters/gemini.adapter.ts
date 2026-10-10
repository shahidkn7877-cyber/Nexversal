import { BaseAiProviderAdapter } from './base.adapter';
import {
  AiProviderMetadata,
  ContentImprovementRequest,
  ContentImprovementResponse,
  ProviderTestResult,
} from '../types';

export class GeminiProviderAdapter extends BaseAiProviderAdapter {
  public get metadata(): AiProviderMetadata {
    const isConfigured = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0
    );
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
        'humanize_tone',
        'translation',
        'style_review',
        'targeted_rewrite',
      ],
      status: isConfigured ? 'AVAILABLE' : 'NOT_CONFIGURED',
      statusReason: isConfigured
        ? 'Gemini API key configured in server environment.'
        : 'GEMINI_API_KEY environment variable is not set.',
      envKeyRequired: 'GEMINI_API_KEY',
      isConfigured,
    };
  }

  public isAvailable(): boolean {
    return this.metadata.isConfigured;
  }

  public async testConnection(): Promise<ProviderTestResult> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return {
        ok: false,
        testResult: 'FAILED_UNCONFIGURED',
        message: 'GEMINI_API_KEY is missing from server environment.',
        recommendation: 'Add GEMINI_API_KEY to your .env file.',
      };
    }

    const startTime = Date.now();
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (res.status === 400 || res.status === 403) {
        return {
          ok: false,
          testResult: 'INVALID_KEY',
          message: 'Google Gemini rejected the API key or model request.',
          latencyMs,
          recommendation: 'Verify GEMINI_API_KEY at aistudio.google.com.',
        };
      }

      if (!res.ok) {
        return {
          ok: false,
          testResult: 'ERROR',
          message: `Gemini API returned HTTP ${res.status}.`,
          latencyMs,
        };
      }

      return {
        ok: true,
        testResult: 'READY',
        message: `Gemini API connection verified successfully using model ${model}.`,
        latencyMs,
        model,
      };
    } catch {
      return {
        ok: false,
        testResult: 'UNREACHABLE',
        message: 'Could not connect to Google Gemini API endpoint.',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  protected async executeInternal(
    request: ContentImprovementRequest
  ): Promise<ContentImprovementResponse> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return {
        success: false,
        action: request.action,
        providerId: this.metadata.id,
        providerStatus: 'NOT_CONFIGURED',
        error: {
          code: 'GEMINI_KEY_MISSING',
          message: 'GEMINI_API_KEY is not configured in the server environment.',
          requiresConfiguration: true,
          configuredProviders: [],
        },
      };
    }

    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    let prompt = `You are a professional article editor and content optimizer. Return ONLY the improved article text in Markdown without commentary or markdown code fences.\n\nContent:\n${request.content}`;

    if (request.action === 'humanize_tone') {
      prompt = `You are an elite editorial writer and content humanizer. Rewrite the following article to sound completely natural, engaging, and genuinely human.
STRICT REQUIREMENTS:
1. Eliminate robotic cadence and AI clichés (e.g., "in today's digital landscape", "delve into", "a testament to", "moreover", "furthermore").
2. PRESERVE ALL Markdown headings (#, ##, ###), lists, blockquotes, tables, and links ([anchor](url)).
${request.focusKeyword ? `3. Preserve focus keyword "${request.focusKeyword}".` : ''}
4. Return ONLY the revised article in Markdown.

Article:\n${request.content}`;
    } else if (request.action === 'translate') {
      const targetLang = request.targetLanguage || 'English';
      prompt = `Translate the following article faithfully into ${targetLang}. Preserve all Markdown headings, lists, tables, and links. Return ONLY the translated article text.\n\nArticle:\n${request.content}`;
    } else if (request.action === 'targeted_rewrite') {
      prompt = `Rewrite only this passage to sound natural and engaging. Return ONLY the rewritten passage.\n\nPassage:\n"${request.targetPassage || request.content}"`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: request.action === 'humanize_tone' ? 0.7 : 0.3,
            maxOutputTokens: 4096,
          },
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
            message: `Gemini service returned error (HTTP ${res.status}).`,
            requiresConfiguration: false,
            configuredProviders: [this.metadata.name],
          },
        };
      }

      const data = await res.json();
      let outputText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!outputText) {
        return {
          success: false,
          action: request.action,
          providerId: this.metadata.id,
          providerStatus: 'ERROR',
          error: {
            code: 'EMPTY_RESPONSE',
            message: 'Gemini returned an empty response.',
            requiresConfiguration: false,
            configuredProviders: [this.metadata.name],
          },
        };
      }

      if (outputText.startsWith('```markdown') && outputText.endsWith('```')) {
        outputText = outputText.slice(11, -3).trim();
      } else if (outputText.startsWith('```') && outputText.endsWith('```')) {
        outputText = outputText.slice(3, -3).trim();
      }

      return {
        success: true,
        action: request.action,
        providerId: this.metadata.id,
        providerStatus: 'AVAILABLE',
        result: {
          original: request.targetPassage || request.content,
          improved: outputText,
          explanation: `Enhanced using Google Gemini (${model}).`,
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
          message: 'Could not connect to Google Gemini API.',
          requiresConfiguration: false,
          configuredProviders: [this.metadata.name],
        },
      };
    }
  }
}
