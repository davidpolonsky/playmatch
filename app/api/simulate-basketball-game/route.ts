import { NextRequest, NextResponse } from 'next/server';
import { simulateBasketballGame } from '@/lib/gemini/ai';

export async function POST(request: NextRequest) {
  try {
    const { team1Name, team1Players, team2Name, team2Players } = await request.json();
    if (!team1Name || !team1Players || !team2Name || !team2Players) {
      return NextResponse.json({ error: 'Missing team data' }, { status: 400 });
    }
    const result = await simulateBasketballGame(team1Name, team1Players, team2Name, team2Players);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in simulate-basketball-game API:', error);
    return NextResponse.json({ error: 'Failed to simulate game' }, { status: 500 });
  }
}
