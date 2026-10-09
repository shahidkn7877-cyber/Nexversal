import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, SafeUser, getSession } from './session';

export function getTokenFromRequest(req?: NextRequest | Request): string | null {
  if (!req) return null;

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }

  if ('cookies' in req && (req as NextRequest).cookies) {
    const cookie = (req as NextRequest).cookies.get(SESSION_COOKIE_NAME)?.value;
    if (cookie && cookie.trim()) return cookie.trim();
  }

  const rawCookie = req.headers.get('cookie');
  if (rawCookie) {
    const match = rawCookie.match(new RegExp('(?:^|; )' + SESSION_COOKIE_NAME + '=([^;]*)'));
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

export async function getCurrentUser(req?: NextRequest | Request): Promise<SafeUser | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  const session = await getSession(token);
  return session?.user ?? null;
}

export async function getCurrentUserServer(): Promise<SafeUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    const session = await getSession(token);
    return session?.user ?? null;
  } catch {
    return null;
  }
}

export async function requireUser(
  req: NextRequest
): Promise<{ user: SafeUser } | { response: NextResponse }> {
  const user = await getCurrentUser(req);
  if (!user) {
    return {
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be signed in to perform this action.',
          },
        },
        { status: 401 }
      ),
    };
  }
  return { user };
}