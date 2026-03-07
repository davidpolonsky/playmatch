export interface Player {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  rating: number;
  imageUrl: string;
  isHistorical?: boolean;
  year?: string;
}

export interface Formation {
  name: string;
  positions: {
    GK: number;
    DEF: number;
    MID: number;
    FWD: number;
  };
}

export const FORMATIONS: Record<string, Formation> = {
  '4-4-2': {
    name: '4-4-2',
    positions: { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  },
  '4-3-3': {
    name: '4-3-3',
    positions: { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  },
  '3-5-2': {
    name: '3-5-2',
    positions: { GK: 1, DEF: 3, MID: 5, FWD: 2 },
  },
  '4-2-3-1': {
    name: '4-2-3-1',
    positions: { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  },
  '3-4-3': {
    name: '3-4-3',
    positions: { GK: 1, DEF: 3, MID: 4, FWD: 3 },
  },
};

export const selectBestStarting11 = (
  players: Player[],
  formation: string
): Player[] => {
  const formationConfig = FORMATIONS[formation];
  if (!formationConfig) {
    throw new Error('Invalid formation');
  }

  const starting11: Player[] = [];
  const positions: Array<'GK' | 'DEF' | 'MID' | 'FWD'> = ['GK', 'DEF', 'MID', 'FWD'];

  positions.forEach(position => {
    const count = formationConfig.positions[position];
    const positionPlayers = players
      .filter(p => p.position === position)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, count);
    
    starting11.push(...positionPlayers);
  });

  return starting11;
};

export const validateStarting11 = (
  players: Player[],
  formation: string
): { valid: boolean; message?: string } => {
  if (players.length !== 11) {
    return { valid: false, message: 'Team must have exactly 11 players' };
  }

  const formationConfig = FORMATIONS[formation];
  const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };

  players.forEach(player => {
    counts[player.position]++;
  });

  const positions: Array<'GK' | 'DEF' | 'MID' | 'FWD'> = ['GK', 'DEF', 'MID', 'FWD'];
  
  for (const position of positions) {
    if (counts[position] !== formationConfig.positions[position]) {
      return {
        valid: false,
        message: `Formation ${formation} requires ${formationConfig.positions[position]} ${position} but has ${counts[position]}`,
      };
    }
  }

  return { valid: true };
};
