'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { signOut } from '@/lib/firebase/auth';
import { Player, FORMATIONS, selectBestStarting11 } from '@/lib/types';
import { uploadCardImage } from '@/lib/firebase/storage';
import { saveTeam, getUserTeams, saveUserRoster, getUserRoster, checkCardUploadLimit, incrementCardUploadCount, getAllTeams, getTeamRecords, getUserLegendaryRecords, TeamRecord, saveTablePreferences, getTablePreferences } from '@/lib/firebase/firestore';
import { Team } from '@/lib/firebase/firestore';
import { migrateRosterAppearance } from '@/lib/migrate-players';
import { getLegendaryTeams, LegendaryTeam } from '@/lib/legendary-teams';
import CardUploader from '@/components/CardUploader';
import InteractiveTeamDisplay from '@/components/InteractiveTeamDisplay';
import InteractivePlayerList from '@/components/InteractivePlayerList';
import TeamList from '@/components/TeamList';
import MatchSimulator from '@/components/MatchSimulator';
import Footer from '@/components/Footer';
import Navigation from '@/components/Navigation';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Player[]>([]);
  const [formation, setFormation] = useState('4-3-3');
  const [teamName, setTeamName] = useState('');
  const [savedTeams, setSavedTeams] = useState<Team[]>([]);
  const [activeTab, setActiveTab] = useState<'build' | 'teams' | 'match' | 'table'>('build');
  // League Table state
  const [tableTeamIds, setTableTeamIds] = useState<Set<string>>(new Set());
  const [tableMetric, setTableMetric] = useState<'points' | 'winpct'>('points');
  const [tableAllTeams, setTableAllTeams] = useState<(Team | LegendaryTeam)[]>([]);
  const [tableRecords, setTableRecords] = useState<Record<string, TeamRecord>>({});
  const [tableLegendaryRecords, setTableLegendaryRecords] = useState<Record<string, TeamRecord>>({});
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [tableSaveState, setTableSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    show: boolean;
  }>({ message: '', type: 'info', show: false });

  // Show notification function
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type, show: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000); // Auto-hide after 5 seconds
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadUserTeams();
      loadUserRoster();
      // Load saved table selection
      getTablePreferences(user.uid).then(prefs => {
        if (prefs.tableTeamIds.length > 0) setTableTeamIds(new Set(prefs.tableTeamIds));
      }).catch(() => {});
    }
  }, [user]);

  // Load all teams + records when Table tab is opened
  useEffect(() => {
    if (activeTab !== 'table' || !user) return;
    (async () => {
      const legendaryTeams = getLegendaryTeams();
      const [all, legRecs] = await Promise.all([
        getAllTeams().catch(() => [] as Team[]),
        getUserLegendaryRecords(user.uid).catch(() => ({} as Record<string, TeamRecord>)),
      ]);
      const ids = all.filter(t => t.id).map(t => t.id!);
      const recs = ids.length ? await getTeamRecords(ids).catch(() => ({} as Record<string, TeamRecord>)) : {};
      setTableAllTeams([...all, ...legendaryTeams]);
      setTableRecords(recs);
      setTableLegendaryRecords(legRecs);
    })();
  }, [activeTab, user]);

  const loadUserTeams = async () => {
    if (!user) return;
    try {
      const teams = await getUserTeams(user.uid);
      setSavedTeams(teams);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const loadUserRoster = async () => {
    if (!user) return;
    try {
      const roster = await getUserRoster(user.uid);
      // Ensure all players have IDs (fix for legacy data without IDs)
      let rosterWithIds = roster.map(player =>
        player.id ? player : { ...player, id: crypto.randomUUID() }
      );

      // Migrate players without appearance data
      const rosterWithAppearance = migrateRosterAppearance(rosterWithIds);
      setPlayers(rosterWithAppearance);

      // Save back to Firebase if any IDs or appearance data were added
      const hadIdsMissing = rosterWithIds.some((p, i) => !roster[i].id);
      const hadAppearanceMissing = rosterWithAppearance.some(p => !p.skinTone);

      if (hadIdsMissing || hadAppearanceMissing) {
        await saveUserRoster(user.uid, rosterWithAppearance);
      }
    } catch (error) {
      console.error('Error loading roster:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handlePlayerAdded = async (player: Player) => {
    if (!user) return;

    // Check rate limits before adding
    const limitCheck = await checkCardUploadLimit(user.uid, 1);
    if (!limitCheck.allowed) {
      alert(limitCheck.reason || 'Upload limit reached');
      return;
    }

    // Generate unique ID for the player
    const playerWithId = { ...player, id: crypto.randomUUID() };
    const newPlayers = [...players, playerWithId];
    setPlayers(newPlayers);

    // Save to Firebase and increment count
    try {
      await saveUserRoster(user.uid, newPlayers);
      await incrementCardUploadCount(user.uid, 1);
    } catch (error) {
      console.error('Error saving roster:', error);
      alert('Failed to save card');
    }
  };

  const handleRemovePlayerFromRoster = async (playerId: string) => {
    const newPlayers = players.filter((p) => p.id !== playerId);
    setPlayers(newPlayers);
    // Also remove from current team if present
    setCurrentTeam(prev => prev.filter(p => p.id !== playerId));

    // Save to Firebase
    if (user) {
      try {
        await saveUserRoster(user.uid, newPlayers);
      } catch (error) {
        console.error('Error saving roster:', error);
      }
    }
  };

  const handleAddToTeam = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    if (currentTeam.length >= 11) {
      showNotification('Team is full — 11 players maximum', 'info');
      return;
    }

    const formationConfig = FORMATIONS[formation];
    const currentCount = currentTeam.filter(p => p.position === player.position).length;
    const maxCount = formationConfig.positions[player.position];

    setCurrentTeam(prev => [...prev, player]);

    if (currentCount >= maxCount) {
      showNotification(`⚠️ ${player.name} added out of position — ${player.position} exceeds ${formation} quota. Red border shows in team.`, 'info');
    }
  };

  // Compute which players are exceeding their position quota (out of position)
  const getOutOfPositionIds = (team: typeof currentTeam): Set<string> => {
    const out = new Set<string>();
    const formationConfig = FORMATIONS[formation];
    const positions = ['GK', 'DEF', 'MID', 'FWD'] as const;
    for (const pos of positions) {
      const posPlayers = team.filter(p => p.position === pos).sort((a, b) => b.rating - a.rating);
      const limit = formationConfig.positions[pos];
      posPlayers.slice(limit).forEach(p => out.add(p.id));
    }
    return out;
  };

  const handleRemoveFromTeam = (playerId: string) => {
    setCurrentTeam(prev => prev.filter(p => p.id !== playerId));
  };

  const handleGenerateTeam = () => {
    if (players.length === 0) {
      showNotification('You need to upload some players first! Try uploading a soccer player card.', 'info');
      return;
    }

    // Generate the best possible team with available players
    const formationConfig = FORMATIONS[formation];
    const bestTeam: Player[] = [];
    const positions: Array<'GK' | 'DEF' | 'MID' | 'FWD'> = ['GK', 'DEF', 'MID', 'FWD'];

    positions.forEach(position => {
      const requiredCount = formationConfig.positions[position];
      const positionPlayers = players
        .filter(p => p.position === position)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, requiredCount);

      bestTeam.push(...positionPlayers);
    });

    setCurrentTeam(bestTeam);

    // Show informative message
    if (bestTeam.length === 11) {
      const avgRating = Math.round(bestTeam.reduce((sum, p) => sum + p.rating, 0) / 11);
      showNotification(`🎉 Complete ${formation} team generated! Average rating: ${avgRating}`, 'success');
    } else {
      const avgRating = bestTeam.length > 0 ? Math.round(bestTeam.reduce((sum, p) => sum + p.rating, 0) / bestTeam.length) : 0;
      showNotification(`📋 Partial team created: ${bestTeam.length}/11 players. Upload more cards to complete your squad!`, 'info');
    }
  };

  const handleSaveTeam = async () => {
    if (!user || currentTeam.length !== 11 || !teamName.trim()) {
      showNotification('Please provide a team name and ensure you have 11 players selected.', 'error');
      return;
    }

    try {
      await saveTeam({
        name: teamName,
        formation,
        players: currentTeam,
        userId: user.uid,
      });

      showNotification(`✅ Team "${teamName}" saved successfully!`, 'success');
      setTeamName('');
      loadUserTeams();
    } catch (error) {
      console.error('Error saving team:', error);
      showNotification('Failed to save team. Please try again.', 'error');
    }
  };

  // Get position breakdown for current players
  const getPositionBreakdown = () => {
    const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    players.forEach(player => {
      counts[player.position]++;
    });
    return counts;
  };

  const positionCounts = getPositionBreakdown();
  const formationConfig = FORMATIONS[formation];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navigation user={user} currentPage="dashboard" />

      <main className="p-4 md:p-8 relative">
        <div className="max-w-7xl mx-auto">
          {/* Notification Toast */}
          {notification.show && (
            <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
              <div className={`max-w-md p-4 rounded-lg shadow-lg border-l-4 ${
                notification.type === 'success'
                  ? 'bg-green-50 border-green-400 text-green-800'
                  : notification.type === 'error'
                  ? 'bg-red-50 border-red-400 text-red-800'
                  : 'bg-blue-50 border-blue-400 text-blue-800'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{notification.message}</p>
                  </div>
                  <button
                    onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                    className={`ml-3 text-lg font-bold ${
                      notification.type === 'success'
                        ? 'text-green-600 hover:text-green-800'
                        : notification.type === 'error'
                        ? 'text-red-600 hover:text-red-800'
                        : 'text-blue-600 hover:text-blue-800'
                    }`}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-6">
            <h2 className="font-retro text-[11px] text-fifa-mint mb-2 tracking-wider">DASHBOARD</h2>
            <p className="font-headline text-[10px] text-white/40">Welcome, {user.displayName}</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-fifa-border pb-0 flex-wrap">
            {[
              { key: 'build', label: 'Build Team' },
              { key: 'teams', label: `Teams (${savedTeams.length})` },
              { key: 'match', label: 'Simulate Match' },
              { key: 'table', label: 'Table' },
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

        {/* Content */}
        {activeTab === 'build' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card Upload Section */}
            <div className="card">
              <h2 className="font-retro text-[10px] text-fifa-mint mb-4 tracking-wider">📷 Scan Player Cards</h2>
              <CardUploader
                onPlayerAdded={handlePlayerAdded}
                onError={(message) => showNotification(message, 'error')}
                onSuccess={(message) => showNotification(message, 'success')}
                userId={user.uid}
              />

              <div className="mt-6">
                <h3 className="font-retro text-[10px] text-fifa-mint tracking-wider mb-4">
                  UPLOADED PLAYERS ({players.length})
                </h3>

                {/* Position breakdown */}
                <div className="mb-4 p-3 bg-fifa-dark border border-fifa-border rounded-lg">
                  <h4 className="font-retro text-[9px] text-fifa-mint/70 mb-3 tracking-wider">POSITION BREAKDOWN</h4>
                  <div className="grid grid-cols-4 gap-2">
                    <div className={`text-center p-2.5 rounded-lg border ${positionCounts.GK >= formationConfig.positions.GK ? 'bg-fifa-mint/10 border-fifa-mint/40' : 'bg-red-500/10 border-red-500/40'}`}>
                      <div className="font-retro text-[8px] text-fifa-amber">GK</div>
                      <div className={`font-headline text-[13px] font-bold mt-0.5 ${positionCounts.GK >= formationConfig.positions.GK ? 'text-fifa-mint' : 'text-red-400'}`}>
                        {positionCounts.GK}<span className="text-white/30 text-[10px]">/{formationConfig.positions.GK}</span>
                      </div>
                    </div>
                    <div className={`text-center p-2.5 rounded-lg border ${positionCounts.DEF >= formationConfig.positions.DEF ? 'bg-fifa-mint/10 border-fifa-mint/40' : 'bg-red-500/10 border-red-500/40'}`}>
                      <div className="font-retro text-[8px] text-blue-400">DEF</div>
                      <div className={`font-headline text-[13px] font-bold mt-0.5 ${positionCounts.DEF >= formationConfig.positions.DEF ? 'text-fifa-mint' : 'text-red-400'}`}>
                        {positionCounts.DEF}<span className="text-white/30 text-[10px]">/{formationConfig.positions.DEF}</span>
                      </div>
                    </div>
                    <div className={`text-center p-2.5 rounded-lg border ${positionCounts.MID >= formationConfig.positions.MID ? 'bg-fifa-mint/10 border-fifa-mint/40' : 'bg-red-500/10 border-red-500/40'}`}>
                      <div className="font-retro text-[8px] text-fifa-mint">MID</div>
                      <div className={`font-headline text-[13px] font-bold mt-0.5 ${positionCounts.MID >= formationConfig.positions.MID ? 'text-fifa-mint' : 'text-red-400'}`}>
                        {positionCounts.MID}<span className="text-white/30 text-[10px]">/{formationConfig.positions.MID}</span>
                      </div>
                    </div>
                    <div className={`text-center p-2.5 rounded-lg border ${positionCounts.FWD >= formationConfig.positions.FWD ? 'bg-fifa-mint/10 border-fifa-mint/40' : 'bg-red-500/10 border-red-500/40'}`}>
                      <div className="font-retro text-[8px] text-red-400">FWD</div>
                      <div className={`font-headline text-[13px] font-bold mt-0.5 ${positionCounts.FWD >= formationConfig.positions.FWD ? 'text-fifa-mint' : 'text-red-400'}`}>
                        {positionCounts.FWD}<span className="text-white/30 text-[10px]">/{formationConfig.positions.FWD}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <InteractivePlayerList
                  allPlayers={players}
                  teamPlayers={currentTeam}
                  outOfPositionIds={getOutOfPositionIds(currentTeam)}
                  onAdd={handleAddToTeam}
                  onRemove={handleRemoveFromTeam}
                />
              </div>
            </div>

            {/* Team Builder Section */}
            <div className="card">
              <h2 className="font-retro text-[10px] text-fifa-mint mb-4 tracking-wider">⚽ Build Your Team</h2>

              <div className="mb-4">
                <label className="block font-retro text-[9px] text-fifa-mint/70 mb-2 uppercase tracking-widest">
                  Formation
                </label>
                <select
                  value={formation}
                  onChange={(e) => setFormation(e.target.value)}
                  className="w-full px-3 py-2 bg-fifa-dark border border-fifa-border rounded-lg text-fifa-cream font-headline text-sm focus:ring-1 focus:ring-fifa-mint focus:outline-none"
                >
                  {Object.keys(FORMATIONS).map((form) => (
                    <option key={form} value={form}>
                      {form}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGenerateTeam}
                className="btn-primary w-full mb-4"
                disabled={players.length === 0}
              >
                Generate Best Starting 11
              </button>

              {currentTeam.length > 0 && (
                <>
                  <InteractiveTeamDisplay
                    players={currentTeam}
                    allPlayers={players}
                    formation={FORMATIONS[formation]}
                    outOfPositionIds={getOutOfPositionIds(currentTeam)}
                    onRemoveFromTeam={handleRemoveFromTeam}
                    onAddToTeam={handleAddToTeam}
                  />

                  <div className="mt-4">
                    <label className="block font-retro text-[9px] text-fifa-mint/70 mb-2 uppercase tracking-widest">
                      Team Name
                    </label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Enter team name"
                      className="w-full px-3 py-2 bg-fifa-dark border border-fifa-border rounded-lg text-fifa-cream font-headline text-sm placeholder:text-white/25 focus:ring-1 focus:ring-fifa-mint focus:outline-none mb-4"
                    />
                    <button
                      onClick={handleSaveTeam}
                      className="btn-primary w-full"
                      disabled={!teamName.trim() || currentTeam.length !== 11}
                    >
                      {currentTeam.length === 11 ? 'Save Team' : 'Need 11 Players to Save'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <TeamList teams={savedTeams} onTeamsChange={loadUserTeams} />
        )}

        {activeTab === 'match' && (
          <MatchSimulator teams={savedTeams} userId={user.uid} userEmail={user.email || undefined} />
        )}

        {activeTab === 'table' && (() => {
          const getRecord = (team: Team | LegendaryTeam): TeamRecord => {
            const isLeg = 'isLegendary' in team && team.isLegendary;
            return (isLeg ? tableLegendaryRecords[team.id!] : tableRecords[team.id!]) ?? { wins: 0, losses: 0, ties: 0 };
          };
          const selected = tableAllTeams.filter(t => tableTeamIds.has(t.id!));
          const rows = selected.map(team => {
            const r = getRecord(team);
            const wins = r.wins ?? 0;
            const losses = r.losses ?? 0;
            const ties = r.ties ?? 0;
            const p = wins + losses + ties;
            const pts = wins * 3 + ties;
            const winpct = p > 0 ? (wins / p) : 0;
            return { team, wins, losses, ties, p, pts, winpct };
          }).sort((a, b) => tableMetric === 'points' ? (b.pts - a.pts) || (b.wins - a.wins) : b.winpct - a.winpct);

          // Available teams not yet added, grouped
          const myTeams = tableAllTeams.filter(t => !('isLegendary' in t && t.isLegendary) && (t as Team).userId === user.uid);
          const friendTeams = tableAllTeams.filter(t => !('isLegendary' in t && t.isLegendary) && (t as Team).userId !== user.uid);
          const legendTeams = tableAllTeams.filter(t => 'isLegendary' in t && t.isLegendary);

          const toggle = (id: string) => setTableTeamIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
          });

          return (
            <div className="space-y-4">
              {/* Controls bar */}
              <div className="flex flex-wrap justify-between items-center gap-3">
                {/* Metric toggle */}
                <div className="flex rounded-lg overflow-hidden border border-fifa-border">
                  {(['points', 'winpct'] as const).map(m => (
                    <button key={m} onClick={() => setTableMetric(m)}
                      className={`px-3 py-1.5 font-retro text-[9px] tracking-wider transition-colors ${tableMetric === m ? 'bg-fifa-mint text-black' : 'text-white/40 hover:text-white/70'}`}>
                      {m === 'points' ? 'Points' : 'Win%'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {/* Save button */}
                  <button
                    title="Save table selection"
                    onClick={async () => {
                      if (tableSaveState !== 'idle') return;
                      setTableSaveState('saving');
                      try {
                        await saveTablePreferences(user.uid, [...tableTeamIds]);
                        setTableSaveState('saved');
                        setTimeout(() => setTableSaveState('idle'), 2000);
                      } catch { setTableSaveState('idle'); }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-retro text-[9px] tracking-wider transition-all hover:bg-fifa-mint/10"
                    style={{ color: tableSaveState === 'saved' ? '#4ade80' : 'rgba(74,222,128,0.5)' }}>
                    {tableSaveState === 'saved' ? (
                      '✓ SAVED'
                    ) : tableSaveState === 'saving' ? (
                      '…'
                    ) : (
                      // Retro floppy disk icon
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="1" y="1" width="14" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                        <rect x="3" y="1" width="7" height="5" rx="0.5"/>
                        <rect x="9" y="2" width="2" height="3" fill="var(--color-fifa-dark, #0a1628)" rx="0.3"/>
                        <rect x="3" y="8" width="10" height="6" rx="0.5"/>
                        <rect x="5" y="9.5" width="6" height="3" rx="0.3" fill="var(--color-fifa-dark, #0a1628)"/>
                      </svg>
                    )}
                  </button>
                  {/* Add teams button */}
                  <button onClick={() => setTablePickerOpen(o => !o)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-retro text-[9px] tracking-wider transition-colors border-fifa-mint/40 text-fifa-mint hover:bg-fifa-mint/10">
                    {tablePickerOpen ? '✕ Close' : '＋ Add Teams'}
                  </button>
                </div>
              </div>

              {/* Team picker panel */}
              {tablePickerOpen && (
                <div className="card space-y-4">
                  {[
                    { label: 'My Teams', teams: myTeams },
                    { label: 'Friends\' Teams', teams: friendTeams },
                    { label: 'Legendary Teams', teams: legendTeams },
                  ].filter(g => g.teams.length > 0).map(group => (
                    <div key={group.label}>
                      <p className="font-retro text-[8px] text-white/30 uppercase tracking-widest mb-2">{group.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {group.teams.map(team => {
                          const on = tableTeamIds.has(team.id!);
                          const isLeg = 'isLegendary' in team && team.isLegendary;
                          return (
                            <button key={team.id} onClick={() => toggle(team.id!)}
                              className={`px-3 py-1.5 rounded-lg font-headline text-[11px] border transition-all ${
                                on
                                  ? isLeg ? 'bg-yellow-400/20 border-yellow-400/60 text-yellow-300' : 'bg-fifa-mint/20 border-fifa-mint/60 text-fifa-mint'
                                  : 'border-white/10 text-white/50 hover:border-white/30'
                              }`}>
                              {on && <span className="mr-1 text-[9px]">✓</span>}{team.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Table */}
              {rows.length === 0 ? (
                <div className="card text-center py-12">
                  <p className="font-retro text-[9px] text-white/20 tracking-wider">ADD TEAMS TO BUILD YOUR TABLE</p>
                  <p className="font-headline text-[11px] text-white/30 mt-2">Click "＋ Add Teams" to choose from your teams, friends, or legends</p>
                </div>
              ) : (
                <div className="card overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-fifa-border">
                        {['#', 'Team', 'P', 'W', 'D', 'L', tableMetric === 'points' ? 'Pts' : 'Win%'].map((h, i) => (
                          <th key={h} className={`py-2 font-retro text-[8px] text-white/30 tracking-wider ${i === 1 ? 'text-left pl-2' : 'text-center'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => {
                        const isLeg = 'isLegendary' in row.team && row.team.isLegendary;
                        return (
                          <tr key={row.team.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            <td className="py-2.5 text-center font-retro text-[9px] text-white/30 w-8">{i + 1}</td>
                            <td className="py-2.5 pl-2">
                              <div className="flex items-center gap-2">
                                <span className="font-headline text-[12px] text-white">{row.team.name}</span>
                                {isLeg && <span className="font-retro text-[7px] text-yellow-400/70">LEGEND</span>}
                              </div>
                            </td>
                            {[row.p, row.wins, row.ties, row.losses].map((v, j) => (
                              <td key={j} className="py-2.5 text-center font-headline text-[12px] text-white/60">{v}</td>
                            ))}
                            <td className="py-2.5 text-center">
                              <span className="font-retro text-[10px] text-fifa-mint">
                                {tableMetric === 'points' ? row.pts : `${(row.winpct * 100).toFixed(0)}%`}
                              </span>
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
      </main>

      <Footer />
    </div>
  );
}
