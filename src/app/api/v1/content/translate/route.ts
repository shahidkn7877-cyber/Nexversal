import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { contentImprovementService } from '@/services/content-improvement.service';
import { getUserIdFromRequest } from '@/lib/auth/user-session';
import { activityService } from '@/services/activity/activity.service';

const translateInputSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Article content cannot be empty')
    .max(100000, 'Content must be under 100,000 characters'),
  targetLanguage: z.string().trim().min(1, 'Target language is required').max(50),
  sourceLanguage: z.string().trim().max(50).optional(),
  focusKeyword: z.string().trim().max(100).optional(),
});

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
            message: 'Malformed JSON payload provided.',
          },
        },
        { status: 400 }
      );
    }

    const parseResult = translateInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.issues[0]?.message || 'Invalid translation request payload.',
          },
        },
        { status: 400 }
      );
    }

    const response = await contentImprovementService.improveContent({
      content: parseResult.data.content,
      action: 'translate',
      targetLanguage: parseResult.data.targetLanguage,
      sourceLanguage: parseResult.data.sourceLanguage,
      focusKeyword: parseResult.data.focusKeyword,
    });

    const userId = getUserIdFromRequest(req);
    activityService.recordEvent({
      type: 'AI_IMPROVEMENT_REQUESTED',
      userId,
      summary: `Article translation requested (Target: ${parseResult.data.targetLanguage})`,
      metadata: {
        action: 'translate',
        targetLanguage: parseResult.data.targetLanguage,
        providerSuccess: response.success,
      },
    });

    if (!response.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AI_UNAVAILABLE',
            message: 'AI improvements are currently unavailable.',
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

