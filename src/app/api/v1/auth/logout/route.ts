import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest } from '@/lib/auth/user-guard';
import { deleteSession, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { ADMIN_COOKIE_NAME } from '@/lib/auth/admin-guard';

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (token) {
      await deleteSession(token);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully.',
    });

    response.cookies.delete(SESSION_COOKIE_NAME);
    response.cookies.delete(ADMIN_COOKIE_NAME);

    return response;
  } catch {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully.',
    });

    response.cookies.delete(SESSION_COOKIE_NAME);
    response.cookies.delete(ADMIN_COOKIE_NAME);

    return response;
  }
}