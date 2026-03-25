'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';
import { signOut } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { Player, Formation, FORMATIONS } from '@/lib/types';
import { saveTeam, getUserRoster, saveUserRoster } from '@/lib/firebase/firestore';
import CardUploader from '@/components/CardUploader';
import InteractiveTeamDisplay from '@/components/InteractiveTeamDisplay';
import InteractivePlayerList from '@/components/InteractivePlayerList';
import Footer from '@/components/Footer';
import Navigation from '@/components/Navigation';
import { migrateRosterAppearance } from '@/lib/migrate-players';

const POSITION_ORDER = { GK: 0, DEF: 1, MID: 2, FWD: 3 } as const;

export default function TeamBuilder() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]); // All scanned players
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]); // Manually selected for starting 11
  const [selectedFormation, setSelectedFormation] = useState<Formation>(Object.values(FORMATIONS)[0]);
  const [teamName, setTeamName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  // Load user's roster from Firebase
  useEffect(() => {
    const loadRoster = async () => {
      if (!user) return;
      try {
        const roster = await getUserRoster(user.uid);
        // Ensure IDs and appearance data
        let rosterWithIds = roster.map(player =>
          player.id ? player : { ...player, id: crypto.randomUUID() }
        );
        const rosterWithAppearance = migrateRosterAppearance(rosterWithIds);
        setPlayers(rosterWithAppearance);

        // Save if migrations were applied
        const hadIdsMissing = roster.some(p => !p.id);
        const hadAppearanceMissing = rosterWithAppearance.some(p => !p.skinTone);
        if (hadIdsMissing || hadAppearanceMissing) {
          await saveUserRoster(user.uid, rosterWithAppearance);
        }
      } catch (error) {
        console.error('Error loading roster:', error);
      }
    };
    if (user) loadRoster();
  }, [user]);

  const handleCardAnalyzed = async (player: Player) => {
    // Generate unique ID for the player
    const playerWithId = { ...player, id: crypto.randomUUID() };
    const newPlayers = [...players, playerWithId];
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

  const handleRemovePlayerFromRoster = (playerId: string) => {
    setPlayers(prev => prev.filter(p => p.id !== playerId));
    setSelectedPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  const handleAddToTeam = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    // Check if we can add more of this position
    const currentCount = selectedPlayers.filter(p => p.position === player.position).length;
    const maxCount = selectedFormation.positions[player.position];

    if (currentCount < maxCount) {
      setSelectedPlayers(prev => [...prev, player]);
    }
  };

  const handleRemoveFromTeam = (playerId: string) => {
    setSelectedPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  const handleSaveTeam = async () => {
    if (!teamName.trim()) {
      setMessage('Enter a team name first.');
      setMessageType('error');
      return;
    }
    if (selectedPlayers.length < 11) {
      setMessage(`Need 11 players — you have ${selectedPlayers.length}.`);
      setMessageType('error');
      return;
    }
    setSaving(true);
    try {
      await saveTeam({
        name: teamName,
        userId: user!.uid,
        formation: selectedFormation.name,
        players: selectedPlayers
      });
      setMessage('Team saved!');
      setMessageType('success');
      setTimeout(() => router.push('/teams'), 1500);
    } catch {
      setMessage('Error saving team. Please try again.');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fifa-mint mx-auto" />
          <p className="mt-4 font-retro text-[9px] text-fifa-mint/50">Loading…</p>
        </div>
      </div>
    );
  }

  const grouped: Record<string, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  players.forEach(p => { if (grouped[p.position] !== undefined) grouped[p.position]++; });
  const fp = selectedFormation.positions;

  return (
    <div className="min-h-screen">
      <Navigation user={user} currentPage="team-builder" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="font-retro text-[13px] text-fifa-mint mb-6 tracking-wider">🏗 Team Builder</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column: scanner + player list */}
          <div className="lg:col-span-1 space-y-4">

            {/* Scan Cards */}
            <div className="bg-fifa-mid rounded-xl border border-fifa-border shadow-retro p-5">
              <h3 className="font-retro text-[10px] text-fifa-mint mb-4 tracking-wider flex items-center gap-2">
                <Image src="/camera.png" alt="" width={16} height={16} style={{ imageRendering: 'pixelated' }} unoptimized />
                Scan Player Cards
              </h3>
              <CardUploader
                onPlayerAdded={handleCardAnalyzed}
                onError={msg => { setMessage(msg); setMessageType('error'); }}
                onSuccess={msg => { setMessage(msg); setMessageType('success'); }}
                userId={user!.uid}
              />
              {message && (
                <p className={`mt-3 font-headline text-[10px] text-center ${messageType === 'success' ? 'text-fifa-mint' : 'text-red-400'}`}>
                  {message}
                </p>
              )}
            </div>

            {/* Uploaded Players */}
            <div className="bg-fifa-mid rounded-xl border border-fifa-border shadow-retro p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-retro text-[10px] text-fifa-mint tracking-wider">Uploaded Players ({players.length})</h3>
              </div>

              {/* Position breakdown */}
              {players.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5 mb-4">
                  {(['GK', 'DEF', 'MID', 'FWD'] as const).map(pos => (
                    <div key={pos} className="bg-fifa-dark border border-fifa-border rounded-lg p-2 text-center">
                      <div className="font-retro text-[8px] text-fifa-mint/70">{pos}</div>
                      <div className="font-headline text-[13px] text-white mt-0.5">
                        {grouped[pos]}
                        <span className="text-white/30 text-[10px]">/{fp[pos]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <InteractivePlayerList
                allPlayers={players}
                teamPlayers={selectedPlayers}
                onAdd={handleAddToTeam}
                onRemove={handleRemovePlayerFromRoster}
              />
            </div>
          </div>

          {/* Right column: pitch + save */}
          <div className="lg:col-span-2 space-y-4">

            {/* Starting 11 + formation picker */}
            <div className="bg-fifa-mid rounded-xl border border-fifa-border shadow-retro p-5">
              <div className="mb-4">
                <div className="flex justify-between items-center gap-3 flex-wrap mb-2">
                  <h3 className="font-retro text-[10px] text-fifa-mint tracking-wider">
                    Starting 11
                    <span className={`ml-2 ${selectedPlayers.length === 11 ? 'text-fifa-mint' : 'text-white/30'}`}>
                      ({selectedPlayers.length}/11)
                    </span>
                  </h3>
                <select
                  value={selectedFormation.name}
                  onChange={e => {
                    const f = Object.values(FORMATIONS).find(x => x.name === e.target.value);
                    if (f) setSelectedFormation(f);
                  }}
                  className="px-3 py-1.5 bg-fifa-dark border border-fifa-border rounded-lg text-fifa-cream font-headline text-[11px] focus:ring-1 focus:ring-fifa-mint focus:outline-none"
                >
                  {Object.values(FORMATIONS).map(f => (
                    <option key={f.name} value={f.name}>{f.name}</option>
                  ))}
                </select>
                </div>
                <p className="font-headline text-[9px] text-white/40 mb-4">
                  ℹ️ Click + on roster or empty slots. Drag & drop players. Click X to remove.
                </p>
              </div>
              <InteractiveTeamDisplay
                players={selectedPlayers}
                allPlayers={players}
                formation={selectedFormation}
                onRemoveFromTeam={handleRemoveFromTeam}
                onAddToTeam={handleAddToTeam}
              />
            </div>

            {/* Save Team */}
            <div className="bg-fifa-mid rounded-xl border border-fifa-border shadow-retro p-5">
              <h3 className="font-retro text-[10px] text-fifa-mint mb-4 tracking-wider">💾 Save Team</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter team name…"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveTeam()}
                  className="w-full px-4 py-2.5 bg-fifa-dark border border-fifa-border rounded-lg text-white font-headline text-sm placeholder:text-white/25 focus:ring-1 focus:ring-fifa-mint focus:outline-none"
                />
                <button
                  onClick={handleSaveTeam}
                  disabled={saving || selectedPlayers.length < 11}
                  className="w-full btn-primary py-3 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : selectedPlayers.length < 11 ? `Need ${11 - selectedPlayers.length} more players` : '✅ Save Team'}
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
