'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Team,
  saveMatchHistory,
  getAllTeams,
  updateTeamRecord,
  updateLegendaryRecord,
  getUserLegendaryRecords,
  getTeamRecords,
  TeamRecord,
  getTeamByShareId,
  parseShareId,
  addSavedTeam,
  getSavedTeamIds,
} from '@/lib/firebase/firestore';
import { getLegendaryTeams, LegendaryTeam } from '@/lib/legendary-teams';
import { calculateSoccerChemistry, ChemistryResult } from '@/lib/chemistry';

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
  userEmail?: string;
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

// ── Chemistry Panel ────────────────────────────────────────────
const CHEMISTRY_COLORS: Record<string, string> = {
  club:     'bg-blue-500/20 border-blue-500/40 text-blue-300',
  national: 'bg-green-500/20 border-green-500/40 text-green-300',
  era:      'bg-purple-500/20 border-purple-500/40 text-purple-300',
  team:     'bg-orange-500/20 border-orange-500/40 text-orange-300',
};

function ChemistryPanel({ chemistry }: { chemistry: ChemistryResult | null }) {
  if (!chemistry || chemistry.activeBonuses.length === 0) return null;
  const score = chemistry.chemistryScore;
  const barColor = score >= 70 ? 'bg-green-400' : score >= 40 ? 'bg-fifa-amber' : 'bg-red-400';
  return (
    <div className="mt-2 rounded-lg border border-fifa-border bg-fifa-dark/80 p-3 space-y-2">
      {/* Score bar */}
      <div className="flex items-center gap-2">
        <span className="font-retro text-[8px] text-white/40 uppercase tracking-widest whitespace-nowrap">Chemistry</span>
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${score}%` }} />
        </div>
        <span className={`font-retro text-[9px] font-bold ${score >= 70 ? 'text-green-400' : score >= 40 ? 'text-fifa-amber' : 'text-red-400'}`}>{score}</span>
      </div>
      {/* Active bonus badges */}
      <div className="flex flex-wrap gap-1.5">
        {chemistry.activeBonuses.map((bonus, i) => (
          <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-headline ${CHEMISTRY_COLORS[bonus.type] || CHEMISTRY_COLORS.club}`}>
            {bonus.emoji} {bonus.label} <span className="font-bold">+{bonus.bonusPerPlayer}</span>
          </span>
        ))}
      </div>
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

export default function MatchSimulator({ teams, userId, userEmail }: MatchSimulatorProps) {
  const [otherTeams, setOtherTeams] = useState<Team[]>([]);
  const [teamRecords, setTeamRecords] = useState<Record<string, TeamRecord>>({});
  const [legendaryRecords, setLegendaryRecords] = useState<Record<string, TeamRecord>>({});

  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [visibleEvents, setVisibleEvents] = useState<PlayByPlayEvent[]>([]);
  const [streamingDone, setStreamingDone] = useState(false);
  const [currentScore, setCurrentScore] = useState({ team1: 0, team2: 0 });
  const [simError, setSimError] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const [addTeamIdInput, setAddTeamIdInput] = useState('');
  const [addTeamLoading, setAddTeamLoading] = useState(false);
  const [addTeamError, setAddTeamError] = useState('');
  const [savedTeamIds, setSavedTeamIds] = useState<string[]>([]);
  const [team1Chemistry, setTeam1Chemistry] = useState<ChemistryResult | null>(null);
  const [team2Chemistry, setTeam2Chemistry] = useState<ChemistryResult | null>(null);

  // Get legendary teams (excluding premium)
  const legendaryTeams = getLegendaryTeams();

  // All selectable teams
  const allTeams: AnyTeam[] = [...teams, ...legendaryTeams, ...otherTeams.filter(t => t.userId !== userId)];

  // Load other users' teams + records on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [all, legRecs, savedIds] = await Promise.all([
          getAllTeams().catch(() => [] as Team[]),
          getUserLegendaryRecords(userId).catch(() => ({} as Record<string, TeamRecord>)),
          getSavedTeamIds(userId).catch(() => [] as string[]),
        ]);
        const other = all.filter(t => t.userId !== userId);
        setOtherTeams(other);
        setLegendaryRecords(legRecs);
        setSavedTeamIds(savedIds);

        const allIds = [...teams, ...other].map(t => t.id!).filter(Boolean);
        const recs = await getTeamRecords(allIds).catch(() => ({} as Record<string, TeamRecord>));
        setTeamRecords(recs);
      } catch (e) {
        console.error('Failed to load teams/records', e);
      }
    };
    if (userId) load();
  }, [userId, teams]);

  // Stream events
  useEffect(() => {
    if (!result?.playByPlay?.length) return;
    setVisibleEvents([]);
    setStreamingDone(false);
    setCurrentScore({ team1: 0, team2: 0 });
    const events = result.playByPlay.filter(e => e && e.type && e.text);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= events.length) { clearInterval(interval); setStreamingDone(true); return; }
      const event = events[i];
      setVisibleEvents(prev => [...prev, event]);

      // Update score when goal event appears
      if (event.type === 'goal' && 'scoringTeam' in event) {
        setCurrentScore(prev => ({
          team1: prev.team1 + ((event as any).scoringTeam === 'team1' ? 1 : 0),
          team2: prev.team2 + ((event as any).scoringTeam === 'team2' ? 1 : 0),
        }));
      }

      i++;
    }, 1800); // 90 seconds / ~50 events = 1800ms per event
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

  const handleAddTeamById = async () => {
    const raw = parseShareId(addTeamIdInput.trim());
    if (raw.length !== 7) {
      setAddTeamError('Enter a valid 7-digit Team ID (e.g. 123-4567).');
      return;
    }
    setAddTeamLoading(true);
    setAddTeamError('');
    try {
      const team = await getTeamByShareId(raw);
      if (!team) {
        setAddTeamError('Team not found. Double-check the ID.');
        return;
      }
      if (team.userId === userId) {
        setAddTeamError("That's your own team!");
        return;
      }
      if (teams.some(t => t.id === team.id) || otherTeams.some(t => t.id === team.id)) {
        setAddTeamError('Team already available.');
        return;
      }
      await addSavedTeam(userId, team.id!);
      setOtherTeams(prev => [...prev, team]);
      setSavedTeamIds(prev => [...prev, team.id!]);
      const recs = await getTeamRecords([team.id!]).catch(() => ({} as Record<string, TeamRecord>));
      setTeamRecords(prev => ({ ...prev, ...recs }));
      setAddTeamIdInput('');
    } catch {
      setAddTeamError('Something went wrong. Try again.');
    } finally {
      setAddTeamLoading(false);
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
    setCurrentScore({ team1: 0, team2: 0 });
    setSimError(null);

    try {
      const response = await fetch('/api/simulate-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team1Name: team1.name, team1Players: team1.players, team1Formation: (team1 as any).formation || '4-3-3',
          team2Name: team2.name, team2Players: team2.players, team2Formation: (team2 as any).formation || '4-3-3',
          userId: userId,
          userEmail: userEmail,
          team1ChemistryText: team1Chemistry?.promptText || '',
          team2ChemistryText: team2Chemistry?.promptText || '',
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

      // Save history for team1 if not legendary
      if (!isLeg1 && team1.id) {
        saveMatchHistory({
          teamId: team1.id,
          teamName: team1.name,
          teamScore: matchResult.team1Score,
          opponentId: team2.id ?? 'legendary',
          opponentName: team2.name,
          opponentScore: matchResult.team2Score,
          result: t1wins ? 'win' : tied ? 'tie' : 'loss',
          date: null,
        }).catch(() => {});
      }

      // Save history for team2 if not legendary
      if (!isLeg2 && team2.id) {
        saveMatchHistory({
          teamId: team2.id,
          teamName: team2.name,
          teamScore: matchResult.team2Score,
          opponentId: team1.id ?? 'legendary',
          opponentName: team1.name,
          opponentScore: matchResult.team1Score,
          result: t2wins ? 'win' : tied ? 'tie' : 'loss',
          date: null,
        }).catch(() => {});
      }
    } catch (e: any) {
      console.error('Error:', e);
      const msg = e?.message || 'Failed to simulate match. Please try again.';
      setSimError(msg);
    } finally {
      setSimulating(false);
    }
  };

  const team1 = getTeamById(team1Id);
  const team2 = getTeamById(team2Id);
  const isHomeOwnTeam = team1 && !('isLegendary' in team1 && team1.isLegendary) && teams.some(t => t.id === team1.id);

  // Recompute chemistry when selected teams change
  useEffect(() => {
    setTeam1Chemistry(team1 ? calculateSoccerChemistry(team1.players as any[]) : null);
  }, [team1Id]);
  useEffect(() => {
    setTeam2Chemistry(team2 ? calculateSoccerChemistry(team2.players as any[]) : null);
  }, [team2Id]);

  return (
    <div className="bg-fifa-mid rounded-xl border border-fifa-border shadow-retro p-6 max-w-4xl mx-auto">
      <h2 className="font-retro text-[11px] text-fifa-mint mb-2 tracking-wider">⚽ MATCH SIMULATOR</h2>
      <p className="font-headline text-[10px] text-white/50 mb-6">Simulate matches with your teams. Friends' teams can only play against your teams.</p>

      {/* Team selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start mb-2">
        <div>
          <label className="block font-retro text-[9px] text-fifa-mint/70 mb-2 uppercase tracking-widest">Home Team</label>
          <select value={team1Id} onChange={e => setTeam1Id(e.target.value)} className="w-full px-3 py-2 bg-fifa-dark border border-fifa-border rounded-lg text-fifa-cream font-headline text-sm focus:ring-1 focus:ring-fifa-mint focus:outline-none">
            <option value="">Select Home Team</option>
            <optgroup label="🏠 My Teams">
              {teams.map(t => <option key={t.id} value={t.id!}>{t.name}</option>)}
            </optgroup>
            <optgroup label="⭐ Legendary Teams">
              {legendaryTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </optgroup>
          </select>
          {team1 && <RosterPreview team={team1} record={getRecord(team1)} />}
          {team1 && <ChemistryPanel chemistry={team1Chemistry} />}
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
          {simError && (
            <div
              role="alert"
              className="mt-3 px-3 py-2 text-xs font-headline rounded-md border border-red-500/40 bg-red-500/10 text-red-300 flex items-start justify-between gap-2"
            >
              <span className="leading-relaxed">⚠️ {simError}</span>
              <button
                onClick={() => setSimError(null)}
                className="text-red-300/60 hover:text-red-300 shrink-0"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block font-retro text-[9px] text-fifa-mint/70 mb-2 uppercase tracking-widest">Away Team</label>
          <select value={team2Id} onChange={e => setTeam2Id(e.target.value)} className="w-full px-3 py-2 bg-fifa-dark border border-fifa-border rounded-lg text-fifa-cream font-headline text-sm focus:ring-1 focus:ring-fifa-mint focus:outline-none">
            <option value="">Select Away Team</option>
            <optgroup label="🏠 My Teams">
              {teams.filter(t => t.id !== team1Id).map(t => <option key={t.id} value={t.id!}>{t.name}</option>)}
            </optgroup>
            <optgroup label="⭐ Legendary Teams">
              {legendaryTeams.filter(t => t.id !== team1Id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </optgroup>
            {isHomeOwnTeam && otherTeams.filter(t => t.userId !== userId && t.id !== team1Id).length > 0 && (
              <optgroup label="👥 Friends' Teams">
                {otherTeams.filter(t => t.userId !== userId && t.id !== team1Id).map(t => <option key={t.id} value={t.id!}>{t.name}</option>)}
              </optgroup>
            )}
          </select>
          {team2 && <RosterPreview team={team2} record={getRecord(team2)} />}
          {team2 && <ChemistryPanel chemistry={team2Chemistry} />}
        </div>
      </div>

      {/* Add by Team ID */}
      <div className="mt-4 p-4 bg-fifa-dark border border-fifa-border rounded-xl">
        <p className="font-retro text-[9px] text-fifa-mint mb-3 tracking-wider">⚔️ Add a Friend's Team by ID</p>
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

      {/* Scoreboard */}
      {result && (
        <div className="mt-6 bg-fifa-dark border border-fifa-border rounded-xl p-6 mb-4">
          <div className="flex items-center justify-between text-center">
            <div className="flex-1">
              <div className="font-headline text-[11px] text-fifa-cream/60 mb-2 truncate">{team1?.name}</div>
              <div className="font-retro text-5xl text-fifa-mint">{currentScore.team1}</div>
            </div>
            <div className="px-6">
              <div className="font-retro text-[9px] text-white/20 tracking-widest">{streamingDone ? 'FULL TIME' : 'LIVE'}</div>
              <div className="font-retro text-lg text-white/30 mt-1">—</div>
            </div>
            <div className="flex-1">
              <div className="font-headline text-[11px] text-fifa-cream/60 mb-2 truncate">{team2?.name}</div>
              <div className="font-retro text-5xl text-fifa-mint">{currentScore.team2}</div>
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
