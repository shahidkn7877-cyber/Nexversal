/**
 * Centralized Error Sanitizer for Nexversal.
 *
 * Protects users and security posture by intercepting internal system errors,
 * database connection failures, Prisma query internals, and stack traces.
 * Transforms technical errors into clean, professional, context-relevant messages.
 */

export type ErrorContext =
  | 'auth'
  | 'register'
  | 'audit'
  | 'keywords'
  | 'content'
  | 'reports'
  | 'admin'
  | 'settings'
  | 'general';

interface SanitizedErrorResult {
  code: string;
  message: string;
  status: number;
}

const TECHNICAL_PATTERNS = [
  'prisma',
  'database_url',
  'database',
  'postgres',
  'postgresql',
  'findunique',
  'findmany',
  'findfirst',
  'create',
  'update',
  'delete',
  'upsert',
  'schema.prisma',
  'econnrefused',
  'etimedout',
  'econnreset',
  'p1000',
  'p1001',
  'p1002',
  'p1003',
  'p2000',
  'p2002',
  'p2025',
  'validation error count',
  'invocation',
  'foreign key',
  'unique constraint',
  'sqlite',
  'sql',
  'queryraw',
  'syntax error',
  'prepared statement',
];

const RELEVANT_UNAVAILABLE_MESSAGES: Record<ErrorContext, string> = {
  auth: 'Authentication service is temporarily unavailable. Please try again in a few moments.',
  register: 'Registration service is temporarily unavailable. Please try again in a few moments.',
  audit: 'Audit service is temporarily unavailable. Please try again shortly.',
  keywords: 'Keyword research service is temporarily unavailable. Please try again shortly.',
  content: 'Content analysis service is temporarily unavailable. Please try again shortly.',
  reports: 'Reporting service is temporarily unavailable. Please try again shortly.',
  admin: 'Administrative service is temporarily unavailable. Please try again shortly.',
  settings: 'Settings service is temporarily unavailable. Please try again shortly.',
  general: 'Service is temporarily unavailable. Please try again in a few moments.',
};

/**
 * Checks whether an error message exposes internal infrastructure or technical code details.
 */
export function isTechnicalError(message: string): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return TECHNICAL_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Transforms an uncaught exception or error into a sanitized, user-friendly response.
 */
export function sanitizeApiError(
  err: unknown,
  context: ErrorContext = 'general',
  defaultFallback?: string
): SanitizedErrorResult {
  // Always log the full technical error to server console for developer observability
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Nexversal API Error - ${context.toUpperCase()}]:`, err);
  }

  const rawMessage = err instanceof Error ? err.message : typeof err === 'string' ? err : '';

  // Check if it's a technical database, Prisma, or server exception
  if (!rawMessage || isTechnicalError(rawMessage)) {
    return {
      code: 'SERVICE_UNAVAILABLE',
      message: RELEVANT_UNAVAILABLE_MESSAGES[context] || RELEVANT_UNAVAILABLE_MESSAGES.general,
      status: 503,
    };
  }

  // Safe user-friendly business logic errors (e.g., validation rules, user not found)
  // Ensure multiline stack traces or JSON payloads are filtered out
  const isSuspicious = rawMessage.includes('\n') || rawMessage.includes('{') || rawMessage.length > 120;
  if (isSuspicious) {
    return {
      code: 'REQUEST_FAILED',
      message: defaultFallback || RELEVANT_UNAVAILABLE_MESSAGES[context],
      status: 500,
    };
  }

  return {
    code: 'BAD_REQUEST',
    message: rawMessage,
    status: 400,
  };
}

/**
 * Client-side sanitization helper for UI components.
 * Ensures that if any raw technical string arrives from any network payload,
 * it is cleanly masked before rendering to end users.
 */
export function sanitizeClientMessage(message?: string | null, context: ErrorContext = 'general'): string {
  if (!message || typeof message !== 'string') {
    return RELEVANT_UNAVAILABLE_MESSAGES[context];
  }

  if (isTechnicalError(message) || message.includes('\n') || message.includes('{') || message.length > 120) {
    return RELEVANT_UNAVAILABLE_MESSAGES[context];
  }

  return message;
}

