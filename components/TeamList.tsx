'use client';

import { useState, useEffect } from 'react';
import {
  Team,
  deleteTeam,
  getTeamRecords,
  getMatchHistory,
  getAllTeams,
  TeamRecord,
  MatchHistoryEntry,
  formatShareId,
} from '@/lib/firebase/firestore';
import { getLegendaryTeams } from '@/lib/legendary-teams';

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
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [inviteTeamId, setInviteTeamId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [teamToDelete, setTeamToDelete] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load all teams (to check if opponents still exist)
  useEffect(() => {
    const loadAllTeams = async () => {
      try {
        const all = await getAllTeams();
        setAllTeams(all);
      } catch (e) {
        console.error('Failed to load all teams', e);
      }
    };
    loadAllTeams();
  }, []);

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
    setTeamToDelete(teamId);
  };

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;
    try {
      await deleteTeam(teamToDelete);
      onTeamsChange();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Failed to delete team');
    } finally {
      setTeamToDelete(null);
    }
  };

  const handleCopyId = (team: Team) => {
    const display = team.shareId ? team.shareId : team.id!;
    navigator.clipboard.writeText(display).catch(() => {});
    setCopiedId(team.id!);
    setTimeout(() => setCopiedId(null), 2000);
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

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !inviteTeamId) return;

    const team = teams.find(t => t.id === inviteTeamId);
    if (!team) return;

    setSendingInvite(true);
    setInviteMessage('');

    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: inviteEmail.trim(),
          fromName: 'A friend',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setInviteMessage(`✅ Invite sent to ${inviteEmail}!`);
        setInviteEmail('');
        setTimeout(() => {
          setInviteTeamId(null);
          setInviteMessage('');
        }, 2000);
      } else {
        setInviteMessage(data.error || 'Failed to send invite');
      }
    } catch (error) {
      setInviteMessage('Failed to send invite. Please try again.');
    } finally {
      setSendingInvite(false);
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
                    <h3 className="font-headline text-[13px] text-fifa-cream flex items-center gap-2 flex-wrap">
                      {team.name}
                      <span className="font-retro text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        [{team.shareId ? formatShareId(team.shareId) : '…'}]
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyId(team);
                        }}
                        title="Copy Team ID"
                        className="p-0.5 transition-colors"
                        style={{ color: copiedId === team.id ? '#7ee8c4' : 'rgba(255,255,255,0.25)' }}
                      >
                        {copiedId === team.id ? <span className="font-retro text-[8px]">✓</span> : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        )}
                      </button>
                    </h3>
                    <p className="font-headline text-[11px] text-fifa-mint/60 mt-1">{team.formation}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setInviteTeamId(team.id!);
                      }}
                      className="text-white/20 hover:text-fifa-mint p-1 transition-colors"
                      title="Invite friend to challenge this team"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </button>
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

                        // Check if opponent team still exists (user teams or legendary teams - including premium for history)
                        const opponentExists = entry.opponentId === 'legendary' ||
                          allTeams.some(t => t.id === entry.opponentId) ||
                          getLegendaryTeams(true).some(t => t.id === entry.opponentId);
                        const opponentDisplay = opponentExists
                          ? entry.opponentName
                          : `${entry.opponentName} - Retired`;

                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="font-retro text-[7px] text-white/25 w-16 flex-shrink-0">{date}</span>
                            <span className="flex-1 truncate text-fifa-cream/60">vs {opponentDisplay}</span>
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

      {/* Invite Modal */}
      {inviteTeamId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-fifa-mid border border-fifa-border rounded-xl p-6 max-w-md w-full shadow-retro">
            <h3 className="font-retro text-[11px] text-fifa-mint mb-4 tracking-wider uppercase">
              Invite Friend to Challenge
            </h3>
            <p className="font-headline text-[11px] text-fifa-cream/80 mb-4">
              Challenge: {teams.find(t => t.id === inviteTeamId)?.name}
            </p>

            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
              placeholder="Friend's email"
              className="w-full px-4 py-2.5 bg-fifa-dark border border-fifa-border rounded-lg text-white font-headline text-sm placeholder:text-white/25 focus:ring-1 focus:ring-fifa-mint focus:outline-none mb-4"
              disabled={sendingInvite}
            />

            {inviteMessage && (
              <p className={`font-headline text-[10px] mb-3 ${
                inviteMessage.startsWith('✅') ? 'text-fifa-mint' : 'text-red-400'
              }`}>
                {inviteMessage}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSendInvite}
                disabled={!inviteEmail.trim() || sendingInvite}
                className="flex-1 btn-primary py-2.5 disabled:opacity-30"
              >
                {sendingInvite ? 'Sending…' : 'Send Invite'}
              </button>
              <button
                onClick={() => {
                  setInviteTeamId(null);
                  setInviteEmail('');
                  setInviteMessage('');
                }}
                className="px-4 py-2.5 bg-fifa-dark border border-fifa-border rounded-lg font-retro text-[9px] text-white/60 hover:text-white transition-colors"
                disabled={sendingInvite}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {teamToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setTeamToDelete(null)}>
          <div className="rounded-xl border p-6 mx-4 max-w-sm w-full" style={{ background: '#1a1f1b', borderColor: '#2a3b2e' }} onClick={e => e.stopPropagation()}>
            <h3 className="font-headline text-[14px] text-fifa-cream mb-3">Delete Team?</h3>
            <p className="font-body text-[11px] mb-6 text-fifa-cream/60">This action cannot be undone. Your team will be permanently deleted.</p>
            <div className="flex gap-2">
              <button
                onClick={confirmDeleteTeam}
                className="flex-1 py-2 rounded-lg font-retro text-[9px] transition-all"
                style={{ background: '#f44336', color: '#fff' }}>
                Delete
              </button>
              <button
                onClick={() => setTeamToDelete(null)}
                className="flex-1 py-2 rounded-lg font-retro text-[9px] border transition-colors"
                style={{ borderColor: '#2a3b2e', color: 'rgba(255,255,255,0.6)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
