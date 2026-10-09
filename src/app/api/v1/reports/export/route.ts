import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/user-guard';
import { auditRepository } from '@/repositories/audit.repository';
import { activityService } from '@/services/activity/activity.service';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) {
      return auth.response;
    }
    const user = auth.user;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // optional
    }

    if (body.auditId) {
      const audit = await auditRepository.findByIdAsync(body.auditId, user.id);
      if (!audit) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Audit record not found or access denied.',
            },
          },
          { status: 404 }
        );
      }
    }

    const format = body.format === 'json' ? 'JSON' : 'HTML';
    const targetUrl = typeof body.url === 'string' ? body.url : 'Audit Report';

    activityService.recordEvent({
      type: 'REPORT_EXPORTED',
      userId: user.id,
      summary: 'SEO Audit Report exported in ' + format + ' format',
      metadata: {
        format,
        targetUrl,
        auditId: body.auditId || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Report export logged.',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not log report export.' },
      { status: 500 }
    );
  }
}
