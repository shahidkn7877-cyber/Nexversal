import { BaseAiProviderAdapter } from './base.adapter';
import {
  AiProviderMetadata,
  ContentImprovementRequest,
  ContentImprovementResponse,
} from '../types';

export class OllamaProviderAdapter extends BaseAiProviderAdapter {
  public get metadata(): AiProviderMetadata {
    const isConfigured = Boolean(
      process.env.OLLAMA_API_KEY && process.env.OLLAMA_API_KEY.trim().length > 0
    );
    return {
      id: 'ollama',
      name: 'Ollama AI (Hosted / Local)',
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
        ? 'Ollama API key configured.'
        : 'OLLAMA_API_KEY environment variable is not set.',
      envKeyRequired: 'OLLAMA_API_KEY',
      isConfigured,
    };
  }

  public isAvailable(): boolean {
    return this.metadata.isConfigured;
  }

  protected async executeInternal(
    request: ContentImprovementRequest
  ): Promise<ContentImprovementResponse> {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'https://ollama.com';
    const apiKey = process.env.OLLAMA_API_KEY;
    const model = process.env.OLLAMA_MODEL || 'gpt-oss:20b';

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
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch(`${baseUrl}/api/chat`, {
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
            message: 'AI improvements are currently unavailable.',
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
            message: 'AI improvements are currently unavailable.',
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
              ? `Translated content into ${request.targetLanguage || 'target language'} using ${model}.`
              : request.action === 'humanize_tone'
              ? `Humanized tone, enhanced readability, and eliminated robotic phrasing using ${model}.`
              : `Refined writing style using ${model}.`,
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
          message: 'AI improvements are currently unavailable.',
          requiresConfiguration: false,
          configuredProviders: [this.metadata.name],
        },
      };
    }
  }
}

