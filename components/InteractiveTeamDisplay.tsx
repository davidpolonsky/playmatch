'use client';

import { Player, Formation } from '@/lib/types';
import { useState } from 'react';

interface InteractiveTeamDisplayProps {
  players: Player[];
  allPlayers: Player[];
  formation: Formation;
  onRemoveFromTeam: (playerId: string) => void;
  onAddToTeam: (playerId: string) => void;
}

// Format name as "J. Smith"
function formatPlayerName(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return name;
  const firstInitial = parts[0][0];
  const lastName = parts[parts.length - 1];
  return `${firstInitial}. ${lastName}`;
}

export default function InteractiveTeamDisplay({
  players,
  allPlayers,
  formation,
  onRemoveFromTeam,
  onAddToTeam,
}: InteractiveTeamDisplayProps) {
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<string | null>(null);

  const playersByPosition = {
    GK: players.filter((p) => p.position === 'GK'),
    DEF: players.filter((p) => p.position === 'DEF'),
    MID: players.filter((p) => p.position === 'MID'),
    FWD: players.filter((p) => p.position === 'FWD'),
  };

  // Get available players for each position (not in starting 11)
  const playerIds = new Set(players.map(p => p.id));
  const availableByPosition = {
    GK: allPlayers.filter(p => p.position === 'GK' && !playerIds.has(p.id)),
    DEF: allPlayers.filter(p => p.position === 'DEF' && !playerIds.has(p.id)),
    MID: allPlayers.filter(p => p.position === 'MID' && !playerIds.has(p.id)),
    FWD: allPlayers.filter(p => p.position === 'FWD' && !playerIds.has(p.id)),
  };

  const handleDragStart = (playerId: string) => {
    setDraggedPlayerId(playerId);
  };

  const handleDragEnd = () => {
    setDraggedPlayerId(null);
    setDragOverPosition(null);
  };

  const handleDragOver = (e: React.DragEvent, position: string) => {
    e.preventDefault();
    setDragOverPosition(position);
  };

  const handleDrop = (e: React.DragEvent, position: string) => {
    e.preventDefault();
    if (draggedPlayerId) {
      const draggedPlayer = allPlayers.find(p => p.id === draggedPlayerId);
      if (draggedPlayer && draggedPlayer.position === position) {
        if (playerIds.has(draggedPlayerId)) {
          // Removing from team (dragging within formation)
          onRemoveFromTeam(draggedPlayerId);
        } else {
          // Adding to team (dragging from roster)
          onAddToTeam(draggedPlayerId);
        }
      }
    }
    setDraggedPlayerId(null);
    setDragOverPosition(null);
  };

  const renderPlayerCard = (player: Player) => (
    <div
      key={player.id}
      draggable
      onDragStart={() => handleDragStart(player.id)}
      onDragEnd={handleDragEnd}
      className="relative bg-white border-2 border-gray-300 rounded-lg p-2 shadow-md hover:shadow-lg transition-all text-center cursor-move group w-20"
    >
      {/* X button to remove */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemoveFromTeam(player.id);
        }}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 flex items-center justify-center z-10 font-bold"
        title="Remove from team"
      >
        ✕
      </button>

      <div className="font-headline text-[10px] mb-1 text-fifa-amber font-bold truncate leading-tight">
        {formatPlayerName(player.name)}
      </div>
      <div className="text-[8px] font-retro text-gray-600 uppercase tracking-widest">
        {player.position}
      </div>
      <div className="mt-1 text-sm font-bold text-blue-600">{player.rating}</div>
      {player.isHistorical && (
        <div className="mt-1 text-[7px] text-purple-600">★</div>
      )}
    </div>
  );

  const renderEmptySlot = (position: 'GK' | 'DEF' | 'MID' | 'FWD', index: number) => {
    const available = availableByPosition[position].sort((a, b) => b.rating - a.rating);
    const isDragOver = dragOverPosition === `${position}-${index}`;

    return (
      <div
        key={`empty-${position}-${index}`}
        onDragOver={(e) => handleDragOver(e, `${position}-${index}`)}
        onDrop={(e) => handleDrop(e, position)}
        className={`bg-white/10 rounded-lg p-2 shadow-md w-20 h-24 flex flex-col items-center justify-center border-2 border-dashed transition-all ${
          isDragOver ? 'border-fifa-mint bg-fifa-mint/10' : 'border-gray-400'
        }`}
      >
        <span className="text-white/60 text-[9px] font-retro mb-1">{position}</span>
        {available.length > 0 && (
          <button
            onClick={() => onAddToTeam(available[0].id)}
            className="text-fifa-mint hover:text-fifa-cream transition-colors text-lg"
            title={`Add ${formatPlayerName(available[0].name)}`}
          >
            +
          </button>
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
      <div className="text-center font-headline text-[11px] text-fifa-cream/60 mb-2">
        {formation.name} Formation
      </div>

      {/* Forward */}
      <div className="space-y-2">
        {renderPositionRow('FWD', formation.positions.FWD)}
      </div>

      {/* Midfield */}
      <div className="space-y-2">
        {renderPositionRow('MID', formation.positions.MID)}
      </div>

      {/* Defense */}
      <div className="space-y-2">
        {renderPositionRow('DEF', formation.positions.DEF)}
      </div>

      {/* Goalkeeper */}
      <div className="space-y-2">
        {renderPositionRow('GK', formation.positions.GK)}
      </div>

      <div className="text-center bg-fifa-dark/50 rounded-lg p-3 mt-4 border border-fifa-border">
        {players.length === 11 ? (
          <p className="font-retro text-[9px] text-fifa-mint mb-1">
            ✓ Complete team
          </p>
        ) : (
          <>
            <p className="font-retro text-[9px] text-fifa-mint mb-1">
              Need {11 - players.length} more player{players.length !== 10 ? 's' : ''}
            </p>
            <p className="font-headline text-[9px] text-white/40">
              Click + on empty slots or drag from roster
            </p>
          </>
        )}
      </div>
    </div>
  );
}
