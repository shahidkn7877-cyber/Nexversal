import { NextRequest } from 'next/server';

export const USER_COOKIE_NAME = 'seo_user_id';
export const DEFAULT_USER_ID = 'default_user';

/**
 * Returns the fallback user ID for unauthenticated guest requests.
 * Client-provided headers (such as `x-user-id`) and unauthenticated cookies
 * are strictly ignored to prevent client-side identity spoofing and IDOR.
 * Verified user identity must always come from cryptographically validated sessions.
 */
export function getUserIdFromRequest(_req?: NextRequest | Request): string {
  return DEFAULT_USER_ID;
}
