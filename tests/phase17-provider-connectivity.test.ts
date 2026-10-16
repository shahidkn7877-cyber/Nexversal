import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GroqProviderAdapter } from '../src/providers/ai/adapters/groq.adapter';
import { GeminiProviderAdapter } from '../src/providers/ai/adapters/gemini.adapter';
import { AiProviderRegistry } from '../src/providers/ai/registry';
import { AiService } from '../src/providers/ai/service';
import { editorActionsService } from '../src/services/editor-actions.service';
import { styleReviewService } from '../src/services/style-review.service';

describe('Phase 17 — AI Provider Connectivity & Real Quick Actions Verification', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  // ============================================================================
  // 1. GROQ PROVIDER ADAPTER: PRE-FLIGHT VALIDATION & ERROR CLASSIFICATION
  // ============================================================================
  describe('1. Groq Provider Adapter', () => {
    it('detects unconfigured state when GROQ_API_KEY is missing', async () => {
      delete process.env.GROQ_API_KEY;
      const adapter = new GroqProviderAdapter();

      expect(adapter.isAvailable()).toBe(false);
      expect(adapter.metadata.status).toBe('NOT_CONFIGURED');

      const testRes = await adapter.testConnection();
      expect(testRes.ok).toBe(false);
      expect(testRes.testResult).toBe('FAILED_UNCONFIGURED');
      expect(testRes.message).toContain('GROQ_API_KEY is missing');

      const execRes = await adapter.execute({
        action: 'humanize_tone',
        content: 'Test content',
      });
      expect(execRes.success).toBe(false);
      expect(execRes.error?.code).toBe('AI_PROVIDER_NOT_CONFIGURED');
    });

    it('identifies OpenRouter key in GROQ_API_KEY and provides actionable diagnostic guidance', async () => {
      // User placed an OpenRouter key in GROQ_API_KEY
      process.env.GROQ_API_KEY = 'sk-or-v1-abcdef1234567890abcdef1234567890';
      const adapter = new GroqProviderAdapter();

      // isAvailable must be false so registry does not select broken Groq
      expect(adapter.isAvailable()).toBe(false);
      expect(adapter.metadata.status).toBe('ERROR');
      expect(adapter.metadata.statusReason).toContain('OpenRouter');
      expect(adapter.metadata.statusReason).toContain('gsk_');

      // testConnection must guide the user with exact fix
      const testRes = await adapter.testConnection();
      expect(testRes.ok).toBe(false);
      expect(testRes.testResult).toBe('INVALID_KEY');
      expect(testRes.message).toContain('OpenRouter');
      expect(testRes.recommendation).toContain('console.groq.com/keys');
      expect(testRes.message).not.toContain('abcdef1234567890'); // No key leak
    });

    it('marks adapter AVAILABLE when valid gsk_ key is provided', () => {
      process.env.GROQ_API_KEY = 'gsk_valid_format_test_key_123';
      const adapter = new GroqProviderAdapter();

      expect(adapter.isAvailable()).toBe(true);
      expect(adapter.metadata.status).toBe('AVAILABLE');
      expect(adapter.metadata.statusReason).toContain('configured');
    });

    it('classifies 401 Unauthorized as INVALID_API_KEY without leaking credentials', async () => {
      process.env.GROQ_API_KEY = 'gsk_revoked_key_999';
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 401,
        ok: false,
        json: async () => ({ error: { message: 'Invalid API Key', code: 'invalid_api_key' } }),
      } as unknown as Response);

      const adapter = new GroqProviderAdapter();
      const res = await adapter.execute({
        action: 'one_click_fix',
        content: 'Test content to polish.',
      });

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('INVALID_API_KEY');
      expect(res.error?.message).toContain('Groq API key is invalid or revoked');
      expect(res.error?.message).not.toContain('gsk_revoked_key_999');
    });

    it('classifies 403 Forbidden properly', async () => {
      process.env.GROQ_API_KEY = 'gsk_forbidden_key';
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 403,
        ok: false,
        json: async () => ({ error: { message: 'Forbidden' } }),
      } as unknown as Response);

      const adapter = new GroqProviderAdapter();
      const res = await adapter.execute({
        action: 'humanize_tone',
        content: 'Test content.',
      });

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('AI_PROVIDER_ERROR');
      expect(res.error?.message).toContain('HTTP 403');
    });

    it('retries once on transient 429 rate limit before returning RATE_LIMIT_EXCEEDED', async () => {
      process.env.GROQ_API_KEY = 'gsk_rate_limited_key';
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        status: 429,
        ok: false,
        json: async () => ({ error: { message: 'Rate limit exceeded' } }),
      } as unknown as Response);

      const adapter = new GroqProviderAdapter();
      const res = await adapter.execute({
        action: 'humanize_tone',
        content: 'Rate limit test.',
      });

      // Initial attempt + 1 retry = 2 fetch calls total
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(res.error?.message).toContain('rate limit reached');
    });

    it('retries transient 503 and succeeds if retry returns 200', async () => {
      process.env.GROQ_API_KEY = 'gsk_transient_key';
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce({
          status: 503,
          ok: false,
          json: async () => ({ error: { message: 'Service Unavailable' } }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Polished content successfully.' } }],
          }),
        } as unknown as Response);

      const adapter = new GroqProviderAdapter();
      const res = await adapter.execute({
        action: 'one_click_fix',
        content: 'Original content.',
      });

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(res.success).toBe(true);
      expect(res.result?.improved).toBe('Polished content successfully.');
    });

    it('classifies AbortError/TimeoutError as TIMEOUT', async () => {
      process.env.GROQ_API_KEY = 'gsk_timeout_key';
      const timeoutErr = new Error('The operation was aborted due to timeout');
      timeoutErr.name = 'TimeoutError';
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(timeoutErr);

      const adapter = new GroqProviderAdapter();
      const res = await adapter.execute({
        action: 'humanize_tone',
        content: 'Timeout test.',
      });

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('TIMEOUT');
      expect(res.error?.message).toContain('timed out');
    });

    it('classifies network connection failure as CONNECTION_FAILED', async () => {
      process.env.GROQ_API_KEY = 'gsk_network_err_key';
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('fetch failed'));

      const adapter = new GroqProviderAdapter();
      const res = await adapter.execute({
        action: 'humanize_tone',
        content: 'Network test.',
      });

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('CONNECTION_FAILED');
      expect(res.error?.message).toContain('Could not connect to Groq API');
    });

    it('unwraps markdown fences from Groq responses cleanly', async () => {
      process.env.GROQ_API_KEY = 'gsk_clean_key';
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '```markdown\n# Clear Heading\n\nDirect body copy.\n```',
              },
            },
          ],
        }),
      } as unknown as Response);

      const adapter = new GroqProviderAdapter();
      const res = await adapter.execute({
        action: 'improve_headings',
        content: 'Raw body copy without headings.',
      });

      expect(res.success).toBe(true);
      expect(res.result?.improved).toBe('# Clear Heading\n\nDirect body copy.');
      expect(res.result?.improved).not.toContain('```');
    });
  });

  // ============================================================================
  // 2. GEMINI PROVIDER ADAPTER: KEY VALIDATION, SAFETY & RECITATION HANDLING
  // ============================================================================
  describe('2. Gemini Provider Adapter', () => {
    it('detects unconfigured state when GEMINI_API_KEY is missing', async () => {
      delete process.env.GEMINI_API_KEY;
      const adapter = new GeminiProviderAdapter();

      expect(adapter.isAvailable()).toBe(false);
      expect(adapter.metadata.status).toBe('NOT_CONFIGURED');

      const testRes = await adapter.testConnection();
      expect(testRes.ok).toBe(false);
      expect(testRes.testResult).toBe('FAILED_UNCONFIGURED');
    });

    it('classifies 400 with invalid API key as INVALID_API_KEY', async () => {
      process.env.GEMINI_API_KEY = 'invalid_gemini_key_123';
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 400,
        ok: false,
        json: async () => ({
          error: {
            code: 400,
            message: 'API key not valid. Please pass a valid API key.',
            status: 'INVALID_ARGUMENT',
          },
        }),
      } as unknown as Response);

      const adapter = new GeminiProviderAdapter();
      const res = await adapter.execute({
        action: 'humanize_tone',
        content: 'Article to humanize.',
      });

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('INVALID_API_KEY');
      expect(res.error?.message).toContain('Google Gemini rejected the API key');
      expect(res.error?.requiresConfiguration).toBe(true);
    });

    it('classifies SAFETY filter finish reason as SAFETY_BLOCKED', async () => {
      process.env.GEMINI_API_KEY = 'AIzaSy_valid_mock_key';
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: 'SAFETY',
              content: { parts: [] },
            },
          ],
        }),
      } as unknown as Response);

      const adapter = new GeminiProviderAdapter();
      const res = await adapter.execute({
        action: 'humanize_tone',
        content: 'Sensitive topic article.',
      });

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('SAFETY_BLOCKED');
      expect(res.error?.message).toContain('safety policy filters');
    });

    it('classifies RECITATION policy finish reason as RECITATION_BLOCKED', async () => {
      process.env.GEMINI_API_KEY = 'AIzaSy_valid_mock_key';
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: 'RECITATION',
              content: { parts: [] },
            },
          ],
        }),
      } as unknown as Response);

      const adapter = new GeminiProviderAdapter();
      const res = await adapter.execute({
        action: 'one_click_fix',
        content: 'Copyrighted passage.',
      });

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('RECITATION_BLOCKED');
      expect(res.error?.message).toContain('recitation/copyright policy');
    });

    it('retries once on transient 429 quota/rate limit in Gemini', async () => {
      process.env.GEMINI_API_KEY = 'AIzaSy_valid_mock_key';
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        status: 429,
        ok: false,
        json: async () => ({
          error: { code: 429, message: 'Resource has been exhausted (e.g. check quota).' },
        }),
      } as unknown as Response);

      const adapter = new GeminiProviderAdapter();
      const res = await adapter.execute({
        action: 'humanize_tone',
        content: 'Test content.',
      });

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('handles successful Gemini generation and unwraps code fences', async () => {
      process.env.GEMINI_API_KEY = 'AIzaSy_valid_mock_key';
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: '```markdown\n# Polished Article\n\nEngaging, natural humanized content.\n```',
                  },
                ],
              },
            },
          ],
        }),
      } as unknown as Response);

      const adapter = new GeminiProviderAdapter();
      const res = await adapter.execute({
        action: 'humanize_tone',
        content: 'Original robotic content.',
      });

      expect(res.success).toBe(true);
      expect(res.result?.improved).toBe('# Polished Article\n\nEngaging, natural humanized content.');
      expect(res.result?.improved).not.toContain('```');
      expect(res.result?.explanation).toContain('Google Gemini');
    });
  });

  // ============================================================================
  // 3. AISERVICE & REGISTRY PROVIDER SELECTION LOGIC
  // ============================================================================
  describe('3. AiService & Registry Provider Selection', () => {
    it('respects DEFAULT_AI_PROVIDER environment variable when configured', async () => {
      process.env.GROQ_API_KEY = 'gsk_valid_groq_key';
      process.env.GEMINI_API_KEY = 'AIzaSy_valid_gemini_key';
      process.env.DEFAULT_AI_PROVIDER = 'gemini';

      const registry = new AiProviderRegistry();
      const service = new AiService(registry);

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Response from Gemini.' }] } }],
        }),
      } as unknown as Response);

      const res = await service.execute({
        action: 'one_click_fix',
        content: 'Sample content.',
      });

      expect(res.success).toBe(true);
      expect(res.providerId).toBe('gemini');
    });

    it('falls back seamlessly to Gemini when GROQ_API_KEY has an invalid OpenRouter key', async () => {
      // Groq has OpenRouter key, so isAvailable() is false
      process.env.GROQ_API_KEY = 'sk-or-v1-invalid-for-groq';
      // Gemini has valid key
      process.env.GEMINI_API_KEY = 'AIzaSy_valid_gemini_key';

      const registry = new AiProviderRegistry();
      const available = registry.getAvailable();
      expect(available.map((a) => a.metadata.id)).not.toContain('groq');
      expect(available.map((a) => a.metadata.id)).toContain('gemini');

      const service = new AiService(registry);

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Polished via Gemini fallback.' }] } }],
        }),
      } as unknown as Response);

      const res = await service.execute({
        action: 'humanize_tone',
        content: 'Robotic text.',
      });

      expect(res.success).toBe(true);
      expect(res.providerId).toBe('gemini');
      expect(res.result?.improved).toBe('Polished via Gemini fallback.');
    });

    it('returns exact standard unconfigured message when no providers are configured', async () => {
      delete process.env.GROQ_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.CLAUDE_API_KEY;
      delete process.env.DEEPSEEK_API_KEY;
      delete process.env.OLLAMA_BASE_URL;

      const registry = new AiProviderRegistry();
      const service = new AiService(registry);

      const res = await service.execute({
        action: 'humanize_tone',
        content: 'Content waiting for AI.',
      });

      expect(res.success).toBe(false);
      expect(res.providerStatus).toBe('NOT_CONFIGURED');
      expect(res.error?.code).toBe('AI_PROVIDER_NOT_CONFIGURED');
      expect(res.error?.message).toBe(
        'No AI provider is configured. Connect an official AI provider to use AI-powered improvements.'
      );
      expect(res.error?.requiresConfiguration).toBe(true);
    });
  });

  // ============================================================================
  // 4. THE SIX QUICK ACTIONS EXECUTION & PIPELINE VERIFICATION
  // ============================================================================
  describe('4. The Six Quick Actions Workflows', () => {
    const sampleArticle = `# The Comprehensive Guide to Modern Search Engines

In today's digital landscape, optimizing your content serves as a testament to strategic excellence.
Delve deeper into search engine patterns to harness the power of rankings.

## Key Tactics

- Focus on reader satisfaction
- Provide structured answers`;

    it('Action 1: 1-Click Fix completes deterministic fix with full changes audit', () => {
      const fix = editorActionsService.oneClickSeoFix({
        content: sampleArticle,
        focusKeyword: 'Modern Search Engines',
        title: 'Modern Search Engines Guide',
        slug: 'modern-search-engines',
      });

      expect(fix.proposedContent).toBeDefined();
      expect(fix.changes.length).toBeGreaterThan(0);
      expect(fix.fixesCount).toBeGreaterThan(0);
    });

    it('Action 2: Humanize Tone replaces robotic clichés and generates diff metrics', () => {
      const humanize = editorActionsService.humanizeTone({
        content: sampleArticle,
      });

      expect(humanize.replacedCount).toBeGreaterThanOrEqual(2);
      expect(humanize.replacements.some((r) => r.original.includes("digital landscape"))).toBe(true);
      expect(humanize.proposedContent).not.toContain("In today's digital landscape");
    });

    it('Action 3: Translate executes via provider and preserves Markdown structure', async () => {
      process.env.GROQ_API_KEY = 'gsk_valid_key';
      const translated = `# Guía Completa de Motores de Búsqueda Modernos\n\nEn el entorno digital actual...`;

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          choices: [{ message: { content: translated } }],
        }),
      } as unknown as Response);

      const adapter = new GroqProviderAdapter();
      const res = await adapter.execute({
        action: 'translate',
        content: sampleArticle,
        targetLanguage: 'Spanish',
      });

      expect(res.success).toBe(true);
      expect(res.result?.improved).toBe(translated);
      expect(res.result?.explanation).toContain('Spanish');
    });

    it('Action 4: Style Review identifies formulaic patterns and offers passage rewrite', () => {
      const review = styleReviewService.analyzeStyle(sampleArticle);
      expect(review.totalFindings).toBeGreaterThan(0);
      expect(review.findings.length).toBeGreaterThan(0);

      const firstFinding = review.findings[0];
      const fallbackRewrite = styleReviewService.generateFallbackRewrite(firstFinding);
      expect(fallbackRewrite).toBeDefined();
      expect(fallbackRewrite.length).toBeGreaterThan(0);
    });

    it('Action 5: Auto Headings generates structured H1 and H2 tags', () => {
      const plainText = `Modern search optimization has evolved into entity graphs.\n\nSearch intent analysis is crucial for readers.`;
      const headings = editorActionsService.autoHeadings({
        content: plainText,
        focusKeyword: 'search optimization',
      });

      expect(headings.generatedHeadings.length).toBeGreaterThan(0);
      expect(headings.proposedContent).toContain('#');
    });

    it('Action 6: US <-> UK Dialect detects variants and adapts vocabulary accurately', () => {
      const usText = 'The apartment building had a fast elevator and people ate cookies on the sidewalk.';
      const detected = editorActionsService.detectDialect(usText);
      expect(detected.detected).toBe('US');
      expect(detected.recommendedTarget).toBe('UK');

      const adapted = editorActionsService.adaptDialect({
        content: usText,
        targetVariant: 'UK',
      });

      expect(adapted.proposedContent).toContain('flat');
      expect(adapted.proposedContent).toContain('lift');
      expect(adapted.proposedContent).toContain('biscuits');
      expect(adapted.proposedContent).toContain('pavement');
      expect(adapted.changeCount).toBeGreaterThanOrEqual(4);
    });
  });
});

