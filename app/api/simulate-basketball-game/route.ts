import { NextRequest, NextResponse } from 'next/server';
import { simulateBasketballGame } from '@/lib/gemini/ai';

export async function POST(request: NextRequest) {
  try {
    const { team1Name, team1Players, team1Lineup, team2Name, team2Players, team2Lineup, team1ChemistryText, team2ChemistryText } = await request.json();
    if (!team1Name || !team1Players || !team2Name || !team2Players) {
      return NextResponse.json({ error: 'Missing team data' }, { status: 400 });
    }
    const result = await simulateBasketballGame(team1Name, team1Players, team2Name, team2Players, team1Lineup, team2Lineup, team1ChemistryText || '', team2ChemistryText || '');
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in simulate-basketball-game API:', error);
    const msg: string = error?.message || String(error);
    if (
      msg.includes('429') ||
      msg.toLowerCase().includes('quota') ||
      msg.toLowerCase().includes('rate limit') ||
      msg.toLowerCase().includes('resource exhausted')
    ) {
      return NextResponse.json(
        { error: 'AI usage limit reached — please wait a minute and try again.' },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: msg || 'Failed to simulate game. Please try again.' }, { status: 500 });
  }
}
