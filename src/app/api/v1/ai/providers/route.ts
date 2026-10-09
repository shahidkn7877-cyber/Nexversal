import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'ACCESS_RESTRICTED',
        message: 'AI provider administration is restricted to authorized platform administrators.',
      },
    },
    { status: 403 }
  );
}
