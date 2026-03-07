'use client';

import { Player } from '@/lib/types';

interface PlayerListProps {
  players: Player[];
  onRemove: (playerId: string) => void;
}

const POSITION_COLORS = {
  GK: 'bg-yellow-100 text-yellow-800',
  DEF: 'bg-blue-100 text-blue-800',
  MID: 'bg-green-100 text-green-800',
  FWD: 'bg-red-100 text-red-800',
};

export default function PlayerList({ players, onRemove }: PlayerListProps) {
  if (players.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No players yet</p>
        <p className="text-sm">Upload card photos to get started</p>
      </div>
    );
  }

  // Sort by position and rating
  const sortedPlayers = [...players].sort((a, b) => {
    const posOrder = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
    if (posOrder[a.position] !== posOrder[b.position]) {
      return posOrder[a.position] - posOrder[b.position];
    }
    return b.rating - a.rating;
  });

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {sortedPlayers.map((player) => (
        <div
          key={player.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{player.name}</h3>
              {player.isHistorical && (
                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                  {player.era}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs px-2 py-0.5 rounded font-medium ${
                  POSITION_COLORS[player.position]
                }`}
              >
                {player.position}
              </span>
              <span className="text-sm text-gray-600">Rating: {player.rating}</span>
            </div>
          </div>
          <button
            onClick={() => onRemove(player.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove player"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
