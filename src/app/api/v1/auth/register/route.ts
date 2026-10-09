import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validation/auth.schema';
import { userRepository } from '@/repositories/user.repository';
import { hashPassword } from '@/lib/auth/password';
import { createSession, SESSION_COOKIE_NAME, SESSION_DURATION_DAYS } from '@/lib/auth/session';
import { ADMIN_COOKIE_NAME, getAdminSecret } from '@/lib/auth/admin-guard';
import { activityService } from '@/services/activity/activity.service';
import { getClientIp, checkRegisterRateLimit } from '@/lib/security/auth-rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRegisterRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many registration attempts. Please try again later.',
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

    const parseResult = registerSchema.safeParse(body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: issue ? issue.message : 'Invalid registration input.',
            details: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { email, password, name } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'An account with this email address already exists. Please sign in instead.',
          },
        },
        { status: 400 }
      );
    }

    // Role assignment: first registered user becomes ADMIN, subsequent users are USER
    const totalUsers = await userRepository.count();
    const role: 'USER' | 'ADMIN' = totalUsers === 0 ? 'ADMIN' : 'USER';

    const passwordHash = hashPassword(password);
    const user = await userRepository.create({
      email: normalizedEmail,
      passwordHash,
      name: name || null,
      role,
    });

    const { token } = await createSession(user.id);

    // Record activity
    activityService.recordEvent({
      type: 'USER_LOGIN',
      userId: user.id,
      summary: `New account created and signed in: ${user.email}`,
      metadata: {
        role: user.role,
        email: user.email,
      },
    });

    const response = NextResponse.json(
      {
        success: true,
        data: {
          user,
          message: 'Account created successfully.',
        },
      },
      { status: 201 }
    );

    // Set user session cookie (HttpOnly)
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * SESSION_DURATION_DAYS,
    });

    // If initial admin user, also provide admin session cookie
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
    const errorMsg = err instanceof Error ? err.message : 'Registration failed due to a server error.';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REGISTRATION_ERROR',
          message: errorMsg,
        },
      },
      { status: 500 }
    );
  }
}