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
  save: '🧤', foul: '🚩', card: '🟡', corner: '🔄',
  freekick: '💨', halftime: '🔔', fulltime: '🏆',
};
const EVENT_COLORS: Record<string, string> = {
  goal:     'bg-green-50 border-l-4 border-green-500',
  halftime: 'bg-blue-50 border-l-4 border-blue-400',
  fulltime: 'bg-purple-50 border-l-4 border-purple-500',
  card:     'bg-yellow-50 border-l-4 border-yellow-400',
  save:     'bg-orange-50 border-l-4 border-orange-400',
  shot:     'bg-gray-50 border-l-4 border-gray-300',
};

const POSITION_ORDER = ['GK', 'DEF', 'MID', 'FWD'] as const;

function RecordBadge({ record }: { record: TeamRecord }) {
  return (
    <span className="inline-flex gap-2 text-xs font-bold">
      <span className="text-green-600">{record.wins}W</span>
      <span className="text-red-500">{record.losses}L</span>
      <span className="text-gray-400">{record.ties}T</span>
    </span>
  );
}

function RosterPanel({ team, record }: { team: AnyTeam; record: TeamRecord }) {
  const isLegendary = 'isLegendary' in team && team.isLegendary;
  const grouped: Record<string, typeof team.players> = { GK: [], DEF: [], MID: [], FWD: [] };
  team.players.forEach(p => { if (grouped[p.position]) grouped[p.position].push(p); });

  return (
    <div className={`mt-2 rounded-lg border p-3 text-sm ${isLegendary ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-gray-700">{isLegendary && '⭐ '}{team.name}</span>
        <RecordBadge record={record} />
      </div>
      {POSITION_ORDER.map(pos => grouped[pos].length > 0 && (
        <div key={pos} className="mb-1">
          <span className="text-xs font-bold text-gray-500 uppercase mr-2">{pos}</span>
          {grouped[pos].map((p, i) => (
            <span key={i} className="inline-block mr-3 text-gray-700">
              {p.name} <span className="text-xs text-gray-400">({p.rating})</span>
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
  const [activeTab, setActiveTab] = useState<'my-teams' | 'all-teams' | 'legendary'>('my-teams');
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
  const feedRef = useRef<HTMLDivElement>(null);

  const allTeamsForSim: AnyTeam[] = [
    ...myTeams,
    ...legendaryTeams,
    ...savedTeams,
    ...allTeams.filter(t => t.userId !== user?.uid && !savedTeams.some(s => s.id === t.id)),
  ];

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

  // Stream play-by-play events over ~120 seconds
  useEffect(() => {
    if (!simResult?.playByPlay?.length) return;
    setVisibleEvents([]);
    setStreamingDone(false);
    const events = simResult.playByPlay.filter(e => e && e.type && e.text);
    const msPerEvent = Math.round(120000 / Math.max(events.length, 1));
    let i = 0;
    const interval = setInterval(() => {
      if (i >= events.length) { clearInterval(interval); setStreamingDone(true); return; }
      setVisibleEvents(prev => [...prev, events[i]]);
      i++;
    }, msPerEvent);
    return () => clearInterval(interval);
  }, [simResult]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [visibleEvents]);

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
    } catch {
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
    setSimulating(true);
    setSimResult(null);
    setVisibleEvents([]);
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

    return (
      <div className={`border rounded-xl transition-shadow ${isLegendary ? 'border-purple-300 bg-purple-50' : isSaved ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'} ${isExpanded ? 'shadow-md' : 'hover:shadow-md'}`}>
        {/* Card header */}
        <button className="w-full text-left p-4" onClick={() => setExpandedId(isExpanded ? null : team.id!)}>
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 flex items-center gap-1 flex-wrap">
                {team.name}
                {isLegendary && <span>⭐</span>}
                {isSaved && <span className="text-xs font-normal text-orange-500 ml-1">⚔️ rival</span>}
              </h3>
              {isLegendary && 'description' in team && (
                <p className="text-xs text-purple-600 mt-0.5">{(team as any).description}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Formation: {getFormation(team.formation)}</p>
            </div>
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              {isOwn && team.id && (
                <button
                  onClick={e => { e.stopPropagation(); handleCopyId(team as Team); }}
                  title="Copy Team ID to share"
                  className="text-gray-400 hover:text-blue-500 p-1 rounded transition-colors"
                >
                  {isCopied
                    ? <span className="text-xs text-green-500 font-semibold">Copied!</span>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  }
                </button>
              )}
              {isOwn && (
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteTeam(team.id!); }}
                  className="text-red-400 hover:text-red-600 p-1"
                  title="Delete team"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              {isSaved && (
                <button
                  onClick={e => { e.stopPropagation(); handleRemoveSavedTeam(team.id!); }}
                  className="text-gray-400 hover:text-red-500 p-1 text-xs font-semibold"
                  title="Remove from Other Teams"
                >✕</button>
              )}
              <span className="text-gray-400 text-xs ml-1">{isExpanded ? '▲' : '▼'}</span>
            </div>
          </div>

          {/* Record + position breakdown */}
          <div className="flex justify-between items-center mt-2">
            <div className="flex gap-3 text-xs text-gray-500">
              {POSITION_ORDER.map(pos => (
                <span key={pos}><span className="font-medium">{pos}</span> {grouped[pos].length}</span>
              ))}
            </div>
            {/* Clickable record badge — opens match history */}
            {!isLegendary && team.id ? (
              <button
                onClick={e => { e.stopPropagation(); handleViewHistory(team.id!); }}
                className="hover:opacity-70 transition-opacity"
                title="View match history"
              >
                <RecordBadge record={record} />
              </button>
            ) : (
              <RecordBadge record={record} />
            )}
          </div>

          {/* Show formatted shareId on own cards */}
          {isOwn && (
            <p className="text-xs text-gray-400 mt-1 font-mono">
              ID: {(team as Team).shareId ? formatShareId((team as Team).shareId!) : '…'}
            </p>
          )}
        </button>

        {/* Expanded roster */}
        {isExpanded && (
          <div className={`border-t px-4 pb-4 pt-3 ${isLegendary ? 'border-purple-200' : isSaved ? 'border-orange-100' : 'border-gray-100'}`}>
            {POSITION_ORDER.map(pos => grouped[pos].length > 0 && (
              <div key={pos} className="mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase block mb-1">{pos}</span>
                <div className="space-y-1">
                  {grouped[pos].map((p, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-800">{p.name}</span>
                      <span className={`font-bold ${p.rating >= 90 ? 'text-yellow-600' : p.rating >= 80 ? 'text-green-600' : 'text-gray-500'}`}>
                        {p.rating}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {isLegendary && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-purple-200 text-purple-800 rounded text-xs font-semibold">Legendary Team</span>
            )}
            {isSaved && team.id && (team as Team).shareId && (
              <p className="text-xs text-gray-400 mt-2 font-mono">
                ID: {formatShareId((team as Team).shareId!)}
              </p>
            )}
          </div>
        )}

        {/* Match history panel */}
        {!isLegendary && team.id && historyTeamId === team.id && (
          <div className="border-t border-gray-100 px-4 pb-4 pt-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Match History</h4>
            {loadingHistory && !matchHistories[team.id] ? (
              <p className="text-xs text-gray-400 animate-pulse">Loading…</p>
            ) : (matchHistories[team.id] ?? []).length === 0 ? (
              <p className="text-xs text-gray-400">No matches played yet.</p>
            ) : (
              <div className="space-y-1">
                {(matchHistories[team.id] ?? []).map((entry, i) => {
                  const date = entry.date
                    ? new Date((entry.date as any).seconds * 1000).toLocaleDateString()
                    : '—';
                  const resultColor = entry.result === 'win' ? 'text-green-600' : entry.result === 'loss' ? 'text-red-500' : 'text-gray-400';
                  const resultLabel = entry.result === 'win' ? 'W' : entry.result === 'loss' ? 'L' : 'T';
                  return (
                    <div key={i} className="flex items-center justify-between text-xs text-gray-700">
                      <span className="text-gray-400 w-20 flex-shrink-0">{date}</span>
                      <span className="flex-1 truncate mx-2">vs {entry.opponentName}</span>
                      <span className="font-mono mr-2">{entry.teamScore}–{entry.opponentScore}</span>
                      <span className={`font-bold w-4 text-right ${resultColor}`}>{resultLabel}</span>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const displayTeams = activeTab === 'my-teams' ? myTeams : activeTab === 'legendary' ? legendaryTeams : allTeams;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">⚽ Teams</h1>
          <div className="flex gap-3 items-center flex-wrap">
            <button onClick={() => router.push('/dashboard')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm">← Dashboard</button>
            <button onClick={() => router.push('/team-builder')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">+ New Team</button>
            <span className="text-gray-500 text-sm">{user?.displayName}</span>
            <button onClick={signOut} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm">Sign Out</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Match Simulator ── */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6">Match Simulator</h2>

          {/* Team selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
            {/* Home */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Home Team</label>
              <select
                value={selectedHome?.id || ''}
                onChange={e => setSelectedHome(allTeamsForSim.find(t => t.id === e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300"
              >
                <option value="">Select home team…</option>
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
              </select>
              {selectedHome && <RosterPanel team={selectedHome} record={getRecord(selectedHome)} />}
            </div>

            {/* Kick off */}
            <div className="flex flex-col items-center justify-start pt-6">
              <div className="text-3xl font-bold text-gray-300 mb-3">VS</div>
              <button
                onClick={handleSimulate}
                disabled={!selectedHome || !selectedAway || simulating}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition-colors"
              >
                {simulating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Simulating…
                  </span>
                ) : '⚽ Kick Off'}
              </button>
            </div>

            {/* Away */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Away Team</label>
              <select
                value={selectedAway?.id || ''}
                onChange={e => setSelectedAway(allTeamsForSim.find(t => t.id === e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300"
              >
                <option value="">Select away team…</option>
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
              </select>
              {selectedAway && <RosterPanel team={selectedAway} record={getRecord(selectedAway)} />}
            </div>
          </div>

          {/* Scoreboard — scores hidden until streaming completes */}
          {(simResult || simulating) && (
            <div className="mt-6 bg-gradient-to-r from-purple-900 to-blue-900 text-white rounded-xl p-6">
              <div className="flex items-center justify-between text-center">
                <div className="flex-1">
                  <div className="text-sm font-medium opacity-75">{selectedHome?.name}</div>
                  <div className="text-6xl font-black mt-1 transition-all duration-500">
                    {streamingDone && simResult ? simResult.team1Score : <span className="opacity-30">?</span>}
                  </div>
                </div>
                <div className="text-2xl opacity-40 px-4">—</div>
                <div className="flex-1">
                  <div className="text-sm font-medium opacity-75">{selectedAway?.name}</div>
                  <div className="text-6xl font-black mt-1 transition-all duration-500">
                    {streamingDone && simResult ? simResult.team2Score : <span className="opacity-30">?</span>}
                  </div>
                </div>
              </div>
              {!streamingDone && (
                <p className="mt-3 text-center text-xs opacity-50 animate-pulse">Match in progress…</p>
              )}
              {streamingDone && simResult && (
                <p className="mt-3 text-center text-sm opacity-70">
                  ⭐ Man of the Match: <span className="font-semibold">{simResult.manOfTheMatch}</span>
                </p>
              )}
            </div>
          )}

          {/* Play-by-play feed */}
          {visibleEvents.length > 0 && (
            <div ref={feedRef} className="mt-4 rounded-xl border border-gray-200 overflow-y-auto" style={{ maxHeight: 400 }}>
              <div className="divide-y divide-gray-100">
                {visibleEvents.filter(ev => ev && ev.type).map((ev, i) => {
                  const color = EVENT_COLORS[ev.type] || 'bg-white border-l-4 border-transparent';
                  const icon = EVENT_ICONS[ev.type] || '⚽';
                  return (
                    <div key={i} className={`flex items-start gap-3 px-4 py-3 ${color}`}>
                      <span className="flex-shrink-0 w-8 text-xs font-bold text-gray-400 pt-0.5">{ev.minute}'</span>
                      <span className="flex-shrink-0 text-base">{icon}</span>
                      <p className={`text-sm flex-1 leading-snug ${ev.type === 'goal' ? 'font-bold text-green-800' : ev.type === 'halftime' || ev.type === 'fulltime' ? 'font-semibold' : 'text-gray-700'}`}>
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
            <div className="mt-4 bg-gray-50 rounded-xl p-4">
              <h4 className="font-bold mb-1">📋 Match Report</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{simResult.summary}</p>
            </div>
          )}
        </div>

        {/* ── Teams List ── */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex gap-4 mb-6 border-b">
            {[
              { key: 'my-teams', label: `My Teams (${myTeams.length})`, color: 'blue' },
              { key: 'legendary', label: `Legendary Teams (${legendaryTeams.length})`, color: 'purple' },
              { key: 'all-teams', label: `All Teams (${allTeams.length})`, color: 'blue' },
            ].map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`px-4 py-2 font-semibold transition-colors ${
                  activeTab === key
                    ? `text-${color}-600 border-b-2 border-${color}-600`
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loadingTeams && activeTab !== 'legendary' ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
              <p className="mt-4 text-gray-500">Loading teams…</p>
            </div>
          ) : (
            <>
              {/* ── My Teams: add-by-ID + other teams ── */}
              {activeTab === 'my-teams' && (
                <>
                  {/* Add by Team ID */}
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-sm font-semibold text-blue-800 mb-2">⚔️ Add a Friend's Team by ID</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={addTeamIdInput}
                        onChange={e => { setAddTeamIdInput(e.target.value); setAddTeamError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleAddTeamById()}
                        placeholder="Paste Team ID here…"
                        className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                      />
                      <button
                        onClick={handleAddTeamById}
                        disabled={addTeamLoading || !addTeamIdInput.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {addTeamLoading ? '…' : 'Add'}
                      </button>
                    </div>
                    {addTeamError && <p className="text-xs text-red-500 mt-1">{addTeamError}</p>}
                  </div>

                  {/* My Teams grid */}
                  {myTeams.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-lg">No teams yet</p>
                      <button onClick={() => router.push('/team-builder')} className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                        Create Your First Team
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
                      <h3 className="text-lg font-bold text-gray-700 mb-3">⚔️ Other Teams</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {savedTeams.map(team => <TeamCard key={team.id} team={team} isSaved />)}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Legendary + All Teams tabs ── */}
              {activeTab !== 'my-teams' && (
                displayTeams.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">No teams found</p>
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
