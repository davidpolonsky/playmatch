'use client';

import { Player, Formation } from '@/lib/types';
import { useState } from 'react';

interface EditableTeamDisplayProps {
  players: Player[];
  allPlayers: Player[];
  formation: Formation;
  onRemovePlayer: (playerId: string) => void;
  onAddPlayer: (playerId: string) => void;
}

export default function EditableTeamDisplay({
  players,
  allPlayers,
  formation,
  onRemovePlayer,
  onAddPlayer,
}: EditableTeamDisplayProps) {
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);

  const playersByPosition = {
    GK: players.filter((p) => p.position === 'GK'),
    DEF: players.filter((p) => p.position === 'DEF'),
    MID: players.filter((p) => p.position === 'MID'),
    FWD: players.filter((p) => p.position === 'FWD'),
  };

  // Get available players for each position
  const availablePlayersByPosition = {
    GK: allPlayers.filter(p => p.position === 'GK' && !players.find(pl => pl.id === p.id)),
    DEF: allPlayers.filter(p => p.position === 'DEF' && !players.find(pl => pl.id === p.id)),
    MID: allPlayers.filter(p => p.position === 'MID' && !players.find(pl => pl.id === p.id)),
    FWD: allPlayers.filter(p => p.position === 'FWD' && !players.find(pl => pl.id === p.id)),
  };

  const handleDragStart = (playerId: string) => {
    setDraggedPlayerId(playerId);
  };

  const handleDragEnd = () => {
    setDraggedPlayerId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropRemove = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedPlayerId) {
      onRemovePlayer(draggedPlayerId);
      setDraggedPlayerId(null);
    }
  };

  const renderPlayerCard = (player: Player) => (
    <div
      key={player.id}
      draggable
      onDragStart={() => handleDragStart(player.id)}
      onDragEnd={handleDragEnd}
      className="relative bg-fifa-dark border border-fifa-border rounded-lg p-3 shadow-retro hover:scale-105 hover:border-fifa-mint hover:shadow-glow transition-all text-center cursor-move group"
    >
      {/* Remove button */}
      <button
        onClick={() => onRemovePlayer(player.id)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 flex items-center justify-center z-10"
        title="Remove player"
      >
        ✕
      </button>

      <div className="font-headline text-[11px] mb-1 truncate text-fifa-cream leading-tight">{player.name}</div>
      <div className="text-[9px] font-retro text-fifa-mint uppercase tracking-widest">{player.position}</div>
      <div className="mt-1 text-sm font-bold text-fifa-amber">{player.rating}</div>
      {player.isHistorical && (
        <div className="mt-1 text-[9px] text-fifa-mint/70 italic">{player.era}</div>
      )}
    </div>
  );

  const renderEmptySlot = (position: 'GK' | 'DEF' | 'MID' | 'FWD', index: number) => {
    const available = availablePlayersByPosition[position];
    const topAvailable = available.sort((a, b) => b.rating - a.rating).slice(0, 3);

    return (
      <div
        key={`empty-${position}-${index}`}
        className="relative bg-fifa-dark/30 rounded-lg p-3 shadow-md w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-fifa-border group hover:border-fifa-mint/50 transition-colors"
      >
        <span className="text-white/40 text-xs font-retro mb-1">{position}</span>

        {/* Show quick-add dropdown on hover if players available */}
        {topAvailable.length > 0 && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 hidden group-hover:block z-20 w-48">
            <div className="bg-fifa-dark border border-fifa-mint rounded-lg shadow-glow p-2 space-y-1">
              <div className="font-retro text-[7px] text-fifa-mint/60 uppercase tracking-wider mb-1 text-center">
                Add Player
              </div>
              {topAvailable.map(player => (
                <button
                  key={player.id}
                  onClick={() => onAddPlayer(player.id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-fifa-mint/10 rounded transition-colors text-left"
                >
                  <span className="font-headline text-[10px] text-fifa-cream truncate flex-1">
                    {player.name}
                  </span>
                  <span className="font-headline text-[9px] text-fifa-amber font-bold ml-1">
                    {player.rating}
                  </span>
                </button>
              ))}
              {available.length > 3 && (
                <div className="text-center pt-1 border-t border-fifa-border">
                  <span className="font-retro text-[7px] text-white/30">
                    +{available.length - 3} more in roster
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {topAvailable.length === 0 && (
          <span className="text-white/20 text-[10px] font-headline">
            No {position}s
          </span>
        )}
      </div>
    );
  };

  const renderPositionRow = (position: 'GK' | 'DEF' | 'MID' | 'FWD', count: number) => {
    const posPlayers = playersByPosition[position].slice(0, count);
    const emptySlots = count - posPlayers.length;

    return (
      <div className="flex justify-center gap-2 flex-wrap">
        {posPlayers.map(renderPlayerCard)}
        {Array.from({ length: emptySlots }).map((_, i) => renderEmptySlot(position, i))}
      </div>
    );
  };

  return (
    <div className="formation-grid space-y-4">
      {/* Drag to remove zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDropRemove}
        className={`text-center p-3 rounded-lg border-2 border-dashed transition-all ${
          draggedPlayerId
            ? 'border-red-400 bg-red-500/10'
            : 'border-transparent bg-transparent'
        }`}
      >
        {draggedPlayerId && (
          <p className="font-retro text-[8px] text-red-400 tracking-wider">
            ↓ DROP HERE TO REMOVE
          </p>
        )}
      </div>

      <div className="text-center font-headline text-[10px] text-fifa-cream/60 mb-2">
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
        <div className="text-center bg-fifa-dark/50 rounded-lg p-4 mt-4 border border-fifa-border">
          <p className="font-retro text-[9px] text-fifa-mint mb-1">
            Need {11 - players.length} more player{players.length !== 10 ? 's' : ''}
          </p>
          <p className="font-headline text-[10px] text-white/40">
            Scan cards or hover over empty slots to add
          </p>
        </div>
      )}
    </div>
  );
}
