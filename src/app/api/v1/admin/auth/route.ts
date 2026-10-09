import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminSecret,
  verifyAdminAuthAsync,
  ADMIN_COOKIE_NAME,
} from '@/lib/auth/admin-guard';
import { getClientIp, checkAdminAuthRateLimit } from '@/lib/security/auth-rate-limit';

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAuthAsync(req);
  return NextResponse.json({
    success: true,
    data: {
      authenticated: auth.authorized,
      user: auth.user || null,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkAdminAuthRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many administrative authentication attempts. Please try again later.',
            retryAfter: rateLimit.resetInSeconds,
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetInSeconds),
          },
        }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload.' },
        { status: 400 }
      );
    }

    const { adminKey } = body;
    const secret = getAdminSecret();

    if (!adminKey || typeof adminKey !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Admin security key is required.' },
        { status: 400 }
      );
    }

    if (adminKey.trim() !== secret) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin credentials provided.' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Admin session authenticated successfully.',
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: secret,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal authentication error.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: 'Admin session terminated successfully.',
  });

  response.cookies.delete(ADMIN_COOKIE_NAME);
  return response;
}
