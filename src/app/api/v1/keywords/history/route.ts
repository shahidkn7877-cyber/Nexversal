import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/user-guard';
import { keywordResearchRepository } from '@/repositories/keyword-research.repository';
import { sanitizeApiError } from '@/lib/security/error-sanitizer';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) {
      return auth.response;
    }
    const user = auth.user;

    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const history = await keywordResearchRepository.getByUserId(user.id, limit);
    const total = await keywordResearchRepository.count(user.id);

    return NextResponse.json({
      success: true,
      data: {
        history,
        total,
      },
    });
  } catch (err: unknown) {
    const sanitized = sanitizeApiError(err, 'keywords');
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
