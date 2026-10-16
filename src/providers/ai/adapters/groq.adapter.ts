import { BaseAiProviderAdapter } from './base.adapter';
import {
  AiProviderMetadata,
  ContentImprovementRequest,
  ContentImprovementResponse,
  ProviderStatus,
  ProviderTestResult,
} from '../types';

export class GroqProviderAdapter extends BaseAiProviderAdapter {
  public get metadata(): AiProviderMetadata {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    const baseUrl = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
    const isStandardGroq = baseUrl.includes('api.groq.com');
    const hasKey = Boolean(apiKey && apiKey.length > 0);
    const isFormatValid = Boolean(apiKey && (!isStandardGroq || apiKey.startsWith('gsk_')));

    let status: ProviderStatus = 'NOT_CONFIGURED';
    let statusReason = 'GROQ_API_KEY environment variable is not set.';

    if (hasKey) {
      if (isFormatValid) {
        status = 'AVAILABLE';
        statusReason = 'Groq API key configured in server environment.';
      } else {
        status = 'ERROR';
        statusReason = apiKey?.startsWith('sk-or-')
          ? 'GROQ_API_KEY contains an OpenRouter key (starts with "sk-or-"). Groq Cloud requires an API key starting with "gsk_" from console.groq.com/keys.'
          : 'GROQ_API_KEY is improperly formatted. Groq Cloud keys start with "gsk_".';
      }
    }

    return {
      id: 'groq',
      name: 'Groq Cloud (Llama 3.3)',
      websiteUrl: 'https://groq.com',
      documentationUrl: 'https://console.groq.com/docs',
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
      status,
      statusReason,
      envKeyRequired: 'GROQ_API_KEY',
      isConfigured: hasKey && isFormatValid,
    };
  }

  public isAvailable(): boolean {
    return this.metadata.isConfigured;
  }

  public async testConnection(): Promise<ProviderTestResult> {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      return {
        ok: false,
        testResult: 'FAILED_UNCONFIGURED',
        message: 'GROQ_API_KEY is missing from the server environment.',
        recommendation: 'Add GROQ_API_KEY=gsk_... to your .env file and restart.',
      };
    }

    const baseUrl = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
    const isStandardGroq = baseUrl.includes('api.groq.com');

    if (isStandardGroq && !apiKey.startsWith('gsk_')) {
      const isOrKey = apiKey.startsWith('sk-or-');
      return {
        ok: false,
        testResult: 'INVALID_KEY',
        message: isOrKey
          ? 'The configured GROQ_API_KEY is an OpenRouter key (starts with "sk-or-"). Groq Cloud requires an API key starting with "gsk_".'
          : 'The configured GROQ_API_KEY format is invalid. Groq Cloud keys must start with "gsk_".',
        recommendation: 'Obtain an official Groq API key from https://console.groq.com/keys and update GROQ_API_KEY in your .env file.',
      };
    }

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (res.status === 401) {
        return {
          ok: false,
          testResult: 'INVALID_KEY',
          message: 'Groq rejected the API key as invalid or revoked.',
          latencyMs,
          recommendation: 'Check and update GROQ_API_KEY at console.groq.com/keys.',
        };
      }

      if (res.status === 403) {
        return {
          ok: false,
          testResult: 'INVALID_KEY',
          message: 'Groq rejected the request (HTTP 403 Forbidden). Check account permissions.',
          latencyMs,
          recommendation: 'Verify your Groq account status and project permissions at console.groq.com.',
        };
      }

      if (res.status === 429) {
        return {
          ok: false,
          testResult: 'RATE_LIMITED',
          message: 'Groq rate limit reached for this account.',
          latencyMs,
          recommendation: 'Wait a few minutes or upgrade your Groq quota tier.',
        };
      }

      if (!res.ok) {
        return {
          ok: false,
          testResult: 'ERROR',
          message: `Groq returned HTTP ${res.status}.`,
          latencyMs,
        };
      }

      const data = await res.json().catch(() => ({}));
      const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

      return {
        ok: true,
        testResult: 'READY',
        message: `Groq API connection verified successfully (${data.data?.length || 0} models available).`,
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
          ? 'Groq API request timed out after 12 seconds.'
          : 'Could not connect to Groq API. Please verify network access and provider status.',
        latencyMs: Date.now() - startTime,
        recommendation: isTimeout
          ? 'Try again or check if Groq API is experiencing latency.'
          : 'Check server outbound internet connectivity and proxy settings.',
      };
    }
  }

  protected async executeInternal(
    request: ContentImprovementRequest
  ): Promise<ContentImprovementResponse> {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      return {
        success: false,
        action: request.action,
        providerId: this.metadata.id,
        providerStatus: 'NOT_CONFIGURED',
        error: {
          code: 'GROQ_KEY_MISSING',
          message: 'GROQ_API_KEY is not configured in the server environment.',
          requiresConfiguration: true,
          configuredProviders: [],
        },
      };
    }

    const baseUrl = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
    const isStandardGroq = baseUrl.includes('api.groq.com');

    if (isStandardGroq && !apiKey.startsWith('gsk_')) {
      const isOrKey = apiKey.startsWith('sk-or-');
      return {
        success: false,
        action: request.action,
        providerId: this.metadata.id,
        providerStatus: 'ERROR',
        error: {
          code: 'INVALID_API_KEY',
          message: isOrKey
            ? 'The configured GROQ_API_KEY is an OpenRouter key (starts with "sk-or-"). Groq Cloud requires an API key starting with "gsk_" from https://console.groq.com/keys.'
            : 'Groq API key format is invalid. Groq Cloud keys must start with "gsk_". Please verify GROQ_API_KEY in your server environment.',
          requiresConfiguration: true,
          configuredProviders: [this.metadata.name],
        },
      };
    }

    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    let systemPrompt =
      'You are a professional article editor, writing stylist, and SEO content optimizer. Return ONLY the improved content text without preambles, greetings, or markdown code fence wrappers.';
    let userPrompt = request.content;

    if (request.action === 'humanize_tone') {
      systemPrompt = `You are an elite editorial writer and content humanizer. Rewrite the article to sound completely natural, engaging, and genuinely human.
STRICT EDITORIAL REQUIREMENTS:
1. Eliminate robotic cadence, repetitive passive sentence structures, and predictable transitions.
2. Remove AI clichés such as "in today's digital landscape", "delve into", "a testament to", "moreover", "furthermore", "tapestry", "beacon".
3. Use varied sentence lengths: blend short impactful observations with nuanced longer sentences.
4. PRESERVE ALL Markdown structure: preserve all headings (# H1, ## H2, ### H3, #### H4), bullet lists (- ), numbered lists (1. ), blockquotes (> ), tables, and links ([anchor](url)).
${request.focusKeyword ? `5. PRESERVE the primary focus keyword "${request.focusKeyword}" naturally.` : ''}
6. Do NOT invent new factual data, statistics, claims, or citations.
7. Return ONLY the humanized article in Markdown format. Do NOT wrap the entire response in backtick code fences.`;
      userPrompt = `Article to humanize:\n\n${request.content}`;
    } else if (request.action === 'translate') {
      const targetLang = request.targetLanguage || 'English';
      const sourceLang =
        request.sourceLanguage && request.sourceLanguage !== 'auto'
          ? ` from ${request.sourceLanguage}`
          : '';
      systemPrompt = `You are a professional literary, technical, and multilingual translator. Translate the provided article faithfully${sourceLang} into ${targetLang}.
STRICT TRANSLATION REQUIREMENTS:
1. Preserve all Markdown elements: headings (#, ##, ###), lists, links ([text](url)), tables, and formatting bold/italics.
2. Maintain brand names, product titles, and technical keywords appropriately.
3. Do not summarize, truncate, or omit any section.
4. Return ONLY the completed translated article in ${targetLang}. Do NOT wrap with code fences.`;
      userPrompt = `Article to translate into ${targetLang}:\n\n${request.content}`;
    } else if (request.action === 'targeted_rewrite') {
      systemPrompt = `You are a concise editorial stylist. Rewrite ONLY the specified passage to improve flow, eliminate fluff, and make it sound natural and engaging. Return ONLY the rewritten passage text without quotes or explanation.`;
      userPrompt = `Passage to rewrite:\n"${request.targetPassage || request.content}"\n\nStyle improvement goal:\n${request.styleFinding || 'Improve natural rhythm and clarity'}`;
    } else if (request.action === 'one_click_fix') {
      systemPrompt = `You are an expert editorial proofreader and SEO content specialist. Perform a comprehensive 1-click editorial and SEO fix on the article.
STRICT EDITORIAL REQUIREMENTS:
1. Fix all spelling errors, typos, punctuation mistakes, capitalization, and grammatical flaws.
2. Improve clarity, concise phrasing, and sentence rhythm while removing unnecessary filler and fluff.
3. Clean up formatting: ensure proper paragraph breaks, logical heading structure (#, ##, ###), lists, and spacing.
4. PRESERVE all links ([text](url)), citations, facts, quotes, code, and key technical terms without inventing claims.
${request.focusKeyword ? `5. Ensure natural placement of the primary focus keyword "${request.focusKeyword}".` : ''}
6. Return ONLY the fully polished, corrected article in clean Markdown format without conversational greetings or code fence wrappers.`;
      userPrompt = `Article to fix and polish:\n\n${request.content}`;
    } else if (request.action === 'improve_headings') {
      systemPrompt = `You are a structural content editor and SEO specialist. Organize and structure the provided article with clear, logical Markdown headings (# H1 for main title, ## H2 for key sections, ### H3 for subsections). Preserve all original content, facts, bullet points, and links. Return ONLY the restructured Markdown content without code fence wrappers.`;
      userPrompt = `Article to structure with headings:\n\n${request.content}`;
    } else if (request.action === 'improve_title') {
      systemPrompt = `You are a search engine optimization and headline specialist. Craft a high-CTR, compelling article headline under 60 characters that includes the keyword if provided. Return ONLY the title text.`;
      userPrompt = `Keyword: ${request.focusKeyword || 'General'}\nCurrent title or topic: ${request.content.slice(0, 300)}`;
    } else if (request.action === 'improve_meta_description') {
      systemPrompt = `You are an SEO copywriter. Write a compelling, click-worthy meta description between 140 and 158 characters that includes the target keyword and an enticing call-to-action. Return ONLY the meta description text.`;
      userPrompt = `Keyword: ${request.focusKeyword || ''}\nArticle snippet: ${request.content.slice(0, 500)}`;
    } else if (request.action === 'improve_readability') {
      systemPrompt = `You are an editorial writing coach. Enhance readability and sentence flow of the provided content. Break overly long sentences into punchy, clear prose while preserving all information, Markdown structure, and keywords. Return ONLY the improved Markdown content.`;
      userPrompt = `Article to improve readability:\n\n${request.content}`;
    }

    try {
      const maxRetries = 1;
      const retryDelayMs = 1500;
      let res: Response | null = null;
      let lastErr: unknown = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 35000);

          const currentRes = await fetch(`${baseUrl}/chat/completions`, {
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
              max_tokens: 4096,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Retry once on transient rate limit or 503
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

      if (res.status === 401) {
        return {
          success: false,
          action: request.action,
          providerId: this.metadata.id,
          providerStatus: 'ERROR',
          error: {
            code: 'INVALID_API_KEY',
            message:
              'Groq API key is invalid or revoked. Please verify GROQ_API_KEY in your server environment.',
            requiresConfiguration: true,
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
            code: 'AI_PROVIDER_ERROR',
            message:
              'Groq API request was forbidden (HTTP 403). Check account permissions.',
            requiresConfiguration: false,
            configuredProviders: [this.metadata.name],
          },
        };
      }

      if (res.status === 404) {
        return {
          success: false,
          action: request.action,
          providerId: this.metadata.id,
          providerStatus: 'ERROR',
          error: {
            code: 'AI_PROVIDER_ERROR',
            message: `Groq model '${model}' was not found (HTTP 404). Please verify GROQ_MODEL in your server environment.`,
            requiresConfiguration: false,
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
              'Groq rate limit reached. Please wait a moment before trying again.',
            requiresConfiguration: false,
            configuredProviders: [this.metadata.name],
          },
        };
      }

      if (!res.ok) {
        return {
          success: false,
          action: request.action,
          providerId: this.metadata.id,
          providerStatus: 'ERROR',
          error: {
            code: 'AI_PROVIDER_ERROR',
            message: `Groq service returned error (HTTP ${res.status}).`,
            requiresConfiguration: false,
            configuredProviders: [this.metadata.name],
          },
        };
      }

      const data = await res.json();
      let outputText = data.choices?.[0]?.message?.content?.trim();

      if (!outputText) {
        return {
          success: false,
          action: request.action,
          providerId: this.metadata.id,
          providerStatus: 'ERROR',
          error: {
            code: 'EMPTY_RESPONSE',
            message: 'Groq returned an empty response.',
            requiresConfiguration: false,
            configuredProviders: [this.metadata.name],
          },
        };
      }

      // If the model wrapped the markdown in backticks ```markdown ... ```, unwrap it cleanly
      if (outputText.startsWith('```markdown') && outputText.endsWith('```')) {
        outputText = outputText.slice(11, -3).trim();
      } else if (outputText.startsWith('```') && outputText.endsWith('```')) {
        outputText = outputText.slice(3, -3).trim();
      }

      let explanation = `Enhanced using Groq Cloud (${model}).`;
      if (request.action === 'humanize_tone') {
        explanation = `Humanized tone, enhanced sentence rhythm, and eliminated robotic phrasing using ${model}.`;
      } else if (request.action === 'translate') {
        explanation = `Translated article into ${request.targetLanguage || 'target language'} using ${model}.`;
      } else if (request.action === 'targeted_rewrite') {
        explanation = `Refined passage style using ${model}.`;
      } else if (request.action === 'one_click_fix') {
        explanation = `Completed 1-click comprehensive editorial and SEO polish using ${model}.`;
      } else if (request.action === 'improve_headings') {
        explanation = `Restructured content hierarchy with optimized headings using ${model}.`;
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
            ? 'Groq request timed out. Please try again with a shorter section or retry.'
            : 'Could not connect to Groq API. Please verify network access and provider status.',
          requiresConfiguration: false,
          configuredProviders: [this.metadata.name],
        },
      };
    }
  }
}

