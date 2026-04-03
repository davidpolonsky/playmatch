import { Player } from './types';
import { BasketballPlayer } from './types-basketball';

// ── Shared types ────────────────────────────────────────────────────────────

export interface ChemistryBonus {
  type: 'club' | 'national' | 'era' | 'team' | 'youth';
  label: string;           // e.g. "Arsenal Club Bond"
  emoji: string;           // e.g. "🔴"
  players: string[];       // player names involved
  bonusPerPlayer: number;  // e.g. +4
  flavor: string;          // narrative flavor for the AI prompt
}

export interface ChemistryResult {
  chemistryScore: number;          // 0-100
  activeBonuses: ChemistryBonus[];
  playerBonuses: Record<string, number>; // player id → total bonus (capped at +6)
  promptText: string;              // ready-to-inject text for the AI prompt
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function groupBy<T>(items: T[], key: (item: T) => string | undefined): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  items.forEach(item => {
    const k = key(item);
    if (!k) return;
    if (!out[k]) out[k] = [];
    out[k].push(item);
  });
  return out;
}

function decadeOf(year?: string): string | undefined {
  if (!year) return undefined;
  const n = parseInt(year.replace(/\D/g, '').slice(0, 4));
  if (isNaN(n)) return undefined;
  return `${Math.floor(n / 10) * 10}s`;
}

const MAX_PLAYER_BONUS = 6;

function applyBonuses(
  players: { id: string }[],
  bonuses: ChemistryBonus[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  players.forEach(p => { totals[p.id] = 0; });
  bonuses.forEach(bonus => {
    players.forEach(p => {
      const playerName = (p as any).name as string;
      if (bonus.players.includes(playerName)) {
        totals[p.id] = Math.min(MAX_PLAYER_BONUS, (totals[p.id] || 0) + bonus.bonusPerPlayer);
      }
    });
  });
  return totals;
}

function chemScore(bonuses: ChemistryBonus[], total: number): number {
  if (bonuses.length === 0) return 0;
  const maxPossible = total * MAX_PLAYER_BONUS;
  const actual = bonuses.reduce((s, b) => s + b.players.length * b.bonusPerPlayer, 0);
  return Math.min(100, Math.round((actual / maxPossible) * 100));
}

// ── Soccer Chemistry ─────────────────────────────────────────────────────────

export function calculateSoccerChemistry(players: Player[]): ChemistryResult {
  const bonuses: ChemistryBonus[] = [];

  // Club Bond
  const byClub = groupBy(players, p => p.club);
  Object.entries(byClub).forEach(([club, group]) => {
    const n = group.length;
    if (n < 3) return;
    const bonus = n >= 9 ? 6 : n >= 6 ? 4 : 2;
    const tier = n >= 9 ? 'Elite' : n >= 6 ? 'Strong' : 'Active';
    bonuses.push({
      type: 'club',
      label: `${club} Club Bond`,
      emoji: '🏟️',
      players: group.map(p => p.name),
      bonusPerPlayer: bonus,
      flavor: `${tier} club chemistry — ${n} ${club} teammates with shared training ground instincts and automatic passing patterns. They find each other without looking.`,
    });
  });

  // National Unity
  const byNation = groupBy(players, p => p.nationality);
  Object.entries(byNation).forEach(([nat, group]) => {
    const n = group.length;
    if (n < 3) return;
    const bonus = n >= 9 ? 3 : n >= 6 ? 2 : 1;
    const tier = n >= 9 ? 'Full International' : n >= 6 ? 'Strong' : 'Active';
    bonuses.push({
      type: 'national',
      label: `${nat} National Unity`,
      emoji: '🌍',
      players: group.map(p => p.name),
      bonusPerPlayer: bonus,
      flavor: `${tier} national chemistry — ${n} ${nat} players with international understanding, shared tactical language, and pride playing together for country.`,
    });
  });

  // Era Cohesion
  const byEra = groupBy(players, p => decadeOf(p.year));
  Object.entries(byEra).forEach(([era, group]) => {
    const n = group.length;
    if (n < 5) return;
    const bonus = n >= 8 ? 2 : 1;
    bonuses.push({
      type: 'era',
      label: `${era} Era Cohesion`,
      emoji: '⏳',
      players: group.map(p => p.name),
      bonusPerPlayer: bonus,
      flavor: `Era cohesion — ${n} players from the ${era} share the same era of football, playing the same pressing style and reading the game with identical instincts.`,
    });
  });

  // Youth Energy (rookies and players under 21)
  const youngPlayers = players.filter(p => p.age && p.age <= 21);
  if (youngPlayers.length >= 2) {
    const n = youngPlayers.length;
    const bonus = n >= 4 ? 4 : 3;
    const tier = n >= 4 ? 'Explosive' : 'Active';
    bonuses.push({
      type: 'youth',
      label: 'Youth Energy ⚡',
      emoji: '⚡',
      players: youngPlayers.map(p => p.name),
      bonusPerPlayer: bonus,
      flavor: `${tier} youth energy — ${n} players age 21 or under bring fearless speed, relentless pressing, and electric pace. BUT they also bring inexperience: expect more turnovers, rushed decisions, occasional defensive lapses, and positional mistakes. The energy is real but volatile — high risk, high reward.`,
    });
  }

  const playerBonuses = applyBonuses(players, bonuses);
  const chemistryScore = chemScore(bonuses, players.length);
  const promptText = buildSoccerPromptText(players, bonuses, playerBonuses);

  return { chemistryScore, activeBonuses: bonuses, playerBonuses, promptText };
}

function buildSoccerPromptText(
  players: Player[],
  bonuses: ChemistryBonus[],
  playerBonuses: Record<string, number>,
): string {
  if (bonuses.length === 0) return '';

  const lines: string[] = [
    '╔══════════════════════════════════════════════════════════╗',
    '║              CHEMISTRY BONUSES ACTIVE                   ║',
    '╚══════════════════════════════════════════════════════════╝',
  ];

  bonuses.forEach(b => {
    lines.push(`${b.emoji} ${b.label} (+${b.bonusPerPlayer} per player): ${b.players.join(', ')}`);
    lines.push(`   → ${b.flavor}`);
  });

  lines.push('');
  lines.push('Effective ratings (base + chemistry bonus):');
  players.forEach(p => {
    const bonus = playerBonuses[p.id] || 0;
    if (bonus > 0) {
      lines.push(`  • ${p.name} | ${p.position} | Base: ${p.rating} | Chemistry: +${bonus} | Effective: ${p.rating + bonus}`);
    }
  });

  lines.push('');
  lines.push('CHEMISTRY INSTRUCTIONS: You MUST weave these connections into the commentary.');
  lines.push('Reference club familiarity ("that Arsenal one-two is second nature to them"),');
  lines.push('national pride ("the England boys dovetail perfectly"), or era instincts.');
  lines.push('Chemistry bonuses ARE reflected in the effective ratings above — use them.');

  return lines.join('\n');
}

// ── Basketball Chemistry ─────────────────────────────────────────────────────

export function calculateBasketballChemistry(players: BasketballPlayer[]): ChemistryResult {
  const bonuses: ChemistryBonus[] = [];

  // Team Bond (NBA franchise)
  const byTeam = groupBy(players, p => p.nbaTeam);
  Object.entries(byTeam).forEach(([team, group]) => {
    const n = group.length;
    if (n < 3) return;
    const bonus = n === 5 ? 6 : n === 4 ? 4 : 2;
    const tier = n === 5 ? 'Dynasty' : n === 4 ? 'Strong' : 'Active';
    bonuses.push({
      type: 'team',
      label: `${team} Team Bond`,
      emoji: '🏀',
      players: group.map(p => p.name),
      bonusPerPlayer: bonus,
      flavor: `${tier} team chemistry — ${n} ${team} teammates. They know each other's cuts, screens, and tendencies without a word spoken. The ball moves like water.`,
    });
  });

  // National Pride
  const byNation = groupBy(players, p => p.nationality);
  Object.entries(byNation).forEach(([nat, group]) => {
    const n = group.length;
    if (n < 3) return;
    const bonus = n === 5 ? 3 : 1;
    bonuses.push({
      type: 'national',
      label: `${nat} National Pride`,
      emoji: '🌍',
      players: group.map(p => p.name),
      bonusPerPlayer: bonus,
      flavor: `National chemistry — ${n} ${nat} players with shared basketball culture and international experience playing together.`,
    });
  });

  // Era Cohesion
  const byEra = groupBy(players, p => decadeOf(p.year));
  Object.entries(byEra).forEach(([era, group]) => {
    const n = group.length;
    if (n < 3) return;
    const bonus = n === 5 ? 2 : 1;
    bonuses.push({
      type: 'era',
      label: `${era} Era Cohesion`,
      emoji: '⏳',
      players: group.map(p => p.name),
      bonusPerPlayer: bonus,
      flavor: `Era cohesion — ${n} players from the ${era} era share the same pace of play, defensive principles, and basketball IQ.`,
    });
  });

  // Youth Energy (rookies and players under 21)
  const youngPlayers = players.filter(p => p.age && p.age <= 21);
  if (youngPlayers.length >= 2) {
    const n = youngPlayers.length;
    const bonus = n >= 4 ? 4 : 3;
    const tier = n >= 4 ? 'Explosive' : 'Active';
    bonuses.push({
      type: 'youth',
      label: 'Youth Energy ⚡',
      emoji: '⚡',
      players: youngPlayers.map(p => p.name),
      bonusPerPlayer: bonus,
      flavor: `${tier} youth energy — ${n} players age 21 or under bring explosive athleticism, fearless attacks on the rim, relentless transition speed, and electric fast breaks. BUT they also bring rookie mistakes: expect more turnovers, bad shots, blown defensive assignments, and overcommitting on blocks. The energy is real but chaotic — high octane, high risk.`,
    });
  }

  const playerBonuses = applyBonuses(players, bonuses);
  const chemistryScore = chemScore(bonuses, players.length);
  const promptText = buildBballPromptText(players, bonuses, playerBonuses);

  return { chemistryScore, activeBonuses: bonuses, playerBonuses, promptText };
}

function buildBballPromptText(
  players: BasketballPlayer[],
  bonuses: ChemistryBonus[],
  playerBonuses: Record<string, number>,
): string {
  if (bonuses.length === 0) return '';

  const lines: string[] = [
    '╔══════════════════════════════════════════════════════════╗',
    '║              CHEMISTRY BONUSES ACTIVE                   ║',
    '╚══════════════════════════════════════════════════════════╝',
  ];

  bonuses.forEach(b => {
    lines.push(`${b.emoji} ${b.label} (+${b.bonusPerPlayer} per player): ${b.players.join(', ')}`);
    lines.push(`   → ${b.flavor}`);
  });

  lines.push('');
  lines.push('Effective ratings (base + chemistry bonus):');
  players.forEach(p => {
    const bonus = playerBonuses[p.id] || 0;
    if (bonus > 0) {
      lines.push(`  • ${p.name} | ${p.position} | Base: ${p.rating} | Chemistry: +${bonus} | Effective: ${p.rating + bonus}`);
    }
  });

  lines.push('');
  lines.push('CHEMISTRY INSTRUCTIONS: You MUST reference these connections in the commentary.');
  lines.push('Mention franchise familiarity ("those two ran this play a thousand times in Chicago"),');
  lines.push('national pride, or era-based instincts. Chemistry bonuses ARE in the effective ratings above.');

  return lines.join('\n');
}
