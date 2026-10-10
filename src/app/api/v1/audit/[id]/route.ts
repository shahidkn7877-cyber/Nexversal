import { NextRequest, NextResponse } from 'next/server';
import { auditRepository } from '@/repositories/audit.repository';
import { requireUser } from '@/lib/auth/user-guard';
import { sanitizeApiError } from '@/lib/security/error-sanitizer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) {
      return auth.response;
    }
    const user = auth.user;

    const { id } = await params;
    const audit = await auditRepository.findByIdAsync(id, user.id);
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) {
      return auth.response;
    }
    const user = auth.user;

    const { id } = await params;
    const deleted = await auditRepository.deleteByIdAsync(id, user.id);
    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DELETE_FAILED',
            message: 'Audit not found or could not be deleted.',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Audit successfully deleted.',
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
