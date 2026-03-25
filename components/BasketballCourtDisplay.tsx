'use client';

import { BasketballPlayer, BasketballPosition } from '@/lib/types-basketball';

interface Props {
  players: BasketballPlayer[];
}

// Court positions as % of the half-court SVG (x=left→right, y=top→bottom)
// Viewed from offensive end looking at basket
const COURT_SLOTS: Record<BasketballPosition, { x: number; y: number; label: string }> = {
  PG: { x: 50, y: 78, label: 'PG' },   // Top of key / ball handler
  SG: { x: 82, y: 60, label: 'SG' },   // Right wing
  SF: { x: 18, y: 60, label: 'SF' },   // Left wing
  PF: { x: 72, y: 30, label: 'PF' },   // Right block
  C:  { x: 50, y: 20, label: 'C'  },   // Paint / under basket
};

const POSITION_COLORS: Record<BasketballPosition, string> = {
  PG: '#f97316',  // orange
  SG: '#fbbf24',  // gold
  SF: '#fb923c',  // light orange
  PF: '#f59e0b',  // amber
  C:  '#ef4444',  // red
};

export default function BasketballCourtDisplay({ players }: Props) {
  const byPosition: Record<string, BasketballPlayer> = {};
  players.forEach(p => { byPosition[p.position] = p; });

  return (
    <div className="w-full max-w-sm mx-auto select-none">
      <div className="relative w-full" style={{ paddingBottom: '120%' }}>
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 300 360"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Court background */}
          <rect width="300" height="360" rx="8" fill="#1c1200" />

          {/* Hardwood grain lines */}
          {Array.from({ length: 18 }).map((_, i) => (
            <line key={i} x1="0" y1={i * 20} x2="300" y2={i * 20}
              stroke="#2d1f00" strokeWidth="0.8" />
          ))}

          {/* Court boundary */}
          <rect x="10" y="10" width="280" height="340" rx="4"
            fill="none" stroke="#3d2c00" strokeWidth="2" />

          {/* Three-point arc */}
          <path d="M 30 360 A 140 140 0 0 1 270 360" fill="none"
            stroke="#3d2c00" strokeWidth="1.5" />

          {/* Paint / key */}
          <rect x="95" y="10" width="110" height="140" rx="2"
            fill="none" stroke="#3d2c00" strokeWidth="1.5" />

          {/* Free throw circle */}
          <circle cx="150" cy="150" r="40" fill="none"
            stroke="#3d2c00" strokeWidth="1.5" />

          {/* Basket */}
          <circle cx="150" cy="30" r="14" fill="none"
            stroke="#f97316" strokeWidth="2" opacity="0.6" />
          <circle cx="150" cy="30" r="5" fill="#f97316" opacity="0.5" />

          {/* Backboard */}
          <line x1="120" y1="15" x2="180" y2="15"
            stroke="#f97316" strokeWidth="3" opacity="0.7" />

          {/* Center circle */}
          <circle cx="150" cy="340" r="28" fill="none"
            stroke="#3d2c00" strokeWidth="1.5" />

          {/* Player tokens */}
          {(Object.keys(COURT_SLOTS) as BasketballPosition[]).map(pos => {
            const slot = COURT_SLOTS[pos];
            const cx = (slot.x / 100) * 300;
            const cy = (slot.y / 100) * 360;
            const player = byPosition[pos];
            const color = POSITION_COLORS[pos];

            return (
              <g key={pos}>
                {/* Glow ring */}
                <circle cx={cx} cy={cy} r={22}
                  fill="none" stroke={color} strokeWidth="1"
                  opacity={player ? 0.4 : 0.15} />

                {/* Token background */}
                <circle cx={cx} cy={cy} r={18}
                  fill={player ? '#1c1200' : '#0f0a00'}
                  stroke={color}
                  strokeWidth={player ? 2 : 1}
                  opacity={player ? 1 : 0.4} />

                {player ? (
                  <>
                    {/* Rating arc indicator */}
                    <circle cx={cx} cy={cy} r={18}
                      fill="none" stroke={color} strokeWidth="2"
                      strokeDasharray={`${(player.rating / 99) * 113} 113`}
                      strokeLinecap="round"
                      transform={`rotate(-90 ${cx} ${cy})`}
                      opacity="0.7" />

                    {/* Rating */}
                    <text x={cx} y={cy - 3} textAnchor="middle"
                      fill={color} fontSize="10" fontWeight="bold"
                      fontFamily="'Orbitron', sans-serif">
                      {player.rating}
                    </text>

                    {/* Name (truncated) */}
                    <text x={cx} y={cy + 8} textAnchor="middle"
                      fill="white" fontSize="5.5"
                      fontFamily="Arial, sans-serif" opacity="0.85">
                      {player.name.split(' ').pop()?.slice(0, 10)}
                    </text>
                  </>
                ) : (
                  <>
                    {/* Empty slot label */}
                    <text x={cx} y={cy + 4} textAnchor="middle"
                      fill={color} fontSize="9" fontWeight="bold"
                      fontFamily="'Orbitron', sans-serif" opacity="0.4">
                      {pos}
                    </text>
                  </>
                )}

                {/* Position badge */}
                <rect x={cx - 10} y={cy + 20} width="20" height="9" rx="4"
                  fill={player ? color : 'transparent'}
                  opacity={player ? 0.9 : 0} />
                <text x={cx} y={cy + 27} textAnchor="middle"
                  fill="#0f0a00" fontSize="5.5" fontWeight="bold"
                  fontFamily="'Press Start 2P', monospace"
                  opacity={player ? 1 : 0}>
                  {pos}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Player list below court */}
      {players.length > 0 && (
        <div className="mt-3 space-y-1">
          {(Object.keys(COURT_SLOTS) as BasketballPosition[]).map(pos => {
            const player = byPosition[pos];
            if (!player) return null;
            return (
              <div key={pos} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-bball-mid border border-bball-border">
                <span className="font-retro text-[7px] w-6 flex-shrink-0"
                  style={{ color: POSITION_COLORS[pos] }}>{pos}</span>
                <span className="font-headline text-[10px] text-white flex-1 truncate">{player.name}</span>
                <span className="font-headline text-[10px] font-bold"
                  style={{ color: player.rating >= 90 ? '#fbbf24' : player.rating >= 80 ? '#f97316' : 'rgba(255,255,255,0.5)' }}>
                  {player.rating}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
