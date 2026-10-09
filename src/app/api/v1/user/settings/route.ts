import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/user-guard';
import { settingsRepository } from '@/repositories/settings.repository';
import { updateSettingsSchema } from '@/lib/validation/auth.schema';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) {
      return auth.response;
    }
    const user = auth.user;

    const settings = await settingsRepository.findByUserId(user.id);
    return NextResponse.json({
      success: true,
      data: {
        settings: settings
          ? {
              editorDialect: settings.editorDialect,
              targetWordCount: settings.targetWordCount,
              defaultDevice: settings.defaultDevice,
              autoSlug: settings.autoSlug,
            }
          : null,
        user: {
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SETTINGS_FETCH_ERROR',
          message: 'Failed to retrieve user settings.',
        },
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if ('response' in auth) {
      return auth.response;
    }
    const user = auth.user;

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Malformed JSON payload.',
          },
        },
        { status: 400 }
      );
    }

    const parseResult = updateSettingsSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid settings input.',
            details: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const updated = await settingsRepository.upsert(user.id, parseResult.data);

    return NextResponse.json({
      success: true,
      data: {
        settings: {
          editorDialect: updated.editorDialect,
          targetWordCount: updated.targetWordCount,
          defaultDevice: updated.defaultDevice,
          autoSlug: updated.autoSlug,
        },
        message: 'Settings updated successfully.',
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SETTINGS_UPDATE_ERROR',
          message: 'Failed to update user settings.',
        },
      },
      { status: 500 }
    );
  }
}