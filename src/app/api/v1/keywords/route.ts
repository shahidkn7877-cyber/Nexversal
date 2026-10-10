import { activityService } from '@/services/activity/activity.service';
import { getUserIdFromRequest } from '@/lib/auth/user-session';
import { NextRequest, NextResponse } from 'next/server';
import { keywordQuerySchema } from '@/lib/validation/keyword.schema';
import { keywordService } from '@/services/keyword.service';
import { sanitizeApiError } from '@/lib/security/error-sanitizer';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const country = searchParams.get('country') || 'US';

    const parseResult = keywordQuerySchema.safeParse({ query, country });
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          code: 'VALIDATION_ERROR',
          error: {
            code: 'VALIDATION_ERROR',
            message: issue ? issue.message : 'Invalid keyword query parameters.',
            details: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    if (!keywordService.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          code: 'KEYWORD_PROVIDER_NOT_CONFIGURED',
          error: {
            code: 'KEYWORD_PROVIDER_NOT_CONFIGURED',
            message:
              'Live keyword research is currently unavailable because the keyword provider is not configured.',
          },
          data: {
            query: parseResult.data.query,
            country: parseResult.data.country,
            provider: 'google-ads',
            totalResults: 0,
            averageDifficulty: 0,
            totalVolume: 0,
            averageCpc: 0,
            items: [],
            disclaimer:
              'No keyword metrics are being shown because displaying estimated or demo data as real data would be misleading.',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 200 }
      );
    }

    const data = await keywordService.getKeywords(parseResult.data.query, parseResult.data.country);
    const userId = getUserIdFromRequest(req);
    activityService.recordEvent({
      type: 'KEYWORD_RESEARCH',
      userId,
      summary: 'Keyword research for "' + parseResult.data.query + '" (' + parseResult.data.country + ')',
      metadata: {
        query: parseResult.data.query,
        country: parseResult.data.country,
        totalResults: data.totalResults,
      },
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: unknown) {
    const sanitized = sanitizeApiError(err, 'keywords');
    return NextResponse.json(
      {
        success: false,
        code: sanitized.code,
        error: {
          code: sanitized.code,
          message: sanitized.message,
        },
      },
      { status: sanitized.status }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_JSON',
          error: {
            code: 'INVALID_JSON',
            message: 'Malformed JSON payload in request body.',
          },
        },
        { status: 400 }
      );
    }

    const parseResult = keywordQuerySchema.safeParse(body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          code: 'VALIDATION_ERROR',
          error: {
            code: 'VALIDATION_ERROR',
            message: issue ? issue.message : 'Invalid keyword request body.',
            details: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    if (!keywordService.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          code: 'KEYWORD_PROVIDER_NOT_CONFIGURED',
          error: {
            code: 'KEYWORD_PROVIDER_NOT_CONFIGURED',
            message:
              'Live keyword research is currently unavailable because the keyword provider is not configured.',
          },
          data: {
            query: parseResult.data.query,
            country: parseResult.data.country,
            provider: 'google-ads',
            totalResults: 0,
            averageDifficulty: 0,
            totalVolume: 0,
            averageCpc: 0,
            items: [],
            disclaimer:
              'No keyword metrics are being shown because displaying estimated or demo data as real data would be misleading.',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 200 }
      );
    }

    const data = await keywordService.getKeywords(parseResult.data.query, parseResult.data.country);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: unknown) {
    const sanitized = sanitizeApiError(err, 'keywords');
    return NextResponse.json(
      {
        success: false,
        code: sanitized.code,
        error: {
          code: sanitized.code,
          message: sanitized.message,
        },
      },
      { status: sanitized.status }
    );
  }
}

