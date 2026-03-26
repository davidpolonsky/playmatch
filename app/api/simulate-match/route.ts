import { NextRequest, NextResponse } from 'next/server';
import { simulateMatch } from '@/lib/gemini/ai';
import { checkSimulationLimit, incrementSimulationCount, trackSimulation } from '@/lib/firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { team1Name, team1Players, team1Formation, team2Name, team2Players, team2Formation, userId, userEmail } = await request.json();

    if (!team1Name || !team1Players || !team2Name || !team2Players) {
      return NextResponse.json({ error: 'Missing team data' }, { status: 400 });
    }

    // Check simulation rate limit
    if (userId) {
      const limitCheck = await checkSimulationLimit(userId);
      if (!limitCheck.allowed) {
        return NextResponse.json({ error: limitCheck.reason || 'Simulation limit reached' }, { status: 429 });
      }
    }

    const result = await simulateMatch(team1Name, team1Players, team2Name, team2Players, team1Formation, team2Formation);

    // Increment simulation count if userId provided
    if (userId) {
      await incrementSimulationCount(userId).catch(err => console.error('Failed to increment simulation count:', err));
    }

    // Track simulation for admin notifications (excluding admin)
    if (userEmail) {
      trackSimulation(userEmail).catch(err => console.error('Failed to track simulation:', err));
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in simulate-match API:', error);

    // Detect Gemini quota / rate-limit errors
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

    // Surface the real error message so the client can show something useful
    return NextResponse.json(
      { error: msg || 'Failed to simulate match. Please try again.' },
      { status: 500 }
    );
  }
}
