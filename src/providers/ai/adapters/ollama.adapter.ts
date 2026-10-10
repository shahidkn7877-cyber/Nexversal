import { BaseAiProviderAdapter } from './base.adapter';
import {
  AiProviderMetadata,
  ContentImprovementRequest,
  ContentImprovementResponse,
  ProviderTestResult,
} from '../types';

function resolveOllamaBaseUrl(): { url: string; isMisconfiguredWebsite: boolean } {
  const envUrl = process.env.OLLAMA_BASE_URL?.trim();
  if (envUrl && envUrl.replace(/\/+$/, '') === 'https://ollama.com') {
    return { url: 'http://localhost:11434', isMisconfiguredWebsite: true };
  }
  return {
    url: envUrl || 'http://localhost:11434',
    isMisconfiguredWebsite: false,
  };
}

export class OllamaProviderAdapter extends BaseAiProviderAdapter {
  public get metadata(): AiProviderMetadata {
    const rawUrl = process.env.OLLAMA_BASE_URL?.trim();
    const hasKey = Boolean(
      process.env.OLLAMA_API_KEY && process.env.OLLAMA_API_KEY.trim().length > 0
    );
    const hasCustomUrl = Boolean(
      rawUrl && rawUrl !== 'https://ollama.com' && rawUrl.length > 0
    );
    // Configured if custom URL or key is provided
    const isConfigured = hasKey || hasCustomUrl;

    return {
      id: 'ollama',
      name: 'Ollama AI (Local / Self-Hosted)',
      websiteUrl: 'https://ollama.com',
      documentationUrl: 'https://ollama.com/docs',
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
        ? 'Ollama configuration detected.'
        : 'OLLAMA_BASE_URL or OLLAMA_API_KEY not configured.',
      envKeyRequired: 'OLLAMA_BASE_URL',
      isConfigured,
    };
  }

  public isAvailable(): boolean {
    return this.metadata.isConfigured;
  }

  public async testConnection(): Promise<ProviderTestResult> {
    const { url, isMisconfiguredWebsite } = resolveOllamaBaseUrl();
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${url}/api/tags`, {
        method: 'GET',
        headers: process.env.OLLAMA_API_KEY
          ? { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` }
          : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        return {
          ok: false,
          testResult: 'ERROR',
          message: `Ollama endpoint at ${url} returned HTTP ${res.status}.`,
          latencyMs,
          recommendation: isMisconfiguredWebsite
            ? 'Note: OLLAMA_BASE_URL was set to https://ollama.com. Update it to http://localhost:11434 in .env.'
            : undefined,
        };
      }

      const data = await res.json().catch(() => ({}));
      const model = process.env.OLLAMA_MODEL || 'llama3';

      return {
        ok: true,
        testResult: 'READY',
        message: `Connected to Ollama at ${url} (${data.models?.length || 0} local models available).`,
        latencyMs,
        model,
      };
    } catch {
      return {
        ok: false,
        testResult: 'UNREACHABLE',
        message: `Could not connect to Ollama at ${url}. Ensure Ollama is running locally ('ollama serve') or specify a valid host.`,
        latencyMs: Date.now() - startTime,
        recommendation: isMisconfiguredWebsite
          ? 'Set OLLAMA_BASE_URL=http://localhost:11434 (not https://ollama.com) in your .env file.'
          : 'Start Ollama using "ollama serve" in a local terminal.',
      };
    }
  }

  protected async executeInternal(
    request: ContentImprovementRequest
  ): Promise<ContentImprovementResponse> {
    const { url } = resolveOllamaBaseUrl();
    const apiKey = process.env.OLLAMA_API_KEY;
    const model = process.env.OLLAMA_MODEL || 'llama3';

    let systemPrompt =
      'You are a professional article editor and content optimizer. Return ONLY the revised article text without conversational commentary, preambles, or markdown backtick fences.';
    let userPrompt = request.content;

    if (request.action === 'humanize_tone') {
      systemPrompt = `You are an expert editorial writer. Rewrite the provided content to eliminate formulaic, robotic phrasing and improve natural rhythm and clarity.
STRICT RULES:
1. Do NOT invent new facts, data, statistics, or citations.
2. PRESERVE all Markdown headings (# H1, ## H2, ### H3), lists, blockquotes, and links ([text](url)).
${request.focusKeyword ? `3. PRESERVE the focus keyword "${request.focusKeyword}" naturally.` : ''}
4. Eliminate stock clichés and robotic transitions (such as "delve into", "testament to", "furthermore", "moreover", "in today's rapidly evolving landscape").
5. Return ONLY the improved article text.`;
      userPrompt = `Article to humanize:\n\n${request.content}`;
    } else if (request.action === 'translate') {
      const targetLang = request.targetLanguage || 'English';
      systemPrompt = `You are a professional literary and technical translator. Translate the provided article accurately into ${targetLang}.
STRICT RULES:
1. PRESERVE all Markdown headings (# H1, ## H2, ### H3), lists, blockquotes, code blocks, and links ([text](url)).
2. Maintain technical terms and product names accurately.
3. Do NOT summarize or omit sections. Translate the complete content faithfully.
4. Return ONLY the translated article text in ${targetLang}.`;
      userPrompt = `Article to translate into ${targetLang}:\n\n${request.content}`;
    } else if (request.action === 'targeted_rewrite') {
      systemPrompt = `You are a concise editorial stylist. Rewrite ONLY the specified passage to improve flow, eliminate wordiness, and make it sound natural and engaging. Return ONLY the rewritten passage.`;
      userPrompt = `Specific passage to rewrite:\n"${request.targetPassage || request.content}"\n\nStyle improvement needed:\n${request.styleFinding || 'Improve natural human flow'}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const res = await fetch(`${url}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          stream: false,
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
            message: `Ollama returned error (HTTP ${res.status}). Verify model "${model}" is downloaded with 'ollama pull ${model}'.`,
            requiresConfiguration: false,
            configuredProviders: [this.metadata.name],
          },
        };
      }

      const data = await res.json();
      const outputText = data.message?.content?.trim();

      if (!outputText) {
        return {
          success: false,
          action: request.action,
          providerId: this.metadata.id,
          providerStatus: 'ERROR',
          error: {
            code: 'EMPTY_RESPONSE',
            message: 'Ollama returned an empty response.',
            requiresConfiguration: false,
            configuredProviders: [this.metadata.name],
          },
        };
      }

      return {
        success: true,
        action: request.action,
        providerId: this.metadata.id,
        providerStatus: 'AVAILABLE',
        result: {
          original: request.targetPassage || request.content,
          improved: outputText,
          explanation:
            request.action === 'translate'
              ? `Translated content into ${request.targetLanguage || 'target language'} using Ollama (${model}).`
              : request.action === 'humanize_tone'
              ? `Humanized tone, enhanced readability, and eliminated robotic phrasing using Ollama (${model}).`
              : `Refined writing style using Ollama (${model}).`,
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
          message: `Could not connect to Ollama instance at ${url}. Ensure Ollama is running ('ollama serve').`,
          requiresConfiguration: false,
          configuredProviders: [this.metadata.name],
        },
      };
    }
  }
}
