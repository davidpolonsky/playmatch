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

    // OOP severity table:
    //   WAY out of position (2 goals against): GK→any, any→GK, DEF→FWD, FWD→DEF
    //   Minor out of position (1 goal against): DEF↔MID, MID↔FWD
    const isWayOOP = (from: string, to: string) =>
      from === 'GK' || to === 'GK' ||
      (from === 'DEF' && to === 'FWD') ||
      (from === 'FWD' && to === 'DEF');

    const analyzeSoccerLineup = (players: any[], formation: string, teamName: string) => {
      const parts = formation.split('-').map(Number);
      if (parts.length < 3) return { summary: 'Well-fitted', mandatoryRules: '' };

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

      if (oopPlayers.length === 0) return { summary: `Well-fitted for ${formation}`, mandatoryRules: '' };

      const rules: string[] = [];
      oopPlayers.forEach(({ player, naturalPos }, i) => {
        const playingAs = deficitSlots[i] || 'outfield';
        const way = isWayOOP(naturalPos, playingAs);

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

      return { summary, mandatoryRules: rules.join('\n') };
    };

    const team1Analysis = analyzeSoccerLineup(team1Players, team1Formation, team1Name);
    const team2Analysis = analyzeSoccerLineup(team2Players, team2Formation, team2Name);
    const hasOopRules = team1Analysis.mandatoryRules || team2Analysis.mandatoryRules;

    const prompt = `You are an elite soccer match commentator. Simulate a FULL match with live play-by-play commentary between these two teams.

TEAM 1: ${team1Name} (Average Rating: ${team1AvgRating}, Formation: ${team1Formation})
${team1Players.map((p: any) => `  - ${p.name} | ${p.position} | Rating: ${p.rating}${p.isHistorical ? ' | Historical legend' : ''}`).join('\n')}

TEAM 2: ${team2Name} (Average Rating: ${team2AvgRating}, Formation: ${team2Formation})
${team2Players.map((p: any) => `  - ${p.name} | ${p.position} | Rating: ${p.rating}${p.isHistorical ? ' | Historical legend' : ''}`).join('\n')}

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

SIMULATION RULES:
- Rating gap is ${ratingGap} points. ${favorite} is the statistical favorite.
- Rating gap 0-3: Toss-up — either team equally likely to win, draw is common
- Rating gap 4-8: Favorite wins ~65% of the time, underdog wins ~20%, draw ~15%
- Rating gap 9+: Favorite wins ~75% of the time, underdog wins ~10%, draw ~15%
- DO NOT always let the higher-rated team win. Upsets happen. Make the outcome feel earned.
- Use ACTUAL player names from the rosters above — never invent players.
- High-rated players should make more impactful plays but can still make mistakes.

SCORELINE VARIETY — Pick a random number 1-10 and use the matching style. Target ~6 total goals per game — this is an action-packed card game, not a 0-0 snooze-fest.
  1   → Dominant victory: 4-0, 5-0, 4-1 (one team simply outclasses the other)
  2   → Comfortable win: 3-0, 3-1, 4-1
  3   → Exciting win: 4-2, 5-2, 3-1 with late drama
  4   → Classic thriller: 3-2, 4-3 — lead changes hands, decided late
  5   → Back-and-forth draw: 2-2, 3-3, 4-4 — goals traded throughout
  6   → Comeback: trailing 0-2 or 1-3 at half, rally to 3-3 or win 4-3
  7   → Late drama: 2-2 at 80', then 2 goals in the last 10 mins — 4-2 or 3-4
  8   → Red card chaos: 10-man team concedes 3+ in second half, final 4-1 or 5-2
  9   → Extra time: 3-3 at 90', goal in 94-97' seals it 4-3
  10  → Goal-fest: 5-3, 6-2, 5-4 (both teams high rated ≥ 83, all-out attack)
RULES: Default to 5-8 total goals across the match. A 2-1 scoreline is BORING — avoid it unless it's a genuine last-minute winner flipping a 2-0. Always vary who leads when. The higher-rated team wins more often but underdogs can sneak it. Never produce the same scoreline twice in a row.

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
  team2Lineup: string = 'Standard'
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

    const prompt = `You are an elite NBA commentator. Simulate a FULL 4-quarter basketball game with live play-by-play between these two teams.

TEAM 1: ${team1Name} (Avg Rating: ${team1Avg}, Strategy: ${team1Lineup})
${team1Players.map((p: any) => `  - ${p.name} | ${p.position} | Rating: ${p.rating}${p.isHistorical ? ' | Legend' : ''}`).join('\n')}

TEAM 2: ${team2Name} (Avg Rating: ${team2Avg}, Strategy: ${team2Lineup})
${team2Players.map((p: any) => `  - ${p.name} | ${p.position} | Rating: ${p.rating}${p.isHistorical ? ' | Legend' : ''}`).join('\n')}

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
SIMULATION RULES:
- Rating gap is ${ratingGap} points. ${favorite} is the statistical favorite.
- Rating gap 0-3: Toss-up — either team equally likely to win, overtime is possible
- Rating gap 4-8: Favorite wins ~65% of the time, upset ~20%, close game ~15%
- Rating gap 9+: Favorite wins ~75% of the time, upset ~10%
- Final scores should be realistic NBA totals: each team scores 85-120 points
- NO ties — if scores are equal at end, one team wins by 2-3 in overtime
- Use ACTUAL player names from the rosters above — never invent players
- High-rated players make more impact but can still miss big shots
- Any mandatory point penalties above ARE INCLUDED in the final score — do not add extra goals on top

PLAY-BY-PLAY RULES:
- Generate exactly 48-56 events covering all 4 quarters
- Include a mix of: tip_off, shot_made (2pts), three_made (3pts), shot_missed, three_missed, dunk, layup, steal, block, turnover, foul, free_throw (1pt), timeout, end_quarter (after each quarter), buzzer_beater (optional), final
- Every shot_made, three_made, dunk, layup, free_throw, buzzer_beater MUST include "scoringTeam": "team1" or "team2" AND "points": 2 or 3 or 1
- EVERY event "text" field MUST end with the current running score in brackets: [team1Score-team2Score] e.g. "[28-24]" — update this after every scoring play so it is always current
- end_quarter events format: "END Q1 — ${team1Name} 28 - ${team2Name} 24 [28-24]"
- final event format: "FINAL — ${team1Name} X - ${team2Name} Y [X-Y]"
- quarter field must be 1, 2, 3, or 4 (use 4 for overtime too)
- time field format: "10:34" (minutes:seconds remaining in quarter)

Return ONLY this JSON (no markdown, no extra text):
{
  "team1Score": <number>,
  "team2Score": <number>,
  "summary": "<2-3 exciting sentences summarizing the game>",
  "playerOfGame": "<Player name> — <one sentence reason>",
  "playByPlay": [
    { "quarter": 1, "time": "12:00", "type": "tip_off", "text": "Jump ball — game underway! [0-0]" },
    { "quarter": 1, "time": "11:22", "type": "shot_made", "scoringTeam": "team1", "points": 2, "text": "Player drains a mid-range jumper. [2-0]" },
    { "quarter": 1, "time": "0:00", "type": "end_quarter", "text": "END Q1 — ${team1Name} 28 - ${team2Name} 24 [28-24]" },
    { "quarter": 4, "time": "0:00", "type": "final", "text": "FINAL — ${team1Name} X - ${team2Name} Y [X-Y]" }
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
