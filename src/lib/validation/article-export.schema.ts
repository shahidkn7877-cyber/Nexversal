import { z } from 'zod';

export const articleExportSchema = z.object({
  title: z.string().max(300).optional().default('Untitled Article'),
  content: z
    .string()
    .trim()
    .min(1, 'Article content cannot be empty.')
    .max(2_000_000, 'Article content exceeds maximum permitted size (2MB).'),
  format: z.enum(['pdf', 'docx']),
  focusKeyword: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
});

export type ArticleExportInput = z.infer<typeof articleExportSchema>;

