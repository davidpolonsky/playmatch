import { NextRequest, NextResponse } from 'next/server';
import { analyzeBasketballCard } from '@/lib/gemini/ai';
import { checkCardUploadLimit, incrementCardUploadCount } from '@/lib/firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, userId } = await request.json();
    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Check card upload rate limit
    if (userId) {
      const limitCheck = await checkCardUploadLimit(userId, 1);
      if (!limitCheck.allowed) {
        return NextResponse.json({ error: limitCheck.reason || 'Card upload limit reached' }, { status: 429 });
      }
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

    // Increment card upload count if successful and userId provided
    if (userId && result && !result.error) {
      await incrementCardUploadCount(userId, 1).catch(err => console.error('Failed to increment card count:', err));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in analyze-basketball-card API:', error);
    return NextResponse.json({ error: 'Failed to analyze card' }, { status: 500 });
  }
}
