import { NextRequest, NextResponse } from 'next/server';
import { analyzeBasketballCard } from '@/lib/gemini/ai';

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();
    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }
    const result = await analyzeBasketballCard(imageBase64);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in analyze-basketball-card API:', error);
    return NextResponse.json({ error: 'Failed to analyze card' }, { status: 500 });
  }
}
