import { describe, it, expect } from 'vitest';
import { auditInputSchema } from '../src/lib/validation/audit.schema';
import { contentAnalyzeSchema } from '../src/lib/validation/content.schema';
import { keywordQuerySchema } from '../src/lib/validation/keyword.schema';

describe('API Zod Validation Schemas', () => {
  it('validates audit input properly', () => {
    expect(auditInputSchema.safeParse({ url: 'https://example.com' }).success).toBe(true);
    expect(auditInputSchema.safeParse({ url: 'not-a-url' }).success).toBe(false);
    expect(auditInputSchema.safeParse({ url: 'ftp://example.com' }).success).toBe(false);
  });

  it('validates content analyze input', () => {
    expect(contentAnalyzeSchema.safeParse({ content: 'Valid article body', focusKeyword: 'seo tips' }).success).toBe(true);
    expect(contentAnalyzeSchema.safeParse({ content: '' }).success).toBe(false);
    expect(contentAnalyzeSchema.safeParse({ content: 'Valid', focusKeyword: '' }).success).toBe(false);
  });

  it('validates keyword query schema', () => {
    expect(keywordQuerySchema.safeParse({ query: 'seo tips' }).success).toBe(true);
    expect(keywordQuerySchema.safeParse({ query: '' }).success).toBe(false);
    expect(keywordQuerySchema.safeParse({ query: 'valid', country: 'USA' }).success).toBe(false); // must be 2 chars
    expect(keywordQuerySchema.safeParse({ query: 'valid', country: 'US' }).success).toBe(true);
  });
});
