export type BasketballPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export interface BasketballPlayer {
  id: string;
  name: string;
  position: BasketballPosition;
  rating: number;
  imageUrl: string;
  isHistorical?: boolean;
  year?: string;
  era?: string;
  nationality?: string; // e.g. "American", "Serbian", "Greek"
  nbaTeam?: string;     // e.g. "Chicago Bulls", "Golden State Warriors"
  rarity?: 'common' | 'rare' | 'legendary'; // card rarity tier
  cardValue?: number;   // estimated market value in USD
  skinTone?: 'light' | 'medium' | 'tan' | 'dark' | 'brown' | 'ebony' | 'pale' | 'olive';
  hairColor?: 'blonde' | 'lightbrown' | 'brown' | 'darkbrown' | 'black' | 'red' | 'auburn' | 'gray' | 'platinum' | 'none';
  hairStyle?: 'short' | 'long' | 'bald' | 'curly';
}

export interface BasketballTeam {
  id?: string;
  shareId?: string;
  name: string;
  lineup: string;
  players: BasketballPlayer[];
  userId: string;
  createdAt?: Date | unknown;
  updatedAt?: Date | unknown;
}

export interface BasketballGameResult {
  team1Score: number;
  team2Score: number;
  summary: string;
  playerOfGame: string;
  playByPlay: BasketballPlayEvent[];
}

export interface BasketballPlayEvent {
  quarter: number;
  time: string;      // e.g. "8:42"
  type: string;
  text: string;
  scoringTeam?: 'team1' | 'team2';
  points?: 1 | 2 | 3;
}

// Basketball lineup strategies — always 5 players, 1 per position
export interface BasketballLineup {
  name: string;
  description: string;
}

export const BASKETBALL_LINEUPS: Record<string, BasketballLineup> = {
  'Standard': {
    name: 'Standard',
    description: 'Classic 5-man lineup. 1 PG, 1 SG, 1 SF, 1 PF, 1 C.',
  },
  'Small Ball': {
    name: 'Small Ball',
    description: 'Speed and spacing over size. SF plays the 4, PF plays center.',
  },
  'Twin Towers': {
    name: 'Twin Towers',
    description: 'Dominant in the paint. Two big men controlling the boards.',
  },
  'Stretch-4': {
    name: 'Stretch-4',
    description: 'Floor-spacing lineup. PF shoots from distance, C anchors the paint.',
  },
};

export const BASKETBALL_POSITION_ORDER: BasketballPosition[] = ['PG', 'SG', 'SF', 'PF', 'C'];

// Required positions for a starting 5 (always one of each)
export const BASKETBALL_ROSTER_REQUIREMENTS: Record<BasketballPosition, number> = {
  PG: 1, SG: 1, SF: 1, PF: 1, C: 1,
};
