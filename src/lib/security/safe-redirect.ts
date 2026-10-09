/**
 * Safe redirect URL validation and sanitization.
 * Prevents open-redirect vulnerabilities, protocol-relative bypasses,
 * backslash evasion, and unauthorized admin navigation.
 */
export function sanitizeRedirectUrl(
  target: string | null | undefined,
  userRole?: string
): string {
  if (!target || typeof target !== 'string') {
    return '/';
  }

  const trimmed = target.trim();

  // Must begin with a single slash '/'
  if (!trimmed.startsWith('/')) {
    return '/';
  }

  // Reject protocol-relative URLs (e.g. '//evil.com')
  if (trimmed.startsWith('//')) {
    return '/';
  }

  // Reject backslash escapes (e.g. '/\evil.com' which some browsers normalize to '//evil.com')
  if (trimmed.includes('\\')) {
    return '/';
  }

  // Reject CR, LF, or null byte injection
  if (/[\r\n\0]/.test(trimmed)) {
    return '/';
  }

  // Reject embedded schemes (e.g. '/javascript:...' or '/https:...')
  if (/^\/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return '/';
  }

  // Restrict admin destinations exclusively to authenticated ADMIN role
  if (trimmed.startsWith('/admin') && userRole !== 'ADMIN') {
    return '/';
  }

  return trimmed;
}

