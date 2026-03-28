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
      "nationality": "player's nationality as an adjective e.g. English, Spanish, Brazilian, French, Argentine",
      "club": "club the player is associated with on this card e.g. Arsenal, Real Madrid, Barcelona — empty string if unknown or national team card",
      "skinTone": "light, medium, tan, or dark",
      "hairColor": "blonde, brown, black, red, gray, or none (if bald)",
      "hairStyle": "short, long, bald, or curly",
      "cardValue": number (estimated USD resale value of this specific card),
      "rarity": "common" | "rare" | "legendary"
    }

    For the rating field:
    - Generate a realistic FIFA-style overall rating (1-99) based on the player's skill level during that specific year
    - Consider the player's peak performance, achievements, and abilities during that time period
    - Use knowledge of actual FIFA ratings if available, or estimate based on the player's real-world performance
    - Examples: Prime Messi (2010-2015) = 94-96, Prime Ronaldo = 94-96, World-class players = 85-93, Good players = 75-84, Average = 65-74

    For nationality: use your knowledge of the player to determine their nationality. Return it as an adjective (e.g. "English" not "England", "French" not "France").
    For club: read the badge/crest on the card if visible. If it's a national team card or club is unclear, return "".

    For cardValue and rarity:
    - Examine the physical card for signs of rarity: holographic/foil finish, special borders, gold or rainbow shimmer, serial numbers (e.g. "/25", "/10"), special edition markings, autographs, refractor patterns, patch cards, graded slabs
    - Estimate the realistic resale value of this specific card in USD based on the player's popularity, card condition, and rarity indicators
    - Common examples: Standard base cards = $0.25-$2. Refractors/prizms = $3-15. Short prints/parallels = $5-50. Numbered parallels = $10-100+. Autographs = $20-500+. 1/1 superfractors = $500+
    - Set rarity based on estimated value:
      * "common" — worth less than $5 (standard base card, no special finish)
      * "rare" — worth $5-$19.99 (refractor, parallel, prizm, or notable star player base card)
      * "legendary" — worth $20+ (numbered card, autograph, patch, superfractor, or major star graded PSA 10)
    - If the card appears to be a standard common card with no special features, set cardValue to a realistic low estimate (e.g. 0.5-2) and rarity to "common"

    For appearance fields (skinTone, hairColor, hairStyle):
    - Describe what you see in the photo on the card
    - Use simple categories that work for pixel art representation
    - If player is bald, use hairColor: "none" and hairStyle: "bald"

    If you cannot read the card clearly or it's not a soccer player card, return:
    {
      "error": "description of the issue"
    }

    IMPORTANT: Always provide a numeric rating, cardValue, rarity, and appearance data, never null or undefined. Only return valid JSON, no additional text.`;

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

// ── Score generators (real randomness — never let the LLM pick its own score) ─

function weighted(options: [number, number][], r: number): number {
  const total = options.reduce((s, [, w]) => s + w, 0);
  let cum = 0;
  for (const [val, w] of options) {
    cum += w / total;
    if (r <= cum) return val;
  }
  return options[options.length - 1][0];
}

// minT2Goals / minT1Goals = OOP floors: team2 must score at least N, team1 must score at least N
function pickSoccerScoreline(
  t1Avg: number, t2Avg: number,
  minT2Goals: number = 0, minT1Goals: number = 0
): { s1: number; s2: number } {
  const gap = Math.abs(t1Avg - t2Avg);
  const favorsT1 = t1Avg >= t2Avg;

  // Draw / fav-win probabilities — steepen sharply at large gaps
  const [drawProb, favWinProb] =
    gap <= 3  ? [0.25, 0.40] :  // coin-flip range
    gap <= 8  ? [0.12, 0.63] :  // clear favourite
    gap <= 14 ? [0.05, 0.82] :  // big gap — rare upsets
                [0.02, 0.94];   // legends vs lackluster — almost always wins

  const r0 = Math.random();
  const isDraw  = r0 < drawProb;
  const favWins = !isDraw && r0 < drawProb + favWinProb;

  // Winning margin grows with gap — large gaps produce bigger wins
  const winnerGoalsTable: [number, number][] =
    gap >= 15 ? [[2,5],[3,15],[4,22],[5,22],[6,18],[7,12],[8,6]  ] :  // dominant
    gap >= 9  ? [[1,4],[2,14],[3,22],[4,22],[5,18],[6,12],[7,6],[8,2]] :  // strong fav
                [[1,6],[2,16],[3,22],[4,20],[5,16],[6,11],[7,6],[8,3]];   // normal

  // Loser goals: when gap is large, loser rarely scores
  const loserBias = gap >= 15 ? 4 : gap >= 9 ? 3 : 2;  // higher = more 0s for loser

  if (isDraw) {
    const draws: [number, number][] = [[0,9],[1,24],[2,24],[3,18],[4,12],[5,8],[6,5]];
    const g = weighted(draws, Math.random());
    let s1 = g, s2 = g;
    s2 = Math.max(s2, minT2Goals);
    s1 = Math.max(s1, minT1Goals);
    // If floors broke the draw symmetry, make it a close win instead
    if (s1 !== s2) return { s1: Math.max(s1, s2 + 1), s2 };
    return { s1, s2 };
  }

  const winnerGoals = weighted(winnerGoalsTable, Math.random());
  const maxLoser = Math.min(winnerGoals - 1, gap >= 12 ? 2 : 5);
  const loserOptions: [number, number][] = Array.from(
    { length: maxLoser + 1 }, (_, i) => [i, Math.max(1, maxLoser - i + loserBias)] as [number, number]
  );
  const loserGoals = weighted(loserOptions, Math.random());

  const teamThatWins = (favWins ? favorsT1 : !favorsT1) ? 'team1' : 'team2';
  let s1 = teamThatWins === 'team1' ? winnerGoals : loserGoals;
  let s2 = teamThatWins === 'team1' ? loserGoals : winnerGoals;

  // Apply OOP floors (opponent must score at least this many)
  s2 = Math.max(s2, minT2Goals);
  s1 = Math.max(s1, minT1Goals);
  // If floor pushed loser above winner, bump the winner
  if (s1 <= s2 && teamThatWins === 'team1') s1 = s2 + 1;
  if (s2 <= s1 && teamThatWins === 'team2') s2 = s1 + 1;

  return { s1, s2 };
}

function pickBasketballScoreline(t1Avg: number, t2Avg: number): { s1: number; s2: number } {
  const gap = Math.abs(t1Avg - t2Avg);
  const favorsT1 = t1Avg >= t2Avg;

  const favWinProb =
    gap <= 3  ? 0.50 :
    gap <= 8  ? 0.65 :
                0.78;

  const favWins = Math.random() < favWinProb;
  const teamThatWins = (favWins ? favorsT1 : !favorsT1) ? 'team1' : 'team2';

  // Winner score: 84–123 (realistic NBA range)
  const winnerScore = 84 + Math.floor(Math.random() * 40);

  // Margin: wide variety from nail-biter OT (2) to blowout (35)
  const margin = weighted([
    [2,4],[3,6],[4,8],[5,9],[6,9],[7,8],[8,7],[9,6],
    [10,6],[12,5],[15,5],[18,4],[20,4],[25,3],[30,2],[35,1]
  ], Math.random());

  const loserScore = Math.max(72, winnerScore - margin);

  return teamThatWins === 'team1'
    ? { s1: winnerScore, s2: loserScore }
    : { s1: loserScore, s2: winnerScore };
}

export const simulateMatch = async (
  team1Name: string,
  team1Players: any[],
  team2Name: string,
  team2Players: any[],
  team1Formation: string = '4-3-3',
  team2Formation: string = '4-3-3',
  team1ChemistryText: string = '',
  team2ChemistryText: string = ''
) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const team1AvgRating = Math.round(team1Players.reduce((sum: number, p: any) => sum + (p.rating || 75), 0) / team1Players.length);
    const team2AvgRating = Math.round(team2Players.reduce((sum: number, p: any) => sum + (p.rating || 75), 0) / team2Players.length);
    const ratingGap = Math.abs(team1AvgRating - team2AvgRating);
    const favorite = team1AvgRating >= team2AvgRating ? team1Name : team2Name;

    // OOP severity table:
    //   WAY out of position (2 goals against): GK→any, any→GK, DEF→FWD, FWD→DEF
    //   Minor out of position (1 goal against): DEF↔MID, MID↔FWD
    const isWayOOP = (from: string, to: string) =>
      from === 'GK' || to === 'GK' ||
      (from === 'DEF' && to === 'FWD') ||
      (from === 'FWD' && to === 'DEF');

    const analyzeSoccerLineup = (players: any[], formation: string, teamName: string) => {
      const parts = formation.split('-').map(Number);
      if (parts.length < 3) return { summary: 'Well-fitted', mandatoryRules: '', minOpponentGoals: 0 };

      const needed: Record<string, number> = { GK: 1, DEF: parts[0], MID: parts[1], FWD: parts[2] };

      const byPos: Record<string, any[]> = { GK: [], DEF: [], MID: [], FWD: [] };
      players.forEach((p: any) => { if (byPos[p.position]) byPos[p.position].push(p); });
      for (const pos of ['GK','DEF','MID','FWD']) byPos[pos].sort((a: any, b: any) => b.rating - a.rating);

      const oopPlayers: Array<{ player: any; naturalPos: string }> = [];
      const deficitSlots: string[] = [];
      for (const pos of ['GK','DEF','MID','FWD']) {
        const have = byPos[pos].length, need = needed[pos] || 0;
        if (have > need) byPos[pos].slice(need).forEach((p: any) => oopPlayers.push({ player: p, naturalPos: pos }));
        if (have < need) for (let i = 0; i < need - have; i++) deficitSlots.push(pos);
      }

      if (oopPlayers.length === 0) return { summary: `Well-fitted for ${formation}`, mandatoryRules: '', minOpponentGoals: 0 };

      const rules: string[] = [];
      let minOpponentGoals = 0;
      oopPlayers.forEach(({ player, naturalPos }, i) => {
        const playingAs = deficitSlots[i] || 'outfield';
        const way = isWayOOP(naturalPos, playingAs);
        minOpponentGoals += way ? 2 : 1;

        if (way) {
          rules.push(
            `🚨 WAY OUT OF POSITION — ${player.name} (${naturalPos}, rated ${player.rating}) is playing ${playingAs} for ${teamName}. ` +
            `MANDATORY RULE — of all the goals the opponent scores in this match, AT LEAST 2 of them must be directly caused by ${player.name}'s inability to perform in this role (do not add extra goals beyond the chosen scoreline — these 2 are included within it). ` +
            `Both goals must explicitly name ${player.name} in the play-by-play event (e.g. "${player.name} loses their man", "terrible ${naturalPos}-playing-${playingAs} mistake from ${player.name}"). ` +
            `Do NOT let ${player.name} have any positive moment — every involvement is a liability.`
          );
        } else {
          rules.push(
            `⚠️ MINOR OUT OF POSITION — ${player.name} (${naturalPos}, rated ${player.rating}) is playing ${playingAs} for ${teamName}. ` +
            `MANDATORY RULE — of all the goals the opponent scores in this match, AT LEAST 1 must be directly caused by ${player.name} being out of position (do not add extra goals beyond the chosen scoreline — this 1 is included within it). ` +
            `That goal event must explicitly name ${player.name} and describe the positional error.`
          );
        }
      });

      const summary = oopPlayers.map(({ player, naturalPos }, i) =>
        `${player.name} (${naturalPos}→${deficitSlots[i] || 'out'}, ${isWayOOP(naturalPos, deficitSlots[i] || 'outfield') ? '2-goal penalty' : '1-goal penalty'})`
      ).join(', ');

      return { summary, mandatoryRules: rules.join('\n'), minOpponentGoals };
    };

    const team1Analysis = analyzeSoccerLineup(team1Players, team1Formation, team1Name);
    const team2Analysis = analyzeSoccerLineup(team2Players, team2Formation, team2Name);
    const hasOopRules = team1Analysis.mandatoryRules || team2Analysis.mandatoryRules;

    // Pre-generate the final score with real JS randomness so the LLM can't default to 4-3 every time.
    // OOP floors ensure the locked score has enough goals to satisfy OOP penalty requirements.
    // team1 OOP → team2 (opponent) must score at least N goals, and vice versa.
    const { s1: lockedS1, s2: lockedS2 } = pickSoccerScoreline(
      team1AvgRating, team2AvgRating,
      team1Analysis.minOpponentGoals ?? 0,   // floor for team2 goals (team1 has OOP)
      team2Analysis.minOpponentGoals ?? 0    // floor for team1 goals (team2 has OOP)
    );
    const isDraw = lockedS1 === lockedS2;
    const narrativeHint = isDraw
      ? `This ends in a ${lockedS1}-${lockedS2} draw — write it as a hard-fought, entertaining contest.`
      : lockedS1 > lockedS2
        ? `${team1Name} win ${lockedS1}-${lockedS2}. Make the winning margin feel earned through the run of play.`
        : `${team2Name} win ${lockedS2}-${lockedS1}. Make the winning margin feel earned through the run of play.`;

    const prompt = `You are an elite soccer match commentator. Simulate a FULL match with live play-by-play commentary between these two teams.

TEAM 1: ${team1Name} (Average Rating: ${team1AvgRating}, Formation: ${team1Formation})
${team1Players.map((p: any) => `  - ${p.name} | ${p.position} | Rating: ${p.rating}${p.isHistorical ? ' | Historical legend' : ''}`).join('\n')}
${team1ChemistryText ? `\n${team1ChemistryText}` : ''}

TEAM 2: ${team2Name} (Average Rating: ${team2AvgRating}, Formation: ${team2Formation})
${team2Players.map((p: any) => `  - ${p.name} | ${p.position} | Rating: ${p.rating}${p.isHistorical ? ' | Historical legend' : ''}`).join('\n')}
${team2ChemistryText ? `\n${team2ChemistryText}` : ''}

TACTICAL ANALYSIS:
- ${team1Name} (${team1Formation}): ${team1Analysis.summary}
- ${team2Name} (${team2Formation}): ${team2Analysis.summary}
${hasOopRules ? `
╔══════════════════════════════════════════════════════════╗
║        MANDATORY OUT-OF-POSITION SIMULATION RULES       ║
║  These OVERRIDE normal rating logic. You MUST follow    ║
║  every instruction below — no exceptions.               ║
╚══════════════════════════════════════════════════════════╝
${team1Analysis.mandatoryRules}
${team2Analysis.mandatoryRules}
` : ''}

╔══════════════════════════════════════════════════════════╗
║   LOCKED FINAL SCORE — NON-NEGOTIABLE                   ║
║   ${team1Name}: ${lockedS1}   |   ${team2Name}: ${lockedS2}
║   You MUST return exactly: team1Score=${lockedS1}, team2Score=${lockedS2}   ║
║   ${narrativeHint}
╚══════════════════════════════════════════════════════════╝

SIMULATION RULES:
- Rating gap is ${ratingGap} points. ${favorite} is the statistical favorite.
- Use ACTUAL player names from the rosters above — never invent players.
- High-rated players make more impactful plays but can still make mistakes.
- Build a compelling narrative that makes the locked score feel natural and earned.

SPECIAL EVENTS (use occasionally to add drama):
- Red cards: type "redcard". Mention the player sent off and minute.
- If the locked score is a draw after 90 min, you may add 2-4 events in mins 91-97 for extra time drama (but the score stays as locked — no penalties unless you want to note it as flavor).
- Comebacks, late equalisers, and early goals are all fair game — make the play-by-play justify the final score.

PLAY-BY-PLAY RULES:
- Generate exactly 45-55 events covering the full match
- Minutes should be roughly chronological (small jumps, e.g. 1, 3, 6, 9, 12...)
- Include a mix of: possession play, passes, dribbles, shots saved, shots missed, goals (with 2-3 events of buildup before each goal), fouls, corners, free kicks, yellow cards, halftime, and fulltime
- Each goal MUST be preceded by at least 2 buildup events
- Goals must include a running scoreline e.g. "${team1Name} 1 - 0 ${team2Name}"
- Halftime event at minute 45 must state the half-time score
- Fulltime event at minute 90 (or last minute of extra time) must state the final score
- Every goal event MUST include a "scoringTeam" field: "team1" if ${team1Name} scored, "team2" if ${team2Name} scored
- The number of "goal" type events MUST equal exactly ${lockedS1 + lockedS2} (${lockedS1} for ${team1Name}, ${lockedS2} for ${team2Name})

Return ONLY this JSON (no markdown, no extra text):
{
  "team1Score": ${lockedS1},
  "team2Score": ${lockedS2},
  "summary": "<2-3 exciting sentences summarizing the match>",
  "manOfTheMatch": "<Player name> — <one sentence reason>",
  "playByPlay": [
    { "minute": 1, "type": "kickoff", "text": "<event description>" },
    { "minute": 4, "type": "action", "text": "<event description>" },
    { "minute": 12, "type": "shot", "text": "<event description>" },
    { "minute": 18, "type": "goal", "scoringTeam": "team1", "text": "GOAL! <description> | ${team1Name} X - Y ${team2Name}" },
    { "minute": 45, "type": "halftime", "text": "HALF TIME — <score summary>" },
    { "minute": 90, "type": "fulltime", "text": "FULL TIME! ${team1Name} ${lockedS1} - ${lockedS2} ${team2Name}" }
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
  "nationality": "player's nationality as an adjective e.g. American, Serbian, Greek, Australian, French",
  "nbaTeam": "NBA team the player is associated with on this card e.g. Chicago Bulls, Los Angeles Lakers — empty string if unknown",
  "skinTone": "light, medium, tan, dark, brown, or ebony",
  "hairColor": "blonde, brown, black, red, gray, or none (if bald)",
  "hairStyle": "short, long, bald, or curly",
  "cardValue": number (estimated USD resale value of this specific card),
  "rarity": "common" | "rare" | "legendary"
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

For nationality: use your knowledge of the player. Return as adjective (e.g. "American" not "United States").
For nbaTeam: read the team name/logo on the card if visible. Return the full franchise name (e.g. "Chicago Bulls"). Empty string if unclear.

For cardValue and rarity:
- Examine the physical card for signs of rarity: holographic/foil finish, special borders, gold or rainbow shimmer, serial numbers (e.g. "/25", "/10"), special edition markings, autographs, refractor/prizm patterns, patch windows, graded slabs (PSA, BGS)
- Estimate the realistic resale value of this specific card in USD based on the player's popularity, card condition, and rarity indicators
- Common examples: Standard base cards = $0.25-$2. Prizms/refractors = $3-15. Numbered parallels = $10-100+. Rookie cards of stars = $5-50+. Autographs = $20-500+. 1/1 cards = $500+
- Set rarity based on estimated value:
  * "common" — worth less than $5 (standard base card, no special finish)
  * "rare" — worth $5-$19.99 (prizm, parallel, refractor, or star player rookie)
  * "legendary" — worth $20+ (numbered card, autograph, patch, superfractor, PSA graded high)
- If the card appears to be a standard common with no special features, set cardValue to a realistic low estimate (0.5-2) and rarity to "common"

If you cannot read the card clearly, or it is not a basketball card, return:
{ "error": "description of the issue" }

IMPORTANT: Always provide a numeric rating, cardValue, and rarity. Only return valid JSON, no extra text.`;

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

// ── Basketball lineup fitness analysis ──────────────────────────────────────
//
// Basketball OOP is structural, not positional: the mismatch is between a
// STRATEGY'S requirements and the actual players staffing its key roles.
//
// Penalty scale (mirrors soccer's goals-against logic but in points):
//   CATASTROPHIC mismatch → opponent MUST receive +10 pts from exploiting it
//   SEVERE        mismatch → opponent MUST receive +6  pts
//   MODERATE      mismatch → opponent MUST receive +4  pts
//   No penalty             → strategy works as designed
//
// Each strategy has 1-2 "critical slots." Fail to staff those adequately and
// the whole system collapses in a specific, nameable way.
//
function analyzeBasketballLineup(players: any[], lineup: string, teamName: string): { summary: string; mandatoryRules: string } {
  const byPos: Record<string, any> = {};
  players.forEach((p: any) => { byPos[p.position] = p; });
  const r = (pos: string) => byPos[pos]?.rating ?? 68;
  const n = (pos: string) => byPos[pos]?.name ?? pos;

  const teamAvg = Math.round(players.reduce((s: number, p: any) => s + (p.rating || 68), 0) / players.length);
  const rules: string[] = [];

  // ── TWIN TOWERS ────────────────────────────────────────────────────────────
  // Core requirement: dominant PF AND C (the "towers"). Strategy collapses
  // if either big is weak — the opponent just posts up and scores at will.
  if (lineup === 'Twin Towers') {
    const pfR = r('PF'), pfN = n('PF'), cR = r('C'), cN = n('C');
    const bigAvg = (pfR + cR) / 2;

    if (bigAvg < 72) {
      // Both towers are weak — catastrophic. Opponent owns the paint entirely.
      rules.push(
        `🚨 TWIN TOWERS CATASTROPHE — ${teamName} runs Twin Towers but both bigs are undersized for this strategy: ` +
        `${pfN} (PF, ${pfR}) and ${cN} (C, ${cR}), avg ${Math.round(bigAvg)}. ` +
        `MANDATORY: Opponent MUST dominate the paint entirely. ` +
        `${pfN} and ${cN} MUST be physically outmuscled, posterized, or bullied on at least 3 combined possessions. ` +
        `This mismatch MUST directly hand the opponent +10 points through open paint looks, ` +
        `put-backs, and foul-drawing that ${teamName}'s weak bigs cannot defend. ` +
        `Name both players in those negative events. Do NOT let them look competent inside.`
      );
    } else if (pfR < 76 && cR >= 80) {
      // One weak tower — the PF side collapses
      rules.push(
        `⚠️ WEAK TOWER — ${teamName}'s Twin Towers leans entirely on ${cN} (C, ${cR}) because ` +
        `${pfN} (PF, ${pfR}) cannot hold his own at the 4. ` +
        `MANDATORY: Opponent ISO's ${pfN} repeatedly on the low block and off ball-screens. ` +
        `${pfN} MUST give up at least 2 easy baskets or foul out early. ` +
        `This costs ${teamName} +6 points that a real power forward would have prevented.`
      );
    } else if (cR < 76 && pfR >= 80) {
      // One weak tower — the C side collapses
      rules.push(
        `⚠️ WEAK TOWER — ${teamName}'s Twin Towers leans entirely on ${pfN} (PF, ${pfR}) because ` +
        `${cN} (C, ${cR}) is not a true anchor. ` +
        `MANDATORY: Opponent targets ${cN} in the post and on pick-and-rolls — ${cN} MUST surrender ` +
        `at least 2 baskets through poor positioning or getting beaten off the dribble. ` +
        `This costs ${teamName} +6 points.`
      );
    } else if (bigAvg >= 88) {
      rules.push(
        `✅ TWIN TOWERS DOMINANT — ${pfN} (${pfR}) and ${cN} (${cR}) are elite bigs. ` +
        `MANDATORY: ${teamName} owns the paint. Opponent MUST avoid interior play. ` +
        `60%+ of ${teamName}'s scoring should come inside. Highlight the towers dominating boards and post-ups.`
      );
    } else {
      rules.push(`TWIN TOWERS FUNCTIONAL — ${pfN} (${pfR}) and ${cN} (${cR}) are adequate. Strategy works but without elite paint dominance.`);
    }
  }

  // ── SMALL BALL ─────────────────────────────────────────────────────────────
  // Core requirement: PG drives pace and spacing; the C slot "plays PF" in
  // this system — they need mobility. A slow traditional big at C is the classic
  // Small Ball liability: dragged to the perimeter, can't keep up in transition.
  else if (lineup === 'Small Ball') {
    const pgR = r('PG'), pgN = n('PG');
    const cR  = r('C'),  cN  = n('C');
    const sgR = r('SG');
    const perimeterAvg = Math.round((pgR + sgR) / 2);

    if (cR < 72) {
      // C is too weak to even survive the Small Ball scheme's PF demands
      rules.push(
        `🚨 SMALL BALL BREAKING POINT — ${teamName} runs Small Ball but ${cN} (C, ${cR}) cannot ` +
        `handle the mobile-big role this scheme demands. ` +
        `MANDATORY: Opponent exploits ${cN} relentlessly — dragging them to the perimeter on ` +
        `pick-and-pops, running them in transition, and forcing them to guard quicker players. ` +
        `${cN} MUST surrender at least 2 open three-pointers after getting caught on switches ` +
        `AND blow at least 1 defensive rotation. This costs ${teamName} +10 points directly.`
      );
    } else if (cR < 78 && cR < (perimeterAvg - 6)) {
      // C is below perimeter average — moderate liability in this system
      rules.push(
        `⚠️ SMALL BALL DRAG — ${cN} (C, ${cR}) is a traditional big trying to function in ` +
        `${teamName}'s Small Ball scheme. ` +
        `MANDATORY: Opponent pops ${cN} off screens to the midrange and switches quicker players onto them. ` +
        `${cN} MUST give up at least 1 open look after being caught in a switch, and miss ` +
        `a defensive rotation in transition. This costs ${teamName} +6 points.`
      );
    }

    if (pgR < 74) {
      // No engine — Small Ball without a real PG is a car without a driver
      rules.push(
        `⚠️ SMALL BALL WITHOUT AN ENGINE — Small Ball lives and dies with the PG, ` +
        `but ${pgN} (PG, ${pgR}) is too limited to push pace for ${teamName}. ` +
        `MANDATORY: ${teamName} fails to generate transition opportunities. ` +
        `${pgN} MUST turn the ball over at least twice trying to create in the open court, ` +
        `costing ${teamName} +4 points in easy fast-break buckets for the opponent.`
      );
    } else if (pgR >= 87 && perimeterAvg >= 84) {
      rules.push(
        `✅ SMALL BALL FIRING — ${pgN} (${pgR}) is an elite engine for ${teamName}'s Small Ball. ` +
        `MANDATORY: Highlight transition buckets, quick ball movement, and perimeter shooting. ` +
        `${teamName} should win at least one quarter decisively through pace.`
      );
    }
  }

  // ── STRETCH-4 ──────────────────────────────────────────────────────────────
  // Core requirement: PF must space the floor (perimeter threat). If the PF
  // can't shoot, the defense ignores them, sags into the paint, and the entire
  // point of the scheme — opening driving lanes — is nullified.
  else if (lineup === 'Stretch-4') {
    const pfR  = r('PF'),  pfN  = n('PF');
    const pgR  = r('PG'),  pgN  = n('PG');
    const perimAvg = Math.round((r('PG') + r('SG') + r('SF')) / 3);

    if (pfR < 70) {
      // PF is a liability — defense ignores them entirely
      rules.push(
        `🚨 STRETCH-4 NULLIFIED — ${teamName}'s Stretch-4 strategy depends entirely on ${pfN} ` +
        `spacing the floor, but ${pfN} (PF, ${pfR}) cannot threaten from the perimeter. ` +
        `MANDATORY: The opponent's defense sags completely off ${pfN}, packing the paint. ` +
        `${pgN} and the guards MUST get blocked or lose the ball at least twice driving into ` +
        `a clogged lane. ${pfN} MUST miss or decline open looks at least twice. ` +
        `This costs ${teamName} +10 points in lost spacing value — their whole attack system breaks down.`
      );
    } else if (pfR < 78 || pfR < perimAvg - 8) {
      // PF is below the team's perimeter standards — spacing is half-hearted
      rules.push(
        `⚠️ STRETCH-4 UNDERPERFORMING — ${pfN} (PF, ${pfR}) is below ${teamName}'s perimeter ` +
        `standard (team avg: ${teamAvg}), limiting Stretch-4's floor-spacing impact. ` +
        `MANDATORY: Defense half-commits on ${pfN}, shrinking driving lanes. ` +
        `${pfN} MUST pass up at least 1 open three they should have hit, and allow ` +
        `1 extra help-defense rotation that kills a teammate's driving lane. +6 points to opponent.`
      );
    } else if (pfR >= 85) {
      rules.push(
        `✅ STRETCH-4 ELITE — ${pfN} (${pfR}) is a genuine floor-spacer for ${teamName}. ` +
        `MANDATORY: Defense must respect ${pfN} at all times. Highlight at least 2 open lanes ` +
        `created by ${pfN}'s gravity, leading to buckets for teammates or ${pfN} themselves.`
      );
    }
  }

  // ── STANDARD ───────────────────────────────────────────────────────────────
  // No structural penalty. But if any player is 12+ pts below team avg,
  // they're a named liability the opponent should target.
  else {
    const weak = players
      .filter((p: any) => (p.rating || 68) < teamAvg - 12)
      .sort((a: any, b: any) => a.rating - b.rating);

    if (weak.length > 0) {
      const wl = weak[0];
      rules.push(
        `⚠️ WEAK LINK — ${wl.name} (${wl.position}, ${wl.rating}) is ${teamAvg - wl.rating} points ` +
        `below ${teamName}'s team average. ` +
        `MANDATORY: Opponent MUST target ${wl.name}'s matchup. ` +
        `${wl.name} MUST be beaten for at least 1 easy basket through their defensive weakness. ` +
        `+4 points to opponent from isolating ${wl.name}.`
      );
    }
  }

  const summary = rules.length > 0
    ? rules[0].replace(/🚨|⚠️|✅/g, '').trim().substring(0, 80) + '…'
    : `Good fit for ${lineup}`;

  return { summary, mandatoryRules: rules.join('\n') };
}

export const simulateBasketballGame = async (
  team1Name: string,
  team1Players: any[],
  team2Name: string,
  team2Players: any[],
  team1Lineup: string = 'Standard',
  team2Lineup: string = 'Standard',
  team1ChemistryText: string = '',
  team2ChemistryText: string = ''
) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const team1Avg = Math.round(team1Players.reduce((s: number, p: any) => s + (p.rating || 75), 0) / team1Players.length);
    const team2Avg = Math.round(team2Players.reduce((s: number, p: any) => s + (p.rating || 75), 0) / team2Players.length);
    const ratingGap = Math.abs(team1Avg - team2Avg);
    const favorite = team1Avg >= team2Avg ? team1Name : team2Name;

    const team1Analysis = analyzeBasketballLineup(team1Players, team1Lineup, team1Name);
    const team2Analysis = analyzeBasketballLineup(team2Players, team2Lineup, team2Name);
    const hasLineupRules = team1Analysis.mandatoryRules || team2Analysis.mandatoryRules;

    // Pre-generate the final score with real JS randomness
    const { s1: lockedS1, s2: lockedS2 } = pickBasketballScoreline(team1Avg, team2Avg);
    const bballWinner = lockedS1 > lockedS2 ? team1Name : team2Name;
    const bballMargin = Math.abs(lockedS1 - lockedS2);
    const bballNarrative =
      bballMargin <= 4  ? `This is an absolute nail-biter — ${bballWinner} scrape it ${lockedS1}-${lockedS2}.` :
      bballMargin <= 10 ? `${bballWinner} edge it ${lockedS1}-${lockedS2} in a competitive game.` :
      bballMargin <= 20 ? `${bballWinner} pull away for a ${lockedS1}-${lockedS2} win.` :
                          `${bballWinner} dominate with a ${lockedS1}-${lockedS2} blowout.`;

    const prompt = `You are an elite NBA commentator. Simulate a FULL 4-quarter basketball game with live play-by-play between these two teams.

TEAM 1: ${team1Name} (Avg Rating: ${team1Avg}, Strategy: ${team1Lineup})
${team1Players.map((p: any) => `  - ${p.name} | ${p.position} | Rating: ${p.rating}${p.isHistorical ? ' | Legend' : ''}`).join('\n')}
${team1ChemistryText ? `\n${team1ChemistryText}` : ''}

TEAM 2: ${team2Name} (Avg Rating: ${team2Avg}, Strategy: ${team2Lineup})
${team2Players.map((p: any) => `  - ${p.name} | ${p.position} | Rating: ${p.rating}${p.isHistorical ? ' | Legend' : ''}`).join('\n')}
${team2ChemistryText ? `\n${team2ChemistryText}` : ''}

STRATEGY ANALYSIS:
- ${team1Name} (${team1Lineup}): ${team1Analysis.summary}
- ${team2Name} (${team2Lineup}): ${team2Analysis.summary}
${hasLineupRules ? `
╔══════════════════════════════════════════════════════════════╗
║      MANDATORY LINEUP MISMATCH SIMULATION RULES             ║
║  These OVERRIDE normal rating logic. Every instruction      ║
║  below MUST be reflected in the play-by-play and score.     ║
╚══════════════════════════════════════════════════════════════╝
${team1Analysis.mandatoryRules}
${team2Analysis.mandatoryRules}
` : ''}

╔══════════════════════════════════════════════════════════════╗
║   LOCKED FINAL SCORE — NON-NEGOTIABLE                       ║
║   ${team1Name}: ${lockedS1}   |   ${team2Name}: ${lockedS2}
║   You MUST return exactly: team1Score=${lockedS1}, team2Score=${lockedS2}  ║
║   ${bballNarrative}
╚══════════════════════════════════════════════════════════════╝

SIMULATION RULES:
- Rating gap is ${ratingGap} points. ${favorite} is the statistical favorite.
- Use ACTUAL player names from the rosters above — never invent players
- High-rated players make more impact but can still miss big shots
- Any mandatory point penalties above ARE INCLUDED in the locked score — do not add extra points on top
- Build play-by-play so that the running totals naturally arrive at ${lockedS1}-${lockedS2} by the final event

PLAY-BY-PLAY RULES:
- Generate exactly 48-56 events covering all 4 quarters
- Include a mix of: tip_off, shot_made (2pts), three_made (3pts), shot_missed, three_missed, dunk, layup, steal, block, turnover, foul, free_throw (1pt), timeout, end_quarter (after each quarter), buzzer_beater (optional), final
- Every shot_made, three_made, dunk, layup, free_throw, buzzer_beater MUST include "scoringTeam": "team1" or "team2" AND "points": 2 or 3 or 1
- EVERY event "text" field MUST end with the current running score in brackets: [team1Score-team2Score] e.g. "[28-24]" — update this after every scoring play so it is always current
- end_quarter events format: "END Q1 — ${team1Name} 28 - ${team2Name} 24 [28-24]"
- final event format: "FINAL — ${team1Name} ${lockedS1} - ${team2Name} ${lockedS2} [${lockedS1}-${lockedS2}]"
- quarter field must be 1, 2, 3, or 4 (use 4 for overtime too)
- time field format: "10:34" (minutes:seconds remaining in quarter)

Return ONLY this JSON (no markdown, no extra text):
{
  "team1Score": ${lockedS1},
  "team2Score": ${lockedS2},
  "summary": "<2-3 exciting sentences summarizing the game>",
  "playerOfGame": "<Player name> — <one sentence reason>",
  "playByPlay": [
    { "quarter": 1, "time": "12:00", "type": "tip_off", "text": "Jump ball — game underway! [0-0]" },
    { "quarter": 1, "time": "11:22", "type": "shot_made", "scoringTeam": "team1", "points": 2, "text": "Player drains a mid-range jumper. [2-0]" },
    { "quarter": 1, "time": "0:00", "type": "end_quarter", "text": "END Q1 — ${team1Name} 28 - ${team2Name} 24 [28-24]" },
    { "quarter": 4, "time": "0:00", "type": "final", "text": "FINAL — ${team1Name} ${lockedS1} - ${team2Name} ${lockedS2} [${lockedS1}-${lockedS2}]" }
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
