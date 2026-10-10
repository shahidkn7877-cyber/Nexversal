import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/user-guard';
import { auditRepository } from '@/repositories/audit.repository';
import { verifyAuditContinuationToken } from '@/lib/security/audit-continuation';
import { activityService } from '@/services/activity/activity.service';
import { DEFAULT_USER_ID } from '@/lib/auth/user-session';
import { sanitizeApiError } from '@/lib/security/error-sanitizer';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) {
      return auth.response;
    }
    const user = auth.user;

    let body: any;
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

    const { auditId, token } = body || {};

    if (!auditId || typeof auditId !== 'string' || !token || typeof token !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Both auditId and continuation token are required.',
          },
        },
        { status: 400 }
      );
    }

    // Verify HMAC signature, expiration, and target audit ID
    const verification = verifyAuditContinuationToken(token, auditId);
    if (!verification.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_OR_EXPIRED_TOKEN',
            message:
              verification.reason === 'Token has expired'
                ? 'This audit continuation token has expired. Please run a new audit.'
                : 'Invalid or tampered audit continuation token.',
          },
        },
        { status: 400 }
      );
    }

    const audit = await auditRepository.findByIdAsync(auditId);
    if (!audit) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Audit record not found.',
          },
        },
        { status: 404 }
      );
    }

    // Strict Anti-IDOR enforcement: verify audit is not claimed by another user
    if (
      audit.userId &&
      audit.userId !== user.id &&
      audit.userId !== DEFAULT_USER_ID
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'This audit record already belongs to another user account.',
          },
        },
        { status: 403 }
      );
    }

    // Bind audit to authenticated user
    audit.userId = user.id;
    await auditRepository.saveAsync(audit);

    activityService.recordEvent({
      type: 'AUDIT_CREATED',
      userId: user.id,
      summary: `SEO Audit claimed by ${user.email} for ${audit.url}`,
      metadata: {
        auditId: audit.id,
        url: audit.url,
        score: audit.score,
      },
    });

    return NextResponse.json({
      success: true,
      data: audit,
    });
  } catch (err: unknown) {
    const sanitized = sanitizeApiError(err, 'audit');
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
