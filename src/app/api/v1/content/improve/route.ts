import { activityService } from '@/services/activity/activity.service';
import { getUserIdFromRequest } from '@/lib/auth/user-session';
import { NextRequest, NextResponse } from 'next/server';
import { contentImprovementSchema } from '@/lib/validation/ai-improvement.schema';
import { contentImprovementService } from '@/services/content-improvement.service';

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

    const parseResult = contentImprovementSchema.safeParse(body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: issue ? issue.message : 'Invalid content improvement request.',
            details: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const response = await contentImprovementService.improveContent(parseResult.data);
    const userId = getUserIdFromRequest(req);
    activityService.recordEvent({
      type: 'AI_IMPROVEMENT_REQUESTED',
      userId,
      summary: 'AI content improvement requested (' + parseResult.data.action + ')',
      metadata: {
        action: parseResult.data.action,
        desiredTone: parseResult.data.desiredTone || 'conversational',
        providerSuccess: response.success,
      },
    });

    if (!response.success) {
      return NextResponse.json(
        {
          success: false,
          data: {
            success: false,
            action: response.action,
          },
          error: {
            code: response.error?.code || 'AI_UNAVAILABLE',
            message: response.error?.message || 'AI improvements are currently unavailable.',
            requiresConfiguration: response.error?.requiresConfiguration ?? false,
            configuredProviders: response.error?.configuredProviders ?? [],
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'AI improvements are currently unavailable.',
        },
      },
      { status: 500 }
    );
  }
}
