'use client';

import { Player } from '@/lib/types';
import { useState } from 'react';

interface InteractivePlayerListProps {
  allPlayers: Player[];
  teamPlayers: Player[];
  onAdd: (playerId: string) => void;
  onRemove: (playerId: string) => void;
}

const POSITION_ORDER = { GK: 0, DEF: 1, MID: 2, FWD: 3 } as const;

const POSITION_COLORS: Record<string, string> = {
  GK:  'bg-fifa-amber/20 text-fifa-amber border border-fifa-amber/30',
  DEF: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  MID: 'bg-fifa-mint/20 text-fifa-mint border border-fifa-mint/30',
  FWD: 'bg-red-500/20 text-red-300 border border-red-500/30',
};

export default function InteractivePlayerList({
  allPlayers,
  teamPlayers,
  onAdd,
  onRemove,
}: InteractivePlayerListProps) {
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);

  if (allPlayers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="font-retro text-[9px] text-white/40">No players yet</p>
        <p className="font-headline text-[10px] text-white/25 mt-1">Scan cards to get started</p>
      </div>
    );
  }

  const teamPlayerIds = new Set(teamPlayers.map(p => p.id));

  const sorted = [...allPlayers].sort((a, b) => {
    if (POSITION_ORDER[a.position] !== POSITION_ORDER[b.position])
      return POSITION_ORDER[a.position] - POSITION_ORDER[b.position];
    return b.rating - a.rating;
  });

  const handleDragStart = (playerId: string) => {
    setDraggedPlayerId(playerId);
  };

  const handleDragEnd = () => {
    setDraggedPlayerId(null);
  };

  return (
    <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
      {sorted.map((player) => {
        const isInTeam = teamPlayerIds.has(player.id);

        return (
          <div
            key={player.id}
            draggable
            onDragStart={() => handleDragStart(player.id)}
            onDragEnd={handleDragEnd}
            className={`flex items-center justify-between px-3 py-2.5 bg-fifa-dark border rounded-lg transition-colors cursor-move ${
              isInTeam
                ? 'border-fifa-mint/50 bg-fifa-mint/5'
                : 'border-fifa-border hover:border-fifa-mint/30'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-headline text-[12px] text-white truncate">
                  {player.name}
                </span>
                {player.isHistorical && (
                  <span className="font-retro text-[7px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded">
                    {player.era || 'LEGEND'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`font-retro text-[8px] px-1.5 py-0.5 rounded ${POSITION_COLORS[player.position]}`}>
                  {player.position}
                </span>
                <span className={`font-headline text-[11px] font-bold ${
                  player.rating >= 90 ? 'text-fifa-amber' :
                  player.rating >= 80 ? 'text-fifa-mint' :
                  'text-white/60'
                }`}>{player.rating}</span>
              </div>
            </div>

            {/* Add or Remove button */}
            <button
              onClick={() => isInTeam ? onRemove(player.id) : onAdd(player.id)}
              className={`ml-2 p-1.5 transition-colors flex-shrink-0 rounded ${
                isInTeam
                  ? 'text-white/40 hover:text-red-400'
                  : 'text-fifa-mint/60 hover:text-fifa-mint'
              }`}
              title={isInTeam ? 'Remove from team' : 'Add to team'}
            >
              {isInTeam ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M20 12H4" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
