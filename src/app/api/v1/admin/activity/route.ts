import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { activityService } from '@/services/activity/activity.service';
import { ActivityEventType } from '@/types/activity';

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const typeFilter = searchParams.get('type') as ActivityEventType | null;

    const activities = activityService.getRecentPlatformActivity(
      limit,
      typeFilter || undefined
    );
    const stats = activityService.getActivityStats();

    return NextResponse.json({
      success: true,
      data: {
        activities,
        total: activities.length,
        stats,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ACTIVITY_LOG_ERROR',
          message: 'Activity log data could not be retrieved.',
        },
      },
      { status: 500 }
    );
  }
}
