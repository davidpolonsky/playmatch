import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Vercel injects x-vercel-ip-country on every request — no external API needed
  const country = request.headers.get('x-vercel-ip-country') || '';
  return NextResponse.json({ country_code: country });
}
