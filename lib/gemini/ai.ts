import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const analyzePlayerCard = async (imageBase64: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Analyze this soccer/football player card image and extract the following information in JSON format:
    {
      "name": "player full name",
      "position": "position (GK, DEF, MID, FWD)",
      "rating": number between 1-99,
      "isHistorical": boolean (true if retired/historical player),
      "year": "year or era if historical"
    }

    For the rating field:
    - Generate a realistic FIFA-style overall rating (1-99) based on the player's skill level during that specific year
    - Consider the player's peak performance, achievements, and abilities during that time period
    - Use knowledge of actual FIFA ratings if available, or estimate based on the player's real-world performance
    - Examples: Prime Messi (2010-2015) = 94-96, Prime Ronaldo = 94-96, World-class players = 85-93, Good players = 75-84, Average = 65-74

    If you cannot read the card clearly or it's not a soccer player card, return:
    {
      "error": "description of the issue"
    }

    IMPORTANT: Always provide a numeric rating, never null or undefined. Only return valid JSON, no additional text.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // Debug logging
    console.log('Raw Gemini response:', text);

    // Remove markdown code blocks if present
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();

    // Debug logging
    console.log('Cleaned text before parsing:', cleanText);

    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Error analyzing card:', error);
    throw error;
  }
};

export const simulateMatch = async (
  team1Name: string,
  team1Players: any[],
  team2Name: string,
  team2Players: any[]
) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const team1AvgRating = Math.round(team1Players.reduce((sum: number, p: any) => sum + (p.rating || 75), 0) / team1Players.length);
    const team2AvgRating = Math.round(team2Players.reduce((sum: number, p: any) => sum + (p.rating || 75), 0) / team2Players.length);
    const ratingGap = Math.abs(team1AvgRating - team2AvgRating);
    const favorite = team1AvgRating >= team2AvgRating ? team1Name : team2Name;

    const prompt = `You are an elite soccer match commentator. Simulate a FULL 90-minute match with live play-by-play commentary between these two teams.

TEAM 1: ${team1Name} (Average Rating: ${team1AvgRating})
${team1Players.map((p: any) => `  - ${p.name} | ${p.position} | Rating: ${p.rating}${p.isHistorical ? ' | Historical legend' : ''}`).join('\n')}

TEAM 2: ${team2Name} (Average Rating: ${team2AvgRating})
${team2Players.map((p: any) => `  - ${p.name} | ${p.position} | Rating: ${p.rating}${p.isHistorical ? ' | Historical legend' : ''}`).join('\n')}

SIMULATION RULES:
- Rating gap is ${ratingGap} points. ${favorite} is the statistical favorite.
- Rating gap 0-3: Toss-up — either team equally likely to win, draw is common
- Rating gap 4-8: Favorite wins ~65% of the time, underdog wins ~20%, draw ~15%
- Rating gap 9+: Favorite wins ~75% of the time, underdog wins ~10%, draw ~15%
- DO NOT always let the higher-rated team win. Upsets happen. Make the outcome feel earned.
- Use ACTUAL player names from the rosters above — never invent players.
- High-rated players should make more impactful plays but can still make mistakes.

PLAY-BY-PLAY RULES:
- Generate exactly 45-55 events covering the full 90 minutes
- Minutes should be roughly chronological (small jumps, e.g. 1, 3, 6, 9, 12...)
- Include a mix of: possession play, passes, dribbles, shots saved, shots missed, goals (with 2-3 events of buildup before each goal), fouls, corners, free kicks, yellow cards occasionally, halftime, and fulltime
- Each goal MUST be preceded by at least 2 buildup events
- Goals must include a running scoreline e.g. "[Team1] 1 - 0 [Team2]"
- Halftime event at minute 45 must state the score
- Fulltime event at minute 90 must state the final score

Return ONLY this JSON (no markdown, no extra text):
{
  "team1Score": <number>,
  "team2Score": <number>,
  "summary": "<2-3 exciting sentences summarizing the match>",
  "manOfTheMatch": "<Player name> — <one sentence reason>",
  "playByPlay": [
    { "minute": 1, "type": "kickoff", "text": "<event description>" },
    { "minute": 4, "type": "action", "text": "<event description>" },
    { "minute": 12, "type": "shot", "text": "<event description>" },
    { "minute": 18, "type": "goal", "text": "GOAL! <description> | ${team1Name} X - Y ${team2Name}" },
    { "minute": 45, "type": "halftime", "text": "HALF TIME — <score summary>" },
    { "minute": 90, "type": "fulltime", "text": "FULL TIME! ${team1Name} X - Y ${team2Name}" }
  ]
}

Valid event types: kickoff, action, shot, goal, save, foul, card, corner, freekick, halftime, fulltime`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Error simulating match:', error);
    throw error;
  }
};
