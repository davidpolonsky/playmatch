'use client';

import { useState, useEffect, useRef } from 'react';
import { Team, saveMatchResult } from '@/lib/firebase/firestore';
import { LEGENDARY_TEAMS, LegendaryTeam } from '@/lib/legendary-teams';

interface PlayByPlayEvent {
  minute: number;
  type: 'kickoff' | 'action' | 'shot' | 'goal' | 'save' | 'foul' | 'card' | 'corner' | 'freekick' | 'halftime' | 'fulltime';
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
  teams: Team[];
  userId: string;
}

const POSITION_ORDER = ['GK', 'DEF', 'MID', 'FWD'] as const;

function RosterPreview({ team }: { team: Team | LegendaryTeam }) {
  const isLegendary = 'isLegendary' in team && team.isLegendary;
  const grouped: Record<string, typeof team.players> = { GK: [], DEF: [], MID: [], FWD: [] };
  team.players.forEach(p => { if (grouped[p.position]) grouped[p.position].push(p); });
  return (
    <div className={`mt-2 rounded-lg border p-3 text-sm ${isLegendary ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="font-semibold text-gray-700 mb-2">{isLegendary ? '⭐ ' : ''}{team.name}</div>
      {POSITION_ORDER.map(pos => grouped[pos].length > 0 && (
        <div key={pos} className="mb-1 leading-snug">
          <span className="text-xs font-bold text-gray-400 uppercase mr-2">{pos}</span>
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

const EVENT_ICONS: Record<string, string> = {
  kickoff:  '🏁',
  action:   '⚽',
  shot:     '🎯',
  goal:     '🚨',
  save:     '🧤',
  foul:     '🚩',
  card:     '🟡',
  corner:   '🔄',
  freekick: '💨',
  halftime: '🔔',
  fulltime: '🏆',
};

const EVENT_COLORS: Record<string, string> = {
  goal:     'bg-green-50 border-l-4 border-green-500',
  halftime: 'bg-blue-50 border-l-4 border-blue-400',
  fulltime: 'bg-purple-50 border-l-4 border-purple-500',
  card:     'bg-yellow-50 border-l-4 border-yellow-400',
  save:     'bg-orange-50 border-l-4 border-orange-400',
  shot:     'bg-gray-50 border-l-4 border-gray-300',
  default:  'bg-white border-l-4 border-transparent',
};

export default function MatchSimulator({ teams, userId }: MatchSimulatorProps) {
  const allTeams: (Team | LegendaryTeam)[] = [...teams, ...LEGENDARY_TEAMS];

  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [visibleEvents, setVisibleEvents] = useState<PlayByPlayEvent[]>([]);
  const [streamingDone, setStreamingDone] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  // Stream events one by one after result arrives
  useEffect(() => {
    if (!result?.playByPlay?.length) return;
    setVisibleEvents([]);
    setStreamingDone(false);
    const events = result.playByPlay.filter(e => e && e.type && e.text);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= events.length) {
        clearInterval(interval);
        setStreamingDone(true);
        return;
      }
      setVisibleEvents(prev => [...prev, events[i]]);
      i++;
    }, 120);
    return () => clearInterval(interval);
  }, [result]);

  // Auto-scroll the feed as events appear
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [visibleEvents]);

  const getTeamById = (id: string) => allTeams.find(t => t.id === id);

  const handleSimulate = async () => {
    if (!team1Id || !team2Id) {
      alert('Please select both teams');
      return;
    }

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
          team1Name: team1.name,
          team1Players: team1.players,
          team2Name: team2.name,
          team2Players: team2.players,
        }),
      });

      const matchResult = await response.json();
      if (!response.ok || matchResult.error) throw new Error(matchResult.error || 'Simulation failed');
      if (!Array.isArray(matchResult.playByPlay)) throw new Error('Invalid response format');
      matchResult.playByPlay = matchResult.playByPlay.filter((e: any) => e && typeof e.type === 'string' && typeof e.text === 'string');
      setResult(matchResult as MatchResult);

      // Save to Firebase only for user teams (not legendary)
      const isLegendary1 = 'isLegendary' in team1 && team1.isLegendary;
      const isLegendary2 = 'isLegendary' in team2 && team2.isLegendary;
      if (!isLegendary1 && !isLegendary2 && team1.id && team2.id) {
        await saveMatchResult({
          team1Id: team1.id,
          team2Id: team2.id,
          team1Name: team1.name,
          team2Name: team2.name,
          team1Score: matchResult.team1Score,
          team2Score: matchResult.team2Score,
          summary: matchResult.summary,
          userId,
        }).catch(() => {}); // non-blocking
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to simulate match');
    } finally {
      setSimulating(false);
    }
  };

  const team1 = getTeamById(team1Id);
  const team2 = getTeamById(team2Id);

  return (
    <div className="card max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">⚽ Match Simulator</h2>

      {/* Team Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm font-medium mb-2">Home Team</label>
          <select
            value={team1Id}
            onChange={(e) => setTeam1Id(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Home Team</option>
            <optgroup label="My Teams">
              {teams.map(t => (
                <option key={t.id} value={t.id!}>{t.name}</option>
              ))}
            </optgroup>
            <optgroup label="⭐ Legendary Teams">
              {LEGENDARY_TEAMS.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </optgroup>
          </select>
          {team1 && <RosterPreview team={team1} />}
        </div>

        <div className="text-center">
          <div className="text-3xl font-bold text-gray-400 mb-2">VS</div>
          <button
            onClick={handleSimulate}
            disabled={!team1Id || !team2Id || simulating}
            className="btn-primary w-full"
          >
            {simulating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Simulating…
              </span>
            ) : '▶ Kick Off'}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Away Team</label>
          <select
            value={team2Id}
            onChange={(e) => setTeam2Id(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Away Team</option>
            <optgroup label="My Teams">
              {teams.filter(t => t.id !== team1Id).map(t => (
                <option key={t.id} value={t.id!}>{t.name}</option>
              ))}
            </optgroup>
            <optgroup label="⭐ Legendary Teams">
              {LEGENDARY_TEAMS.filter(t => t.id !== team1Id).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </optgroup>
          </select>
          {team2 && <RosterPreview team={team2} />}
        </div>
      </div>

      {/* Scoreboard — shown once streaming starts */}
      {result && (
        <div className="bg-gradient-to-r from-purple-900 to-blue-900 text-white rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between text-center">
            <div className="flex-1">
              <div className="text-lg font-semibold opacity-80">{team1?.name}</div>
              <div className="text-6xl font-black mt-1">{result.team1Score}</div>
            </div>
            <div className="px-4 text-2xl font-bold opacity-50">—</div>
            <div className="flex-1">
              <div className="text-lg font-semibold opacity-80">{team2?.name}</div>
              <div className="text-6xl font-black mt-1">{result.team2Score}</div>
            </div>
          </div>
          {streamingDone && (
            <div className="mt-4 text-center text-sm opacity-75">
              ⭐ Man of the Match: <span className="font-semibold">{result.manOfTheMatch}</span>
            </div>
          )}
        </div>
      )}

      {/* Play-by-play feed */}
      {visibleEvents.length > 0 && (
        <div
          ref={feedRef}
          className="rounded-xl border border-gray-200 overflow-y-auto"
          style={{ maxHeight: '480px' }}
        >
          <div className="divide-y divide-gray-100">
            {visibleEvents.filter(event => event && event.type).map((event, idx) => {
              const colorClass = EVENT_COLORS[event.type] || EVENT_COLORS.default;
              const icon = EVENT_ICONS[event.type] || '⚽';
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 px-4 py-3 ${colorClass} animate-fade-in`}
                >
                  <div className="flex-shrink-0 w-10 text-center">
                    <span className="text-xs font-bold text-gray-500">{event.minute}'</span>
                  </div>
                  <div className="flex-shrink-0 text-lg leading-tight">{icon}</div>
                  <p className={`text-sm leading-snug flex-1 ${
                    event.type === 'goal' ? 'font-bold text-green-800' :
                    event.type === 'halftime' || event.type === 'fulltime' ? 'font-semibold' :
                    'text-gray-700'
                  }`}>
                    {event.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Match summary — shown after streaming ends */}
      {streamingDone && result && (
        <div className="mt-6 bg-gray-50 rounded-xl p-5">
          <h4 className="font-bold text-lg mb-2">📋 Match Report</h4>
          <p className="text-gray-700 leading-relaxed">{result.summary}</p>
        </div>
      )}
    </div>
  );
}
