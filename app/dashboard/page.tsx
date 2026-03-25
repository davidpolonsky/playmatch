'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { signOut } from '@/lib/firebase/auth';
import { Player, FORMATIONS, selectBestStarting11 } from '@/lib/types';
import { uploadCardImage } from '@/lib/firebase/storage';
import { saveTeam, getUserTeams, saveUserRoster, getUserRoster } from '@/lib/firebase/firestore';
import { Team } from '@/lib/firebase/firestore';
import CardUploader from '@/components/CardUploader';
import TeamBuilder from '@/components/TeamBuilder';
import TeamList from '@/components/TeamList';
import MatchSimulator from '@/components/MatchSimulator';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Player[]>([]);
  const [formation, setFormation] = useState('4-3-3');
  const [teamName, setTeamName] = useState('');
  const [savedTeams, setSavedTeams] = useState<Team[]>([]);
  const [activeTab, setActiveTab] = useState<'build' | 'teams' | 'match'>('build');
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
    }
  }, [user]);

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
      setPlayers(roster);
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
    const newPlayers = [...players, player];
    setPlayers(newPlayers);

    // Save to Firebase
    if (user) {
      try {
        await saveUserRoster(user.uid, newPlayers);
      } catch (error) {
        console.error('Error saving roster:', error);
      }
    }
  };

  const handleRemovePlayer = async (playerIndex: number) => {
    const newPlayers = players.filter((_, index) => index !== playerIndex);
    setPlayers(newPlayers);

    // Save to Firebase
    if (user) {
      try {
        await saveUserRoster(user.uid, newPlayers);
      } catch (error) {
        console.error('Error saving roster:', error);
      }
    }
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
    <div className="min-h-screen p-4 md:p-8 relative">
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-retro text-[13px] text-fifa-mint tracking-wider">⚽ PlayMatch</h1>
            <p className="font-headline text-[10px] text-white/40 mt-1">Welcome, {user.displayName}</p>
          </div>
          <button onClick={handleSignOut} className="btn-secondary">Sign Out</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-fifa-border pb-0 flex-wrap">
          {[
            { key: 'build', label: 'Build Team' },
            { key: 'teams', label: `My Teams (${savedTeams.length})` },
            { key: 'match', label: 'Simulate Match' },
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
          <button
            onClick={() => router.push('/teams')}
            className="px-4 py-2.5 font-retro text-[9px] tracking-wider text-white/30 border-b-2 border-transparent hover:text-fifa-amber hover:border-fifa-amber transition-all -mb-px"
          >
            ⭐ Teams
          </button>
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
                <h3 className="text-lg font-semibold mb-2">
                  Uploaded Players ({players.length})
                </h3>

                {/* Position breakdown */}
                <div className="mb-4 p-3 bg-gray-100 rounded">
                  <h4 className="font-medium text-sm mb-2">Position Breakdown:</h4>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className={`text-center p-2 rounded ${positionCounts.GK >= formationConfig.positions.GK ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      <div className="font-bold">GK</div>
                      <div>{positionCounts.GK}/{formationConfig.positions.GK}</div>
                    </div>
                    <div className={`text-center p-2 rounded ${positionCounts.DEF >= formationConfig.positions.DEF ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      <div className="font-bold">DEF</div>
                      <div>{positionCounts.DEF}/{formationConfig.positions.DEF}</div>
                    </div>
                    <div className={`text-center p-2 rounded ${positionCounts.MID >= formationConfig.positions.MID ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      <div className="font-bold">MID</div>
                      <div>{positionCounts.MID}/{formationConfig.positions.MID}</div>
                    </div>
                    <div className={`text-center p-2 rounded ${positionCounts.FWD >= formationConfig.positions.FWD ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      <div className="font-bold">FWD</div>
                      <div>{positionCounts.FWD}/{formationConfig.positions.FWD}</div>
                    </div>
                  </div>
                </div>

                {players.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                    {players.map((player, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-100 rounded text-sm hover:bg-gray-200 transition-colors"
                      >
                        <div>
                          <div className="font-semibold">{player.name}</div>
                          <div className="text-gray-600">
                            {player.position} - {player.rating}
                            {player.isHistorical && <span className="text-amber-600 ml-1">★</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemovePlayer(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                          title="Remove player"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No players uploaded yet</p>
                )}
              </div>
            </div>

            {/* Team Builder Section */}
            <div className="card">
              <h2 className="font-retro text-[10px] text-fifa-mint mb-4 tracking-wider">⚽ Build Your Team</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Formation
                </label>
                <select
                  value={formation}
                  onChange={(e) => setFormation(e.target.value)}
                  className="w-full p-2 border rounded"
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
                  <div className="mb-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                      currentTeam.length === 11
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {currentTeam.length === 11 ? 'Complete Team' : `Partial Team: ${currentTeam.length}/11`}
                    </span>
                  </div>

                  <TeamBuilder players={currentTeam} formation={formation} />

                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">
                      Team Name
                    </label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Enter team name"
                      className="w-full p-2 border rounded mb-4"
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
          <MatchSimulator teams={savedTeams} userId={user.uid} />
        )}
      </div>
    </div>
  );
}
