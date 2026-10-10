import { NextRequest, NextResponse } from 'next/server';
import { auditRepository } from '@/repositories/audit.repository';
import { requireUser } from '@/lib/auth/user-guard';
import { sanitizeApiError } from '@/lib/security/error-sanitizer';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) {
      return auth.response;
    }
    const user = auth.user;

    const { searchParams } = new URL(req.url);
    const limitParam = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Math.max(1, Math.min(100, isNaN(limitParam) ? 20 : limitParam));

    const audits = await auditRepository.getByUserIdAsync(user.id, limit);
    const totalCount = await auditRepository.countAsync(user.id);
    const avgScore = await auditRepository.getAverageScoreAsync(user.id);

    return NextResponse.json({
      success: true,
      data: {
        audits,
        total: totalCount,
        averageScore: avgScore,
      },
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
