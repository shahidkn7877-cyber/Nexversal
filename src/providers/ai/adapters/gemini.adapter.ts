import { BaseAiProviderAdapter } from './base.adapter';
import {
  AiProviderMetadata,
  ContentImprovementRequest,
  ContentImprovementResponse,
  ProviderTestResult,
} from '../types';

export class GeminiProviderAdapter extends BaseAiProviderAdapter {
  public get metadata(): AiProviderMetadata {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const isConfigured = Boolean(apiKey && apiKey.length > 0);
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
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error?.message || '';
        return {
          ok: false,
          testResult: 'INVALID_KEY',
          message:
            'Google Gemini rejected the API key or model request.' +
            (errMsg ? ` (${errMsg})` : ''),
          latencyMs,
          recommendation: 'Verify GEMINI_API_KEY at aistudio.google.com.',
        };
      }

      if (res.status === 429) {
        return {
          ok: false,
          testResult: 'RATE_LIMITED',
          message: 'Google Gemini quota or rate limit exceeded.',
          latencyMs,
          recommendation:
            'Wait a few moments or verify quota limits at aistudio.google.com.',
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
    } catch (err: unknown) {
      const isTimeout =
        err instanceof Error &&
        (err.name === 'AbortError' ||
          err.name === 'TimeoutError' ||
          /aborted|timed?\s*out/i.test(err.message));
      return {
        ok: false,
        testResult: 'UNREACHABLE',
        message: isTimeout
          ? 'Google Gemini API request timed out after 12 seconds.'
          : 'Could not connect to Google Gemini API endpoint.',
        latencyMs: Date.now() - startTime,
        recommendation:
          'Check server outbound internet connectivity and proxy settings.',
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
1. Eliminate robotic cadence and AI clichés (e.g., "in today's digital landscape", "delve into", "a testament to", "moreover", "furthermore", "tapestry", "beacon").
2. PRESERVE ALL Markdown headings (#, ##, ###), lists, blockquotes, tables, and links ([anchor](url)).
${request.focusKeyword ? `3. Preserve focus keyword "${request.focusKeyword}".` : ''}
4. Return ONLY the revised article in Markdown without markdown code fences.

Article:\n${request.content}`;
    } else if (request.action === 'translate') {
      const targetLang = request.targetLanguage || 'English';
      const sourceLang =
        request.sourceLanguage && request.sourceLanguage !== 'auto'
          ? ` from ${request.sourceLanguage}`
          : '';
      prompt = `You are a professional literary, technical, and multilingual translator. Translate the following article faithfully${sourceLang} into ${targetLang}. Preserve all Markdown headings, lists, tables, and links. Return ONLY the translated article text in clean Markdown without code fences.\n\nArticle:\n${request.content}`;
    } else if (request.action === 'targeted_rewrite') {
      prompt = `You are a concise editorial stylist. Rewrite only this passage to sound natural, punchy, and engaging while fixing style issues (${request.styleFinding || 'clarity and flow'}). Return ONLY the rewritten passage without commentary or quotes.\n\nPassage:\n"${request.targetPassage || request.content}"`;
    } else if (request.action === 'one_click_fix') {
      prompt = `You are an expert editorial proofreader and SEO content specialist. Perform a comprehensive 1-click editorial and SEO fix on the article.
1. Fix all spelling errors, typos, punctuation, capitalization, and grammatical flaws.
2. Improve clarity, concise phrasing, and sentence rhythm while removing filler and fluff.
3. Clean up formatting: ensure proper paragraph breaks, logical heading structure (#, ##, ###), lists, and spacing.
4. PRESERVE all links ([text](url)), citations, facts, quotes, code, and key technical terms.
${request.focusKeyword ? `5. Ensure natural placement of the primary focus keyword "${request.focusKeyword}".` : ''}
Return ONLY the fully polished, corrected article in clean Markdown format without commentary or code fences.\n\nArticle:\n${request.content}`;
    } else if (request.action === 'improve_headings') {
      prompt = `You are a structural content editor and SEO specialist. Organize and structure the provided article with clear, logical Markdown headings (# H1 for main title, ## H2 for key sections, ### H3 for subsections). Preserve all original content, facts, bullet points, and links. Return ONLY the restructured Markdown content without code fences.\n\nArticle:\n${request.content}`;
    } else if (request.action === 'improve_title') {
      prompt = `You are an SEO headline specialist. Craft a high-CTR, compelling article headline under 60 characters that includes the keyword if provided. Return ONLY the title text.\n\nKeyword: ${request.focusKeyword || 'General'}\nArticle context: ${request.content.slice(0, 300)}`;
    } else if (request.action === 'improve_meta_description') {
      prompt = `You are an SEO copywriter. Write a compelling, click-worthy meta description between 140 and 158 characters that includes the target keyword and a strong call-to-action. Return ONLY the meta description text.\n\nKeyword: ${request.focusKeyword || ''}\nArticle snippet: ${request.content.slice(0, 500)}`;
    } else if (request.action === 'improve_readability') {
      prompt = `You are an editorial writing coach. Enhance readability and sentence flow of the provided content. Break overly long sentences into clear, accessible prose while preserving all information, Markdown structure, and keywords. Return ONLY the improved Markdown content.\n\nContent:\n${request.content}`;
    }

    try {
      const maxRetries = 1;
      const retryDelayMs = 1500;
      let res: Response | null = null;
      let lastErr: unknown = null;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 35000);

          const currentRes = await fetch(url, {
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

          if (
            (currentRes.status === 429 || currentRes.status === 503) &&
            attempt < maxRetries
          ) {
            continue;
          }

          res = currentRes;
          break;
        } catch (fetchErr) {
          throw fetchErr;
        }
      }

      if (!res) {
        throw lastErr || new Error('Connection failed');
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error?.message || '';

        if (res.status === 400) {
          const isKeyInvalid = /api key|invalid|not valid/i.test(errMsg);
          return {
            success: false,
            action: request.action,
            providerId: this.metadata.id,
            providerStatus: 'ERROR',
            error: {
              code: isKeyInvalid ? 'INVALID_API_KEY' : 'AI_PROVIDER_ERROR',
              message: isKeyInvalid
                ? 'Google Gemini rejected the API key as invalid or revoked. Please verify GEMINI_API_KEY in your server environment.'
                : `Gemini service returned bad request: ${errMsg || 'HTTP 400'}.`,
              requiresConfiguration: isKeyInvalid,
              configuredProviders: [this.metadata.name],
            },
          };
        }

        if (res.status === 403) {
          return {
            success: false,
            action: request.action,
            providerId: this.metadata.id,
            providerStatus: 'ERROR',
            error: {
              code: 'INVALID_API_KEY',
              message:
                'Google Gemini returned 403 Forbidden. Please verify GEMINI_API_KEY permissions.',
              requiresConfiguration: true,
              configuredProviders: [this.metadata.name],
            },
          };
        }

        if (res.status === 429) {
          return {
            success: false,
            action: request.action,
            providerId: this.metadata.id,
            providerStatus: 'ERROR',
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message:
                'Google Gemini quota or rate limit reached. Please wait a moment before trying again.',
              requiresConfiguration: false,
              configuredProviders: [this.metadata.name],
            },
          };
        }

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
      const candidate = data.candidates?.[0];

      if (candidate?.finishReason === 'SAFETY') {
        return {
          success: false,
          action: request.action,
          providerId: this.metadata.id,
          providerStatus: 'ERROR',
          error: {
            code: 'SAFETY_BLOCKED',
            message:
              'Google Gemini blocked the response due to content safety policy filters.',
            requiresConfiguration: false,
            configuredProviders: [this.metadata.name],
          },
        };
      }

      if (candidate?.finishReason === 'RECITATION') {
        return {
          success: false,
          action: request.action,
          providerId: this.metadata.id,
          providerStatus: 'ERROR',
          error: {
            code: 'RECITATION_BLOCKED',
            message:
              'Google Gemini blocked the response due to recitation/copyright policy.',
            requiresConfiguration: false,
            configuredProviders: [this.metadata.name],
          },
        };
      }

      let outputText = candidate?.content?.parts?.[0]?.text?.trim();

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

      let explanation = `Enhanced using Google Gemini (${model}).`;
      if (request.action === 'humanize_tone') {
        explanation = `Humanized tone, enhanced sentence rhythm, and eliminated robotic phrasing using Google Gemini (${model}).`;
      } else if (request.action === 'translate') {
        explanation = `Translated article into ${request.targetLanguage || 'target language'} using Google Gemini (${model}).`;
      } else if (request.action === 'one_click_fix') {
        explanation = `Completed 1-click comprehensive editorial and SEO polish using Google Gemini (${model}).`;
      } else if (request.action === 'targeted_rewrite') {
        explanation = `Refined passage style using Google Gemini (${model}).`;
      } else if (request.action === 'improve_headings') {
        explanation = `Restructured content hierarchy with optimized headings using Google Gemini (${model}).`;
      }

      return {
        success: true,
        action: request.action,
        providerId: this.metadata.id,
        providerStatus: 'AVAILABLE',
        result: {
          original: request.targetPassage || request.content,
          improved: outputText,
          explanation,
        },
      };
    } catch (err: unknown) {
      const isTimeout =
        err instanceof Error &&
        (err.name === 'AbortError' ||
          err.name === 'TimeoutError' ||
          /aborted|timed?\s*out/i.test(err.message));

      return {
        success: false,
        action: request.action,
        providerId: this.metadata.id,
        providerStatus: 'ERROR',
        error: {
          code: isTimeout ? 'TIMEOUT' : 'CONNECTION_FAILED',
          message: isTimeout
            ? 'Google Gemini request timed out. Please try again with a shorter section or retry.'
            : 'Could not connect to Google Gemini API. Please verify network access and provider status.',
          requiresConfiguration: false,
          configuredProviders: [this.metadata.name],
        },
      };
    }
  }
}
