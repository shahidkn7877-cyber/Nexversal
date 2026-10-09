import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, getSession } from './session';
import { getCurrentUser } from './user-guard';

export const ADMIN_COOKIE_NAME = 'seo_admin_session';
export const DEFAULT_ADMIN_SECRET = 'seo_admin_vault_secret_2026';

/**
 * Retrieves the server-side master admin secret.
 * Used exclusively on the server as a development/bootstrap override.
 * In production, set ADMIN_SECRET_KEY in server environment variables.
 */
export function getAdminSecret(): string {
  return process.env.ADMIN_SECRET_KEY || process.env.ADMIN_KEY || DEFAULT_ADMIN_SECRET;
}

export interface AdminAuthResult {
  authorized: boolean;
  user?: {
    username: string;
    role: 'admin';
  };
  forbidden?: boolean;
  error?: string;
}

/**
 * Synchronous verification for master credentials (x-admin-key header / bearer token / admin cookie).
 */
export function verifyAdminAuth(req?: NextRequest | Request): AdminAuthResult {
  const secret = getAdminSecret();

  if (req) {
    const adminKeyHeader = req.headers.get('x-admin-key');
    if (adminKeyHeader && adminKeyHeader === secret) {
      return { authorized: true, user: { username: 'admin', role: 'admin' } };
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token === secret) {
        return { authorized: true, user: { username: 'admin', role: 'admin' } };
      }
    }

    if ('cookies' in req && (req as any).cookies) {
      const cookieVal = (req as any).cookies.get(ADMIN_COOKIE_NAME)?.value;
      if (cookieVal && cookieVal === secret) {
        return { authorized: true, user: { username: 'admin', role: 'admin' } };
      }
    }

    const rawCookie = req.headers.get('cookie');
    if (rawCookie) {
      const match = rawCookie.match(new RegExp('(?:^|; )' + ADMIN_COOKIE_NAME + '=([^;]*)'));
      if (match && match[1] && decodeURIComponent(match[1]) === secret) {
        return { authorized: true, user: { username: 'admin', role: 'admin' } };
      }
    }
  }

  return {
    authorized: false,
    error: 'Unauthorized: Valid administrator credentials are required.',
  };
}

/**
 * Primary authorization path for production admin APIs.
 * 1. Primary: Checks persistent user session in DB for role === 'ADMIN'.
 *    If user has role === 'USER', access is strictly forbidden.
 * 2. Secondary/Bootstrap: Checks master credentials as fallback.
 */
export async function verifyAdminAuthAsync(req?: NextRequest | Request): Promise<AdminAuthResult> {
  if (req) {
    const user = await getCurrentUser(req);
    if (user) {
      if (user.role === 'ADMIN') {
        return {
          authorized: true,
          user: {
            username: user.email,
            role: 'admin',
          },
        };
      } else {
        return {
          authorized: false,
          forbidden: true,
          error: 'Forbidden: Standard USER accounts do not have administrator permissions.',
        };
      }
    }
  }

  return verifyAdminAuth(req);
}

/**
 * Guard for Next.js API route handlers.
 * Enforces server-side administrator authorization.
 */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const result = await verifyAdminAuthAsync(req);
  if (!result.authorized) {
    const isForbidden = result.forbidden || (result.error && result.error.startsWith('Forbidden'));
    return NextResponse.json(
      {
        success: false,
        error: {
          code: isForbidden ? 'FORBIDDEN_ADMIN_ACCESS' : 'UNAUTHORIZED_ADMIN_ACCESS',
          message: result.error || 'Unauthorized: Admin privileges required to access this resource.',
        },
      },
      { status: isForbidden ? 403 : 401 }
    );
  }
  return null;
}

/**
 * Server Component guard for Next.js App Router (/admin, /admin/*).
 * Validates persistent ADMIN user session as primary path, master secret cookie as fallback.
 */
export async function checkAdminServerComponent(): Promise<boolean> {
  try {
    const cookieStore = await cookies();

    // 1. Primary: Check persistent user session in database
    const userSessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (userSessionCookie && userSessionCookie.value) {
      const session = await getSession(userSessionCookie.value);
      if (session) {
        return session.user.role === 'ADMIN';
      }
    }

    // 2. Secondary / Bootstrap: Master admin secret session cookie
    const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME);
    const secret = getAdminSecret();
    if (sessionCookie && sessionCookie.value === secret) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}