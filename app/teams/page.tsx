'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { signOut } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { Team } from '@/lib/types';
import {
  getUserTeams, getAllTeams, deleteTeam, getTeam,
  updateTeamRecord, updateLegendaryRecord,
  getTeamRecords, getUserLegendaryRecords,
  addSavedTeam, getSavedTeamIds, removeSavedTeam,
  ensureShareId, getTeamByShareId, formatShareId, parseShareId,
  saveMatchHistory, getMatchHistory,
  TeamRecord, MatchHistoryEntry,
} from '@/lib/firebase/firestore';
import { LEGENDARY_TEAMS, LegendaryTeam } from '@/lib/legendary-teams';

type AnyTeam = Team | LegendaryTeam;

interface PlayByPlayEvent {
  minute: number;
  type: string;
  text: string;
  scoringTeam?: 'team1' | 'team2';
}

interface SimResult {
  team1Score: number;
  team2Score: number;
  summary: string;
  manOfTheMatch: string;
  playByPlay: PlayByPlayEvent[];
}

const EVENT_ICONS: Record<string, string> = {
  kickoff: '🏁', action: '⚽', shot: '🎯', goal: '🚨',
  save: '🧤', foul: '🚩', card: '🟨', corner: '🔄',
  freekick: '💨', halftime: '🔔', fulltime: '🏆',
};
const EVENT_COLORS: Record<string, string> = {
  goal:     'bg-fifa-mint/10 border-l-4 border-fifa-mint',
  halftime: 'bg-white/5 border-l-4 border-white/30',
  fulltime: 'bg-fifa-mint/20 border-l-4 border-fifa-mint',
  card:     'bg-fifa-amber/10 border-l-4 border-fifa-amber',
  save:     'bg-white/5 border-l-4 border-white/20',
  shot:     'border-l-4 border-transparent',
};

const POSITION_ORDER = ['GK', 'DEF', 'MID', 'FWD'] as const;

const LOADING_PHRASES = [
  'Warming Up…', 'Stretching…', 'Fans are Singing…',
  'Coin Toss…', 'Players Ready…', 'Ref Checks the Ball…',
  'Tunnel Walk…', 'Anthems Playing…', 'Kicking Off…',
];

function RecordBadge({ record }: { record: TeamRecord }) {
  return (
    <span className="inline-flex gap-2 font-headline text-[11px] font-bold">
      <span className="text-fifa-mint">{record.wins}W</span>
      <span className="text-red-400">{record.losses}L</span>
      <span className="text-white/60">{record.ties}T</span>
    </span>
  );
}

function RosterPanel({ team, record }: { team: AnyTeam; record: TeamRecord }) {
  const grouped: Record<string, typeof team.players> = { GK: [], DEF: [], MID: [], FWD: [] };
  team.players.forEach(p => { if (grouped[p.position]) grouped[p.position].push(p); });

  return (
    <div className="mt-2 rounded-lg border border-fifa-border bg-fifa-dark p-3 text-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="font-headline text-[11px] text-fifa-cream">{team.name}</span>
        <RecordBadge record={record} />
      </div>
      {POSITION_ORDER.map(pos => grouped[pos].length > 0 && (
        <div key={pos} className="mb-1">
          <span className="text-[9px] font-retro text-fifa-mint uppercase mr-2">{pos}</span>
          {grouped[pos].map((p, i) => (
            <span key={i} className="inline-block mr-3 text-fifa-cream/80 text-xs">
              {p.name} <span className="text-fifa-amber">({p.rating})</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function TeamsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const legendaryTeams = LEGENDARY_TEAMS;
  const [selectedHome, setSelectedHome] = useState<AnyTeam | null>(null);
  const [selectedAway, setSelectedAway] = useState<AnyTeam | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [visibleEvents, setVisibleEvents] = useState<PlayByPlayEvent[]>([]);
  const [streamingDone, setStreamingDone] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-teams' | 'teams'>('my-teams');
  const [liveScore, setLiveScore] = useState<{ home: number; away: number }>({ home: 0, away: 0 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [teamRecords, setTeamRecords] = useState<Record<string, TeamRecord>>({});
  const [legendaryRecords, setLegendaryRecords] = useState<Record<string, TeamRecord>>({});
  const [savedTeams, setSavedTeams] = useState<Team[]>([]);
  const [addTeamIdInput, setAddTeamIdInput] = useState('');
  const [addTeamLoading, setAddTeamLoading] = useState(false);
  const [addTeamError, setAddTeamError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [historyTeamId, setHistoryTeamId] = useState<string | null>(null);
  const [matchHistories, setMatchHistories] = useState<Record<string, MatchHistoryEntry[]>>({});
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadTeams();
      const timeout = setTimeout(() => setLoadingTeams(false), 5000);
      return () => clearTimeout(timeout);
    } else if (!loading) {
      setLoadingTeams(false);
    }
  }, [user, loading]);

  // Stream play-by-play events over ~100 seconds with live score updates
  useEffect(() => {
    if (!simResult?.playByPlay?.length) return;
    setVisibleEvents([]);
    setStreamingDone(false);
    setLiveScore({ home: 0, away: 0 });
    const events = simResult.playByPlay.filter(e => e && e.type && e.text);
    const msPerEvent = Math.round(100000 / Math.max(events.length, 1));
    let i = 0;
    const interval = setInterval(() => {
      if (i >= events.length) { clearInterval(interval); setStreamingDone(true); return; }
      const ev = events[i];
      setVisibleEvents(prev => [...prev, ev]);
      // Update live score when a goal event arrives
      if (ev.type === 'goal' && ev.scoringTeam) {
        setLiveScore(prev => ({
          home: prev.home + (ev.scoringTeam === 'team1' ? 1 : 0),
          away: prev.away + (ev.scoringTeam === 'team2' ? 1 : 0),
        }));
      }
      i++;
    }, msPerEvent);
    return () => clearInterval(interval);
  }, [simResult]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [visibleEvents]);

  // Cycle fun phrases while waiting for simulation response
  useEffect(() => {
    if (!simulating) { setLoadingPhrase(''); return; }
    let i = 0;
    setLoadingPhrase(LOADING_PHRASES[0]);
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_PHRASES.length;
      setLoadingPhrase(LOADING_PHRASES[i]);
    }, 2200);
    return () => clearInterval(interval);
  }, [simulating]);

  const loadTeams = async () => {
    try {
      const [userTeams, teams, legRecs, savedIds] = await Promise.all([
        getUserTeams(user!.uid).catch(() => [] as Team[]),
        getAllTeams().catch(() => [] as Team[]),
        getUserLegendaryRecords(user!.uid).catch(() => ({} as Record<string, TeamRecord>)),
        getSavedTeamIds(user!.uid).catch(() => [] as string[]),
      ]);
      // Lazily assign shareIds to any teams missing them (one-time migration)
      const teamsNeedingShareId = userTeams.filter(t => !t.shareId);
      if (teamsNeedingShareId.length > 0) {
        await Promise.all(teamsNeedingShareId.map(async t => {
          if (t.id) t.shareId = await ensureShareId(t.id).catch(() => undefined);
        }));
      }
      setMyTeams(userTeams);
      setAllTeams(teams);
      setLegendaryRecords(legRecs);

      // Resolve saved team IDs → full team objects (filter out own teams)
      const myTeamIds = new Set(userTeams.map(t => t.id));
      const savedRaw = await Promise.all(
        savedIds.filter(id => !myTeamIds.has(id)).map(id => getTeam(id).catch(() => null))
      );
      const savedFull = savedRaw.filter(t => t != null) as Team[];
      setSavedTeams(savedFull);

      // Load W/L/T records for all teams
      const ids = [...userTeams, ...teams, ...savedFull].map(t => t.id).filter((id): id is string => !!id);
      const recs = await getTeamRecords(ids).catch(() => ({} as Record<string, TeamRecord>));
      setTeamRecords(recs);
    } catch {
      setMyTeams([]); setAllTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleAddTeamById = async () => {
    const raw = parseShareId(addTeamIdInput.trim());
    if (raw.length !== 7) { setAddTeamError('Enter a valid 7-digit Team ID (e.g. 123-4567).'); return; }
    setAddTeamLoading(true);
    setAddTeamError('');
    try {
      const team = await getTeamByShareId(raw);
      if (!team) { setAddTeamError('Team not found. Double-check the ID.'); return; }
      if (team.userId === user!.uid) { setAddTeamError("That's your own team!"); return; }
      if (myTeams.some(t => t.id === team.id) || savedTeams.some(t => t.id === team.id)) {
        setAddTeamError('You already have this team.'); return;
      }
      await addSavedTeam(user!.uid, team.id!);
      setSavedTeams(prev => [...prev, team]);
      const recs = await getTeamRecords([team.id!]).catch(() => ({} as Record<string, TeamRecord>));
      setTeamRecords(prev => ({ ...prev, ...recs }));
      setAddTeamIdInput('');
    } catch {
      setAddTeamError('Something went wrong. Try again.');
    } finally {
      setAddTeamLoading(false);
    }
  };

  const handleRemoveSavedTeam = async (teamId: string) => {
    await removeSavedTeam(user!.uid, teamId).catch(() => {});
    setSavedTeams(prev => prev.filter(t => t.id !== teamId));
  };

  const handleCopyId = (team: Team) => {
    const display = team.shareId ? formatShareId(team.shareId) : team.id!;
    navigator.clipboard.writeText(display).catch(() => {});
    setCopiedId(team.id!);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleViewHistory = async (teamId: string) => {
    if (historyTeamId === teamId) { setHistoryTeamId(null); return; }
    setHistoryTeamId(teamId);
    if (matchHistories[teamId]) return; // already cached
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

  const getRecord = (team: AnyTeam): TeamRecord => {
    const isLeg = 'isLegendary' in team && team.isLegendary;
    return (isLeg ? legendaryRecords[team.id] : teamRecords[team.id!]) ?? { wins: 0, losses: 0, ties: 0 };
  };

  const applyRecordUpdate = async (team: AnyTeam, result: 'win' | 'loss' | 'tie') => {
    try {
      const isLeg = 'isLegendary' in team && team.isLegendary;
      const field = result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'ties';
      if (isLeg) {
        await updateLegendaryRecord(user!.uid, team.id, result);
        setLegendaryRecords(prev => {
          const cur = prev[team.id] ?? { wins: 0, losses: 0, ties: 0 };
          return { ...prev, [team.id]: { ...cur, [field]: (cur[field as keyof TeamRecord] ?? 0) + 1 } };
        });
      } else if (team.id) {
        await updateTeamRecord(team.id, result);
        setTeamRecords(prev => {
          const cur = prev[team.id!] ?? { wins: 0, losses: 0, ties: 0 };
          return { ...prev, [team.id!]: { ...cur, [field]: (cur[field as keyof TeamRecord] ?? 0) + 1 } };
        });
      }
    } catch (e) {
      console.error('Failed to update record', e);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    try { await deleteTeam(teamId); await loadTeams(); }
    catch { alert('Failed to delete team'); }
  };

  const handleSimulate = async () => {
    if (!selectedHome || !selectedAway) { alert('Please select both teams'); return; }
    if (selectedHome.id === selectedAway.id) { alert("You can't play a team against itself!"); return; }
    setSimulating(true);
    setSimResult(null);
    setVisibleEvents([]);
    setLiveScore({ home: 0, away: 0 });
    try {
      const res = await fetch('/api/simulate-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team1Name: selectedHome.name,
          team1Players: selectedHome.players,
          team2Name: selectedAway.name,
          team2Players: selectedAway.players,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Simulation failed');
      if (!Array.isArray(data.playByPlay)) throw new Error('Invalid response: missing playByPlay');
      data.playByPlay = data.playByPlay.filter((e: any) => e && typeof e.type === 'string' && typeof e.text === 'string');
      setSimResult(data as SimResult);

      // Update W/L/T records for both teams
      const t1wins = data.team1Score > data.team2Score;
      const t2wins = data.team2Score > data.team1Score;
      const tied = data.team1Score === data.team2Score;
      const homeResult: 'win'|'loss'|'tie' = t1wins ? 'win' : tied ? 'tie' : 'loss';
      const awayResult: 'win'|'loss'|'tie' = t2wins ? 'win' : tied ? 'tie' : 'loss';
      await Promise.all([
        applyRecordUpdate(selectedHome, homeResult),
        applyRecordUpdate(selectedAway, awayResult),
      ]);

      // Save match history for both non-legendary teams
      const isLegHome = 'isLegendary' in selectedHome && selectedHome.isLegendary;
      const isLegAway = 'isLegendary' in selectedAway && selectedAway.isLegendary;
      if (!isLegHome && selectedHome.id) {
        saveMatchHistory({
          teamId: selectedHome.id, teamName: selectedHome.name,
          teamScore: data.team1Score, result: homeResult,
          opponentId: selectedAway.id ?? 'legendary',
          opponentName: selectedAway.name, opponentScore: data.team2Score,
          date: null,
        }).catch(() => {});
        // Bust cache so next open reloads
        setMatchHistories(prev => { const n = {...prev}; delete n[selectedHome.id!]; return n; });
      }
      if (!isLegAway && selectedAway.id) {
        saveMatchHistory({
          teamId: selectedAway.id, teamName: selectedAway.name,
          teamScore: data.team2Score, result: awayResult,
          opponentId: selectedHome.id ?? 'legendary',
          opponentName: selectedHome.name, opponentScore: data.team1Score,
          date: null,
        }).catch(() => {});
        setMatchHistories(prev => { const n = {...prev}; delete n[selectedAway.id!]; return n; });
      }
    } catch (e) {
      console.error(e);
      alert('Failed to simulate match. Please try again.');
    } finally {
      setSimulating(false);
    }
  };

  const getFormation = (f: any) => typeof f === 'string' ? f : f?.name || 'N/A';

  // ── Inner TeamCard ──────────────────────────────────────────────
  const TeamCard = ({ team, isOwn = false, isSaved = false }: { team: AnyTeam; isOwn?: boolean; isSaved?: boolean }) => {
    const isLegendary = 'isLegendary' in team && team.isLegendary;
    const isExpanded = expandedId === team.id;
    const grouped: Record<string, typeof team.players> = { GK: [], DEF: [], MID: [], FWD: [] };
    team.players.forEach(p => { if (grouped[p.position]) grouped[p.position].push(p); });
    const record = isLegendary
      ? (legendaryRecords[team.id!] ?? { wins: 0, losses: 0, ties: 0 })
      : (teamRecords[team.id!] ?? { wins: 0, losses: 0, ties: 0 });
    const isCopied = copiedId === team.id;

    const cardBorder = isLegendary ? 'border-fifa-amber/40' : isSaved ? 'border-fifa-mint/30' : 'border-fifa-border';
    const cardBg = isExpanded ? 'bg-fifa-dark' : 'bg-fifa-mid hover:bg-fifa-dark';

    return (
      <div className={`border rounded-xl transition-all duration-200 ${cardBorder} ${cardBg}`}>
        {/* Card header */}
        <button className="w-full text-left p-4" onClick={() => setExpandedId(isExpanded ? null : team.id!)}>
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h3 className="font-headline text-[13px] text-white flex items-center gap-2 flex-wrap">
                {team.name}
                {isLegendary && <span className="text-[9px] font-retro text-fifa-amber">LEGEND</span>}
                {isSaved && <span className="text-[9px] font-retro text-fifa-mint/60">RIVAL</span>}
              </h3>
              {isLegendary && 'description' in team && (
                <p className="font-body text-[10px] text-fifa-amber/70 mt-0.5">{(team as any).description}</p>
              )}
              <p className="font-headline text-[11px] text-fifa-mint/60 mt-1">{getFormation(team.formation)}</p>
            </div>
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              {isOwn && team.id && (
                <button
                  onClick={e => { e.stopPropagation(); handleCopyId(team as Team); }}
                  title="Copy Team ID to share"
                  className="text-white/30 hover:text-fifa-mint p-1 transition-colors"
                >
                  {isCopied
                    ? <span className="font-retro text-[8px] text-fifa-mint">✓</span>
                    : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  }
                </button>
              )}
              {isOwn && (
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteTeam(team.id!); }}
                  className="text-white/20 hover:text-red-400 p-1 transition-colors"
                  title="Delete team"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              {isSaved && (
                <button
                  onClick={e => { e.stopPropagation(); handleRemoveSavedTeam(team.id!); }}
                  className="text-white/20 hover:text-red-400 p-1 font-retro text-[9px] transition-colors"
                  title="Remove rival"
                >✕</button>
              )}
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
            {!isLegendary && team.id ? (
              <button onClick={e => { e.stopPropagation(); handleViewHistory(team.id!); }} className="hover:opacity-70 transition-opacity" title="View match history">
                <RecordBadge record={record} />
              </button>
            ) : (
              <RecordBadge record={record} />
            )}
          </div>

          {/* Share ID on own cards */}
          {isOwn && (
            <p className="font-retro text-[8px] text-white/20 mt-1.5">
              ID: {(team as Team).shareId ? formatShareId((team as Team).shareId!) : '…'}
            </p>
          )}
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
                      <span className={`font-headline text-[11px] font-bold ${p.rating >= 90 ? 'text-fifa-amber' : p.rating >= 80 ? 'text-fifa-mint' : 'text-white/40'}`}>
                        {p.rating}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {isSaved && team.id && (team as Team).shareId && (
              <p className="font-retro text-[8px] text-white/20 mt-2">
                ID: {formatShareId((team as Team).shareId!)}
              </p>
            )}
          </div>
        )}

        {/* Match history panel */}
        {!isLegendary && team.id && historyTeamId === team.id && (
          <div className="border-t border-fifa-border px-4 pb-4 pt-3">
            <h4 className="font-retro text-[8px] text-fifa-mint/60 uppercase mb-3">Match History</h4>
            {loadingHistory && !matchHistories[team.id] ? (
              <p className="font-headline text-[10px] text-white/30 animate-pulse">Loading…</p>
            ) : (matchHistories[team.id] ?? []).length === 0 ? (
              <p className="font-headline text-[10px] text-white/30">No history yet — only games played after history tracking was added are recorded.</p>
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
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fifa-mint mx-auto" />
          <p className="mt-4 font-retro text-[9px] text-fifa-mint/50">Loading…</p>
        </div>
      </div>
    );
  }

  // "Teams" tab = legendary teams + all other users' teams combined
  const browseTeams: AnyTeam[] = [
    ...legendaryTeams,
    ...allTeams.filter(t => t.userId !== user?.uid),
  ];
  const displayTeams = activeTab === 'my-teams' ? myTeams : browseTeams;

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || inviteSending) return;
    const name = inviteName.trim() || user?.displayName || 'A friend';
    setInviteSending(true);
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromName: name, toEmail: inviteEmail.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      setInviteSent(true);
      setTimeout(() => { setInviteSent(false); setInviteEmail(''); setShowInvite(false); }, 3000);
    } catch {
      alert('Failed to send invite. Please try again.');
    } finally {
      setInviteSending(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="bg-fifa-dark border-b border-fifa-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center gap-4 flex-wrap">
          <h1 className="font-retro text-[11px] text-fifa-mint tracking-wider">⚽ PlayMatch</h1>
          <div className="flex gap-2 items-center flex-wrap">
            <button onClick={() => router.push('/dashboard')} className="btn-secondary text-[9px] py-1.5 px-3">← Dashboard</button>
            <button onClick={() => router.push('/team-builder')} className="btn-primary text-[9px] py-1.5 px-3">+ New Team</button>
            {/* Invite Friends */}
            <div className="relative">
              <button
                onClick={() => { setShowInvite(v => !v); setInviteSent(false); setInviteEmail(''); setInviteName(user?.displayName || ''); }}
                className="btn-secondary text-[9px] py-1.5 px-3"
              >
                📨 Invite
              </button>
              {showInvite && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-fifa-dark border border-fifa-border rounded-xl shadow-retro p-4 z-50">
                  <h3 className="font-retro text-[9px] text-fifa-mint mb-3 tracking-wider">Invite a Friend</h3>
                  {inviteSent ? (
                    <p className="font-headline text-[11px] text-fifa-mint text-center py-2">✓ Invite sent!</p>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <label className="font-retro text-[7px] text-white/40 uppercase tracking-wider block mb-1">Your Name</label>
                        <input
                          type="text"
                          value={inviteName}
                          onChange={e => setInviteName(e.target.value)}
                          placeholder={user?.displayName || 'Your name'}
                          className="w-full px-3 py-1.5 bg-fifa-mid border border-fifa-border rounded-lg text-white font-headline text-[11px] placeholder:text-white/25 focus:ring-1 focus:ring-fifa-mint focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-retro text-[7px] text-white/40 uppercase tracking-wider block mb-1">Friend's Email</label>
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={e => setInviteEmail(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
                          placeholder="friend@example.com"
                          className="w-full px-3 py-1.5 bg-fifa-mid border border-fifa-border rounded-lg text-white font-headline text-[11px] placeholder:text-white/25 focus:ring-1 focus:ring-fifa-mint focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleSendInvite}
                          disabled={!inviteEmail.trim() || inviteSending}
                          className="flex-1 btn-primary text-[8px] py-2 disabled:opacity-30"
                        >
                          {inviteSending ? 'Sending…' : 'Send Invite ⚽'}
                        </button>
                        <button onClick={() => setShowInvite(false)} className="btn-secondary text-[8px] py-2 px-3">
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <span className="font-headline text-[10px] text-fifa-cream/50 hidden sm:block">{user?.displayName}</span>
            <button onClick={signOut} className="btn-secondary text-[9px] py-1.5 px-3">Sign Out</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Match Simulator ── */}
        <div className="bg-fifa-mid rounded-xl border border-fifa-border shadow-retro p-6">
          <h2 className="font-retro text-[11px] text-fifa-mint mb-6 tracking-wider">⚡ Match Simulator</h2>

          {/* Team selectors */}
          {(() => {
            const isHomeLegendary = selectedHome && 'isLegendary' in selectedHome && (selectedHome as any).isLegendary;
            const homeOptions: AnyTeam[] = [...myTeams, ...legendaryTeams];
            const notHome = (t: AnyTeam) => t.id !== selectedHome?.id;
            const awayOptions: AnyTeam[] = (isHomeLegendary
              ? legendaryTeams
              : [...myTeams, ...legendaryTeams, ...savedTeams,
                 ...allTeams.filter(t => t.userId !== user?.uid && !savedTeams.some(s => s.id === t.id))]
            ).filter(notHome);
            return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
            {/* Home */}
            <div>
              <label className="block font-retro text-[9px] text-fifa-mint/70 mb-2 uppercase tracking-widest">Home Team</label>
              <select
                value={selectedHome?.id || ''}
                onChange={e => {
                  const team = homeOptions.find(t => t.id === e.target.value) || null;
                  setSelectedHome(team);
                  // If new home is legendary, clear away if it's not legendary
                  if (team && 'isLegendary' in team && (team as any).isLegendary) {
                    if (selectedAway && !('isLegendary' in selectedAway && (selectedAway as any).isLegendary)) {
                      setSelectedAway(null);
                    }
                  }
                }}
                className="w-full px-3 py-2 bg-fifa-dark border border-fifa-border rounded-lg text-fifa-cream text-sm focus:ring-1 focus:ring-fifa-mint focus:outline-none"
              >
                <option value="">Select home team…</option>
                <optgroup label="Your Teams">
                  {myTeams.map(t => <option key={t.id} value={t.id!}>{t.name} ({getFormation(t.formation)})</option>)}
                </optgroup>
                <optgroup label="⭐ Legendary Teams">
                  {legendaryTeams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.formation})</option>)}
                </optgroup>
              </select>
              {selectedHome && <RosterPanel team={selectedHome} record={getRecord(selectedHome)} />}
            </div>

            {/* Kick off */}
            <div className="flex flex-col items-center justify-start pt-5">
              <div className="font-retro text-[11px] text-white/20 mb-4 tracking-widest">VS</div>
              <button
                onClick={handleSimulate}
                disabled={!selectedHome || !selectedAway || simulating}
                className="w-full btn-primary py-3 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {simulating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    {loadingPhrase || 'Loading…'}
                  </span>
                ) : '⚽ Kick Off'}
              </button>
            </div>

            {/* Away */}
            <div>
              <label className="block font-retro text-[9px] text-fifa-mint/70 mb-2 uppercase tracking-widest">Away Team</label>
              <select
                value={selectedAway?.id || ''}
                onChange={e => setSelectedAway(awayOptions.find(t => t.id === e.target.value) || null)}
                className="w-full px-3 py-2 bg-fifa-dark border border-fifa-border rounded-lg text-fifa-cream text-sm focus:ring-1 focus:ring-fifa-mint focus:outline-none"
              >
                <option value="">Select away team…</option>
                {isHomeLegendary ? (
                  <optgroup label="⭐ Legendary Teams">
                    {legendaryTeams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.formation})</option>)}
                  </optgroup>
                ) : (
                  <>
                    <optgroup label="Your Teams">
                      {myTeams.map(t => <option key={t.id} value={t.id!}>{t.name} ({getFormation(t.formation)})</option>)}
                    </optgroup>
                    <optgroup label="⭐ Legendary Teams">
                      {legendaryTeams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.formation})</option>)}
                    </optgroup>
                    {savedTeams.length > 0 && (
                      <optgroup label="⚔️ Rival Teams">
                        {savedTeams.map(t => <option key={t.id} value={t.id!}>{t.name} ({getFormation(t.formation)})</option>)}
                      </optgroup>
                    )}
                    <optgroup label="All Other Teams">
                      {allTeams.filter(t => t.userId !== user?.uid && !savedTeams.some(s => s.id === t.id)).map(t => <option key={t.id} value={t.id!}>{t.name} ({getFormation(t.formation)})</option>)}
                    </optgroup>
                  </>
                )}
              </select>
              {selectedAway && <RosterPanel team={selectedAway} record={getRecord(selectedAway)} />}
            </div>
          </div>
            );
          })()}

          {/* Add rival by ID */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="font-retro text-[8px] text-white/30 tracking-wider">Add rival by ID:</span>
            <input
              type="text"
              value={addTeamIdInput}
              onChange={e => { setAddTeamIdInput(e.target.value); setAddTeamError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAddTeamById()}
              placeholder="123-4567"
              className="w-28 px-2 py-1 bg-fifa-dark border border-fifa-border rounded text-fifa-cream text-xs font-headline focus:ring-1 focus:ring-fifa-mint focus:outline-none placeholder:text-white/20"
            />
            <button
              onClick={handleAddTeamById}
              disabled={addTeamLoading || !addTeamIdInput.trim()}
              className="btn-secondary text-[8px] py-1 px-3 disabled:opacity-30"
            >
              {addTeamLoading ? '…' : '+ Add'}
            </button>
            {addTeamError && <span className="font-retro text-[8px] text-red-400">{addTeamError}</span>}
            {!addTeamError && savedTeams.length > 0 && (
              <span className="font-retro text-[8px] text-fifa-mint/50">{savedTeams.length} rival{savedTeams.length !== 1 ? 's' : ''} saved</span>
            )}
          </div>

          {/* Live Scoreboard */}
          {(simResult || simulating) && (
            <div className="mt-6 bg-fifa-dark border border-fifa-border rounded-xl p-6">
              <div className="flex items-center justify-between text-center">
                <div className="flex-1">
                  <div className="font-headline text-[11px] text-fifa-cream/60 mb-2 truncate">{selectedHome?.name}</div>
                  <div className="font-retro text-5xl text-fifa-mint transition-all duration-300">
                    {liveScore.home}
                  </div>
                </div>
                <div className="px-6">
                  <div className="font-retro text-[9px] text-white/20 tracking-widest">
                    {streamingDone ? 'FULL TIME' : visibleEvents.length > 0 ? 'LIVE' : 'KICK OFF'}
                  </div>
                  <div className="font-retro text-lg text-white/30 mt-1">—</div>
                </div>
                <div className="flex-1">
                  <div className="font-headline text-[11px] text-fifa-cream/60 mb-2 truncate">{selectedAway?.name}</div>
                  <div className="font-retro text-5xl text-fifa-mint transition-all duration-300">
                    {liveScore.away}
                  </div>
                </div>
              </div>
              {!streamingDone && visibleEvents.length > 0 && (
                <p className="mt-3 text-center font-retro text-[8px] text-fifa-mint/50 animate-pulse">
                  ● LIVE
                </p>
              )}
              {streamingDone && simResult && (
                <p className="mt-3 text-center font-headline text-[10px] text-fifa-amber">
                  ⭐ {simResult.manOfTheMatch}
                </p>
              )}
            </div>
          )}

          {/* Play-by-play feed */}
          {visibleEvents.length > 0 && (
            <div ref={feedRef} className="mt-4 rounded-xl border border-fifa-border bg-fifa-dark overflow-y-auto" style={{ maxHeight: 380 }}>
              <div className="divide-y divide-fifa-border/50">
                {visibleEvents.filter(ev => ev && ev.type).map((ev, i) => {
                  const color = EVENT_COLORS[ev.type] || 'border-l-4 border-transparent';
                  const icon = EVENT_ICONS[ev.type] || '⚽';
                  const isGoal = ev.type === 'goal';
                  const isMilestone = ev.type === 'halftime' || ev.type === 'fulltime';
                  return (
                    <div key={i} className={`flex items-start gap-3 px-4 py-2.5 ${color}`}>
                      <span className="flex-shrink-0 w-7 font-retro text-[8px] text-white/30 pt-0.5">{ev.minute}'</span>
                      <span className="flex-shrink-0 text-sm">{icon}</span>
                      <p className={`text-sm flex-1 leading-snug ${isGoal ? 'font-bold text-fifa-mint' : isMilestone ? 'font-headline text-[11px] text-fifa-amber' : 'text-fifa-cream/70'}`}>
                        {ev.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary */}
          {streamingDone && simResult && (
            <div className="mt-4 bg-fifa-dark border border-fifa-border rounded-xl p-4">
              <h4 className="font-retro text-[9px] text-fifa-mint mb-2">📋 Match Report</h4>
              <p className="text-sm text-fifa-cream/80 leading-relaxed">{simResult.summary}</p>
            </div>
          )}
        </div>

        {/* ── Teams List ── */}
        <div className="bg-fifa-mid rounded-xl border border-fifa-border shadow-retro p-6">
          <div className="flex gap-1 mb-6 border-b border-fifa-border pb-0">
            {[
              { key: 'my-teams', label: `My Teams` },
              { key: 'teams',    label: `Teams` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`px-4 py-2.5 font-retro text-[9px] tracking-wider transition-all border-b-2 -mb-px ${
                  activeTab === key
                    ? 'text-fifa-mint border-fifa-mint'
                    : 'text-white/30 border-transparent hover:text-white/60'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loadingTeams && activeTab !== 'teams' ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fifa-mint mx-auto" />
              <p className="mt-4 font-headline text-[10px] text-white/40">Loading…</p>
            </div>
          ) : (
            <>
              {/* ── My Teams: add-by-ID + other teams ── */}
              {activeTab === 'my-teams' && (
                <>
                  {/* Add by Team ID */}
                  <div className="mb-6 p-4 bg-fifa-dark border border-fifa-border rounded-xl">
                    <p className="font-retro text-[9px] text-fifa-mint mb-3 tracking-wider">⚔️ Add a Rival by Team ID</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={addTeamIdInput}
                        onChange={e => { setAddTeamIdInput(e.target.value); setAddTeamError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleAddTeamById()}
                        placeholder="Enter ID e.g. 123-4567"
                        className="flex-1 px-3 py-2 bg-fifa-mid border border-fifa-border rounded-lg text-fifa-cream text-sm placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-fifa-mint"
                      />
                      <button
                        onClick={handleAddTeamById}
                        disabled={addTeamLoading || !addTeamIdInput.trim()}
                        className="btn-primary py-2 px-4 disabled:opacity-30"
                      >
                        {addTeamLoading ? '…' : 'Add'}
                      </button>
                    </div>
                    {addTeamError && <p className="font-headline text-[10px] text-red-400 mt-2">{addTeamError}</p>}
                  </div>

                  {/* My Teams grid */}
                  {myTeams.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="font-headline text-[11px] text-white/40 mb-4">No teams yet</p>
                      <button onClick={() => router.push('/team-builder')} className="btn-primary">
                        + Build Your First Team
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {myTeams.map(team => <TeamCard key={team.id} team={team} isOwn />)}
                    </div>
                  )}

                  {/* Other Teams section */}
                  {savedTeams.length > 0 && (
                    <div className="mt-8">
                      <h3 className="font-retro text-[9px] text-fifa-mint/70 mb-4 tracking-wider">⚔️ Rivals</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {savedTeams.map(team => <TeamCard key={team.id} team={team} isSaved />)}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Teams browse tab ── */}
              {activeTab === 'teams' && (
                displayTeams.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="font-headline text-[11px] text-white/30">No teams found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayTeams.map(team => <TeamCard key={team.id} team={team} />)}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
