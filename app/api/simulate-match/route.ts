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
  } catch (error) {
    console.error('Error in simulate-match API:', error);
    return NextResponse.json(
      { error: 'Failed to simulate match' },
      { status: 500 }
    );
  }
}
