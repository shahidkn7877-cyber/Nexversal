import { z } from 'zod';

export const improvementActionEnum = z.enum([
  'improve_title',
  'improve_intro',
  'improve_meta_description',
  'improve_headings',
  'improve_readability',
  'suggest_keyword_placement',
  'improve_paragraph_clarity',
  'generate_suggestions',
  'humanize_tone',
  'translate',
  'targeted_rewrite',
]);

export const desiredToneEnum = z.enum([
  'professional',
  'conversational',
  'authoritative',
  'engaging',
  'neutral',
]);

export const contentImprovementSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Article content cannot be empty')
    .max(100000, 'Content must be under 100,000 characters'),
  action: improvementActionEnum,
  focusKeyword: z.string().trim().max(100).optional(),
  desiredTone: desiredToneEnum.optional().default('conversational'),
  targetAudience: z.string().trim().max(100).optional(),
  instructions: z.string().trim().max(500).optional(),
  preferredProviderId: z.string().optional(),
  targetLanguage: z.string().trim().max(50).optional(),
  sourceLanguage: z.string().trim().max(50).optional(),
  targetPassage: z.string().trim().max(5000).optional(),
  styleFinding: z.string().trim().max(300).optional(),
});

export type ContentImprovementInput = z.infer<typeof contentImprovementSchema>;
