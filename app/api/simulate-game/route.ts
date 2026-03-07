import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { homeTeam, awayTeam } = await request.json();

    if (!homeTeam || !awayTeam) {
      return NextResponse.json(
        { error: 'Both teams are required' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a soccer match simulator. Generate an exciting, realistic match report between these two teams.

HOME TEAM: ${homeTeam.name}
Formation: ${homeTeam.formation.name}
Players:
${homeTeam.players.map((p: any) => `- ${p.name} (${p.position}, Rating: ${p.rating}${p.isHistorical ? ', Historical: ' + p.era : ''})`).join('\n')}

AWAY TEAM: ${awayTeam.name}
Formation: ${awayTeam.formation.name}
Players:
${awayTeam.players.map((p: any) => `- ${p.name} (${p.position}, Rating: ${p.rating}${p.isHistorical ? ', Historical: ' + p.era : ''})`).join('\n')}

Generate a match simulation that includes:
1. A final score (realistic based on team quality)
2. A narrative description of the match (2-3 paragraphs)
3. 3-5 key moments from the match
4. The MVP (must be a player from one of the teams)

Consider:
- Player ratings when determining performance
- Historical players playing at their peak
- Formation strengths and weaknesses
- Realistic scorelines (most matches are 0-5 goals total)

Return ONLY a valid JSON object with this structure:
{
  "homeScore": number,
  "awayScore": number,
  "narrative": "string",
  "keyMoments": ["string", "string", ...],
  "mvpName": "string",
  "mvpTeam": "home" | "away"
}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from the response
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7, -3).trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3, -3).trim();
    }

    const gameData = JSON.parse(jsonText);

    // Find the MVP player object
    const mvpTeam = gameData.mvpTeam === 'home' ? homeTeam : awayTeam;
    const mvp = mvpTeam.players.find((p: any) => 
      p.name.toLowerCase().includes(gameData.mvpName.toLowerCase()) ||
      gameData.mvpName.toLowerCase().includes(p.name.toLowerCase())
    ) || mvpTeam.players[0]; // Fallback to first player if not found

    return NextResponse.json({
      success: true,
      result: {
        homeTeam,
        awayTeam,
        homeScore: gameData.homeScore,
        awayScore: gameData.awayScore,
        narrative: gameData.narrative,
        keyMoments: gameData.keyMoments,
        mvp,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error simulating game:', error);
    return NextResponse.json(
      { error: 'Failed to simulate game', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
