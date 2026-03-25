'use client';

import { useState, useEffect } from 'react';
import {
  Team,
  deleteTeam,
  getTeamRecords,
  getMatchHistory,
  TeamRecord,
  MatchHistoryEntry,
} from '@/lib/firebase/firestore';

interface TeamListProps {
  teams: Team[];
  onTeamsChange: () => void;
}

const POSITION_ORDER = ['GK', 'DEF', 'MID', 'FWD'] as const;

function RecordBadge({ record }: { record: TeamRecord | undefined }) {
  const r = record ?? { wins: 0, losses: 0, ties: 0 };
  return (
    <span className="inline-flex gap-2 font-headline text-[11px] font-bold">
      <span className="text-fifa-mint">{r.wins}W</span>
      <span className="text-red-400">{r.losses}L</span>
      <span className="text-white/60">{r.ties}T</span>
    </span>
  );
}

export default function TeamList({ teams, onTeamsChange }: TeamListProps) {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [historyTeamId, setHistoryTeamId] = useState<string | null>(null);
  const [teamRecords, setTeamRecords] = useState<Record<string, TeamRecord>>({});
  const [matchHistories, setMatchHistories] = useState<Record<string, MatchHistoryEntry[]>>({});
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load team records
  useEffect(() => {
    const loadRecords = async () => {
      const teamIds = teams.map(t => t.id!).filter(Boolean);
      if (teamIds.length === 0) return;
      try {
        const records = await getTeamRecords(teamIds);
        setTeamRecords(records);
      } catch (e) {
        console.error('Failed to load team records', e);
      }
    };
    loadRecords();
  }, [teams]);

  const handleDelete = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      await deleteTeam(teamId);
      onTeamsChange();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Failed to delete team');
    }
  };

  const handleToggleExpand = (teamId: string) => {
    setExpandedTeamId(prev => prev === teamId ? null : teamId);
    // Close history if expanded
    if (historyTeamId === teamId) setHistoryTeamId(null);
  };

  const handleViewHistory = async (teamId: string) => {
    if (historyTeamId === teamId) {
      setHistoryTeamId(null);
      return;
    }

    setHistoryTeamId(teamId);
    if (matchHistories[teamId]) return; // Already loaded

    setLoadingHistory(true);
    try {
      const history = await getMatchHistory(teamId, 10);
      setMatchHistories(prev => ({ ...prev, [teamId]: history }));
    } catch (e) {
      console.error('getMatchHistory failed:', e);
      setMatchHistories(prev => ({ ...prev, [teamId]: [] }));
    } finally {
      setLoadingHistory(false);
    }
  };

  if (teams.length === 0) {
    return (
      <div className="bg-fifa-mid rounded-xl border border-fifa-border shadow-retro p-6">
        <h2 className="font-retro text-[11px] text-fifa-mint mb-4 tracking-wider">YOUR SAVED TEAMS</h2>
        <p className="font-headline text-[11px] text-white/40">No teams saved yet. Build and save your first team!</p>
      </div>
    );
  }

  return (
    <div className="bg-fifa-mid rounded-xl border border-fifa-border shadow-retro p-6">
      <h2 className="font-retro text-[11px] text-fifa-mint mb-4 tracking-wider">YOUR SAVED TEAMS ({teams.length})</h2>

      <div className="space-y-3">
        {teams.map((team) => {
          const isExpanded = expandedTeamId === team.id;
          const record = teamRecords[team.id!];

          // Group players by position
          const grouped: Record<string, typeof team.players> = { GK: [], DEF: [], MID: [], FWD: [] };
          team.players.forEach(p => {
            if (grouped[p.position]) grouped[p.position].push(p);
          });

          return (
            <div key={team.id} className="bg-fifa-dark rounded-xl border border-fifa-border overflow-hidden">
              {/* Team header */}
              <button
                onClick={() => handleToggleExpand(team.id!)}
                className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-headline text-[13px] text-fifa-cream truncate">{team.name}</h3>
                    <p className="font-headline text-[11px] text-fifa-mint/60 mt-1">{team.formation}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(team.id!);
                      }}
                      className="text-white/20 hover:text-red-400 p-1 transition-colors"
                      title="Delete team"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <span className="text-white/20 text-[10px] ml-1">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Record + position counts */}
                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-3 font-headline text-[10px] text-white/60">
                    {POSITION_ORDER.map(pos => (
                      <span key={pos}>{pos} {grouped[pos].length}</span>
                    ))}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewHistory(team.id!);
                    }}
                    className="hover:opacity-70 transition-opacity"
                    title="View match history"
                  >
                    <RecordBadge record={record} />
                  </button>
                </div>
              </button>

              {/* Expanded roster */}
              {isExpanded && (
                <div className="border-t border-fifa-border px-4 pb-4 pt-3">
                  {POSITION_ORDER.map(pos => grouped[pos].length > 0 && (
                    <div key={pos} className="mb-2">
                      <span className="font-retro text-[8px] text-fifa-mint/60 uppercase block mb-1">{pos}</span>
                      <div className="space-y-1">
                        {grouped[pos].map((p, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-fifa-cream/80">{p.name}</span>
                            <span className={`font-headline text-[11px] font-bold ${
                              p.rating >= 90 ? 'text-fifa-amber' :
                              p.rating >= 80 ? 'text-fifa-mint' :
                              'text-white/40'
                            }`}>
                              {p.rating}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Match history panel */}
              {team.id && historyTeamId === team.id && (
                <div className="border-t border-fifa-border px-4 pb-4 pt-3">
                  <h4 className="font-retro text-[8px] text-fifa-mint/60 uppercase mb-3">Match History</h4>
                  {loadingHistory && !matchHistories[team.id] ? (
                    <p className="font-headline text-[10px] text-white/30 animate-pulse">Loading…</p>
                  ) : (matchHistories[team.id] ?? []).length === 0 ? (
                    <p className="font-headline text-[10px] text-white/30">No matches yet. Simulate matches to build history.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {(matchHistories[team.id] ?? []).map((entry, i) => {
                        const date = entry.date
                          ? new Date((entry.date as any).seconds * 1000).toLocaleDateString()
                          : '—';
                        const rc = entry.result === 'win' ? 'text-fifa-mint' : entry.result === 'loss' ? 'text-red-400' : 'text-white/30';
                        const rl = entry.result === 'win' ? 'W' : entry.result === 'loss' ? 'L' : 'T';

                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="font-retro text-[7px] text-white/25 w-16 flex-shrink-0">{date}</span>
                            <span className="flex-1 truncate text-fifa-cream/60">vs {entry.opponentName}</span>
                            <span className="font-headline text-[10px] text-white/40">{entry.teamScore}–{entry.opponentScore}</span>
                            <span className={`font-retro text-[9px] w-4 text-right ${rc}`}>{rl}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
