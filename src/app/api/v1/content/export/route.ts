import { NextRequest, NextResponse } from 'next/server';
import { articleExportSchema } from '@/lib/validation/article-export.schema';
import { articleExportService } from '@/services/article-export.service';
import { sanitizeApiError } from '@/lib/security/error-sanitizer';

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
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

    const parseResult = articleExportSchema.safeParse(body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: issue ? issue.message : 'Invalid article export request.',
            details: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { title, content, format, focusKeyword, metaDescription } = parseResult.data;

    const filename = articleExportService.sanitizeFilename(title, format);

    if (format === 'pdf') {
      const pdfBuffer = await articleExportService.generatePdf({
        title,
        content,
        format: 'pdf',
        focusKeyword,
        metaDescription,
      });

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': String(pdfBuffer.length),
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    // DOCX format
    const docxBuffer = await articleExportService.generateDocx({
      title,
      content,
      format: 'docx',
      focusKeyword,
      metaDescription,
    });

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(docxBuffer.length),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const sanitized = sanitizeApiError(err, 'content');
    return NextResponse.json(
      {
        success: false,
        error: {
          code: sanitized.code || 'EXPORT_FAILED',
          message: sanitized.message || 'Failed to export article document.',
        },
      },
      { status: sanitized.status || 500 }
    );
  }
}
