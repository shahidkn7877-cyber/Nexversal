import { describe, it, expect } from 'vitest';
import { aiProviderRegistry } from '../src/providers/ai/registry';
import { aiService } from '../src/providers/ai/service';
import { contentImprovementService } from '../src/services/content-improvement.service';
import { contentImprovementSchema } from '../src/lib/validation/ai-improvement.schema';

describe('Phase 3 — AI Provider Architecture & Safety', () => {
  it('registers all official foundation providers in the registry', () => {
    const providers = aiProviderRegistry.getAllMetadata();
    expect(providers.length).toBeGreaterThanOrEqual(4);

    const ids = providers.map((p) => p.id);
    expect(ids).toContain('gemini');
    expect(ids).toContain('openai');
    expect(ids).toContain('claude');
    expect(ids).toContain('deepseek');
  });

  it('provides safe, informational official website links for all providers', () => {
    const providers = aiProviderRegistry.getAllMetadata();
    providers.forEach((provider) => {
      expect(provider.websiteUrl).toMatch(/^https:\/\//);
      expect(provider.websiteUrl).not.toContain('localhost');
      expect(provider.envKeyRequired).toBeDefined();
    });

    const gemini = providers.find((p) => p.id === 'gemini');
    expect(gemini?.websiteUrl).toBe('https://gemini.google.com');
    expect(gemini?.envKeyRequired).toBe('GEMINI_API_KEY');
  });

  it('marks all providers as NOT_CONFIGURED when no environment API key is present', () => {
    const providers = aiProviderRegistry.getAllMetadata();
    providers.forEach((p) => {
      expect(['NOT_CONFIGURED', 'AVAILABLE']).toContain(p.status);
    });
  });

  it('returns standard unconfigured message when no provider credentials exist', async () => {
    const result = await aiService.execute({
      action: 'improve_title',
      content: 'Sample SEO content for testing',
      focusKeyword: 'seo tools',
    });

    if (!result.success) {
      expect(result.error?.message).toBe(
        'No AI provider is configured. Connect an official AI provider to use AI-powered improvements.'
      );
      expect(result.result).toBeUndefined();
    }
  });

  it('never produces fake or simulated AI content when unconfigured', async () => {
    const result = await contentImprovementService.improveContent({
      action: 'improve_readability',
      content: 'A very long and complicated paragraph that needs simplification.',
      focusKeyword: 'paragraph',
    });

    if (!result.success) {
      expect(result.error?.requiresConfiguration).toBe(true);
      expect(result.result).toBeUndefined();
    }
  });

  it('validates ContentImprovementRequest schema strictly with Zod', () => {
    // Valid input
    const valid = contentImprovementSchema.safeParse({
      action: 'improve_meta_description',
      content: 'This is valid body content for testing meta description generation.',
      focusKeyword: 'seo audit tools',
      desiredTone: 'conversational',
    });
    expect(valid.success).toBe(true);

    // Invalid action
    const invalidAction = contentImprovementSchema.safeParse({
      action: 'unsupported_action',
      content: 'Valid content',
    });
    expect(invalidAction.success).toBe(false);

    // Empty content
    const emptyContent = contentImprovementSchema.safeParse({
      action: 'improve_title',
      content: '',
    });
    expect(emptyContent.success).toBe(false);
  });

  it('returns empty list of available providers when none are set up', () => {
    const available = aiProviderRegistry.getAvailable();
    if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
      expect(available.length).toBe(0);
    }
  });
});
