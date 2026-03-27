import { NextRequest, NextResponse } from 'next/server';
import { analyzeBasketballCard } from '@/lib/gemini/ai';

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();
    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }
    const result = await analyzeBasketballCard(imageBase64);

    // Apply rarity rating bonus
    if (result && !result.error && result.rating) {
      const rarity: string = result.rarity || 'common';
      const rarityBonus = rarity === 'legendary' ? 4 : rarity === 'rare' ? 2 : 0;
      if (rarityBonus > 0) {
        result.rating = Math.min(99, result.rating + rarityBonus);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in analyze-basketball-card API:', error);
    return NextResponse.json({ error: 'Failed to analyze card' }, { status: 500 });
  }
}
