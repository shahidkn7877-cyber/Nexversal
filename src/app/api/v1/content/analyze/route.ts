import { NextRequest, NextResponse } from 'next/server';
import { contentAnalyzeSchema } from '@/lib/validation/content.schema';
import { contentAnalyzerService } from '@/services/content-analyzer.service';
import { activityService } from '@/services/activity/activity.service';
import { getUserIdFromRequest } from '@/lib/auth/user-session';

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 2 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: 'Request payload exceeds maximum allowed size of 2MB.',
          },
        },
        { status: 413 }
      );
    }

    const rawText = await req.text();
    if (rawText.length > 2 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: 'Request payload exceeds maximum allowed size of 2MB.',
          },
        },
        { status: 413 }
      );
    }

    let body;
    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Malformed JSON in request body.',
          },
        },
        { status: 400 }
      );
    }

    const parseResult = contentAnalyzeSchema.safeParse(body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: issue ? issue.message : 'Invalid content analyze input.',
            details: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const result = contentAnalyzerService.analyze(parseResult.data);

    const userId = getUserIdFromRequest(req);
    activityService.recordEvent({
      type: 'CONTENT_ANALYSIS',
      userId,
      summary: 'Content analysis evaluated (Score: ' + result.score + '/100, ' + result.metrics.wordCount + ' words)',
      metadata: {
        score: result.score,
        wordCount: result.metrics.wordCount,
        keywordDensity: result.metrics.keywordDensity,
        passedRules: result.issuesSummary.passed,
        hasTargetKeyword: !!parseResult.data.focusKeyword,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Content analysis failed unexpectedly.';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ANALYSIS_ERROR',
          message: errorMsg,
        },
      },
      { status: 500 }
    );
  }
}
