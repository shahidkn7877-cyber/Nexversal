import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/user-guard';
import { userDashboardService } from '@/services/dashboard/user-dashboard.service';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) {
      return auth.response;
    }
    const user = auth.user;
    const data = await userDashboardService.getDashboardData(user.id);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DASHBOARD_UNAVAILABLE',
          message: 'Dashboard data is temporarily unavailable.',
        },
      },
      { status: 500 }
    );
  }
}