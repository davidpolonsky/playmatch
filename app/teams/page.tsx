'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Team, GameResult } from '@/lib/types';
import { getUserTeams, getAllTeams, deleteTeam } from '@/lib/firebase/firestore';
import { LEGENDARY_TEAMS, LegendaryTeam } from '@/lib/legendary-teams';

export default function TeamsPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [legendaryTeams] = useState<LegendaryTeam[]>(LEGENDARY_TEAMS);
  const [selectedHomeTeam, setSelectedHomeTeam] = useState<Team | LegendaryTeam | null>(null);
  const [selectedAwayTeam, setSelectedAwayTeam] = useState<Team | LegendaryTeam | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-teams' | 'all-teams' | 'legendary'>('my-teams');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      console.log('User detected, loading teams for:', user.uid);
      loadTeams();

      // Failsafe: stop loading after 5 seconds no matter what
      const timeout = setTimeout(() => {
        console.warn('Loading timeout reached, forcing page to render');
        setLoadingTeams(false);
      }, 5000);

      return () => clearTimeout(timeout);
    } else if (!loading) {
      console.log('No user and not loading, setting loadingTeams to false');
      setLoadingTeams(false);
    }
  }, [user, loading]);

  const loadTeams = async () => {
    console.log('loadTeams called');
    try {
      console.log('Fetching user teams and all teams...');
      const [userTeams, teams] = await Promise.all([
        getUserTeams(user!.uid).catch(err => {
          console.error('Error loading user teams:', err);
          return [];
        }),
        getAllTeams().catch(err => {
          console.error('Error loading all teams:', err);
          return [];
        }),
      ]);
      console.log('Teams loaded:', { userTeams: userTeams.length, allTeams: teams.length });
      setMyTeams(userTeams);
      setAllTeams(teams);
    } catch (error) {
      console.error('Fatal error loading teams:', error);
      setMyTeams([]);
      setAllTeams([]);
    } finally {
      console.log('Setting loadingTeams to false');
      setLoadingTeams(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      await deleteTeam(teamId);
      await loadTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Failed to delete team');
    }
  };

  const handleSimulateGame = async () => {
    if (!selectedHomeTeam || !selectedAwayTeam) {
      alert('Please select both teams');
      return;
    }

    setSimulating(true);
    setGameResult(null);

    try {
      const response = await fetch('/api/simulate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeam: selectedHomeTeam,
          awayTeam: selectedAwayTeam,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGameResult(data.result);
      } else {
        alert('Failed to simulate game');
      }
    } catch (error) {
      console.error('Error simulating game:', error);
      alert('Error simulating game');
    } finally {
      setSimulating(false);
    }
  };

  if (loading || loadingTeams) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teams...</p>
        </div>
      </div>
    );
  }

  const displayTeams = activeTab === 'my-teams' ? myTeams : activeTab === 'legendary' ? legendaryTeams : allTeams;
  const allTeamsForSimulation = [...allTeams, ...legendaryTeams];

  // Helper to get formation string from either string or Formation object
  const getFormationString = (formation: any): string => {
    return typeof formation === 'string' ? formation : formation?.name || 'N/A';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">My Teams </h1>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => router.push('/team-builder')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              + New Team
            </button>
            <span className="text-gray-600">{user?.displayName}</span>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Match Simulator */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">Match Simulator</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Home Team
              </label>
              <select
                value={selectedHomeTeam?.id || ''}
                onChange={(e) => {
                  const team = allTeamsForSimulation.find((t) => t.id === e.target.value);
                  setSelectedHomeTeam(team || null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select home team...</option>
                <optgroup label="Your Teams">
                  {myTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({getFormationString(team.formation)})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Legendary Teams">
                  {legendaryTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({getFormationString(team.formation)})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="All Other Teams">
                  {allTeams.filter(t => t.userId !== user?.uid).map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({getFormationString(team.formation)})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="flex items-end justify-center">
              <button
                onClick={handleSimulateGame}
                disabled={!selectedHomeTeam || !selectedAwayTeam || simulating}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
              >
                {simulating ? 'Simulating...' : '⚽ Simulate Match'}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Away Team
              </label>
              <select
                value={selectedAwayTeam?.id || ''}
                onChange={(e) => {
                  const team = allTeamsForSimulation.find((t) => t.id === e.target.value);
                  setSelectedAwayTeam(team || null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select away team...</option>
                <optgroup label="Your Teams">
                  {myTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({getFormationString(team.formation)})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Legendary Teams">
                  {legendaryTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({getFormationString(team.formation)})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="All Other Teams">
                  {allTeams.filter(t => t.userId !== user?.uid).map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({getFormationString(team.formation)})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Game Result */}
          {gameResult && (
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 border-2 border-blue-200">
              <div className="text-center mb-6">
                <h3 className="text-3xl font-bold mb-2">Final Score</h3>
                <div className="flex items-center justify-center gap-8 text-4xl font-bold">
                  <div className="text-center">
                    <div className="text-gray-700">{gameResult.homeTeam.name}</div>
                    <div className="text-blue-600">{gameResult.homeScore}</div>
                  </div>
                  <div className="text-gray-400">-</div>
                  <div className="text-center">
                    <div className="text-gray-700">{gameResult.awayTeam.name}</div>
                    <div className="text-green-600">{gameResult.awayScore}</div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold text-lg mb-2">Match Report</h4>
                <p className="text-gray-700 leading-relaxed">{gameResult.narrative}</p>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold text-lg mb-2">Key Moments</h4>
                <ul className="space-y-2">
                  {gameResult.keyMoments.map((moment, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-blue-600 mr-2">⚽</span>
                      <span className="text-gray-700">{moment}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-yellow-100 rounded-lg p-4 border-2 border-yellow-300">
                <h4 className="font-semibold text-lg mb-1">Man of the Match 🏆</h4>
                <p className="text-gray-800">
                  {gameResult.mvp.name} ({gameResult.mvp.position}, Rating: {gameResult.mvp.rating})
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Teams List */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex gap-4 mb-6 border-b">
            <button
              onClick={() => setActiveTab('my-teams')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'my-teams'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Teams ({myTeams.length})
            </button>
            <button
              onClick={() => setActiveTab('legendary')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'legendary'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Legendary Teams ({legendaryTeams.length})
            </button>
            <button
              onClick={() => setActiveTab('all-teams')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'all-teams'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Teams ({allTeams.length})
            </button>
          </div>

          {displayTeams.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No teams yet</p>
              <button
                onClick={() => router.push('/team-builder')}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Create Your First Team
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayTeams.map((team) => {
                const isLegendary = 'isLegendary' in team && team.isLegendary;
                return (
                  <div
                    key={team.id}
                    className={`border rounded-lg p-4 hover:shadow-lg transition-shadow ${
                      isLegendary ? 'border-purple-300 bg-purple-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          {team.name}
                          {isLegendary && <span className="text-xl">⭐</span>}
                        </h3>
                        {isLegendary && 'description' in team && (
                          <p className="text-xs text-purple-600 mt-1">{team.description}</p>
                        )}
                      </div>
                      {!isLegendary && team.userId === user?.uid && (
                        <button
                          onClick={() => handleDeleteTeam(team.id!)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete team"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Formation: {getFormationString(team.formation)}
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>GK: {team.players.filter(p => p.position === 'GK').length}</p>
                      <p>DEF: {team.players.filter(p => p.position === 'DEF').length}</p>
                      <p>MID: {team.players.filter(p => p.position === 'MID').length}</p>
                      <p>FWD: {team.players.filter(p => p.position === 'FWD').length}</p>
                    </div>
                    <div className="mt-3 text-xs">
                      {isLegendary ? (
                        <span className="inline-block px-2 py-1 bg-purple-200 text-purple-800 rounded font-semibold">
                          Legendary Team
                        </span>
                      ) : team.players.some(p => p.isHistorical) && (
                        <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          Includes Legends
                        </span>
                      )}
                    </div>
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
