'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { signOut } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { Team } from '@/lib/types';
import { getUserTeams, getAllTeams, deleteTeam } from '@/lib/firebase/firestore';
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

function RosterPanel({ team }: { team: AnyTeam }) {
  const isLegendary = 'isLegendary' in team && team.isLegendary;
  const grouped: Record<string, typeof team.players> = { GK: [], DEF: [], MID: [], FWD: [] };
  team.players.forEach(p => { if (grouped[p.position]) grouped[p.position].push(p); });

  return (
    <div className={`mt-2 rounded-lg border p-3 text-sm ${isLegendary ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="font-semibold text-gray-700 mb-2 flex items-center gap-1">
        {isLegendary && '⭐'} {team.name} Roster
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
  const feedRef = useRef<HTMLDivElement>(null);

  const allTeamsForSim: AnyTeam[] = [...myTeams, ...legendaryTeams, ...allTeams.filter(t => t.userId !== user?.uid)];

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

  // Stream play-by-play events
  useEffect(() => {
    if (!simResult) return;
    setVisibleEvents([]);
    setStreamingDone(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= simResult.playByPlay.length) { clearInterval(interval); setStreamingDone(true); return; }
      setVisibleEvents(prev => [...prev, simResult.playByPlay[i]]);
      i++;
    }, 120);
    return () => clearInterval(interval);
  }, [simResult]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [visibleEvents]);

  const loadTeams = async () => {
    try {
      const [userTeams, teams] = await Promise.all([
        getUserTeams(user!.uid).catch(() => [] as Team[]),
        getAllTeams().catch(() => [] as Team[]),
      ]);
      setMyTeams(userTeams);
      setAllTeams(teams);
    } catch {
      setMyTeams([]); setAllTeams([]);
    } finally {
      setLoadingTeams(false);
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
      const data: SimResult = await res.json();
      setSimResult(data);
    } catch (e) {
      console.error(e);
      alert('Failed to simulate match');
    } finally {
      setSimulating(false);
    }
  };

  const getFormation = (f: any) => typeof f === 'string' ? f : f?.name || 'N/A';

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
                <optgroup label="All Other Teams">
                  {allTeams.filter(t => t.userId !== user?.uid).map(t => <option key={t.id} value={t.id!}>{t.name} ({getFormation(t.formation)})</option>)}
                </optgroup>
              </select>
              {selectedHome && <RosterPanel team={selectedHome} />}
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
                <optgroup label="All Other Teams">
                  {allTeams.filter(t => t.userId !== user?.uid).map(t => <option key={t.id} value={t.id!}>{t.name} ({getFormation(t.formation)})</option>)}
                </optgroup>
              </select>
              {selectedAway && <RosterPanel team={selectedAway} />}
            </div>
          </div>

          {/* Scoreboard */}
          {simResult && (
            <div className="mt-6 bg-gradient-to-r from-purple-900 to-blue-900 text-white rounded-xl p-6">
              <div className="flex items-center justify-between text-center">
                <div className="flex-1">
                  <div className="text-sm font-medium opacity-75">{selectedHome?.name}</div>
                  <div className="text-6xl font-black mt-1">{simResult.team1Score}</div>
                </div>
                <div className="text-2xl opacity-40 px-4">—</div>
                <div className="flex-1">
                  <div className="text-sm font-medium opacity-75">{selectedAway?.name}</div>
                  <div className="text-6xl font-black mt-1">{simResult.team2Score}</div>
                </div>
              </div>
              {streamingDone && (
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
                {visibleEvents.map((ev, i) => {
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
          ) : displayTeams.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No teams yet</p>
              <button onClick={() => router.push('/team-builder')} className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                Create Your First Team
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayTeams.map(team => {
                const isLegendary = 'isLegendary' in team && team.isLegendary;
                const isExpanded = expandedId === team.id;
                const grouped: Record<string, typeof team.players> = { GK: [], DEF: [], MID: [], FWD: [] };
                team.players.forEach(p => { if (grouped[p.position]) grouped[p.position].push(p); });

                return (
                  <div
                    key={team.id}
                    className={`border rounded-xl transition-shadow ${isLegendary ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'} ${isExpanded ? 'shadow-md' : 'hover:shadow-md'}`}
                  >
                    {/* Card header — always visible */}
                    <button
                      className="w-full text-left p-4"
                      onClick={() => setExpandedId(isExpanded ? null : team.id!)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-1 flex-wrap">
                            {team.name}
                            {isLegendary && <span>⭐</span>}
                          </h3>
                          {isLegendary && 'description' in team && (
                            <p className="text-xs text-purple-600 mt-0.5">{team.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">Formation: {getFormation(team.formation)}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          {!isLegendary && team.userId === user?.uid && (
                            <span
                              role="button"
                              onClick={e => { e.stopPropagation(); handleDeleteTeam(team.id!); }}
                              className="text-red-400 hover:text-red-600 p-1"
                              title="Delete team"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </span>
                          )}
                          <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {/* Mini position breakdown */}
                      <div className="flex gap-3 mt-2 text-xs text-gray-500">
                        {POSITION_ORDER.map(pos => (
                          <span key={pos}><span className="font-medium">{pos}</span> {grouped[pos].length}</span>
                        ))}
                      </div>
                    </button>

                    {/* Expanded roster */}
                    {isExpanded && (
                      <div className={`border-t px-4 pb-4 pt-3 ${isLegendary ? 'border-purple-200' : 'border-gray-100'}`}>
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
