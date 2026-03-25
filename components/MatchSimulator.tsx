'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Team,
  saveMatchResult,
  getAllTeams,
  updateTeamRecord,
  updateLegendaryRecord,
  getUserLegendaryRecords,
  getTeamRecords,
  TeamRecord,
} from '@/lib/firebase/firestore';
import { LEGENDARY_TEAMS, LegendaryTeam } from '@/lib/legendary-teams';

type AnyTeam = Team | LegendaryTeam;

interface PlayByPlayEvent {
  minute: number;
  type: string;
  text: string;
}

interface MatchResult {
  team1Score: number;
  team2Score: number;
  summary: string;
  manOfTheMatch: string;
  playByPlay: PlayByPlayEvent[];
}

interface MatchSimulatorProps {
  teams: Team[];        // current user's own teams
  userId: string;
}

// ── Helpers ──────────────────────────────────────────────────

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

function RosterPreview({ team, record }: { team: AnyTeam; record?: TeamRecord }) {
  const isLegendary = 'isLegendary' in team && team.isLegendary;
  const grouped: Record<string, typeof team.players> = { GK: [], DEF: [], MID: [], FWD: [] };
  team.players.forEach(p => { if (grouped[p.position]) grouped[p.position].push(p); });
  return (
    <div className="mt-2 rounded-lg border border-fifa-border bg-fifa-dark p-3">
      <div className="flex justify-between items-center mb-2">
        <span className="font-headline text-[11px] text-fifa-cream">{isLegendary ? '⭐ ' : ''}{team.name}</span>
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

const EVENT_ICONS: Record<string, string> = {
  kickoff: '🏁', action: '⚽', shot: '🎯', goal: '🚨',
  save: '🧤', foul: '🚩', card: '🟡', corner: '🔄',
  freekick: '💨', halftime: '🔔', fulltime: '🏆',
};
const EVENT_COLORS: Record<string, string> = {
  goal:     'bg-fifa-mint/10 border-l-4 border-fifa-mint',
  halftime: 'bg-white/5 border-l-4 border-white/30',
  fulltime: 'bg-fifa-mint/20 border-l-4 border-fifa-mint',
  card:     'bg-fifa-amber/10 border-l-4 border-fifa-amber',
  save:     'bg-white/5 border-l-4 border-white/20',
  shot:     'border-l-4 border-transparent',
  default:  'border-l-4 border-transparent',
};

// ── Component ─────────────────────────────────────────────────

export default function MatchSimulator({ teams, userId }: MatchSimulatorProps) {
  const [otherTeams, setOtherTeams] = useState<Team[]>([]);
  const [teamRecords, setTeamRecords] = useState<Record<string, TeamRecord>>({});
  const [legendaryRecords, setLegendaryRecords] = useState<Record<string, TeamRecord>>({});

  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [visibleEvents, setVisibleEvents] = useState<PlayByPlayEvent[]>([]);
  const [streamingDone, setStreamingDone] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  // All selectable teams
  const allTeams: AnyTeam[] = [...teams, ...LEGENDARY_TEAMS, ...otherTeams.filter(t => t.userId !== userId)];

  // Load other users' teams + records on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [all, legRecs] = await Promise.all([
          getAllTeams().catch(() => [] as Team[]),
          getUserLegendaryRecords(userId).catch(() => ({} as Record<string, TeamRecord>)),
        ]);
        const other = all.filter(t => t.userId !== userId);
        setOtherTeams(other);
        setLegendaryRecords(legRecs);

        const allIds = [...teams, ...other].map(t => t.id!).filter(Boolean);
        const recs = await getTeamRecords(allIds).catch(() => ({} as Record<string, TeamRecord>));
        setTeamRecords(recs);
      } catch (e) {
        console.error('Failed to load teams/records', e);
      }
    };
    if (userId) load();
  }, [userId]);

  // Stream events
  useEffect(() => {
    if (!result?.playByPlay?.length) return;
    setVisibleEvents([]);
    setStreamingDone(false);
    const events = result.playByPlay.filter(e => e && e.type && e.text);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= events.length) { clearInterval(interval); setStreamingDone(true); return; }
      setVisibleEvents(prev => [...prev, events[i]]);
      i++;
    }, 120);
    return () => clearInterval(interval);
  }, [result]);

  // Auto-scroll
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [visibleEvents]);

  const getTeamById = (id: string): AnyTeam | undefined => allTeams.find(t => t.id === id);

  const getRecord = (team: AnyTeam): TeamRecord | undefined => {
    const isLeg = 'isLegendary' in team && team.isLegendary;
    return isLeg ? legendaryRecords[team.id] : teamRecords[team.id!];
  };

  const applyRecordUpdate = async (team: AnyTeam, result: 'win' | 'loss' | 'tie') => {
    try {
      const isLeg = 'isLegendary' in team && team.isLegendary;
      if (isLeg) {
        await updateLegendaryRecord(userId, team.id, result);
        setLegendaryRecords(prev => {
          const cur = prev[team.id] ?? { wins: 0, losses: 0, ties: 0 };
          return { ...prev, [team.id]: { ...cur, [result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'ties']: (cur[result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'ties'] ?? 0) + 1 } };
        });
      } else if (team.id) {
        await updateTeamRecord(team.id, result);
        setTeamRecords(prev => {
          const cur = prev[team.id!] ?? { wins: 0, losses: 0, ties: 0 };
          return { ...prev, [team.id!]: { ...cur, [result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'ties']: (cur[result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'ties'] ?? 0) + 1 } };
        });
      }
    } catch (e) {
      console.error('Failed to update record', e);
    }
  };

  const handleSimulate = async () => {
    if (!team1Id || !team2Id) { alert('Please select both teams'); return; }
    const team1 = getTeamById(team1Id);
    const team2 = getTeamById(team2Id);
    if (!team1 || !team2) return;

    setSimulating(true);
    setResult(null);
    setVisibleEvents([]);

    try {
      const response = await fetch('/api/simulate-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team1Name: team1.name, team1Players: team1.players,
          team2Name: team2.name, team2Players: team2.players,
        }),
      });

      const matchResult = await response.json();
      if (!response.ok || matchResult.error) throw new Error(matchResult.error || 'Simulation failed');
      if (!Array.isArray(matchResult.playByPlay)) throw new Error('Invalid response format');
      matchResult.playByPlay = matchResult.playByPlay.filter((e: any) => e && typeof e.type === 'string' && typeof e.text === 'string');
      setResult(matchResult as MatchResult);

      // Determine outcomes
      const t1wins = matchResult.team1Score > matchResult.team2Score;
      const t2wins = matchResult.team2Score > matchResult.team1Score;
      const tied = matchResult.team1Score === matchResult.team2Score;

      await Promise.all([
        applyRecordUpdate(team1, t1wins ? 'win' : tied ? 'tie' : 'loss'),
        applyRecordUpdate(team2, t2wins ? 'win' : tied ? 'tie' : 'loss'),
      ]);

      // Save match to history (regular teams only)
      const isLeg1 = 'isLegendary' in team1 && team1.isLegendary;
      const isLeg2 = 'isLegendary' in team2 && team2.isLegendary;
      if (!isLeg1 && !isLeg2 && team1.id && team2.id) {
        saveMatchResult({
          team1Id: team1.id, team2Id: team2.id,
          team1Name: team1.name, team2Name: team2.name,
          team1Score: matchResult.team1Score, team2Score: matchResult.team2Score,
          summary: matchResult.summary, userId,
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Error:', e);
      alert('Failed to simulate match. Please try again.');
    } finally {
      setSimulating(false);
    }
  };

  const team1 = getTeamById(team1Id);
  const team2 = getTeamById(team2Id);

  return (
    <div className="bg-fifa-mid rounded-xl border border-fifa-border shadow-retro p-6 max-w-4xl mx-auto">
      <h2 className="font-retro text-[11px] text-fifa-mint mb-2 tracking-wider">⚽ MATCH SIMULATOR</h2>
      <p className="font-headline text-[10px] text-white/50 mb-6">Pick any two teams — including rivals' teams. Records update for both sides.</p>

      {/* Team selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start mb-2">
        <div>
          <label className="block font-retro text-[9px] text-fifa-mint/70 mb-2 uppercase tracking-widest">Home Team</label>
          <select value={team1Id} onChange={e => setTeam1Id(e.target.value)} className="w-full px-3 py-2 bg-fifa-dark border border-fifa-border rounded-lg text-fifa-cream text-sm focus:ring-1 focus:ring-fifa-mint focus:outline-none">
            <option value="">Select Home Team</option>
            <optgroup label="My Teams">
              {teams.map(t => <option key={t.id} value={t.id!}>{t.name}</option>)}
            </optgroup>
            <optgroup label="⭐ Legendary Teams">
              {LEGENDARY_TEAMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </optgroup>
            {otherTeams.filter(t => t.userId !== userId).length > 0 && (
              <optgroup label="⚔️ Challenge (other users)">
                {otherTeams.filter(t => t.userId !== userId).map(t => <option key={t.id} value={t.id!}>{t.name}</option>)}
              </optgroup>
            )}
          </select>
          {team1 && <RosterPreview team={team1} record={getRecord(team1)} />}
        </div>

        <div className="flex flex-col items-center justify-start pt-6">
          <div className="font-retro text-[11px] text-white/20 mb-4 tracking-widest">VS</div>
          <button
            onClick={handleSimulate}
            disabled={!team1Id || !team2Id || simulating}
            className="btn-primary w-full py-3 disabled:opacity-30"
          >
            {simulating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Simulating…
              </span>
            ) : '⚽ Kick Off'}
          </button>
        </div>

        <div>
          <label className="block font-retro text-[9px] text-fifa-mint/70 mb-2 uppercase tracking-widest">Away Team</label>
          <select value={team2Id} onChange={e => setTeam2Id(e.target.value)} className="w-full px-3 py-2 bg-fifa-dark border border-fifa-border rounded-lg text-fifa-cream text-sm focus:ring-1 focus:ring-fifa-mint focus:outline-none">
            <option value="">Select Away Team</option>
            <optgroup label="My Teams">
              {teams.filter(t => t.id !== team1Id).map(t => <option key={t.id} value={t.id!}>{t.name}</option>)}
            </optgroup>
            <optgroup label="⭐ Legendary Teams">
              {LEGENDARY_TEAMS.filter(t => t.id !== team1Id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </optgroup>
            {otherTeams.filter(t => t.userId !== userId && t.id !== team1Id).length > 0 && (
              <optgroup label="⚔️ Challenge (other users)">
                {otherTeams.filter(t => t.userId !== userId && t.id !== team1Id).map(t => <option key={t.id} value={t.id!}>{t.name}</option>)}
              </optgroup>
            )}
          </select>
          {team2 && <RosterPreview team={team2} record={getRecord(team2)} />}
        </div>
      </div>

      {/* Scoreboard */}
      {result && (
        <div className="mt-6 bg-fifa-dark border border-fifa-border rounded-xl p-6 mb-4">
          <div className="flex items-center justify-between text-center">
            <div className="flex-1">
              <div className="font-headline text-[11px] text-fifa-cream/60 mb-2 truncate">{team1?.name}</div>
              <div className="font-retro text-5xl text-fifa-mint">{result.team1Score}</div>
            </div>
            <div className="px-6">
              <div className="font-retro text-[9px] text-white/20 tracking-widest">FULL TIME</div>
              <div className="font-retro text-lg text-white/30 mt-1">—</div>
            </div>
            <div className="flex-1">
              <div className="font-headline text-[11px] text-fifa-cream/60 mb-2 truncate">{team2?.name}</div>
              <div className="font-retro text-5xl text-fifa-mint">{result.team2Score}</div>
            </div>
          </div>
          {streamingDone && (
            <p className="mt-3 text-center font-headline text-[10px] text-fifa-amber">
              ⭐ {result.manOfTheMatch}
            </p>
          )}
        </div>
      )}

      {/* Play-by-play feed */}
      {visibleEvents.length > 0 && (
        <div ref={feedRef} className="rounded-xl border border-fifa-border bg-fifa-dark overflow-y-auto" style={{ maxHeight: '380px' }}>
          <div className="divide-y divide-fifa-border/50">
            {visibleEvents.filter(event => event && event.type).map((event, idx) => {
              const colorClass = EVENT_COLORS[event.type] || EVENT_COLORS.default;
              const icon = EVENT_ICONS[event.type] || '⚽';
              const isGoal = event.type === 'goal';
              const isMilestone = event.type === 'halftime' || event.type === 'fulltime';
              return (
                <div key={idx} className={`flex items-start gap-3 px-4 py-2.5 ${colorClass}`}>
                  <span className="flex-shrink-0 w-7 font-retro text-[8px] text-white/30 pt-0.5">{event.minute}'</span>
                  <span className="flex-shrink-0 text-sm">{icon}</span>
                  <p className={`text-sm flex-1 leading-snug ${
                    isGoal ? 'font-bold text-fifa-mint' :
                    isMilestone ? 'font-headline text-[11px] text-fifa-amber' :
                    'text-fifa-cream/70'
                  }`}>
                    {event.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Match summary */}
      {streamingDone && result && (
        <div className="mt-4 bg-fifa-dark border border-fifa-border rounded-xl p-4">
          <h4 className="font-retro text-[9px] text-fifa-mint mb-2">📋 MATCH REPORT</h4>
          <p className="text-sm text-fifa-cream/80 leading-relaxed">{result.summary}</p>
        </div>
      )}
    </div>
  );
}
