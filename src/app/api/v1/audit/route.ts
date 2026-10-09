import { NextRequest, NextResponse } from 'next/server';
import { auditInputSchema } from '@/lib/validation/audit.schema';
import { seoAuditService } from '@/services/audit.service';
import { auditRepository } from '@/repositories/audit.repository';
import { activityService } from '@/services/activity/activity.service';
import { getUserIdFromRequest, DEFAULT_USER_ID } from '@/lib/auth/user-session';
import { getCurrentUser } from '@/lib/auth/user-guard';

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Malformed JSON payload provided in request body.',
          },
        },
        { status: 400 }
      );
    }

    const parseResult = auditInputSchema.safeParse(body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: issue ? issue.message : 'Invalid audit input.',
            details: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { url, targetKeyword } = parseResult.data;
    const auditResult = await seoAuditService.auditUrl(url, targetKeyword);

    const user = await getCurrentUser(req);
    const userId = user?.id || getUserIdFromRequest(req);
    auditResult.userId = userId;
    await auditRepository.saveAsync(auditResult);

    let host = auditResult.url;
    try {
      host = new URL(auditResult.url).hostname;
    } catch {
      // ignore
    }

    activityService.recordEvent({
      type: 'AUDIT_CREATED',
      userId,
      summary: 'SEO Audit completed for ' + host + ' (Score: ' + auditResult.score + '/100)',
      metadata: {
        url: auditResult.url,
        score: auditResult.score,
        status: auditResult.status,
        targetKeyword: auditResult.targetKeyword || null,
        passedChecks: auditResult.passedCount,
        warningChecks: auditResult.warningCount,
        criticalChecks: auditResult.criticalCount,
      },
    });

    return NextResponse.json({
      success: true,
      data: auditResult,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred during audit execution.';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AUDIT_EXECUTION_ERROR',
          message: errorMsg,
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  const userId = user?.id || getUserIdFromRequest(req);
  const recent = await auditRepository.getByUserIdAsync(userId, 10);
  return NextResponse.json({
    success: true,
    data: {
      audits: recent,
      total: recent.length,
    },
  });
}