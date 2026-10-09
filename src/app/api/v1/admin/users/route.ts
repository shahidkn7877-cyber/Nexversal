import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { userRepository } from '@/repositories/user.repository';

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const users = await userRepository.findAll(100);
    const totalUsers = await userRepository.count();

    return NextResponse.json({
      success: true,
      data: {
        users,
        totalUsers,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'USERS_FETCH_ERROR',
          message: 'Failed to retrieve platform users.',
        },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_JSON', message: 'Malformed JSON payload.' } },
        { status: 400 }
      );
    }

    const { userId, role } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'User ID is required.' } },
        { status: 400 }
      );
    }

    if (role !== 'USER' && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ROLE', message: 'Role must be either USER or ADMIN.' } },
        { status: 400 }
      );
    }

    const updated = await userRepository.updateRole(userId, role);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'User could not be found.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: updated,
        message: `User role updated to ${role} successfully.`,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ROLE_UPDATE_ERROR',
          message: 'Failed to update user role.',
        },
      },
      { status: 500 }
    );
  }
}