import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validation/auth.schema';
import { userRepository } from '@/repositories/user.repository';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, SESSION_COOKIE_NAME, SESSION_DURATION_DAYS, toSafeUser } from '@/lib/auth/session';
import { ADMIN_COOKIE_NAME, getAdminSecret } from '@/lib/auth/admin-guard';
import { activityService } from '@/services/activity/activity.service';
import { adminBootstrapService } from '@/services/auth/admin-bootstrap.service';
import { getClientIp, checkLoginRateLimit } from '@/lib/security/auth-rate-limit';
import { isDatabaseConfigured } from '@/lib/db';
import { sanitizeApiError } from '@/lib/security/error-sanitizer';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    let body;
    try {
      body = await req.json();
    } catch {
      const rateLimit = checkLoginRateLimit(ip);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many login attempts. Please try again later.',
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
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Malformed JSON payload provided.',
          },
        },
        { status: 400 }
      );
    }

    const emailAttempt = typeof body?.email === 'string' ? body.email : undefined;
    const rateLimit = checkLoginRateLimit(ip, emailAttempt);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many login attempts. Please try again later.',
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

    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: issue ? issue.message : 'Invalid login credentials.',
          },
        },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Authentication service is temporarily unavailable. Please try again in a few moments.',
          },
        },
        { status: 503 }
      );
    }

    // Check if configured ADMIN user needs bootstrapping before authentication
    const configuredAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    if (configuredAdminEmail && normalizedEmail === configuredAdminEmail) {
      await adminBootstrapService.bootstrapAdmin();
    }

    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
          },
        },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
          },
        },
        { status: 401 }
      );
    }

    const safeUser = toSafeUser(user);
    const { token } = await createSession(user.id);

    activityService.recordEvent({
      type: user.role === 'ADMIN' ? 'ADMIN_LOGIN' : 'USER_LOGIN',
      userId: user.id,
      summary: `User logged in: ${user.email} (${user.role})`,
      metadata: {
        role: user.role,
        email: user.email,
      },
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: safeUser,
        message: 'Signed in successfully.',
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * SESSION_DURATION_DAYS,
    });

    if (user.role === 'ADMIN') {
      response.cookies.set({
        name: ADMIN_COOKIE_NAME,
        value: getAdminSecret(),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 12,
      });
    }

    return response;
  } catch (err: unknown) {
    const sanitized = sanitizeApiError(err, 'auth');
    return NextResponse.json(
      {
        success: false,
        error: {
          code: sanitized.code,
          message: sanitized.message,
        },
      },
      { status: sanitized.status }
    );
  }
}