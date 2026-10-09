import { z } from 'zod';

export const keywordResearchSchema = z
  .object({
    seedKeyword: z
      .string()
      .trim()
      .max(150, 'Seed keyword must not exceed 150 characters')
      .optional()
      .or(z.literal('')),
    seedUrl: z
      .string()
      .trim()
      .url('Seed URL must be a valid HTTP or HTTPS URL')
      .max(255, 'Seed URL must not exceed 255 characters')
      .optional()
      .or(z.literal('')),
    location: z
      .string()
      .trim()
      .min(2, 'Location code must be at least 2 characters')
      .max(30, 'Location code must not exceed 30 characters')
      .default('US'),
    language: z
      .string()
      .trim()
      .min(2, 'Language code must be at least 2 characters')
      .max(10, 'Language code must not exceed 10 characters')
      .default('en'),
    maxResults: z
      .number()
      .int()
      .min(1, 'Minimum results limit is 1')
      .max(100, 'Maximum results limit is 100')
      .default(50)
      .optional(),
  })
  .refine(
    (data) => {
      const hasKeyword = Boolean(data.seedKeyword && data.seedKeyword.trim().length >= 2);
      const hasUrl = Boolean(data.seedUrl && data.seedUrl.trim().length > 0);
      return hasKeyword || hasUrl;
    },
    {
      message: 'At least one research seed (seed keyword of min 2 characters or seed URL) is required.',
      path: ['seedKeyword'],
    }
  );

export type KeywordResearchInput = z.infer<typeof keywordResearchSchema>;

/**
 * Legacy schema (preserved for backwards-compatibility with existing routes/tests)
 */
export const keywordQuerySchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, 'Keyword search query is required')
    .max(100, 'Keyword query must be under 100 characters'),
  country: z.string().trim().length(2, 'Country must be a 2-letter ISO code (e.g. US, UK)').optional().default('US'),
});

export type KeywordQueryInput = z.infer<typeof keywordQuerySchema>;
