'use client';

import { Player } from '@/lib/types';

interface PlayerListProps {
  players: Player[];
  onRemove: (playerId: string) => void;
}

const POSITION_ORDER = { GK: 0, DEF: 1, MID: 2, FWD: 3 } as const;

const POSITION_COLORS: Record<string, string> = {
  GK:  'bg-fifa-amber/20 text-fifa-amber border border-fifa-amber/30',
  DEF: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  MID: 'bg-fifa-mint/20 text-fifa-mint border border-fifa-mint/30',
  FWD: 'bg-red-500/20 text-red-300 border border-red-500/30',
};

export default function PlayerList({ players, onRemove }: PlayerListProps) {
  if (players.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="font-retro text-[9px] text-white/40">No players yet</p>
        <p className="font-headline text-[10px] text-white/25 mt-1">Scan cards to get started</p>
      </div>
    );
  }

  const sorted = [...players].sort((a, b) => {
    if (POSITION_ORDER[a.position] !== POSITION_ORDER[b.position])
      return POSITION_ORDER[a.position] - POSITION_ORDER[b.position];
    return b.rating - a.rating;
  });

  return (
    <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
      {sorted.map((player) => (
        <div
          key={player.id}
          className="flex items-center justify-between px-3 py-2.5 bg-fifa-dark border border-fifa-border rounded-lg hover:border-fifa-mint/30 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-headline text-[12px] text-white truncate">{player.name}</span>
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
              {player.rarity === 'legendary' && (
                <span className="font-retro text-[7px] px-1.5 py-0.5 rounded border"
                  style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.4)' }}>
                  ✦ LEGENDARY
                </span>
              )}
              {player.rarity === 'rare' && (
                <span className="font-retro text-[7px] px-1.5 py-0.5 rounded border"
                  style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderColor: 'rgba(139,92,246,0.4)' }}>
                  ◆ RARE
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => onRemove(player.id)}
            className="ml-2 p-1.5 text-white/20 hover:text-red-400 transition-colors flex-shrink-0"
            title="Remove player"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
