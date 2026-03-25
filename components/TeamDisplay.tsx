'use client';

import { Player, Formation } from '@/lib/types';

interface TeamDisplayProps {
  players: Player[];
  formation: Formation;
}

export default function TeamDisplay({ players, formation }: TeamDisplayProps) {
  const playersByPosition = {
    GK: players.filter((p) => p.position === 'GK'),
    DEF: players.filter((p) => p.position === 'DEF'),
    MID: players.filter((p) => p.position === 'MID'),
    FWD: players.filter((p) => p.position === 'FWD'),
  };

  const renderPlayerCard = (player: Player) => (
    <div
      key={player.id}
      className="bg-fifa-green/90 border-2 border-fifa-mint rounded-lg p-3 shadow-retro hover:scale-105 hover:border-fifa-gold transition-all text-center font-retro text-fifa-cream"
    >
      <div className="font-headline text-xs mb-1 truncate text-fifa-mint drop-shadow">{player.name}</div>
      <div className="text-[10px] text-fifa-gold uppercase tracking-widest">{player.position}</div>
      <div className="mt-1 text-xs font-bold text-fifa-gold">{player.rating}</div>
      {player.isHistorical && (
        <div className="mt-1 text-[10px] text-fifa-mint italic">{player.era}</div>
      )}
    </div>
  );

  const renderPositionRow = (position: 'GK' | 'DEF' | 'MID' | 'FWD', count: number) => {
    const posPlayers = playersByPosition[position].slice(0, count);
    const emptySlots = count - posPlayers.length;

    return (
      <div className="flex justify-center gap-2">
        {posPlayers.map(renderPlayerCard)}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div
            key={`empty-${position}-${i}`}
            className="bg-white bg-opacity-20 rounded-lg p-3 shadow-md w-24 h-24 flex items-center justify-center border-2 border-dashed border-white"
          >
            <span className="text-white text-xs">{position}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="formation-grid">
      <div className="text-center text-white font-semibold mb-2">
        {formation.name} Formation
      </div>
      
      {/* Forward */}
      {renderPositionRow('FWD', formation.positions.FWD)}
      
      {/* Midfield */}
      {renderPositionRow('MID', formation.positions.MID)}
      
      {/* Defense */}
      {renderPositionRow('DEF', formation.positions.DEF)}
      
      {/* Goalkeeper */}
      {renderPositionRow('GK', formation.positions.GK)}

      {players.length < 11 && (
        <div className="text-center text-white bg-black bg-opacity-30 rounded-lg p-4 mt-4">
          <p className="font-semibold">
            Need {11 - players.length} more player{players.length !== 10 ? 's' : ''}
          </p>
          <p className="text-sm mt-1">Upload more cards to complete your team</p>
        </div>
      )}
    </div>
  );
}
