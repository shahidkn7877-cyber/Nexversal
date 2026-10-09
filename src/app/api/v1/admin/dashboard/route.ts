import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { adminDashboardService } from '@/services/dashboard/admin-dashboard.service';

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const data = await adminDashboardService.getDashboardData();
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ADMIN_DASHBOARD_ERROR',
          message: 'Dashboard data could not be loaded.',
        },
      },
      { status: 500 }
    );
  }
}
