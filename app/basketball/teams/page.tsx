'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { signOut } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import {
  BballTeamDoc, BballRecord, getBballRecords, getUserBasketballTeams, getAllBasketballTeams,
  getBasketballTeam, deleteBasketballTeam, updateBballRecord, updateLegendaryBballRecord,
  getUserLegendaryBballRecords, addSavedBballTeam, getSavedBballTeamIds, removeSavedBballTeam,
  ensureBballShareId, getBasketballTeamByShareId, formatShareId, parseShareId,
  saveBballHistory, getBballHistory, BballHistoryEntry,
} from '@/lib/firebase/firestore-basketball';
import { saveTablePreferences, getTablePreferences } from '@/lib/firebase/firestore';
import { LEGENDARY_BASKETBALL_TEAMS, LegendaryBasketballTeam } from '@/lib/legendary-basketball-teams';
import { BASKETBALL_POSITION_ORDER, BasketballPosition } from '@/lib/types-basketball';

type AnyBballTeam = BballTeamDoc | LegendaryBasketballTeam;

interface BballPlayEvent {
  quarter: number;
  time: string;
  type: string;
  text: string;
  scoringTeam?: 'team1' | 'team2';
  points?: 1 | 2 | 3;
}

interface BballSimResult {
  team1Score: number;
  team2Score: number;
  summary: string;
  playerOfGame: string;
  playByPlay: BballPlayEvent[];
}

const BBALL_LOADING_PHRASES = [
  'Warming Up…', 'Tip-Off Incoming…', 'Lacing Up Sneakers…',
  'Crowd is Buzzing…', 'Coaches Scheming…', 'Jump Ball Soon…',
  'Jerseys On…', 'National Anthem…', 'Player Intros…',
];

const EVENT_ICONS: Record<string, string> = {
  tip_off: '🏀', shot_made: '🏀', three_made: '🔥', shot_missed: '❌',
  three_missed: '❌', dunk: '💥', layup: '🏀', steal: '⚡', block: '🛡',
  turnover: '🔄', foul: '🚩', free_throw: '🎯', timeout: '⏱',
  end_quarter: '🔔', buzzer_beater: '🚨', final: '🏆',
};

const EVENT_COLORS: Record<string, string> = {
  three_made:    'bg-bball-orange/10 border-l-4 border-bball-orange',
  dunk:          'bg-bball-orange/10 border-l-4 border-bball-orange',
  shot_made:     'bg-yellow-500/10 border-l-4 border-yellow-500',
  free_throw:    'bg-yellow-500/5 border-l-4 border-yellow-500/50',
  end_quarter:   'bg-white/5 border-l-4 border-white/30',
  final:         'bg-bball-orange/20 border-l-4 border-bball-orange',
  buzzer_beater: 'bg-red-500/20 border-l-4 border-red-500',
  steal:         'bg-white/5 border-l-4 border-white/20',
  block:         'bg-white/5 border-l-4 border-white/20',
};

const POS_COLORS: Record<BasketballPosition, string> = {
  PG: '#f97316', SG: '#fbbf24', SF: '#fb923c', PF: '#f59e0b', C: '#ef4444',
};

const inferPoints = (ev: BballPlayEvent): number => {
  if (ev.points) return ev.points;
  if (ev.type === 'three_made') return 3;
  if (ev.type === 'free_throw') return 1;
  if (['shot_made', 'dunk', 'layup', 'buzzer_beater'].includes(ev.type)) return 2;
  return 0;
};

// Parse the embedded [team1Score-team2Score] tag that Gemini appends to every event text
// e.g. "Curry drills a three. [54-48]" → { home: 54, away: 48 }
const parseEmbeddedScore = (text: string): { home: number; away: number } | null => {
  const match = text.match(/\[(\d+)-(\d+)\]\s*$/);
  if (!match) return null;
  return { home: parseInt(match[1], 10), away: parseInt(match[2], 10) };
};

// Strip the embedded [X-Y] tag so it isn't shown in the feed text
const stripScoreTag = (text: string): string => text.replace(/\s*\[\d+-\d+\]\s*$/, '');

const SCORING_EVENT_TYPES = new Set(['shot_made', 'three_made', 'dunk', 'layup', 'free_throw', 'buzzer_beater']);

// ── Team brand colors for the play-by-play feed ──────────────────────────────
// Tuned for legibility on the dark basketball background
const NBA_COLORS: Record<string, string> = {
  // East
  celtics: '#00e676', nets: '#a8a8a8', knicks: '#f97316',
  '76ers': '#5bc8f5', sixers: '#5bc8f5', raptors: '#e8473f',
  bulls: '#f44336', cavaliers: '#c8973d', pistons: '#4fc3f7',
  pacers: '#fbbf24', bucks: '#4caf50', hawks: '#e8473f',
  hornets: '#00e5ff', heat: '#ff6d3b', magic: '#29b6f6',
  wizards: '#e8473f',
  // West
  nuggets: '#ffd740', timberwolves: '#29b6f6', thunder: '#29b6f6',
  jazz: '#26c6da', suns: '#ff8f3c', kings: '#ba68c8',
  warriors: '#ffd740', clippers: '#e8473f', lakers: '#fdb927',
  grizzlies: '#7bafd4', pelicans: '#26c6da', spurs: '#c0c8d0',
  mavericks: '#29b6f6', mavs: '#29b6f6', rockets: '#f44336',
  'trail blazers': '#f44336', blazers: '#f44336',
};

// Custom-team fallback: deterministic color from name hash
const CUSTOM_PALETTE = [
  '#64b5f6', '#81c784', '#ffb74d', '#f06292', '#ba68c8',
  '#4dd0e1', '#a1887f', '#90a4ae', '#fff176', '#80cbc4',
];
const hashTeamColor = (name: string): string => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return CUSTOM_PALETTE[Math.abs(h) % CUSTOM_PALETTE.length];
};
const getTeamColor = (name: string): string => {
  if (!name) return '#f97316';
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(NBA_COLORS)) {
    if (key.includes(k)) return v;
  }
  return hashTeamColor(name);
};

function RecordBadge({ record }: { record: BballRecord }) {
  return (
    <span className="inline-flex gap-2 font-headline text-[11px] font-bold">
      <span style={{ color: '#f97316' }}>{record.wins}W</span>
      <span className="text-red-400">{record.losses}L</span>
    </span>
  );
}

export default function BasketballTeamsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [myTeams, setMyTeams] = useState<BballTeamDoc[]>([]);
  const [allTeams, setAllTeams] = useState<BballTeamDoc[]>([]);
  const legendaryTeams = LEGENDARY_BASKETBALL_TEAMS;
  const [savedTeams, setSavedTeams] = useState<BballTeamDoc[]>([]);
  const [teamRecords, setTeamRecords] = useState<Record<string, BballRecord>>({});
  const [legendaryRecords, setLegendaryRecords] = useState<Record<string, BballRecord>>({});
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [activeTab, setActiveTab] = useState<'simulate' | 'my-teams' | 'teams' | 'standings'>('simulate');
  // Standings state
  const [standingsTeamIds, setStandingsTeamIds] = useState<Set<string>>(new Set());
  const [standingsMetric, setStandingsMetric] = useState<'winpct' | 'gb'>('winpct');
  const [standingsPickerOpen, setStandingsPickerOpen] = useState(false);
  const [standingsSaveState, setStandingsSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [historyTeamId, setHistoryTeamId] = useState<string | null>(null);
  const [matchHistories, setMatchHistories] = useState<Record<string, BballHistoryEntry[]>>({});
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Simulator state
  const [selectedHome, setSelectedHome] = useState<AnyBballTeam | null>(null);
  const [selectedAway, setSelectedAway] = useState<AnyBballTeam | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<BballSimResult | null>(null);
  const [visibleEvents, setVisibleEvents] = useState<BballPlayEvent[]>([]);
  const [streamingDone, setStreamingDone] = useState(false);
  const [liveScore, setLiveScore] = useState({ home: 0, away: 0 });
  const [loadingPhrase, setLoadingPhrase] = useState('');
  const [currentQuarter, setCurrentQuarter] = useState(0);

  // Add rival
  const [addTeamIdInput, setAddTeamIdInput] = useState('');
  const [addTeamLoading, setAddTeamLoading] = useState(false);
  const [addTeamError, setAddTeamError] = useState('');

  // Invite (nav)
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);

  // Challenge invite (from team card envelope)
  const [challengeTeam, setChallengeTeam] = useState<AnyBballTeam | null>(null);
  const [challengeEmail, setChallengeEmail] = useState('');
  const [challengeSent, setChallengeSent] = useState(false);
  const [challengeSending, setChallengeSending] = useState(false);

  // Geo label
  const [soccerLabel, setSoccerLabel] = useState('Football');

  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && !user) router.push('/basketball'); }, [user, loading, router]);

  useEffect(() => {
    fetch('/api/geo').then(r => r.json()).then(d => {
      if (d.country_code === 'US') setSoccerLabel('Soccer');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      loadTeams();
      // Load saved standings selection
      getTablePreferences(user.uid).then(prefs => {
        if (prefs.standingsTeamIds.length > 0) setStandingsTeamIds(new Set(prefs.standingsTeamIds));
      }).catch(() => {});
    }
    else if (!loading) setLoadingTeams(false);
  }, [user, loading]);

  // Stream play-by-play
  useEffect(() => {
    if (!simResult?.playByPlay?.length) return;
    setVisibleEvents([]);
    setStreamingDone(false);
    setLiveScore({ home: 0, away: 0 });
    setCurrentQuarter(1);

    const events = simResult.playByPlay.filter(e => e && e.type && e.text);
    const msPerEvent = Math.round(100000 / Math.max(events.length, 1));

    // Build lowercase name lists for scoring team inference when Gemini omits scoringTeam
    const team1NameLow = (selectedHome?.name || '').toLowerCase();
    const team2NameLow = (selectedAway?.name || '').toLowerCase();
    const team1PlayerNames = (selectedHome?.players || [])
      .map((p: any) => (p.name || '').toLowerCase()).filter(Boolean);
    const team2PlayerNames = (selectedAway?.players || [])
      .map((p: any) => (p.name || '').toLowerCase()).filter(Boolean);

    let i = 0;
    const interval = setInterval(() => {
      if (i >= events.length) { clearInterval(interval); setStreamingDone(true); return; }
      const ev = events[i];
      setVisibleEvents(prev => [...prev, ev]);
      if (ev.quarter) setCurrentQuarter(ev.quarter);

      // Primary: use embedded [X-Y] score tag (present on every event from new prompt)
      const embedded = parseEmbeddedScore(ev.text);
      if (embedded) {
        setLiveScore(embedded);
      } else if (SCORING_EVENT_TYPES.has(ev.type)) {
        // Fallback for events without the tag: infer team from scoringTeam or player names
        let scoringTeam = ev.scoringTeam as 'team1' | 'team2' | undefined;
        if (!scoringTeam) {
          const textLow = ev.text.toLowerCase();
          const inTeam1 = team1PlayerNames.some(n => n.length > 2 && textLow.includes(n));
          const inTeam2 = team2PlayerNames.some(n => n.length > 2 && textLow.includes(n));
          if (inTeam1 && !inTeam2) scoringTeam = 'team1';
          else if (inTeam2 && !inTeam1) scoringTeam = 'team2';
        }
        const pts = inferPoints(ev);
        if (scoringTeam && pts > 0) {
          setLiveScore(prev => ({
            home: prev.home + (scoringTeam === 'team1' ? pts : 0),
            away: prev.away + (scoringTeam === 'team2' ? pts : 0),
          }));
        }
      }

      i++;
    }, msPerEvent);
    return () => clearInterval(interval);
  }, [simResult]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [visibleEvents]);

  // Snap scoreboard to authoritative final score when animation finishes
  useEffect(() => {
    if (streamingDone && simResult) {
      setLiveScore({ home: simResult.team1Score, away: simResult.team2Score });
    }
  }, [streamingDone, simResult]);

  useEffect(() => {
    if (!simulating) { setLoadingPhrase(''); return; }
    let i = 0;
    setLoadingPhrase(BBALL_LOADING_PHRASES[0]);
    const interval = setInterval(() => {
      i = (i + 1) % BBALL_LOADING_PHRASES.length;
      setLoadingPhrase(BBALL_LOADING_PHRASES[i]);
    }, 2200);
    return () => clearInterval(interval);
  }, [simulating]);

  const loadTeams = async () => {
    try {
      const [userTeams, allT, legRecs, savedIds] = await Promise.all([
        getUserBasketballTeams(user!.uid).catch(() => [] as BballTeamDoc[]),
        getAllBasketballTeams().catch(() => [] as BballTeamDoc[]),
        getUserLegendaryBballRecords(user!.uid).catch(() => ({} as Record<string, BballRecord>)),
        getSavedBballTeamIds(user!.uid).catch(() => [] as string[]),
      ]);
      const teamsNeedingShareId = userTeams.filter(t => !t.shareId);
      if (teamsNeedingShareId.length > 0) {
        await Promise.all(teamsNeedingShareId.map(async t => {
          if (t.id) t.shareId = await ensureBballShareId(t.id).catch(() => undefined);
        }));
      }
      setMyTeams(userTeams);
      setAllTeams(allT);
      setLegendaryRecords(legRecs);
      const myIds = new Set(userTeams.map(t => t.id));
      const savedFull = (await Promise.all(
        savedIds.filter(id => !myIds.has(id)).map(id => getBasketballTeam(id).catch(() => null))
      )).filter(Boolean) as BballTeamDoc[];
      setSavedTeams(savedFull);
      const ids = [...userTeams, ...allT, ...savedFull].map(t => t.id).filter((id): id is string => !!id);
      const recs = await getBballRecords(ids).catch(() => ({} as Record<string, BballRecord>));
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
    setAddTeamLoading(true); setAddTeamError('');
    try {
      const team = await getBasketballTeamByShareId(raw);
      if (!team) { setAddTeamError('Team not found.'); return; }
      if (team.userId === user!.uid) { setAddTeamError("That's your own team!"); return; }
      if (savedTeams.some(t => t.id === team.id)) { setAddTeamError('Already saved.'); return; }
      await addSavedBballTeam(user!.uid, team.id!);
      setSavedTeams(prev => [...prev, team]);
      const recs = await getBballRecords([team.id!]).catch(() => ({} as Record<string, BballRecord>));
      setTeamRecords(prev => ({ ...prev, ...recs }));
      setAddTeamIdInput('');
    } catch { setAddTeamError('Something went wrong. Try again.'); }
    finally { setAddTeamLoading(false); }
  };

  const handleViewHistory = async (teamId: string) => {
    if (historyTeamId === teamId) { setHistoryTeamId(null); return; }
    setHistoryTeamId(teamId);
    if (matchHistories[teamId]) return;
    setLoadingHistory(true);
    try {
      const history = await getBballHistory(teamId, 10);
      setMatchHistories(prev => ({ ...prev, [teamId]: history }));
    } catch (e) {
      console.error('getBballHistory failed:', e);
      setMatchHistories(prev => ({ ...prev, [teamId]: [] }));
    } finally { setLoadingHistory(false); }
  };

  const getRecord = (team: AnyBballTeam): BballRecord => {
    const isLeg = 'isLegendary' in team && team.isLegendary;
    return (isLeg ? legendaryRecords[team.id!] : teamRecords[team.id!]) ?? { wins: 0, losses: 0 };
  };

  const applyRecordUpdate = async (team: AnyBballTeam, result: 'win' | 'loss') => {
    const isLeg = 'isLegendary' in team && team.isLegendary;
    const field = result === 'win' ? 'wins' : 'losses';
    try {
      if (isLeg) {
        await updateLegendaryBballRecord(user!.uid, team.id!, result);
        setLegendaryRecords(prev => {
          const cur = prev[team.id!] ?? { wins: 0, losses: 0 };
          return { ...prev, [team.id!]: { ...cur, [field]: cur[field as keyof BballRecord] + 1 } };
        });
      } else if (team.id) {
        await updateBballRecord(team.id, result);
        setTeamRecords(prev => {
          const cur = prev[team.id!] ?? { wins: 0, losses: 0 };
          return { ...prev, [team.id!]: { ...cur, [field]: cur[field as keyof BballRecord] + 1 } };
        });
      }
    } catch (e) { console.error('Failed to update record', e); }
  };

  const handleSimulate = async () => {
    if (!selectedHome || !selectedAway) { alert('Select both teams'); return; }
    if (selectedHome.id === selectedAway.id) { alert("A team can't play itself!"); return; }
    setSimulating(true); setSimResult(null); setVisibleEvents([]); setLiveScore({ home: 0, away: 0 });
    try {
      const res = await fetch('/api/simulate-basketball-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team1Name: selectedHome.name, team1Players: selectedHome.players, team1Lineup: selectedHome.lineup || 'Standard',
          team2Name: selectedAway.name, team2Players: selectedAway.players, team2Lineup: selectedAway.lineup || 'Standard',
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Simulation failed');
      data.playByPlay = (data.playByPlay || []).filter((e: any) => e && e.type && e.text);
      setSimResult(data as BballSimResult);

      const homeWins = data.team1Score > data.team2Score;
      const homeResult: 'win' | 'loss' = homeWins ? 'win' : 'loss';
      const awayResult: 'win' | 'loss' = homeWins ? 'loss' : 'win';
      await Promise.all([applyRecordUpdate(selectedHome, homeResult), applyRecordUpdate(selectedAway, awayResult)]);

      const isLegHome = 'isLegendary' in selectedHome && selectedHome.isLegendary;
      const isLegAway = 'isLegendary' in selectedAway && selectedAway.isLegendary;
      if (!isLegHome && selectedHome.id) {
        saveBballHistory({ teamId: selectedHome.id, teamName: selectedHome.name, teamScore: data.team1Score,
          result: homeResult, opponentId: selectedAway.id ?? 'legendary', opponentName: selectedAway.name,
          opponentScore: data.team2Score, date: null }).catch(() => {});
        setMatchHistories(prev => { const n = { ...prev }; delete n[selectedHome.id!]; return n; });
      }
      if (!isLegAway && selectedAway.id) {
        saveBballHistory({ teamId: selectedAway.id, teamName: selectedAway.name, teamScore: data.team2Score,
          result: awayResult, opponentId: selectedHome.id ?? 'legendary', opponentName: selectedHome.name,
          opponentScore: data.team1Score, date: null }).catch(() => {});
        setMatchHistories(prev => { const n = { ...prev }; delete n[selectedAway.id!]; return n; });
      }
    } catch (e) {
      console.error(e); alert('Failed to simulate game. Please try again.');
    } finally { setSimulating(false); }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || inviteSending) return;
    setInviteSending(true);
    try {
      const res = await fetch('/api/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromName: inviteName.trim() || user?.displayName || 'A friend', toEmail: inviteEmail.trim() }) });
      if (!res.ok) throw new Error('Failed');
      setInviteSent(true);
      setTimeout(() => { setInviteSent(false); setInviteEmail(''); setShowInvite(false); }, 3000);
    } catch { alert('Failed to send invite.'); }
    finally { setInviteSending(false); }
  };

  const handleSendChallenge = async () => {
    if (!challengeEmail.trim() || challengeSending || !challengeTeam) return;
    setChallengeSending(true);
    const t = challengeTeam as BballTeamDoc;
    const teamId = t.shareId ? formatShareId(t.shareId) : t.id!;
    try {
      const res = await fetch('/api/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromName: user?.displayName || 'A friend',
          toEmail: challengeEmail.trim(),
          teamName: challengeTeam.name,
          teamId,
          sport: 'basketball',
        }) });
      if (!res.ok) throw new Error('Failed');
      setChallengeSent(true);
      setTimeout(() => { setChallengeSent(false); setChallengeEmail(''); setChallengeTeam(null); }, 3000);
    } catch { alert('Failed to send challenge.'); }
    finally { setChallengeSending(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0a00' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-bball-orange mx-auto" />
          <p className="mt-4 font-retro text-[9px] text-bball-orange/50">Loading…</p>
        </div>
      </div>
    );
  }

  const isHomeLegendary = selectedHome && 'isLegendary' in selectedHome && (selectedHome as any).isLegendary;
  const notHome = (t: AnyBballTeam) => t.id !== selectedHome?.id;
  const awayOptions = (isHomeLegendary
    ? legendaryTeams
    : [...myTeams, ...legendaryTeams, ...savedTeams,
       ...allTeams.filter(t => t.userId !== user?.uid && !savedTeams.some(s => s.id === t.id))]
  ).filter(notHome);

  const browseTeams: AnyBballTeam[] = [
    ...legendaryTeams,
    ...allTeams.filter(t => t.userId !== user?.uid),
  ];

  const SELECT_CLS = "w-full px-3 py-2 rounded-lg font-headline text-sm focus:outline-none focus:ring-1";
  const SELECT_STYLE = { background: '#0f0a00', border: '1px solid #3d2c00', color: '#f1efe3', outlineColor: '#f97316' };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f0a00 0%, #1c1200 60%, #0f0a00 100%)' }}>
      {/* Nav */}
      <nav style={{ background: '#0f0a00', borderBottom: '1px solid #3d2c00' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-4 flex-wrap">
          <h1 className="font-retro text-[11px] tracking-wider flex items-center gap-1.5" style={{ color: '#f97316' }}>
            <img src="/basketball.png" className="w-4 h-4" alt="" /> PlayMatch
          </h1>
          <div className="flex gap-2 items-center flex-wrap">
            <button onClick={() => router.push('/dashboard')}
              className="font-retro text-[9px] py-1.5 px-3 rounded-lg border transition-colors"
              style={{ borderColor: '#3d2c00', color: 'rgba(255,255,255,0.6)' }}>
              ⚽ {soccerLabel}
            </button>
            {/* Invite */}
            <div className="relative">
              <button onClick={() => { setShowInvite(v => !v); setInviteSent(false); setInviteEmail(''); setInviteName(user?.displayName || ''); }}
                className="font-retro text-[9px] py-1.5 px-3 rounded-lg border transition-colors"
                style={{ borderColor: '#3d2c00', color: 'rgba(255,255,255,0.6)' }}>
                📨 Invite
              </button>
              {showInvite && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-xl p-4 z-50"
                  style={{ background: '#0f0a00', border: '1px solid #3d2c00', boxShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
                  <h3 className="font-retro text-[9px] mb-3 tracking-wider" style={{ color: '#f97316' }}>Invite a Friend</h3>
                  {inviteSent ? (
                    <p className="font-headline text-[11px] text-center py-2" style={{ color: '#f97316' }}>✓ Invite sent!</p>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <label className="font-retro text-[7px] block mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Your Name</label>
                        <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                          placeholder={user?.displayName || 'Your name'}
                          className="w-full px-3 py-1.5 rounded-lg font-headline text-[11px] focus:outline-none"
                          style={SELECT_STYLE} />
                      </div>
                      <div>
                        <label className="font-retro text-[7px] block mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Friend's Email</label>
                        <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
                          placeholder="friend@example.com"
                          className="w-full px-3 py-1.5 rounded-lg font-headline text-[11px] focus:outline-none"
                          style={SELECT_STYLE} />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={handleSendInvite} disabled={!inviteEmail.trim() || inviteSending}
                          className="flex-1 py-2 rounded-lg font-retro text-[8px] disabled:opacity-30 transition-all"
                          style={{ background: '#f97316', color: '#0f0a00' }}>
                          {inviteSending ? 'Sending…' : <span className="flex items-center justify-center gap-1">Send Invite <img src="/basketball.png" className="w-3.5 h-3.5 inline-block" alt="" /></span>}
                        </button>
                        <button onClick={() => setShowInvite(false)}
                          className="py-2 px-3 rounded-lg font-retro text-[8px] border transition-colors"
                          style={{ borderColor: '#3d2c00', color: 'rgba(255,255,255,0.6)' }}>✕</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <span className="font-headline text-[10px] hidden sm:block" style={{ color: 'rgba(241,239,227,0.4)' }}>{user?.displayName}</span>
            <button onClick={signOut}
              className="font-retro text-[9px] py-1.5 px-3 rounded-lg border transition-colors"
              style={{ borderColor: '#3d2c00', color: 'rgba(255,255,255,0.6)' }}>
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Tab bar (matches soccer) ── */}
        <div className="flex gap-1 mb-6 flex-wrap" style={{ borderBottom: '1px solid #3d2c00', paddingBottom: 0 }}>
          {([
            { key: 'build-team', label: 'Build Team' },
            { key: 'my-teams', label: `My Teams (${myTeams.length})` },
            { key: 'simulate', label: 'Simulate' },
            { key: 'standings', label: 'Standings' },
          ] as const).map(({ key, label }) => (
            <button key={key}
              onClick={() => key === 'build-team' ? router.push('/basketball/team-builder') : setActiveTab(key)}
              className={`px-4 py-2.5 font-retro text-[9px] tracking-wider transition-all border-b-2 -mb-px ${
                activeTab === key ? 'border-bball-orange text-bball-orange' : 'border-transparent text-white/30 hover:text-white/60'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-6">

        {/* ── Game Simulator ── */}
        {activeTab === 'simulate' && (
        <div className="rounded-xl border p-6" style={{ background: '#1c1200', borderColor: '#3d2c00', boxShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>
          <h2 className="font-retro text-[11px] mb-6 tracking-wider" style={{ color: '#f97316' }}>⚡ Game Simulator</h2>

          {/* Team selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
            {/* Home */}
            <div>
              <label className="block font-retro text-[9px] mb-2 uppercase tracking-widest" style={{ color: 'rgba(249,115,22,0.7)' }}>Home Team</label>
              <select value={selectedHome?.id || ''}
                onChange={e => {
                  const all: AnyBballTeam[] = [...myTeams, ...legendaryTeams];
                  const team = all.find(t => t.id === e.target.value) || null;
                  setSelectedHome(team);
                  if (team && 'isLegendary' in team && (team as any).isLegendary) {
                    if (selectedAway && !('isLegendary' in selectedAway && (selectedAway as any).isLegendary)) setSelectedAway(null);
                  }
                }}
                className={SELECT_CLS} style={SELECT_STYLE}>
                <option value="">Select home team…</option>
                <optgroup label="Your Teams">
                  {myTeams.map(t => <option key={t.id} value={t.id!}>{t.name} ({t.lineup})</option>)}
                </optgroup>
                <optgroup label="🏆 Legendary Teams">
                  {legendaryTeams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.era})</option>)}
                </optgroup>
              </select>
              {selectedHome && (
                <div className="mt-2 rounded-lg border p-3 text-sm" style={{ background: '#0f0a00', borderColor: '#3d2c00' }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-headline text-[11px] text-white">{selectedHome.name}</span>
                    <RecordBadge record={getRecord(selectedHome)} />
                  </div>
                  {selectedHome.players.map((p, idx) => {
                    const slotPos = BASKETBALL_POSITION_ORDER[idx];
                    const isOop = slotPos && p.position !== slotPos;
                    return (
                      <div key={idx} className="flex items-center gap-1 text-xs">
                        <span className="font-retro text-[7px] w-5" style={{ color: POS_COLORS[slotPos || p.position as BasketballPosition] }}>{slotPos || p.position}</span>
                        <span style={{ color: 'rgba(241,239,227,0.7)' }}>{p.name}</span>
                        {isOop && <span className="font-retro text-[6px] px-0.5 rounded" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>oop</span>}
                        <span className="ml-auto font-headline text-[10px] font-bold"
                          style={{ color: p.rating >= 90 ? '#fbbf24' : p.rating >= 80 ? '#f97316' : 'rgba(255,255,255,0.4)' }}>
                          {p.rating}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tip Off button */}
            <div className="flex flex-col items-center justify-start pt-5">
              <div className="font-retro text-[11px] mb-4 tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>VS</div>
              <button onClick={handleSimulate}
                disabled={!selectedHome || !selectedAway || simulating}
                className="w-full py-3 rounded-lg font-retro text-[9px] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                style={{ background: '#f97316', color: '#0f0a00', boxShadow: '0 0 12px rgba(249,115,22,0.3)' }}>
                {simulating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    {loadingPhrase || 'Loading…'}
                  </span>
                ) : <span className="flex items-center justify-center gap-1.5"><img src="/basketball.png" className="w-4 h-4" alt="" /> Tip Off</span>}
              </button>
            </div>

            {/* Away */}
            <div>
              <label className="block font-retro text-[9px] mb-2 uppercase tracking-widest" style={{ color: 'rgba(249,115,22,0.7)' }}>Away Team</label>
              <select value={selectedAway?.id || ''}
                onChange={e => setSelectedAway(awayOptions.find(t => t.id === e.target.value) || null)}
                className={SELECT_CLS} style={SELECT_STYLE}>
                <option value="">Select away team…</option>
                {isHomeLegendary ? (
                  <optgroup label="🏆 Legendary Teams">
                    {legendaryTeams.filter(notHome).map(t => <option key={t.id} value={t.id}>{t.name} ({t.era})</option>)}
                  </optgroup>
                ) : (
                  <>
                    <optgroup label="Your Teams">
                      {myTeams.filter(notHome).map(t => <option key={t.id} value={t.id!}>{t.name} ({t.lineup})</option>)}
                    </optgroup>
                    <optgroup label="🏆 Legendary Teams">
                      {legendaryTeams.filter(notHome).map(t => <option key={t.id} value={t.id}>{t.name} ({t.era})</option>)}
                    </optgroup>
                    {savedTeams.length > 0 && (
                      <optgroup label="⚔️ Rival Teams">
                        {savedTeams.filter(notHome).map(t => <option key={t.id} value={t.id!}>{t.name} ({t.lineup})</option>)}
                      </optgroup>
                    )}
                    <optgroup label="All Other Teams">
                      {allTeams.filter(t => t.userId !== user?.uid && !savedTeams.some(s => s.id === t.id)).filter(notHome).map(t => (
                        <option key={t.id} value={t.id!}>{t.name} ({t.lineup})</option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>
              {selectedAway && (
                <div className="mt-2 rounded-lg border p-3 text-sm" style={{ background: '#0f0a00', borderColor: '#3d2c00' }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-headline text-[11px] text-white">{selectedAway.name}</span>
                    <RecordBadge record={getRecord(selectedAway)} />
                  </div>
                  {selectedAway.players.map((p, idx) => {
                    const slotPos = BASKETBALL_POSITION_ORDER[idx];
                    const isOop = slotPos && p.position !== slotPos;
                    return (
                      <div key={idx} className="flex items-center gap-1 text-xs">
                        <span className="font-retro text-[7px] w-5" style={{ color: POS_COLORS[slotPos || p.position as BasketballPosition] }}>{slotPos || p.position}</span>
                        <span style={{ color: 'rgba(241,239,227,0.7)' }}>{p.name}</span>
                        {isOop && <span className="font-retro text-[6px] px-0.5 rounded" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>oop</span>}
                        <span className="ml-auto font-headline text-[10px] font-bold"
                          style={{ color: p.rating >= 90 ? '#fbbf24' : p.rating >= 80 ? '#f97316' : 'rgba(255,255,255,0.4)' }}>
                          {p.rating}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Add rival by ID */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="font-retro text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Add rival by ID:</span>
            <input type="text" value={addTeamIdInput}
              onChange={e => { setAddTeamIdInput(e.target.value); setAddTeamError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAddTeamById()}
              placeholder="123-4567"
              className="w-28 px-2 py-1 rounded text-sm font-headline focus:outline-none"
              style={{ ...SELECT_STYLE, fontSize: '12px' }} />
            <button onClick={handleAddTeamById} disabled={addTeamLoading || !addTeamIdInput.trim()}
              className="font-retro text-[8px] py-1 px-3 rounded-lg border disabled:opacity-30 transition-colors"
              style={{ borderColor: '#3d2c00', color: 'rgba(255,255,255,0.6)' }}>
              {addTeamLoading ? '…' : '+ Add'}
            </button>
            {addTeamError && <span className="font-retro text-[8px] text-red-400">{addTeamError}</span>}
            {!addTeamError && savedTeams.length > 0 && (
              <span className="font-retro text-[8px]" style={{ color: 'rgba(249,115,22,0.5)' }}>{savedTeams.length} rival{savedTeams.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {/* Live Scoreboard */}
          {(() => {
            // Compute team brand colors once — used for both scoreboard and feed
            const team1Color = selectedHome ? getTeamColor(selectedHome.name) : '#f97316';
            const team2Color = selectedAway ? getTeamColor(selectedAway.name) : '#f97316';
            const t1Names = (selectedHome?.players || []).map((p: any) => (p.name || '').toLowerCase()).filter((n: string) => n.length > 2);
            const t2Names = (selectedAway?.players || []).map((p: any) => (p.name || '').toLowerCase()).filter((n: string) => n.length > 2);

            return (
              <>
                {(simResult || simulating) && (
                  <div className="mt-6 rounded-xl border p-6" style={{ background: '#0f0a00', borderColor: '#3d2c00' }}>
                    {currentQuarter > 0 && !streamingDone && (
                      <p className="text-center font-retro text-[8px] mb-3 tracking-widest" style={{ color: 'rgba(249,115,22,0.6)' }}>
                        Q{currentQuarter}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-center">
                      <div className="flex-1">
                        <div className="font-headline text-[11px] mb-2 truncate" style={{ color: team1Color + 'cc' }}>{selectedHome?.name}</div>
                        <div className="font-retro text-5xl transition-all duration-300" style={{ color: team1Color }}>{liveScore.home}</div>
                      </div>
                      <div className="px-6">
                        <div className="font-retro text-[9px] tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
                          {streamingDone ? 'FINAL' : visibleEvents.length > 0 ? 'LIVE' : 'TIP OFF'}
                        </div>
                        <div className="font-retro text-lg mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>—</div>
                      </div>
                      <div className="flex-1">
                        <div className="font-headline text-[11px] mb-2 truncate" style={{ color: team2Color + 'cc' }}>{selectedAway?.name}</div>
                        <div className="font-retro text-5xl transition-all duration-300" style={{ color: team2Color }}>{liveScore.away}</div>
                      </div>
                    </div>
                    {!streamingDone && visibleEvents.length > 0 && (
                      <p className="mt-3 text-center font-retro text-[8px] animate-pulse" style={{ color: 'rgba(249,115,22,0.5)' }}>● LIVE</p>
                    )}
                    {streamingDone && simResult && (
                      <p className="mt-3 text-center font-headline text-[10px]" style={{ color: '#fbbf24' }}>
                        ⭐ {simResult.playerOfGame}
                      </p>
                    )}
                  </div>
                )}

                {/* Play-by-play feed */}
                {visibleEvents.length > 0 && (
                  <div ref={feedRef} className="mt-4 rounded-xl border overflow-y-auto" style={{ maxHeight: 380, borderColor: '#3d2c00', background: '#0f0a00' }}>
                    <div className="divide-y" style={{ borderColor: 'rgba(61,44,0,0.5)' }}>
                      {visibleEvents.filter(ev => ev && ev.type).map((ev, i) => {
                        // Determine which team this event belongs to
                        let eventTeam: 'team1' | 'team2' | null = ev.scoringTeam || null;
                        if (!eventTeam) {
                          const tl = ev.text.toLowerCase();
                          const inT1 = t1Names.some((n: string) => tl.includes(n));
                          const inT2 = t2Names.some((n: string) => tl.includes(n));
                          if (inT1 && !inT2) eventTeam = 'team1';
                          else if (inT2 && !inT1) eventTeam = 'team2';
                        }
                        const teamColor = eventTeam === 'team1' ? team1Color : eventTeam === 'team2' ? team2Color : null;

                        const icon = EVENT_ICONS[ev.type] || '🏀';
                        const isScore = SCORING_EVENT_TYPES.has(ev.type);
                        const isMilestone = ev.type === 'end_quarter' || ev.type === 'final';
                        const displayText = stripScoreTag(ev.text);

                        // Text color: team color (full for scores, 70% for others), yellow for milestones, dim white for neutral
                        const textColor = isMilestone
                          ? '#fbbf24'
                          : teamColor
                          ? (isScore ? teamColor : teamColor + 'b0')
                          : 'rgba(241,239,227,0.65)';

                        const borderColor = teamColor || (isMilestone ? '#fbbf24' : 'transparent');

                        return (
                          <div key={i} className="flex items-start gap-3 px-4 py-2.5 border-l-4"
                            style={{ borderLeftColor: borderColor }}>
                            <span className="flex-shrink-0 w-8 font-retro text-[7px] pt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Q{ev.quarter}</span>
                            <span className="flex-shrink-0 text-sm">
                              {icon === '🏀' ? <img src="/basketball.png" className="w-4 h-4 inline-block" alt="" /> : icon}
                            </span>
                            <p className={`text-sm flex-1 leading-snug ${isScore ? 'font-bold' : ''}`}
                              style={{ color: textColor }}>
                              {displayText}
                              {ev.points && isScore && (
                                <span className="ml-1 font-retro text-[8px] opacity-70">+{ev.points}</span>
                              )}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Summary */}
          {streamingDone && simResult && (
            <div className="mt-4 rounded-xl border p-4" style={{ background: '#0f0a00', borderColor: '#3d2c00' }}>
              <h4 className="font-retro text-[9px] mb-2" style={{ color: '#f97316' }}>📋 Game Report</h4>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(241,239,227,0.8)' }}>{simResult.summary}</p>
            </div>
          )}
        </div>
        )}

        {/* ── Teams List (My Teams + Teams tabs) ── */}
        {(activeTab === 'my-teams' || activeTab === 'teams') && (
        <div className="rounded-xl border p-6" style={{ background: '#1c1200', borderColor: '#3d2c00', boxShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>
          {loadingTeams ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bball-orange mx-auto" />
              <p className="mt-3 font-retro text-[8px] text-bball-orange/40 animate-pulse">Loading teams…</p>
            </div>
          ) : activeTab === 'my-teams' ? (
            <div className="space-y-3">
              {myTeams.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mb-3">
                    <img src="/basketball.png" className="w-12 h-12 mx-auto" alt="Basketball" />
                  </div>
                  <p className="font-retro text-[9px] mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>No teams yet</p>
                  <button onClick={() => router.push('/basketball/team-builder')}
                    className="font-retro text-[9px] py-2 px-6 rounded-lg transition-all"
                    style={{ background: '#f97316', color: '#0f0a00' }}>
                    Build Your First Team
                  </button>
                </div>
              ) : (
                myTeams.map(team => (
                  <TeamCard key={team.id} team={team} isOwn
                    expandedId={expandedId} setExpandedId={setExpandedId}
                    record={teamRecords[team.id!] ?? { wins: 0, losses: 0 }}
                    copiedId={copiedId} setCopiedId={setCopiedId}
                    historyTeamId={historyTeamId} onViewHistory={handleViewHistory}
                    matchHistories={matchHistories} loadingHistory={loadingHistory}
                    onDelete={async (id) => { if (!confirm('Delete this team?')) return; await deleteBasketballTeam(id); await loadTeams(); }}
                    onChallenge={t => { setChallengeTeam(t); setChallengeEmail(''); setChallengeSent(false); }}
                  />
                ))
              )}
              {savedTeams.length > 0 && (
                <>
                  <h3 className="font-retro text-[9px] mt-6 mb-3 tracking-wider" style={{ color: 'rgba(249,115,22,0.6)' }}>⚔️ Rival Teams</h3>
                  {savedTeams.map(team => (
                    <TeamCard key={team.id} team={team} isSaved
                      expandedId={expandedId} setExpandedId={setExpandedId}
                      record={teamRecords[team.id!] ?? { wins: 0, losses: 0 }}
                      copiedId={copiedId} setCopiedId={setCopiedId}
                      historyTeamId={historyTeamId} onViewHistory={handleViewHistory}
                      matchHistories={matchHistories} loadingHistory={loadingHistory}
                      onRemoveSaved={async (id) => { await removeSavedBballTeam(user!.uid, id); setSavedTeams(prev => prev.filter(t => t.id !== id)); }}
                    />
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-retro text-[9px] mb-3 tracking-wider" style={{ color: 'rgba(249,115,22,0.6)' }}>🏆 Legendary Teams</h3>
              {legendaryTeams.map(team => (
                <TeamCard key={team.id} team={team}
                  expandedId={expandedId} setExpandedId={setExpandedId}
                  record={legendaryRecords[team.id] ?? { wins: 0, losses: 0 }}
                  copiedId={copiedId} setCopiedId={setCopiedId}
                  historyTeamId={null} onViewHistory={() => {}}
                  matchHistories={{}} loadingHistory={false}
                />
              ))}
              {allTeams.filter(t => t.userId !== user?.uid).length > 0 && (
                <>
                  <h3 className="font-retro text-[9px] mt-6 mb-3 tracking-wider" style={{ color: 'rgba(249,115,22,0.6)' }}>🌍 Other Players' Teams</h3>
                  {allTeams.filter(t => t.userId !== user?.uid).map(team => (
                    <TeamCard key={team.id} team={team}
                      expandedId={expandedId} setExpandedId={setExpandedId}
                      record={teamRecords[team.id!] ?? { wins: 0, losses: 0 }}
                      copiedId={copiedId} setCopiedId={setCopiedId}
                      historyTeamId={historyTeamId} onViewHistory={handleViewHistory}
                      matchHistories={matchHistories} loadingHistory={loadingHistory}
                    />
                  ))}
                </>
              )}
            </div>
          )}

        </div>
        )}

        {/* ── Standings tab ── */}
        {!loadingTeams && activeTab === 'standings' && (() => {
            const allAvail: AnyBballTeam[] = [
              ...myTeams,
              ...savedTeams,
              ...allTeams.filter(t => t.userId !== user?.uid && !savedTeams.some(s => s.id === t.id)),
              ...legendaryTeams,
            ];

            const getRecord = (team: AnyBballTeam): BballRecord => {
              const isLeg = 'isLegendary' in team && team.isLegendary;
              return (isLeg ? legendaryRecords[team.id!] : teamRecords[team.id!]) ?? { wins: 0, losses: 0 };
            };

            const selected = allAvail.filter(t => standingsTeamIds.has(t.id!));
            const sorted = [...selected].sort((a, b) => {
              const ra = getRecord(a), rb = getRecord(b);
              const ga = ra.wins + ra.losses, gb = rb.wins + rb.losses;
              const pctA = ga > 0 ? ra.wins / ga : 0;
              const pctB = gb > 0 ? rb.wins / gb : 0;
              return pctB - pctA || rb.wins - ra.wins;
            });

            // GB calc: leader is sorted[0]
            const leader = sorted[0] ? getRecord(sorted[0]) : null;
            const gb = (team: AnyBballTeam) => {
              if (!leader) return 0;
              const r = getRecord(team);
              return ((leader.wins - r.wins) + (r.losses - leader.losses)) / 2;
            };

            const toggleStandings = (id: string) => setStandingsTeamIds(prev => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            });

            const myGroup = allAvail.filter(t => !('isLegendary' in t && t.isLegendary) && (t as BballTeamDoc).userId === user?.uid);
            const friendGroup = allAvail.filter(t => !('isLegendary' in t && t.isLegendary) && (t as BballTeamDoc).userId !== user?.uid);
            const legGroup = allAvail.filter(t => 'isLegendary' in t && t.isLegendary);

            return (
              <div className="space-y-4">
                {/* Controls */}
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#3d2c00' }}>
                    {(['winpct', 'gb'] as const).map(m => (
                      <button key={m} onClick={() => setStandingsMetric(m)}
                        className="px-3 py-1.5 font-retro text-[9px] tracking-wider transition-colors"
                        style={standingsMetric === m ? { background: '#f97316', color: '#0f0a00' } : { color: 'rgba(255,255,255,0.3)' }}>
                        {m === 'winpct' ? 'Win%' : 'GB'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Save button */}
                    <button
                      title="Save standings selection"
                      onClick={async () => {
                        if (standingsSaveState !== 'idle' || !user) return;
                        setStandingsSaveState('saving');
                        try {
                          await saveTablePreferences(user.uid, [], [...standingsTeamIds]);
                          setStandingsSaveState('saved');
                          setTimeout(() => setStandingsSaveState('idle'), 2000);
                        } catch { setStandingsSaveState('idle'); }
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-retro text-[9px] tracking-wider transition-all"
                      style={{
                        color: standingsSaveState === 'saved' ? '#4ade80' : 'rgba(249,115,22,0.5)',
                      }}>
                      {standingsSaveState === 'saved' ? (
                        '✓ SAVED'
                      ) : standingsSaveState === 'saving' ? (
                        '…'
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                          <rect x="1" y="1" width="14" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                          <rect x="3" y="1" width="7" height="5" rx="0.5"/>
                          <rect x="9" y="2" width="2" height="3" fill="#1c1200" rx="0.3"/>
                          <rect x="3" y="8" width="10" height="6" rx="0.5"/>
                          <rect x="5" y="9.5" width="6" height="3" rx="0.3" fill="#1c1200"/>
                        </svg>
                      )}
                    </button>
                    {/* Add teams button */}
                    <button onClick={() => setStandingsPickerOpen(o => !o)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-retro text-[9px] tracking-wider transition-colors"
                      style={{ border: '1px solid rgba(249,115,22,0.4)', color: '#f97316' }}>
                      {standingsPickerOpen ? '✕ Close' : '＋ Add Teams'}
                    </button>
                  </div>
                </div>

                {/* Picker */}
                {standingsPickerOpen && (
                  <div className="rounded-xl border p-4 space-y-4" style={{ background: '#0f0a00', borderColor: '#3d2c00' }}>
                    {[
                      { label: 'My Teams', teams: myGroup },
                      { label: 'Friends\' Teams', teams: friendGroup },
                      { label: 'Legendary Teams', teams: legGroup },
                    ].filter(g => g.teams.length > 0).map(group => (
                      <div key={group.label}>
                        <p className="font-retro text-[8px] tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.2)' }}>{group.label.toUpperCase()}</p>
                        <div className="flex flex-wrap gap-2">
                          {group.teams.map(team => {
                            const on = standingsTeamIds.has(team.id!);
                            const isLeg = 'isLegendary' in team && team.isLegendary;
                            return (
                              <button key={team.id} onClick={() => toggleStandings(team.id!)}
                                className="px-3 py-1.5 rounded-lg font-headline text-[11px] border transition-all"
                                style={{
                                  borderColor: on ? (isLeg ? 'rgba(251,191,36,0.6)' : 'rgba(249,115,22,0.6)') : 'rgba(255,255,255,0.1)',
                                  background: on ? (isLeg ? 'rgba(251,191,36,0.15)' : 'rgba(249,115,22,0.15)') : 'transparent',
                                  color: on ? (isLeg ? '#fbbf24' : '#f97316') : 'rgba(255,255,255,0.4)',
                                }}>
                                {on && <span className="mr-1 text-[9px]">✓</span>}{team.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Standings table */}
                {sorted.length === 0 ? (
                  <div className="text-center py-12 rounded-xl border" style={{ borderColor: '#3d2c00' }}>
                    <p className="font-retro text-[9px] tracking-wider" style={{ color: 'rgba(255,255,255,0.2)' }}>ADD TEAMS TO BUILD YOUR STANDINGS</p>
                    <p className="font-headline text-[11px] mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Click "＋ Add Teams" to choose from your teams, friends, or legends</p>
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-x-auto" style={{ background: '#0f0a00', borderColor: '#3d2c00' }}>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b" style={{ borderColor: '#3d2c00' }}>
                          {['#', 'Team', 'W', 'L', standingsMetric === 'winpct' ? 'Win%' : 'GB'].map((h, i) => (
                            <th key={h} className={`py-2.5 font-retro text-[8px] tracking-wider ${i === 1 ? 'text-left pl-3' : 'text-center'}`}
                              style={{ color: 'rgba(255,255,255,0.25)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((team, i) => {
                          const r = getRecord(team);
                          const total = r.wins + r.losses;
                          const pct = total > 0 ? r.wins / total : 0;
                          const isLeg = 'isLegendary' in team && team.isLegendary;
                          const gbVal = gb(team);
                          return (
                            <tr key={team.id} className="border-b transition-colors" style={{ borderColor: 'rgba(61,44,0,0.4)' }}>
                              <td className="py-2.5 text-center font-retro text-[9px] w-8" style={{ color: 'rgba(255,255,255,0.25)' }}>{i + 1}</td>
                              <td className="py-2.5 pl-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-headline text-[12px] text-white">{team.name}</span>
                                  {isLeg && <span className="font-retro text-[7px]" style={{ color: '#fbbf24' }}>LEGEND</span>}
                                </div>
                              </td>
                              <td className="py-2.5 text-center font-headline text-[12px]" style={{ color: 'rgba(249,115,22,0.8)' }}>{r.wins}</td>
                              <td className="py-2.5 text-center font-headline text-[12px]" style={{ color: 'rgba(248,113,113,0.7)' }}>{r.losses}</td>
                              <td className="py-2.5 text-center font-retro text-[10px]" style={{ color: '#f97316' }}>
                                {standingsMetric === 'winpct'
                                  ? (total > 0 ? `${(pct * 100).toFixed(1)}%` : '—')
                                  : (i === 0 ? '—' : gbVal === 0 ? '0' : gbVal % 1 === 0 ? gbVal.toString() : gbVal.toFixed(1))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* ── Challenge modal ── */}
        {challengeTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="w-full max-w-sm rounded-xl p-6" style={{ background: '#0f0a00', border: '1px solid #3d2c00', boxShadow: '0 4px 24px rgba(0,0,0,0.8)' }}>
              <h3 className="font-retro text-[10px] mb-1 tracking-wider" style={{ color: '#f97316' }}>Challenge a Friend</h3>
              <p className="font-headline text-[11px] mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Send your team ID so they can add you as a rival</p>
              {challengeSent ? (
                <p className="font-headline text-[11px] text-center py-4" style={{ color: '#f97316' }}>✓ Challenge sent!</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="font-retro text-[7px] block mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Team</label>
                    <p className="font-headline text-[12px] text-white">{challengeTeam.name}</p>
                  </div>
                  <div>
                    <label className="font-retro text-[7px] block mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Friend's Email</label>
                    <input type="email" value={challengeEmail} onChange={e => setChallengeEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendChallenge()}
                      placeholder="friend@example.com" autoFocus
                      className="w-full px-3 py-2 rounded-lg font-headline text-[11px] focus:outline-none"
                      style={{ background: '#1c1200', border: '1px solid #3d2c00', color: '#f1efe3' }} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSendChallenge} disabled={!challengeEmail.trim() || challengeSending}
                      className="flex-1 py-2 rounded-lg font-retro text-[8px] disabled:opacity-30 transition-all"
                      style={{ background: '#f97316', color: '#0f0a00' }}>
                      {challengeSending ? 'Sending…' : 'Send Challenge 🏀'}
                    </button>
                    <button onClick={() => { setChallengeTeam(null); setChallengeEmail(''); }}
                      className="py-2 px-3 rounded-lg font-retro text-[8px] border transition-colors"
                      style={{ borderColor: '#3d2c00', color: 'rgba(255,255,255,0.6)' }}>✕</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── TeamCard sub-component ──────────────────────────────────────
function TeamCard({ team, isOwn = false, isSaved = false, expandedId, setExpandedId, record, copiedId, setCopiedId, historyTeamId, onViewHistory, matchHistories, loadingHistory, onDelete, onRemoveSaved, onChallenge }: {
  team: AnyBballTeam; isOwn?: boolean; isSaved?: boolean;
  expandedId: string | null; setExpandedId: (id: string | null) => void;
  record: BballRecord; copiedId: string | null; setCopiedId: (id: string | null) => void;
  historyTeamId: string | null; onViewHistory: (id: string) => void;
  matchHistories: Record<string, BballHistoryEntry[]>; loadingHistory: boolean;
  onDelete?: (id: string) => void; onRemoveSaved?: (id: string) => void;
  onChallenge?: (team: AnyBballTeam) => void;
}) {
  const isLeg = 'isLegendary' in team && team.isLegendary;
  const isExpanded = expandedId === team.id;
  const isCopied = copiedId === team.id;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const t = team as BballTeamDoc;
    const display = t.shareId ? formatShareId(t.shareId) : t.id!;
    navigator.clipboard.writeText(display).catch(() => {});
    setCopiedId(t.id!);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="rounded-xl border transition-all duration-200"
      style={{
        borderColor: isLeg ? 'rgba(251,191,36,0.4)' : isSaved ? 'rgba(249,115,22,0.3)' : '#3d2c00',
        background: isExpanded ? '#0f0a00' : '#1c1200',
      }}>
      <button className="w-full text-left p-4" onClick={() => setExpandedId(isExpanded ? null : team.id!)}>
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="font-headline text-[13px] text-white flex items-center gap-2 flex-wrap">
              {team.name}
              {isLeg && <span className="font-retro text-[8px]" style={{ color: '#fbbf24' }}>LEGEND</span>}
              {isSaved && <span className="font-retro text-[8px]" style={{ color: 'rgba(249,115,22,0.7)' }}>RIVAL</span>}
            </h3>
            {isLeg && 'era' in team && (
              <p className="font-body text-[10px] mt-0.5" style={{ color: 'rgba(251,191,36,0.7)' }}>{team.era} · {team.description}</p>
            )}
            <p className="font-headline text-[11px] mt-1" style={{ color: 'rgba(249,115,22,0.6)' }}>{team.lineup}</p>
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {isOwn && (
              <>
                <button onClick={e => { e.stopPropagation(); onChallenge?.(team); }}
                  title="Invite friend to challenge this team"
                  className="p-1 transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f97316')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </button>
                <button onClick={handleCopy} title="Copy Team ID" className="p-1 transition-colors" style={{ color: isCopied ? '#f97316' : 'rgba(255,255,255,0.3)' }}>
                  {isCopied ? <span className="font-retro text-[8px]">✓</span> : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  )}
                </button>
                {onDelete && (
                  <button onClick={e => { e.stopPropagation(); onDelete(team.id!); }} className="p-1 transition-colors text-white/20 hover:text-red-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </>
            )}
            {isSaved && onRemoveSaved && (
              <button onClick={e => { e.stopPropagation(); onRemoveSaved(team.id!); }} className="p-1 font-retro text-[9px] transition-colors text-white/20 hover:text-red-400">✕</button>
            )}
            <span className="text-white/20 text-[10px] ml-1">{isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>

        {/* Players row + record */}
        <div className="flex justify-between items-center mt-2">
          <div className="flex gap-2 font-headline text-[10px] text-white/60">
            {BASKETBALL_POSITION_ORDER.map((pos, idx) => {
              const p = team.players[idx];
              const isOop = p && p.position !== pos;
              return (
                <span key={pos} style={isOop ? { color: '#fbbf24' } : undefined}>
                  {pos} {p ? 1 : 0}{isOop ? '*' : ''}
                </span>
              );
            })}
          </div>
          {!isLeg && team.id ? (
            <button onClick={e => { e.stopPropagation(); onViewHistory(team.id!); }} className="hover:opacity-70 transition-opacity">
              <RecordBadge record={record} />
            </button>
          ) : <RecordBadge record={record} />}
        </div>
        {isOwn && (
          <p className="font-retro text-[8px] mt-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
            ID: {(team as BballTeamDoc).shareId ? formatShareId((team as BballTeamDoc).shareId!) : '…'}
          </p>
        )}
      </button>

      {/* Expanded roster */}
      {isExpanded && (
        <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: '#3d2c00' }}>
          {team.players.map((p, idx) => {
            const slotPos = BASKETBALL_POSITION_ORDER[idx];
            const isOop = slotPos && p.position !== slotPos;
            return (
              <div key={idx} className="flex justify-between items-center py-1">
                <div className="flex items-center gap-2">
                  <span className="font-retro text-[7px] w-6" style={{ color: POS_COLORS[slotPos || p.position as BasketballPosition] }}>{slotPos || p.position}</span>
                  <span className="text-sm" style={{ color: 'rgba(241,239,227,0.8)' }}>{p.name}</span>
                  {isOop && <span className="font-retro text-[6px] px-1 rounded" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>oop</span>}
                  {p.isHistorical && <span className="font-retro text-[6px] px-1 rounded" style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa' }}>{p.year}</span>}
                </div>
                <span className="font-headline text-[11px] font-bold"
                  style={{ color: p.rating >= 90 ? '#fbbf24' : p.rating >= 80 ? '#f97316' : 'rgba(255,255,255,0.4)' }}>
                  {p.rating}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Match history */}
      {!isLeg && team.id && historyTeamId === team.id && (
        <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: '#3d2c00' }}>
          <h4 className="font-retro text-[8px] mb-3 uppercase" style={{ color: 'rgba(249,115,22,0.6)' }}>Game History</h4>
          {loadingHistory && !matchHistories[team.id] ? (
            <p className="font-headline text-[10px] animate-pulse" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading…</p>
          ) : (matchHistories[team.id] ?? []).length === 0 ? (
            <p className="font-headline text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>No history yet — only games played after tracking was added are recorded.</p>
          ) : (
            <div className="space-y-1.5">
              {(matchHistories[team.id] ?? []).map((entry, i) => {
                const date = entry.date ? new Date((entry.date as any).seconds * 1000).toLocaleDateString() : '—';
                const rc = entry.result === 'win' ? '#f97316' : '#f87171';
                const rl = entry.result === 'win' ? 'W' : 'L';
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="font-retro text-[7px] w-16 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>{date}</span>
                    <span className="flex-1 truncate" style={{ color: 'rgba(241,239,227,0.6)' }}>vs {entry.opponentName}</span>
                    <span className="font-headline text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{entry.teamScore}–{entry.opponentScore}</span>
                    <span className="font-retro text-[9px] w-4 text-right" style={{ color: rc }}>{rl}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
