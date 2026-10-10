import { describe, it, expect } from 'vitest';
import { sanitizeApiError, sanitizeClientMessage, isTechnicalError } from '@/lib/security/error-sanitizer';

describe('Error Sanitizer Module', () => {
  it('detects technical database and prisma errors', () => {
    expect(isTechnicalError('Invalid prisma.user.findUnique() invocation')).toBe(true);
    expect(isTechnicalError('Environment variable not found: DATABASE_URL.')).toBe(true);
    expect(isTechnicalError('Can not reach database server at postgres://localhost')).toBe(true);
    expect(isTechnicalError('Invalid email or password.')).toBe(false);
  });

  it('masks auth technical errors with a relevant user message', () => {
    const error = new Error('Invalid `prisma.user.findUnique()` invocation: error: Environment variable not found: DATABASE_URL.');
    const result = sanitizeApiError(error, 'auth');

    expect(result.status).toBe(503);
    expect(result.code).toBe('SERVICE_UNAVAILABLE');
    expect(result.message).toBe('Authentication service is temporarily unavailable. Please try again in a few moments.');
    expect(result.message).not.toContain('prisma');
    expect(result.message).not.toContain('DATABASE_URL');
  });

  it('masks register technical errors with context-relevant message', () => {
    const error = new Error('PrismaClientKnownRequestError: P2002 Unique constraint failed');
    const result = sanitizeApiError(error, 'register');

    expect(result.status).toBe(503);
    expect(result.code).toBe('SERVICE_UNAVAILABLE');
    expect(result.message).toBe('Registration service is temporarily unavailable. Please try again in a few moments.');
  });

  it('masks audit and keywords technical errors with context-relevant messages', () => {
    const auditErr = sanitizeApiError(new Error('Connection to database refused'), 'audit');
    expect(auditErr.message).toBe('Audit service is temporarily unavailable. Please try again shortly.');

    const keywordErr = sanitizeApiError(new Error('PostgreSQL timeout'), 'keywords');
    expect(keywordErr.message).toBe('Keyword research service is temporarily unavailable. Please try again shortly.');
  });

  it('preserves clean user-facing validation errors', () => {
    const result = sanitizeApiError(new Error('Invalid email or password.'), 'auth');
    expect(result.status).toBe(400);
    expect(result.message).toBe('Invalid email or password.');
  });

  it('sanitizes client-side messages safely', () => {
    const masked = sanitizeClientMessage(
      'Invalid prisma.user.findUnique() invocation: error: Environment variable not found: DATABASE_URL.',
      'auth'
    );
    expect(masked).toBe('Authentication service is temporarily unavailable. Please try again in a few moments.');

    const clean = sanitizeClientMessage('Invalid email or password.', 'auth');
    expect(clean).toBe('Invalid email or password.');
  });
});

