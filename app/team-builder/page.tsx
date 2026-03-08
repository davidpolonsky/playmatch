'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Player, Formation, FORMATIONS } from '@/lib/types';
import { saveTeam, getUserTeams } from '@/lib/firestore';
import CardUploader from '@/components/CardUploader';
import TeamDisplay from '@/components/TeamDisplay';
import PlayerList from '@/components/PlayerList';

export default function TeamBuilder() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedFormation, setSelectedFormation] = useState<Formation>(Object.values(FORMATIONS)[0]);
    const [teamName, setTeamName] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

  useEffect(() => {
        if (!loading && !user) {
                router.push('/');
        }
  }, [user, loading, router]);

  const handleCardAnalyzed = (player: Player) => {
        setPlayers((prev) => [...prev, player]);
  };

  const handleRemovePlayer = (playerId: string) => {
        setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  };

  const getStarting11 = (): Player[] => {
        const starting11: Player[] = [];
        const positions: { [key: string]: Player[] } = {
                GK: [],
                DEF: [],
                MID: [],
                FWD: [],
        };

        players.forEach((player) => {
                positions[player.position].push(player);
        });

        Object.keys(positions).forEach((pos) => {
                positions[pos].sort((a, b) => b.rating - a.rating);
        });

        const formationPositions = selectedFormation.positions;
        starting11.push(...positions.GK.slice(0, formationPositions.GK));
        starting11.push(...positions.DEF.slice(0, formationPositions.DEF));
        starting11.push(...positions.MID.slice(0, formationPositions.MID));
        starting11.push(...positions.FWD.slice(0, formationPositions.FWD));

        return starting11;
  };

  const handleSaveTeam = async () => {
        if (!teamName.trim()) {
                setMessage('Please enter a team name');
                return;
        }

        const starting11 = getStarting11();
        if (starting11.length < 11) {
                setMessage(`You need 11 players. You have ${starting11.length}.`);
                return;
        }

        setSaving(true);
        try {
                await saveTeam({
                          name: teamName,
                          userId: user!.uid,
                          formation: selectedFormation.name,
                          players: starting11,
                });
                setMessage('Team saved successfully!');
                setTimeout(() => {
                          router.push('/teams');
                }, 1500);
        } catch (error) {
                setMessage('Error saving team. Please try again.');
        } finally {
                setSaving(false);
        }
  };

  if (loading) {
        return (
                <div className="min-h-screen flex items-center justify-center">
                        <div className="text-center">
                                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>div>
                                  <p className="mt-4 text-gray-600">Loading...</p>p>
                        </div>div>
                </div>div>
              );
  }
  
    const starting11 = getStarting11();
  
    return (
          <div className="min-h-screen bg-gray-50">
                <nav className="bg-white shadow-sm">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                                  <h1 className="text-2xl font-bold text-gray-900">Team Builder</h1>h1>
                                  <div className="flex gap-4 items-center">
                                              <button
                                                              onClick={() => router.push('/teams')}
                                                              className="px-4 py-2 text-gray-700 hover:text-gray-900"
                                                            >
                                                            My Teams
                                              </button>button>
                                              <span className="text-gray-600">{user?.displayName}</span>span>
                                              <button
                                                              onClick={signOut}
                                                              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                                                            >
                                                            Sign Out
                                              </button>button>
                                  </div>div>
                        </div>div>
                </nav>nav>
          
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          {/* Left Column */}
                                  <div className="lg:col-span-1 space-y-6">
                                              <div className="bg-white rounded-lg shadow p-6">
                                                            <h2 className="text-xl font-semibold mb-4">Upload Cards</h2>h2>
                                                            <CardUploader onPlayerAdded={handleCardAnalyzed} userId={user!.uid} />
                                              </div>div>
                                              <div className="bg-white rounded-lg shadow p-6">
                                                            <h2 className="text-xl font-semibold mb-4">
                                                                            All Players ({players.length})
                                                            </h2>h2>
                                                            <PlayerList players={players} onRemove={handleRemovePlayer} />
                                              </div>div>
                                  </div>div>
                        
                          {/* Right Column */}
                                  <div className="lg:col-span-2 space-y-6">
                                              <div className="bg-white rounded-lg shadow p-6">
                                                            <div className="flex justify-between items-center mb-4">
                                                                            <h2 className="text-xl font-semibold">
                                                                                              Starting 11 ({starting11.length}/11)
                                                                            </h2>h2>
                                                                            <select
                                                                                                value={selectedFormation.name}
                                                                                                onChange={(e) => {
                                                                                                                      const formation = Object.values(FORMATIONS).find((f) => f.name === e.target.value);
                                                                                                                      if (formation) setSelectedFormation(formation);
                                                                                                  }}
                                                                                                className="px-4 py-2 border border-gray-300 rounded-lg"
                                                                                              >
                                                                              {Object.values(FORMATIONS).map((formation) => (
                                                                                                                    <option key={formation.name} value={formation.name}>
                                                                                                                      {formation.name}
                                                                                                                      </option>option>
                                                                                                                  ))}
                                                                            </select>select>
                                                            </div>div>
                                                            <TeamDisplay players={starting11} formation={selectedFormation} />
                                              </div>div>
                                  
                                              <div className="bg-white rounded-lg shadow p-6">
                                                            <h2 className="text-xl font-semibold mb-4">Save Team</h2>h2>
                                                            <div className="space-y-4">
                                                                            <input
                                                                                                type="text"
                                                                                                placeholder="Enter team name..."
                                                                                                value={teamName}
                                                                                                onChange={(e) => setTeamName(e.target.value)}
                                                                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                                              />
                                                                            <button
                                                                                                onClick={handleSaveTeam}
                                                                                                disabled={saving || starting11.length < 11}
                                                                                                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
                                                                                              >
                                                                              {saving ? 'Saving...' : 'Save Team'}
                                                                            </button>button>
                                                              {message && (
                              <p className={`text-center ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                                {message}
                              </p>p>
                                                                            )}
                                                            </div>div>
                                              </div>div>
                                  </div>div>
                        </div>div>
                </main>main>
          </div>div>
        );
}</div>
