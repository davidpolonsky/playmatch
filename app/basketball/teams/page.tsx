'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
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
import { LEGENDARY_BASKETBALL_TEAMS, LegendaryBasketballTeam } from '@/lib/legendary-basketball-teams';
import { BASKETBALL_POSITION_ORDER, BasketballPosition } from '@/lib/types-basketball';
import Footer from '@/components/Footer';

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
  const [activeTab, setActiveTab] = useState<'my-teams' | 'teams'>('my-teams');
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

  // Invite
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);
  const [soccerLabel, setSoccerLabel] = useState('Football');

  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && !user) router.push('/basketball'); }, [user, loading, router]);

  // Detect user location to show "Soccer" for US, "Football" for others
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.country_code === 'US') {
          setSoccerLabel('Soccer');
        }
      })
      .catch(() => {
        // If detection fails, keep default "Football"
      });
  }, []);

  useEffect(() => {
    if (user) { loadTeams(); }
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
    let i = 0;
    const interval = setInterval(() => {
      if (i >= events.length) { clearInterval(interval); setStreamingDone(true); return; }
      const ev = events[i];
      setVisibleEvents(prev => [...prev, ev]);
      if (ev.quarter) setCurrentQuarter(ev.quarter);
      if (ev.scoringTeam && ev.points) {
        setLiveScore(prev => ({
          home: prev.home + (ev.scoringTeam === 'team1' ? ev.points! : 0),
          away: prev.away + (ev.scoringTeam === 'team2' ? ev.points! : 0),
        }));
      }
      i++;
    }, msPerEvent);
    return () => clearInterval(interval);
  }, [simResult]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [visibleEvents]);

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
          team1Name: selectedHome.name, team1Players: selectedHome.players,
          team2Name: selectedAway.name, team2Players: selectedAway.players,
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
    <>
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f0a00 0%, #1c1200 60%, #0f0a00 100%)' }}>
        {/* Nav */}
        <nav style={{ background: '#0f0a00', borderBottom: '1px solid #3d2c00' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-4 flex-wrap">
          <h1 className="font-retro text-[11px] tracking-wider flex items-center gap-2" style={{ color: '#f97316' }}>
            <Image src="/basketball.png" alt="" width={16} height={16} style={{ imageRendering: 'pixelated' }} unoptimized />
            PlayMatch
          </h1>
          <div className="flex gap-2 items-center flex-wrap">
            <button onClick={() => router.push('/dashboard')}
              className="font-retro text-[9px] py-1.5 px-3 rounded-lg border transition-colors"
              style={{ borderColor: '#3d2c00', color: 'rgba(255,255,255,0.6)' }}>
              ⚽ Switch to {soccerLabel}
            </button>
            <button onClick={() => router.push('/basketball/team-builder')}
              className="font-retro text-[9px] py-1.5 px-3 rounded-lg transition-all"
              style={{ background: '#f97316', color: '#0f0a00' }}>
              + New Team
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Game Simulator ── */}
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
                  {BASKETBALL_POSITION_ORDER.map(pos => {
                    const p = selectedHome.players.find(pl => pl.position === pos);
                    return p ? (
                      <div key={pos} className="flex items-center gap-1 text-xs">
                        <span className="font-retro text-[7px] w-5" style={{ color: POS_COLORS[pos] }}>{pos}</span>
                        <span style={{ color: 'rgba(241,239,227,0.7)' }}>{p.name}</span>
                        <span className="ml-auto font-headline text-[10px] font-bold"
                          style={{ color: p.rating >= 90 ? '#fbbf24' : p.rating >= 80 ? '#f97316' : 'rgba(255,255,255,0.4)' }}>
                          {p.rating}
                        </span>
                      </div>
                    ) : null;
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
                  {BASKETBALL_POSITION_ORDER.map(pos => {
                    const p = selectedAway.players.find(pl => pl.position === pos);
                    return p ? (
                      <div key={pos} className="flex items-center gap-1 text-xs">
                        <span className="font-retro text-[7px] w-5" style={{ color: POS_COLORS[pos] }}>{pos}</span>
                        <span style={{ color: 'rgba(241,239,227,0.7)' }}>{p.name}</span>
                        <span className="ml-auto font-headline text-[10px] font-bold"
                          style={{ color: p.rating >= 90 ? '#fbbf24' : p.rating >= 80 ? '#f97316' : 'rgba(255,255,255,0.4)' }}>
                          {p.rating}
                        </span>
                      </div>
                    ) : null;
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
          {(simResult || simulating) && (
            <div className="mt-6 rounded-xl border p-6" style={{ background: '#0f0a00', borderColor: '#3d2c00' }}>
              {currentQuarter > 0 && !streamingDone && (
                <p className="text-center font-retro text-[8px] mb-3 tracking-widest" style={{ color: 'rgba(249,115,22,0.6)' }}>
                  Q{currentQuarter}
                </p>
              )}
              <div className="flex items-center justify-between text-center">
                <div className="flex-1">
                  <div className="font-headline text-[11px] mb-2 truncate" style={{ color: 'rgba(241,239,227,0.6)' }}>{selectedHome?.name}</div>
                  <div className="font-retro text-5xl transition-all duration-300" style={{ color: '#f97316' }}>{liveScore.home}</div>
                </div>
                <div className="px-6">
                  <div className="font-retro text-[9px] tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {streamingDone ? 'FINAL' : visibleEvents.length > 0 ? 'LIVE' : 'TIP OFF'}
                  </div>
                  <div className="font-retro text-lg mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>—</div>
                </div>
                <div className="flex-1">
                  <div className="font-headline text-[11px] mb-2 truncate" style={{ color: 'rgba(241,239,227,0.6)' }}>{selectedAway?.name}</div>
                  <div className="font-retro text-5xl transition-all duration-300" style={{ color: '#f97316' }}>{liveScore.away}</div>
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
                  const color = EVENT_COLORS[ev.type] || 'border-l-4 border-transparent';
                  const icon = EVENT_ICONS[ev.type] || '🏀';
                  const isScore = ['shot_made', 'three_made', 'dunk', 'layup', 'free_throw', 'buzzer_beater'].includes(ev.type);
                  const isMilestone = ev.type === 'end_quarter' || ev.type === 'final';
                  return (
                    <div key={i} className={`flex items-start gap-3 px-4 py-2.5 ${color}`}>
                      <span className="flex-shrink-0 w-8 font-retro text-[7px] pt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Q{ev.quarter}</span>
                      <span className="flex-shrink-0 text-sm">
                        {icon === '🏀' ? <img src="/basketball.png" className="w-4 h-4 inline-block" alt="" /> : icon}
                      </span>
                      <p className={`text-sm flex-1 leading-snug ${isScore ? 'font-bold' : ''}`}
                        style={{ color: isScore ? '#f97316' : isMilestone ? '#fbbf24' : 'rgba(241,239,227,0.7)' }}>
                        {ev.text}
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

          {/* Summary */}
          {streamingDone && simResult && (
            <div className="mt-4 rounded-xl border p-4" style={{ background: '#0f0a00', borderColor: '#3d2c00' }}>
              <h4 className="font-retro text-[9px] mb-2" style={{ color: '#f97316' }}>📋 Game Report</h4>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(241,239,227,0.8)' }}>{simResult.summary}</p>
            </div>
          )}
        </div>

        {/* ── Teams List ── */}
        <div className="rounded-xl border p-6" style={{ background: '#1c1200', borderColor: '#3d2c00', boxShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>
          <div className="flex gap-1 mb-6 border-b pb-0" style={{ borderColor: '#3d2c00' }}>
            {[{ key: 'my-teams', label: 'My Teams' }, { key: 'teams', label: 'Teams' }].map(({ key, label }) => (
              <button key={key} onClick={() => setActiveTab(key as typeof activeTab)}
                className={`px-4 py-2.5 font-retro text-[9px] tracking-wider transition-all border-b-2 -mb-px ${
                  activeTab === key ? 'border-bball-orange text-bball-orange' : 'border-transparent text-white/30 hover:text-white/60'
                }`}>
                {label}
              </button>
            ))}
          </div>

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
      </main>

// ── TeamCard sub-component ──────────────────────────────────────
function TeamCard({ team, isOwn = false, isSaved = false, expandedId, setExpandedId, record, copiedId, setCopiedId, historyTeamId, onViewHistory, matchHistories, loadingHistory, onDelete, onRemoveSaved }: {
  team: AnyBballTeam; isOwn?: boolean; isSaved?: boolean;
  expandedId: string | null; setExpandedId: (id: string | null) => void;
  record: BballRecord; copiedId: string | null; setCopiedId: (id: string | null) => void;
  historyTeamId: string | null; onViewHistory: (id: string) => void;
  matchHistories: Record<string, BballHistoryEntry[]>; loadingHistory: boolean;
  onDelete?: (id: string) => void; onRemoveSaved?: (id: string) => void;
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
            {BASKETBALL_POSITION_ORDER.map(pos => {
              const p = team.players.find(pl => pl.position === pos);
              return <span key={pos}>{pos} {p ? 1 : 0}</span>;
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
          {BASKETBALL_POSITION_ORDER.map(pos => {
            const p = team.players.find(pl => pl.position === pos);
            if (!p) return null;
            return (
              <div key={pos} className="flex justify-between items-center py-1">
                <div className="flex items-center gap-2">
                  <span className="font-retro text-[7px] w-6" style={{ color: POS_COLORS[pos] }}>{pos}</span>
                  <span className="text-sm" style={{ color: 'rgba(241,239,227,0.8)' }}>{p.name}</span>
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
      <Footer />
    </>
  );
}
