'use client';

import { Player, Formation } from '@/lib/types';
import { useState } from 'react';
import PixelAvatar from './PixelAvatar';

interface InteractiveTeamDisplayProps {
  players: Player[];
  allPlayers: Player[];
  formation: Formation;
  outOfPositionIds?: Set<string>;
  onRemoveFromTeam: (playerId: string) => void;
  onAddToTeam: (playerId: string) => void;
}

type PositionKey = 'GK' | 'DEF' | 'MID' | 'FWD';
const POSITION_ROW_ORDER: PositionKey[] = ['GK', 'DEF', 'MID', 'FWD'];

function formatPlayerName(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return name;
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

/**
 * Assign all team players to formation slots.
 * In-position players fill their natural row first.
 * OOP players spill into empty slots in other rows (top-down: GK → DEF → MID → FWD).
 * Returns a map of positionKey → array of (player | null) for each slot in that row.
 * Also returns a set of player IDs that ended up in a mismatched slot.
 */
function assignSlots(
  players: Player[],
  formation: Formation,
  outOfPositionIds: Set<string>
): {
  slots: Record<PositionKey, (Player | null)[]>;
  slotOopIds: Set<string>;
} {
  // Build per-position buckets: matching players first (sorted by rating desc)
  const inPos: Record<PositionKey, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  const oop: Player[] = [];

  for (const p of players) {
    if (outOfPositionIds.has(p.id)) {
      oop.push(p);
    } else {
      inPos[p.position as PositionKey].push(p);
    }
  }

  // Sort each bucket by rating desc so best players claim first slots
  for (const pos of POSITION_ROW_ORDER) inPos[pos].sort((a, b) => b.rating - a.rating);

  // Fill slots: each position row has `formation.positions[pos]` slots
  const slots: Record<PositionKey, (Player | null)[]> = {
    GK:  Array(formation.positions.GK).fill(null),
    DEF: Array(formation.positions.DEF).fill(null),
    MID: Array(formation.positions.MID).fill(null),
    FWD: Array(formation.positions.FWD).fill(null),
  };

  for (const pos of POSITION_ROW_ORDER) {
    inPos[pos].forEach((p, i) => { if (i < slots[pos].length) slots[pos][i] = p; });
  }

  // Distribute OOP players into first available null slots (GK → DEF → MID → FWD)
  const slotOopIds = new Set<string>();
  const oopQueue = [...oop];
  for (const pos of POSITION_ROW_ORDER) {
    for (let i = 0; i < slots[pos].length; i++) {
      if (slots[pos][i] === null && oopQueue.length > 0) {
        const p = oopQueue.shift()!;
        slots[pos][i] = p;
        slotOopIds.add(p.id);
      }
    }
  }

  return { slots, slotOopIds };
}

export default function InteractiveTeamDisplay({
  players,
  allPlayers,
  formation,
  outOfPositionIds = new Set(),
  onRemoveFromTeam,
  onAddToTeam,
}: InteractiveTeamDisplayProps) {
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  const { slots, slotOopIds } = assignSlots(players, formation, outOfPositionIds);
  // Combined set: players that are OOP (either excess of their position OR placed in a wrong-position slot)
  const allOopIds = new Set([...outOfPositionIds, ...slotOopIds]);

  const playerIds = new Set(players.map(p => p.id));

  // Available players not already in the team, for the + button
  const available = allPlayers.filter(p => !playerIds.has(p.id)).sort((a, b) => b.rating - a.rating);

  const handleDragStart = (playerId: string) => setDraggedPlayerId(playerId);
  const handleDragEnd = () => { setDraggedPlayerId(null); setDragOverSlot(null); };
  const handleDragOver = (e: React.DragEvent, slotKey: string) => { e.preventDefault(); setDragOverSlot(slotKey); };

  const handleDrop = (e: React.DragEvent, _slotKey: string) => {
    e.preventDefault();
    if (draggedPlayerId) {
      if (playerIds.has(draggedPlayerId)) {
        // Drag within team — remove then let parent re-add (noop swap for now)
        onRemoveFromTeam(draggedPlayerId);
      } else {
        onAddToTeam(draggedPlayerId);
      }
    }
    setDraggedPlayerId(null);
    setDragOverSlot(null);
  };

  const renderPlayerCard = (player: Player) => {
    const isOOP = allOopIds.has(player.id);
    return (
      <div
        key={player.id}
        draggable
        onDragStart={() => handleDragStart(player.id)}
        onDragEnd={handleDragEnd}
        className={`relative rounded-lg p-2 shadow-md hover:shadow-lg transition-all text-center cursor-move group w-20 ${
          isOOP ? 'bg-white border-2 border-red-500' : 'bg-white border-2 border-gray-300'
        }`}
      >
        {/* Out-of-position indicator */}
        {isOOP && (
          <div
            className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold z-10"
            title="Out of position — will perform worse in simulation"
          >
            !
          </div>
        )}

        {/* Remove button */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemoveFromTeam(player.id); }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 flex items-center justify-center z-10 font-bold"
          title="Remove from team"
        >
          ✕
        </button>

        <div className="flex justify-center mb-1">
          <PixelAvatar skinTone={player.skinTone} hairColor={player.hairColor} hairStyle={player.hairStyle} size={32} />
        </div>
        <div className="font-headline text-[10px] mb-0.5 text-fifa-amber font-bold truncate leading-tight">
          {formatPlayerName(player.name)}
        </div>
        <div className={`text-[8px] font-retro uppercase tracking-widest ${isOOP ? 'text-red-500 font-bold' : 'text-gray-600'}`}>
          {player.position}
        </div>
        <div className="mt-0.5 text-sm font-bold text-blue-600">{player.rating}</div>
        {player.isHistorical && <div className="mt-0.5 text-[7px] text-purple-600">★</div>}
      </div>
    );
  };

  const renderEmptySlot = (pos: PositionKey, slotIndex: number) => {
    const slotKey = `${pos}-${slotIndex}`;
    const isDragOver = dragOverSlot === slotKey;
    // Best available to suggest — prefer same-position, then any
    const best = available.find(p => p.position === pos) ?? available[0];

    return (
      <div
        key={slotKey}
        onDragOver={(e) => handleDragOver(e, slotKey)}
        onDrop={(e) => handleDrop(e, slotKey)}
        className={`bg-white/10 rounded-lg p-2 shadow-md w-20 h-24 flex flex-col items-center justify-center border-2 border-dashed transition-all ${
          isDragOver ? 'border-fifa-mint bg-fifa-mint/10' : 'border-gray-400'
        }`}
      >
        <span className="text-white/60 text-[9px] font-retro mb-1">{pos}</span>
        {best && (
          <button
            onClick={() => onAddToTeam(best.id)}
            className="text-fifa-mint hover:text-fifa-cream transition-colors text-lg"
            title={`Add ${best.name} (${best.position} · ${best.rating})`}
          >
            +
          </button>
        )}
      </div>
    );
  };

  const renderRow = (pos: PositionKey) => (
    <div className="flex justify-center gap-2 flex-wrap">
      {slots[pos].map((player, i) =>
        player ? renderPlayerCard(player) : renderEmptySlot(pos, i)
      )}
    </div>
  );

  const oopCount = allOopIds.size;

  return (
    <div className="formation-grid space-y-4">
      <div className="text-center font-headline text-[11px] text-fifa-cream/60 mb-2">
        {formation.name} Formation
      </div>

      <div className="space-y-2">{renderRow('FWD')}</div>
      <div className="space-y-2">{renderRow('MID')}</div>
      <div className="space-y-2">{renderRow('DEF')}</div>
      <div className="space-y-2">{renderRow('GK')}</div>

      <div className="text-center bg-fifa-dark/50 rounded-lg p-3 mt-4 border border-fifa-border">
        {players.length === 11 ? (
          <p className={`font-retro text-[9px] mb-1 ${oopCount > 0 ? 'text-red-400' : 'text-fifa-mint'}`}>
            {oopCount > 0
              ? `⚠ 11 players — ${oopCount} out of position (red border)`
              : '✓ Complete team'}
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
        {oopCount > 0 && (
          <p className="font-headline text-[9px] text-red-300/60 mt-1">
            Out-of-position players will underperform in simulation
          </p>
        )}
      </div>
    </div>
  );
}
