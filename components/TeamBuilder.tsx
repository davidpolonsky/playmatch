'use client';

import { Player } from '@/lib/types';

interface TeamBuilderProps {
  players: Player[];
  formation: string;
}

// Format name as "J. Smith"
function formatPlayerName(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return name;
  const firstInitial = parts[0][0];
  const lastName = parts[parts.length - 1];
  return `${firstInitial}. ${lastName}`;
}

export default function TeamBuilder({ players, formation }: TeamBuilderProps) {
  const positionGroups = {
    GK: players.filter(p => p.position === 'GK'),
    DEF: players.filter(p => p.position === 'DEF'),
    MID: players.filter(p => p.position === 'MID'),
    FWD: players.filter(p => p.position === 'FWD'),
  };

  return (
    <div className="bg-green-700 rounded-lg p-6 relative" style={{ minHeight: '400px' }}>
      <div className="text-white text-center mb-4 font-headline text-[11px]">
        Formation: {formation}
      </div>

      <div className="flex flex-col gap-8 items-center">
        <div className="flex gap-4 justify-center flex-wrap">
          {positionGroups.FWD.map((player, i) => (
            <PlayerCard key={i} player={player} />
          ))}
        </div>

        <div className="flex gap-4 justify-center flex-wrap">
          {positionGroups.MID.map((player, i) => (
            <PlayerCard key={i} player={player} />
          ))}
        </div>

        <div className="flex gap-4 justify-center flex-wrap">
          {positionGroups.DEF.map((player, i) => (
            <PlayerCard key={i} player={player} />
          ))}
        </div>

        <div className="flex gap-4 justify-center flex-wrap">
          {positionGroups.GK.map((player, i) => (
            <PlayerCard key={i} player={player} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ player }: { player: Player }) {
  return (
    <div className="bg-white rounded p-2 text-center shadow-md" style={{ width: '80px' }}>
      <div className="font-headline text-[10px] font-bold text-fifa-amber truncate leading-tight">
        {formatPlayerName(player.name)}
      </div>
      <div className="text-[8px] font-retro text-gray-600 uppercase tracking-widest mt-1">
        {player.position}
      </div>
      <div className="text-sm font-bold text-blue-600 mt-1">{player.rating}</div>
      {player.isHistorical && (
        <div className="text-[7px] text-purple-600 mt-0.5">★</div>
      )}
    </div>
  );
}
