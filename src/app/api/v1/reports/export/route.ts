import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/user-guard';
import { auditRepository } from '@/repositories/audit.repository';
import { activityService } from '@/services/activity/activity.service';
import { reportGeneratorService } from '@/services/report/report-generator.service';
import { sanitizeApiError } from '@/lib/security/error-sanitizer';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) {
      return auth.response;
    }
    const user = auth.user;

    const { searchParams } = new URL(req.url);
    const auditId = searchParams.get('auditId');
    const format = (searchParams.get('format') || 'html').toLowerCase();

    if (!auditId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'auditId parameter is required.',
          },
        },
        { status: 400 }
      );
    }

    if (format !== 'html' && format !== 'json') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Supported export formats are "html" and "json".',
          },
        },
        { status: 400 }
      );
    }

    // Strict Anti-IDOR check: user can only export audits belonging to them
    const audit = await auditRepository.findByIdAsync(auditId, user.id);
    if (!audit || (audit.userId && audit.userId !== user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Audit report not found or access denied.',
          },
        },
        { status: 404 }
      );
    }

    activityService.recordEvent({
      type: 'REPORT_EXPORTED',
      userId: user.id,
      summary: `SEO Audit Report exported in ${format.toUpperCase()} format for ${audit.url}`,
      metadata: {
        format,
        targetUrl: audit.url,
        auditId: audit.id,
      },
    });

    if (format === 'json') {
      return new NextResponse(JSON.stringify(audit, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="seo-audit-${audit.id}.json"`,
        },
      });
    }

    // HTML format
    const html = reportGeneratorService.generateHtmlReport(audit);
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="seo-audit-${audit.id}.html"`,
      },
    });
  } catch (err: unknown) {
    const sanitized = sanitizeApiError(err, 'reports');
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
      if (!audit || (audit.userId && audit.userId !== user.id)) {
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
