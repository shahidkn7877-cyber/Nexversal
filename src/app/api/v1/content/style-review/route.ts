import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { styleReviewService } from '@/services/style-review.service';

const styleReviewInputSchema = z.object({
  content: z.string().trim().min(1, 'Article content cannot be empty'),
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

    const parseResult = styleReviewInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.issues[0]?.message || 'Invalid input payload.',
          },
        },
        { status: 400 }
      );
    }

    const reviewResult = styleReviewService.analyzeStyle(parseResult.data.content);

    return NextResponse.json({
      success: true,
      data: reviewResult,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Unable to analyze writing style at this time.',
        },
      },
      { status: 500 }
    );
  }
}

