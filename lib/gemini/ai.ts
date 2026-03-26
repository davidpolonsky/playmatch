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
      "year": "year or era if historical",
      "skinTone": "light, medium, tan, or dark",
      "hairColor": "blonde, brown, black, red, gray, or none (if bald)",
      "hairStyle": "short, long, bald, or curly"
    }

    For the rating field:
    - Generate a realistic FIFA-style overall rating (1-99) based on the player's skill level during that specific year
    - Consider the player's peak performance, achievements, and abilities during that time period
    - Use knowledge of actual FIFA ratings if available, or estimate based on the player's real-world performance
    - Examples: Prime Messi (2010-2015) = 94-96, Prime Ronaldo = 94-96, World-class players = 85-93, Good players = 75-84, Average = 65-74

    For appearance fields (skinTone, hairColor, hairStyle):
    - Describe what you see in the photo on the card
    - Use simple categories that work for pixel art representation
    - If player is bald, use hairColor: "none" and hairStyle: "bald"

    If you cannot read the card clearly or it's not a soccer player card, return:
    {
      "error": "description of the issue"
    }

    IMPORTANT: Always provide a numeric rating and appearance data, never null or undefined. Only return valid JSON, no additional text.`;

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
  team2Players: any[],
  team1Formation: string = '4-3-3',
  team2Formation: string = '4-3-3'
) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const team1AvgRating = Math.round(team1Players.reduce((sum: number, p: any) => sum + (p.rating || 75), 0) / team1Players.length);
    const team2AvgRating = Math.round(team2Players.reduce((sum: number, p: any) => sum + (p.rating || 75), 0) / team2Players.length);
    const ratingGap = Math.abs(team1AvgRating - team2AvgRating);
    const favorite = team1AvgRating >= team2AvgRating ? team1Name : team2Name;

    // Analyze position fit for soccer
    const soccerPositionNote = (players: any[], formation: string) => {
      const pos: Record<string, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
      players.forEach((p: any) => { if (pos[p.position] !== undefined) pos[p.position]++; });
      const issues: string[] = [];
      // Formation like "4-3-3" → [4 DEF, 3 MID, 3 FWD]
      const parts = formation.split('-').map(Number);
      if (parts.length >= 3) {
        const [def, mid, fwd] = parts;
        if (pos['GK'] < 1) issues.push('No GK');
        if (pos['DEF'] < def) issues.push(`Only ${pos['DEF']} DEF (needs ${def})`);
        if (pos['MID'] < mid) issues.push(`Only ${pos['MID']} MID (needs ${mid})`);
        if (pos['FWD'] < fwd) issues.push(`Only ${pos['FWD']} FWD (needs ${fwd})`);
      }
      if (issues.length === 0) return `Well-fitted for ${formation}`;
      return `MISMATCH in ${formation}: ${issues.join(', ')} — affected positions perform at reduced effectiveness`;
    };

    const team1PositionNote = soccerPositionNote(team1Players, team1Formation);
    const team2PositionNote = soccerPositionNote(team2Players, team2Formation);

    const prompt = `You are an elite soccer match commentator. Simulate a FULL match with live play-by-play commentary between these two teams.

TEAM 1: ${team1Name} (Average Rating: ${team1AvgRating}, Formation: ${team1Formation})
${team1Players.map((p: any) => `  - ${p.name} | ${p.position} | Rating: ${p.rating}${p.isHistorical ? ' | Historical legend' : ''}`).join('\n')}

TEAM 2: ${team2Name} (Average Rating: ${team2AvgRating}, Formation: ${team2Formation})
${team2Players.map((p: any) => `  - ${p.name} | ${p.position} | Rating: ${p.rating}${p.isHistorical ? ' | Historical legend' : ''}`).join('\n')}

TACTICAL ANALYSIS:
- ${team1Name} (${team1Formation}): ${team1PositionNote}
- ${team2Name} (${team2Formation}): ${team2PositionNote}
If a team has a MISMATCH, reduce their effective performance accordingly — players out of position make more errors and contribute less.

SIMULATION RULES:
- Rating gap is ${ratingGap} points. ${favorite} is the statistical favorite.
- Rating gap 0-3: Toss-up — either team equally likely to win, draw is common
- Rating gap 4-8: Favorite wins ~65% of the time, underdog wins ~20%, draw ~15%
- Rating gap 9+: Favorite wins ~75% of the time, underdog wins ~10%, draw ~15%
- DO NOT always let the higher-rated team win. Upsets happen. Make the outcome feel earned.
- Use ACTUAL player names from the rosters above — never invent players.
- High-rated players should make more impactful plays but can still make mistakes.

SCORELINE VARIETY — THIS IS CRITICAL. Roll a dice and pick ONE of these scoreline styles (roughly equal probability):
  1. Low-scoring tight game: 1-0, 0-0, 1-1, 2-1
  2. Comfortable win: 3-1, 3-0, 4-1
  3. High-scoring thriller: 3-3, 4-2, 4-3, 5-2, 3-4
  4. Comeback: team losing 0-2 or 1-3 at half, then equalises or wins
  5. Extra time drama: 90 minutes ends level (e.g. 2-2), then a goal in 93', 95', or 97' decides it
  6. Red card chaos: a red card (type "redcard") in the 2nd half changes the game
You MUST NOT default to 2-1. If you keep getting 2-1 you are broken. Vary it every time.

SPECIAL EVENTS (use occasionally, not every game):
- Red cards: type "redcard", mention the player sent off and minute. A 10-man team concedes more goals.
- Extra time: if the 90-minute score is level, add 2-5 events in minutes 91-97, then a winner or penalties note.
- Penalties: if still level after extra time, add a type "penalties" event with a result.
- Big upsets and late drama make the best stories.

PLAY-BY-PLAY RULES:
- Generate exactly 45-55 events covering the full match
- Minutes should be roughly chronological (small jumps, e.g. 1, 3, 6, 9, 12...)
- Include a mix of: possession play, passes, dribbles, shots saved, shots missed, goals (with 2-3 events of buildup before each goal), fouls, corners, free kicks, yellow cards, halftime, and fulltime
- Each goal MUST be preceded by at least 2 buildup events
- Goals must include a running scoreline e.g. "[Team1] 1 - 0 [Team2]"
- Halftime event at minute 45 must state the score
- Fulltime event at minute 90 (or last minute of extra time) must state the final score
- Every goal event MUST include a "scoringTeam" field: "team1" if ${team1Name} scored, "team2" if ${team2Name} scored

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
    { "minute": 18, "type": "goal", "scoringTeam": "team1", "text": "GOAL! <description> | ${team1Name} X - Y ${team2Name}" },
    { "minute": 45, "type": "halftime", "text": "HALF TIME — <score summary>" },
    { "minute": 90, "type": "fulltime", "text": "FULL TIME! ${team1Name} X - Y ${team2Name}" }
  ]
}

Valid event types: kickoff, action, shot, goal, save, foul, card, redcard, corner, freekick, halftime, fulltime, penalties`;

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

// ── Basketball Card Analysis ────────────────────────────────────────────────

export const analyzeBasketballCard = async (imageBase64: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Analyze this basketball player card image and extract information in JSON format:
{
  "name": "player full name",
  "position": "position — must be one of: PG, SG, SF, PF, C",
  "rating": number between 1-99,
  "isHistorical": boolean (true if retired/historical player),
  "year": "year or era if historical",
  "skinTone": "light, medium, tan, dark, brown, or ebony",
  "hairColor": "blonde, brown, black, red, gray, or none (if bald)",
  "hairStyle": "short, long, bald, or curly"
}

Position guide:
- PG = Point Guard (ball handler, usually shortest)
- SG = Shooting Guard (scorer/perimeter)
- SF = Small Forward (versatile wing)
- PF = Power Forward (athletic big)
- C  = Center (tallest, paint player)

For the rating field:
- Use NBA 2K-style overall rating (1-99) based on the player's skill during that specific year
- Consider peak performance, achievements, and real-world impact
- Examples: Prime MJ (1996) = 99, Prime LeBron (2013) = 98, Prime Curry (2016) = 97, All-Star = 88-94, Good starter = 78-87, Role player = 65-77

If you cannot read the card clearly, or it is not a basketball card, return:
{ "error": "description of the issue" }

IMPORTANT: Always provide a numeric rating. Only return valid JSON, no extra text.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
    ]);

    const text = result.response.text();
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Error analyzing basketball card:', error);
    throw error;
  }
};

// ── Basketball Game Simulation ──────────────────────────────────────────────

// Analyze how well a team's players fit their lineup strategy
function analyzeLineupFit(players: any[], lineup: string): string {
  const posRatings: Record<string, number> = {};
  players.forEach((p: any) => { posRatings[p.position] = p.rating || 75; });

  const issues: string[] = [];

  if (lineup === 'Twin Towers') {
    const pfRating = posRatings['PF'] || 60;
    const cRating = posRatings['C'] || 60;
    if (pfRating < 75) issues.push(`PF (${posRatings['PF'] || '?'}) is too weak for a Twin Towers strategy`);
    if (cRating < 75) issues.push(`C (${posRatings['C'] || '?'}) is too weak for a Twin Towers strategy`);
    const bigAvg = (pfRating + cRating) / 2;
    if (bigAvg >= 85) return `GOOD FIT — Twin Towers with dominant bigs (PF: ${pfRating}, C: ${cRating})`;
    if (bigAvg >= 75) return `AVERAGE FIT — Twin Towers has adequate bigs but no dominant presence`;
    return `POOR FIT — Twin Towers requires strong PF and C, but bigs are weak (PF: ${pfRating}, C: ${cRating}). Significant penalty in the paint.`;
  }

  if (lineup === 'Small Ball') {
    const sfRating = posRatings['SF'] || 60;
    const pfRating = posRatings['PF'] || 60;
    if (sfRating < 75) issues.push(`SF (${sfRating}) too weak for Small Ball`);
    if (pfRating < 75) issues.push(`PF (${pfRating}) too weak for Small Ball`);
    const wingAvg = (sfRating + pfRating) / 2;
    if (wingAvg >= 82) return `GOOD FIT — Small Ball with athletic wings (SF: ${sfRating}, PF: ${pfRating})`;
    if (wingAvg >= 72) return `AVERAGE FIT — Small Ball works but wings are not elite`;
    return `POOR FIT — Small Ball needs quick athletic wings, but SF/PF are weak (SF: ${sfRating}, PF: ${pfRating}). Strategy backfires.`;
  }

  if (lineup === 'Stretch-4') {
    const pfRating = posRatings['PF'] || 60;
    if (pfRating >= 82) return `GOOD FIT — Stretch-4 with a strong shooting PF (${pfRating})`;
    if (pfRating >= 72) return `AVERAGE FIT — Stretch-4 PF can contribute but isn't elite`;
    return `POOR FIT — Stretch-4 requires a high-rated PF as a floor-spacer, but PF is rated ${pfRating}. Spacing collapses.`;
  }

  // Standard lineup — check for any severely weak positions
  const ratings = Object.values(posRatings);
  const minRating = Math.min(...ratings);
  if (minRating < 65) {
    const weakPos = Object.entries(posRatings).find(([, r]) => r < 65);
    return `WEAK LINK — Standard lineup but ${weakPos?.[0]} (rated ${weakPos?.[1]}) is a major liability.`;
  }
  return `STANDARD — Balanced lineup, no major mismatches.`;
}

export const simulateBasketballGame = async (
  team1Name: string,
  team1Players: any[],
  team2Name: string,
  team2Players: any[],
  team1Lineup: string = 'Standard',
  team2Lineup: string = 'Standard'
) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const team1Avg = Math.round(team1Players.reduce((s: number, p: any) => s + (p.rating || 75), 0) / team1Players.length);
    const team2Avg = Math.round(team2Players.reduce((s: number, p: any) => s + (p.rating || 75), 0) / team2Players.length);
    const ratingGap = Math.abs(team1Avg - team2Avg);
    const favorite = team1Avg >= team2Avg ? team1Name : team2Name;

    const team1FitNote = analyzeLineupFit(team1Players, team1Lineup);
    const team2FitNote = analyzeLineupFit(team2Players, team2Lineup);

    const prompt = `You are an elite NBA commentator. Simulate a FULL 4-quarter basketball game with live play-by-play between these two teams.

TEAM 1: ${team1Name} (Avg Rating: ${team1Avg}, Strategy: ${team1Lineup})
${team1Players.map((p: any) => `  - ${p.name} | ${p.position} | Rating: ${p.rating}${p.isHistorical ? ' | Legend' : ''}`).join('\n')}

TEAM 2: ${team2Name} (Avg Rating: ${team2Avg}, Strategy: ${team2Lineup})
${team2Players.map((p: any) => `  - ${p.name} | ${p.position} | Rating: ${p.rating}${p.isHistorical ? ' | Legend' : ''}`).join('\n')}

LINEUP STRATEGY ANALYSIS:
- ${team1Name} (${team1Lineup}): ${team1FitNote}
- ${team2Name} (${team2Lineup}): ${team2FitNote}
IMPORTANT: If a team has a POOR FIT rating above, their effective performance should be significantly worse than their raw average would suggest. A team playing the wrong strategy with mismatched players should struggle and lose more often — even against lower-rated opponents who are well-fitted.

SIMULATION RULES:
- Rating gap is ${ratingGap} points. ${favorite} is the statistical favorite.
- Rating gap 0-3: Toss-up — either team equally likely to win, overtime is possible
- Rating gap 4-8: Favorite wins ~65% of the time, upset ~20%, close game ~15%
- Rating gap 9+: Favorite wins ~75% of the time, upset ~10%
- Final scores should be realistic NBA totals: each team scores 85-120 points
- NO ties — if scores are equal at end, one team wins by 2-3 in overtime
- Use ACTUAL player names from the rosters above — never invent players
- High-rated players make more impact but can still miss big shots
- If a team has a POOR FIT lineup, their weak players should make key mistakes in relevant situations (e.g., Twin Towers with weak bigs gets dominated in the paint)

PLAY-BY-PLAY RULES:
- Generate exactly 48-56 events covering all 4 quarters
- Include a mix of: tip_off, shot_made (2pts), three_made (3pts), shot_missed, three_missed, dunk, layup, steal, block, turnover, foul, free_throw (1pt), timeout, end_quarter (after each quarter), buzzer_beater (optional), final
- Every shot_made, three_made, dunk, layup, free_throw, buzzer_beater MUST include "scoringTeam": "team1" or "team2" AND "points": 2 or 3 or 1
- end_quarter events must state the running score e.g. "END Q1 — ${team1Name} 28 - ${team2Name} 24"
- final event must state the final score
- quarter field must be 1, 2, 3, or 4 (use 4 for overtime too)
- time field format: "10:34" (minutes:seconds remaining in quarter)

Return ONLY this JSON (no markdown, no extra text):
{
  "team1Score": <number>,
  "team2Score": <number>,
  "summary": "<2-3 exciting sentences summarizing the game>",
  "playerOfGame": "<Player name> — <one sentence reason>",
  "playByPlay": [
    { "quarter": 1, "time": "12:00", "type": "tip_off", "text": "<description>" },
    { "quarter": 1, "time": "11:22", "type": "shot_made", "scoringTeam": "team1", "points": 2, "text": "<description>" },
    { "quarter": 1, "time": "0:00", "type": "end_quarter", "text": "END Q1 — <score>" },
    { "quarter": 4, "time": "0:00", "type": "final", "text": "FINAL — ${team1Name} X - ${team2Name} Y" }
  ]
}

Valid event types: tip_off, shot_made, three_made, shot_missed, three_missed, dunk, layup, steal, block, turnover, foul, free_throw, timeout, end_quarter, buzzer_beater, final`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Error simulating basketball game:', error);
    throw error;
  }
};
