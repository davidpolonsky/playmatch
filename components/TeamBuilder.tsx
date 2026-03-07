'use client';

import { Player } from '@/lib/types';

interface TeamBuilderProps {
  players: Player[];
  formation: string;
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
      <div className="text-white text-center mb-4 font-bold">
        Formation: {formation}
      </div>
      
      <div className="flex flex-col gap-8 items-center">
        <div className="flex gap-4 justify-center">
          {positionGroups.FWD.map((player, i) => (
            <PlayerCard key={i} player={player} />
          ))}
        </div>
        
        <div className="flex gap-4 justify-center">
          {positionGroups.MID.map((player, i) => (
            <PlayerCard key={i} player={player} />
          ))}
        </div>
        
        <div className="flex gap-4 justify-center">
          {positionGroups.DEF.map((player, i) => (
            <PlayerCard key={i} player={player} />
          ))}
        </div>
        
        <div className="flex gap-4 justify-center">
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
      <div className="font-bold text-xs truncate">{player.name}</div>
      <div className="text-xs text-gray-600">{player.position}</div>
      <div className="text-sm font-semibold text-blue-600">{player.rating}</div>
      {player.isHistorical && (
        <div className="text-xs text-amber-600">★</div>
      )}
    </div>
  );
}
