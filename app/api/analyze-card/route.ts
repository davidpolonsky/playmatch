import { NextRequest, NextResponse } from 'next/server';
import { analyzePlayerCard } from '@/lib/gemini/ai';

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const result = await analyzePlayerCard(imageBase64);

    // Debug logging
    console.log('Gemini API result:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in analyze-card API:', error);
    return NextResponse.json(
      { error: 'Failed to analyze card' },
      { status: 500 }
    );
  }
}
