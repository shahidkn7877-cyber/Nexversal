import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/user-guard';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      data: {
        user,
      },
    });
  } catch {
    return NextResponse.json({
      success: false,
      authenticated: false,
      data: null,
    });
  }
}