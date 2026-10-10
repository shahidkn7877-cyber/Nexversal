import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/user-guard';
import { keywordResearchSchema } from '@/lib/validation/keyword.schema';
import { keywordService } from '@/services/keyword.service';
import { checkKeywordRateLimit } from '@/lib/security/keyword-rate-limit';
import { sanitizeApiError } from '@/lib/security/error-sanitizer';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user from session
    const auth = await requireUser(req);
    if ('response' in auth) {
      return auth.response;
    }
    const user = auth.user;

    // 2. Rate limiting check
    const rateCheck = checkKeywordRateLimit(user.id);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Too many keyword research requests. Please wait ${rateCheck.resetInSeconds} seconds before trying again.`,
          },
        },
        { status: 429 }
      );
    }

    // 3. Parse JSON payload
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Malformed JSON payload in request body.',
          },
        },
        { status: 400 }
      );
    }

    // 4. Validate input with Zod
    const parseResult = keywordResearchSchema.safeParse(body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: issue ? issue.message : 'Invalid keyword research parameters.',
            details: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { seedKeyword, seedUrl, location, language } = parseResult.data;

    // 5. Execute research flow using real provider architecture
    const response = await keywordService.executeResearch({
      userId: user.id,
      seedKeyword: seedKeyword || undefined,
      seedUrl: seedUrl || undefined,
      location,
      language,
    });

    // 6. Handle unconfigured provider state honestly
    if (response.status === 'NOT_CONFIGURED') {
      return NextResponse.json(
        {
          success: false,
          code: 'KEYWORD_PROVIDER_NOT_CONFIGURED',
          error: {
            code: 'KEYWORD_PROVIDER_NOT_CONFIGURED',
            message:
              response.message ||
              'Live keyword research is unavailable because the Google Ads provider is not configured.',
          },
          data: {
            provider: response.provider,
            status: 'NOT_CONFIGURED',
            errorCode: 'NOT_CONFIGURED',
            seedKeyword: response.seedKeyword,
            seedUrl: response.seedUrl,
            location: response.location,
            language: response.language,
            totalResults: 0,
            results: [],
            message: response.message,
            disclaimer: response.disclaimer,
            createdAt: response.createdAt,
          },
        },
        { status: 200 }
      );
    }

    // 7. Handle provider error state safely without exposing secrets
    if (response.status === 'ERROR') {
      const errCode = response.errorCode || 'GOOGLE_ADS_API_ERROR';
      return NextResponse.json(
        {
          success: false,
          code: errCode,
          error: {
            code: errCode,
            message: response.message || 'Google Ads Keyword Planner request failed.',
          },
          data: {
            provider: response.provider,
            status: 'ERROR',
            errorCode: errCode,
            seedKeyword: response.seedKeyword,
            seedUrl: response.seedUrl,
            location: response.location,
            language: response.language,
            totalResults: 0,
            results: [],
            message: response.message,
            disclaimer: response.disclaimer,
            createdAt: response.createdAt,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      data: response,
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
