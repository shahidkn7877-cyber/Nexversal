import { z } from 'zod';

export const ContentTypeEnum = z.enum([
  'article',
  'blog_post',
  'landing_page',
  'guide',
  'product_page',
]);

export const SearchIntentEnum = z.enum([
  'informational',
  'commercial',
  'transactional',
  'navigational',
]);

export const contentAnalyzeSchema = z
  .object({
    content: z
      .string()
      .min(1, 'Content cannot be empty')
      .max(500000, 'Content exceeds maximum size limit of 500,000 characters'),
    focusKeyword: z.string().trim().max(200, 'Target keyword must be 200 characters or fewer').optional(),
    targetKeyword: z.string().trim().max(200, 'Target keyword must be 200 characters or fewer').optional(),
    secondaryKeywords: z
      .union([z.array(z.string()), z.string()])
      .optional()
      .transform((val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        return val.split(',').map((s) => s.trim()).filter(Boolean);
      })
      .default([]),
    title: z.string().trim().max(300, 'Title must be 300 characters or fewer').optional().default(''),
    metaTitle: z.string().trim().max(300, 'Meta title must be 300 characters or fewer').optional().default(''),
    metaDescription: z.string().trim().max(500, 'Meta description must be 500 characters or fewer').optional().default(''),
    slug: z.string().trim().max(200, 'Slug must be 200 characters or fewer').optional().default(''),
    url: z.string().trim().max(500, 'URL must be 500 characters or fewer').optional().default(''),
    language: z.string().default('en-US'),
    contentType: ContentTypeEnum.optional(),
    searchIntent: SearchIntentEnum.optional(),
  })
  .superRefine((data, ctx) => {
    const kw = (data.focusKeyword || data.targetKeyword || '').trim();
    if (!kw) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Target keyword is required',
        path: ['focusKeyword'],
      });
    }
  })
  .transform((data) => {
    const kw = (data.focusKeyword || data.targetKeyword || '').trim();
    return {
      ...data,
      focusKeyword: kw,
      targetKeyword: kw,
    };
  });

export type ContentAnalyzeInput = z.infer<typeof contentAnalyzeSchema>;
export type ContentAnalyzeParams = z.input<typeof contentAnalyzeSchema>;
