import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { articleExportService } from '../src/services/article-export.service';
import { articleExportSchema } from '../src/lib/validation/article-export.schema';
import { GroqProviderAdapter } from '../src/providers/ai/adapters/groq.adapter';
import { OllamaProviderAdapter } from '../src/providers/ai/adapters/ollama.adapter';
import { GeminiProviderAdapter } from '../src/providers/ai/adapters/gemini.adapter';
import { OpenAiProviderAdapter } from '../src/providers/ai/adapters/openai.adapter';
import { ClaudeProviderAdapter } from '../src/providers/ai/adapters/claude.adapter';
import { DeepSeekProviderAdapter } from '../src/providers/ai/adapters/deepseek.adapter';
import { AiProviderRegistry } from '../src/providers/ai/registry';
import { editorActionsService } from '../src/services/editor-actions.service';

describe('Phase 15: Article Export & Real AI Provider Connectivity', () => {
  const sampleArticle = `# The Complete Guide to SEO Optimization

Search engine optimization is critical for modern digital businesses.

## Key On-Page Elements

Here are the essential factors to keep in mind:

- Title tags and meta descriptions
- High quality engaging body content
- Internal and external link architecture
- Image alt text attributes

### Heading Structures

1. Use only one H1 per page
2. Organize subsections with H2 and H3 tags
3. Maintain logical hierarchy

> Good SEO is about providing the best answer to the searcher's query.

| Metric | Target | Status |
| --- | --- | --- |
| Word Count | 1500+ | Pass |
| Readability | 65+ | Optimal |

Visit [Nexversal SEO](https://nexversal.bond) for automated audits and insights.`;

  // ============================================================================
  // PART A: ARTICLE EXPORT TESTS (PDF & DOCX)
  // ============================================================================
  describe('Part A: Article Export (PDF & DOCX)', () => {
    describe('1. PDF Generation', () => {
      it('generates a valid binary PDF buffer starting with %PDF- header', async () => {
        const buffer = await articleExportService.generatePdf({
          title: 'The Complete Guide to SEO Optimization',
          content: sampleArticle,
          format: 'pdf',
          focusKeyword: 'SEO Optimization',
          metaDescription: 'Comprehensive guide to mastering SEO fundamentals.',
        });

        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(1000);

        // Check for genuine PDF magic bytes: %PDF-
        const header = buffer.subarray(0, 5).toString('ascii');
        expect(header).toBe('%PDF-');
      });

      it('generates a multi-page PDF without errors for extensive articles', async () => {
        const longContent = Array.from({ length: 40 }, (_, i) => (
          `## Section ${i + 1}: In-Depth Analysis\n\nThis is paragraph ${i + 1} detailing technical SEO strategies with comprehensive insights, clear paragraphs, and informative guidance.\n\n- Point A\n- Point B\n- Point C\n\n`
        )).join('\n');

        const buffer = await articleExportService.generatePdf({
          title: 'Comprehensive Technical SEO Whitepaper',
          content: longContent,
          format: 'pdf',
        });

        expect(buffer.length).toBeGreaterThan(10000);
        expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
      });

      it('handles unicode characters, apostrophes, and markdown formatting gracefully', async () => {
        const unicodeArticle = `# Spécialité Français & UK/US English: “Smart Quotes” & Em—Dashes

Here's an analysis of café culture: naïve assumptions vs. façade architecture.
Symbols: © 2026 Nexversal™ · 100% Guaranteed.`;

        const buffer = await articleExportService.generatePdf({
          title: 'International Characters & Punctuation',
          content: unicodeArticle,
          format: 'pdf',
        });

        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
      });
    });

    describe('2. DOCX Generation', () => {
      it('generates a valid Microsoft Word (.docx) buffer with PK zip magic header', async () => {
        const buffer = await articleExportService.generateDocx({
          title: 'The Complete Guide to SEO Optimization',
          content: sampleArticle,
          format: 'docx',
          focusKeyword: 'SEO Optimization',
          metaDescription: 'A guide to on-page optimization.',
        });

        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(1000);

        // Word .docx files are OpenXML zip packages starting with PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
        expect(buffer[0]).toBe(0x50); // P
        expect(buffer[1]).toBe(0x4b); // K
        expect(buffer[2]).toBe(0x03);
        expect(buffer[3]).toBe(0x04);
      });

      it('handles tables, quotes, bullet points, and hyperlinks in DOCX', async () => {
        const buffer = await articleExportService.generateDocx({
          title: 'Structured Elements Document',
          content: sampleArticle,
          format: 'docx',
        });

        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(2000);
      });
    });

    describe('3. Filename Sanitization & Validation', () => {
      it('sanitizes illegal filename characters and produces clean filenames', () => {
        expect(
          articleExportService.sanitizeFilename('Best SEO: 10/10 "Tips" & Tricks?', 'pdf')
        ).toBe('best-seo-10-10-tips-tricks.pdf');

        expect(
          articleExportService.sanitizeFilename('Dangerous/Path\\Traverse*File?:Name', 'docx')
        ).toBe('dangerous-path-traverse-file-name.docx');
      });

      it('falls back to default filename when title is empty or whitespace', () => {
        expect(articleExportService.sanitizeFilename('', 'pdf')).toBe('nexversal-article.pdf');
        expect(articleExportService.sanitizeFilename('   ', 'docx')).toBe('nexversal-article.docx');
        expect(articleExportService.sanitizeFilename('???///:::', 'pdf')).toBe('nexversal-article.pdf');
      });

      it('validates request payload schema using articleExportSchema', () => {
        const valid = articleExportSchema.safeParse({
          title: 'My Article',
          content: 'Some good content here.',
          format: 'pdf',
        });
        expect(valid.success).toBe(true);

        // Rejects empty content
        const empty = articleExportSchema.safeParse({
          title: 'My Article',
          content: '   ',
          format: 'pdf',
        });
        expect(empty.success).toBe(false);

        // Rejects invalid format
        const badFormat = articleExportSchema.safeParse({
          title: 'My Article',
          content: 'Valid content',
          format: 'txt',
        });
        expect(badFormat.success).toBe(false);
      });
    });
  });

  // ============================================================================
  // PART B: REAL AI PROVIDER CONNECTIVITY & DIAGNOSTICS
  // ============================================================================
  describe('Part B: Real AI Provider Connectivity & Diagnostics', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      process.env = { ...originalEnv };
      vi.restoreAllMocks();
    });

    afterEach(() => {
      process.env = { ...originalEnv };
      vi.restoreAllMocks();
    });

    describe('1. Groq Provider Adapter', () => {
      it('correctly reports metadata, capability set, and required env key', () => {
        const adapter = new GroqProviderAdapter();
        expect(adapter.metadata.id).toBe('groq');
        expect(adapter.metadata.envKeyRequired).toBe('GROQ_API_KEY');
        expect(adapter.metadata.capabilities).toContain('humanize_tone');
        expect(adapter.metadata.capabilities).toContain('translation');
        expect(adapter.metadata.capabilities).toContain('targeted_rewrite');
      });

      it('isAvailable returns false when GROQ_API_KEY is not set', () => {
        delete process.env.GROQ_API_KEY;
        const adapter = new GroqProviderAdapter();
        expect(adapter.isAvailable()).toBe(false);
        expect(adapter.metadata.status).toBe('NOT_CONFIGURED');
      });

      it('isAvailable returns true when GROQ_API_KEY is set', () => {
        process.env.GROQ_API_KEY = 'gsk_mock_valid_key_12345';
        const adapter = new GroqProviderAdapter();
        expect(adapter.isAvailable()).toBe(true);
        expect(adapter.metadata.status).toBe('AVAILABLE');
      });

      it('testConnection reports FAILED_UNCONFIGURED if key is missing', async () => {
        delete process.env.GROQ_API_KEY;
        const adapter = new GroqProviderAdapter();
        const res = await adapter.testConnection();
        expect(res.ok).toBe(false);
        expect(res.testResult).toBe('FAILED_UNCONFIGURED');
        expect(res.message).toContain('GROQ_API_KEY is missing');
      });

      it('testConnection detects invalid API key when endpoint returns 401', async () => {
        process.env.GROQ_API_KEY = 'gsk_invalid_test_key';
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          status: 401,
          ok: false,
          json: async () => ({ error: { message: 'Invalid API Key', code: 'invalid_api_key' } }),
        } as unknown as Response);

        const adapter = new GroqProviderAdapter();
        const res = await adapter.testConnection();

        expect(res.ok).toBe(false);
        expect(res.testResult).toBe('INVALID_KEY');
        expect(res.message).toContain('Groq rejected the API key');
        // Crucial security test: Must NEVER leak the key
        expect(res.message).not.toContain('gsk_invalid_test_key');
      });

      it('testConnection succeeds when endpoint returns 200 with models', async () => {
        process.env.GROQ_API_KEY = 'gsk_valid_key';
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({ data: [{ id: 'llama-3.3-70b-versatile' }] }),
        } as unknown as Response);

        const adapter = new GroqProviderAdapter();
        const res = await adapter.testConnection();

        expect(res.ok).toBe(true);
        expect(res.testResult).toBe('READY');
        expect(res.message).toContain('verified successfully');
      });

      it('executes humanize_tone with prompt and unwraps response without backtick fences', async () => {
        process.env.GROQ_API_KEY = 'gsk_valid_key';
        const mockImprovedText = '# Better SEO Guide\n\nSearch engine optimization is straightforward when you focus on clarity.';

        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: `\`\`\`markdown\n${mockImprovedText}\n\`\`\``,
                },
              },
            ],
          }),
        } as unknown as Response);

        const adapter = new GroqProviderAdapter();
        const result = await adapter.execute({
          content: '# SEO Guide\n\nIn today\'s digital landscape, SEO is important.',
          action: 'humanize_tone',
          focusKeyword: 'SEO Guide',
        });

        expect(result.success).toBe(true);
        expect(result.result?.improved).toBe(mockImprovedText);
        expect(result.result?.explanation).toContain('llama-3.3-70b-versatile');
      });

      it('executes translation preserving markdown structure', async () => {
        process.env.GROQ_API_KEY = 'gsk_valid_key';
        const translatedContent = '# Guía de Optimización SEO\n\nLa optimización para motores de búsqueda es vital.';

        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: translatedContent,
                },
              },
            ],
          }),
        } as unknown as Response);

        const adapter = new GroqProviderAdapter();
        const result = await adapter.execute({
          content: '# SEO Optimization Guide\n\nSearch engine optimization is vital.',
          action: 'translate',
          targetLanguage: 'Spanish',
        });

        expect(result.success).toBe(true);
        expect(result.result?.improved).toBe(translatedContent);
      });
    });

    describe('2. Ollama Provider Adapter', () => {
      it('correctly resolves baseUrl away from https://ollama.com to http://localhost:11434', async () => {
        process.env.OLLAMA_BASE_URL = 'https://ollama.com';
        process.env.OLLAMA_API_KEY = 'mock_key';

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Connection refused'));

        const adapter = new OllamaProviderAdapter();
        const testRes = await adapter.testConnection();

        // Must connect to localhost, NOT https://ollama.com
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('http://localhost:11434'),
          expect.anything()
        );
        expect(testRes.ok).toBe(false);
        expect(testRes.testResult).toBe('UNREACHABLE');
        expect(testRes.recommendation).toContain('http://localhost:11434');
      });
    });

    describe('3. Other Adapters Test Connectivity', () => {
      it('Gemini adapter implements testConnection safely', async () => {
        delete process.env.GEMINI_API_KEY;
        const gemini = new GeminiProviderAdapter();
        const res = await gemini.testConnection();
        expect(res.ok).toBe(false);
        expect(res.testResult).toBe('FAILED_UNCONFIGURED');
      });

      it('OpenAI adapter implements testConnection safely', async () => {
        delete process.env.OPENAI_API_KEY;
        const openai = new OpenAiProviderAdapter();
        const res = await openai.testConnection();
        expect(res.ok).toBe(false);
        expect(res.testResult).toBe('FAILED_UNCONFIGURED');
      });

      it('Claude adapter implements testConnection safely', async () => {
        delete process.env.ANTHROPIC_API_KEY;
        const claude = new ClaudeProviderAdapter();
        const res = await claude.testConnection();
        expect(res.ok).toBe(false);
        expect(res.testResult).toBe('FAILED_UNCONFIGURED');
      });

      it('DeepSeek adapter implements testConnection safely', async () => {
        delete process.env.DEEPSEEK_API_KEY;
        const deepseek = new DeepSeekProviderAdapter();
        const res = await deepseek.testConnection();
        expect(res.ok).toBe(false);
        expect(res.testResult).toBe('FAILED_UNCONFIGURED');
      });
    });

    describe('4. AI Provider Registry Order & Priority', () => {
      it('registers Groq as the top adapter in the default registry', () => {
        const registry = new AiProviderRegistry();
        const all = registry.getAll();
        expect(all.length).toBeGreaterThanOrEqual(6);
        expect(all[0].metadata.id).toBe('groq');
      });

      it('getDefaultProvider picks Groq when configured', () => {
        process.env.GROQ_API_KEY = 'gsk_test';
        const registry = new AiProviderRegistry();
        const def = registry.getDefaultProvider();
        expect(def?.metadata.id).toBe('groq');
      });
    });

    describe('5. Verification of All Existing AI & Editor Actions', () => {
      it('1-Click SEO Fix generates proposal with title and structure', () => {
        const result = editorActionsService.oneClickSeoFix({
          content: 'Here is some content without any headings.',
          focusKeyword: 'Modern SEO',
          title: 'Old Title',
          slug: 'old-title',
        });

        expect(result.proposedTitle).toContain('Modern SEO');
        expect(result.proposedSlug).toBe('modern-seo');
        expect(result.changes.length).toBeGreaterThan(0);
      });

      it('Auto Headings adds H1 and H2 subheadings', () => {
        const rawText = `First paragraph about internet marketing.\n\nSecond paragraph explaining link building.`;
        const result = editorActionsService.autoHeadings({
          content: rawText,
          focusKeyword: 'internet marketing',
        });

        expect(result.proposedContent).toContain('# ');
        expect(result.proposedContent).toContain('## ');
        expect(result.generatedHeadings.length).toBeGreaterThanOrEqual(2);
      });

      it('Rule-based humanizeTone replaces stock robotic phrases', () => {
        const roboticText = `We must delve into this topic and explore solutions.`;
        const result = editorActionsService.humanizeTone({ content: roboticText });

        expect(result.replacedCount).toBeGreaterThan(0);
        expect(result.proposedContent).not.toContain('delve into');
      });

      it('US <-> UK dialect adaptation converts target spelling variants', () => {
        const usText = 'The color of the apartment will optimize flow.';
        const ukResult = editorActionsService.adaptDialect({ content: usText, targetVariant: 'UK' });
        expect(ukResult.proposedContent).toContain('colour');
        expect(ukResult.proposedContent).toContain('flat');
        expect(ukResult.proposedContent).toContain('optimise');

        const usResult = editorActionsService.adaptDialect({ content: ukResult.proposedContent, targetVariant: 'US' });
        expect(usResult.proposedContent).toContain('color');
        expect(usResult.proposedContent).toContain('apartment');
        expect(usResult.proposedContent).toContain('optimize');
      });
    });
  });
});
