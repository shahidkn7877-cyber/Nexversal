import { z } from 'zod';

export const auditInputSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'Website URL is required')
    .url('Please provide a valid website URL with http:// or https://')
    .refine((val) => {
      try {
        const parsed = new URL(val);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    }, 'URL must use http:// or https:// protocol'),
  targetKeyword: z.string().trim().max(100, 'Target keyword must be under 100 characters').optional().default(''),
  crawlMultiPage: z.boolean().optional().default(false),
  maxPages: z.number().int().min(1).max(25).optional().default(5),
  crawlDepth: z.number().int().min(1).max(3).optional().default(2),
});

export type AuditInput = z.infer<typeof auditInputSchema>;
