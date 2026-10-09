import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters'),
  name: z.string().trim().max(100).optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateSettingsSchema = z.object({
  editorDialect: z.enum(['en-US', 'en-GB']).optional(),
  targetWordCount: z.string().max(20).optional(),
  defaultDevice: z.enum(['desktop', 'mobile']).optional(),
  autoSlug: z.boolean().optional(),
});