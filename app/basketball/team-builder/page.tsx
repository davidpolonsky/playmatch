'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';
import { signOut } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { BasketballPlayer, BasketballPosition, BASKETBALL_LINEUPS, BASKETBALL_POSITION_ORDER, BASKETBALL_ROSTER_REQUIREMENTS } from '@/lib/types-basketball';
import { saveBasketballTeam } from '@/lib/firebase/firestore-basketball';

// Camera-based card uploader wired to basketball API
function BasketballCardUploader({ onPlayerAdded, onError, onSuccess }: {
  onPlayerAdded: (p: BasketballPlayer) => void;
  onError?: (msg: string) => void;
  onSuccess?: (msg: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!stream || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = stream;
    setVideoReady(false);
    const onReady = () => { setVideoReady(true); video.play().catch(() => {}); };
    video.addEventListener('loadeddata', onReady);
    if (video.readyState >= 2) onReady();
    return () => video.removeEventListener('loadeddata', onReady);
  }, [stream, cameraActive]);

  const startCamera = async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: { ideal: 'environment' } },
      });
      setStream(ms);
      setCameraActive(true);
    } catch {
      onError?.('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setVideoReady(false);
    setCameraActive(false);
  };

  const captureAndAnalyze = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0) { onError?.('Camera not ready yet.'); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) { onError?.('Could not capture photo.'); return; }
      stopCamera();
      setUploading(true);
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((res, rej) => {
          reader.onload = () => res((reader.result as string).split(',')[1]);
          reader.onerror = rej;
          reader.readAsDataURL(new File([blob], 'capture.jpg', { type: 'image/jpeg' }));
        });
        const resp = await fetch('/api/analyze-basketball-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 }),
        });
        const result = await resp.json();
        if (result.error) { onError?.(result.error); return; }
        if (!result.name || !result.position || typeof result.rating !== 'number') {
          onError?.('Card analyzed but missing data. Try a clearer photo.'); return;
        }
        const player: BasketballPlayer = { ...result, id: crypto.randomUUID(), imageUrl: '' };
        onPlayerAdded(player);
        onSuccess?.(`🏀 ${result.name} added! (${result.position} · ${result.rating})`);
      } catch {
        onError?.('Failed to analyze card. Check your connection and try again.');
      } finally {
        setUploading(false);
      }
    }, 'image/jpeg', 0.9);
  };

  if (uploading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-bball-orange mb-3" />
        <p className="font-retro text-[9px] text-bball-orange/70 animate-pulse">Analyzing card…</p>
      </div>
    );
  }

  if (!cameraActive) {
    return (
      <div className="text-center py-6">
        <div className="mb-4 inline-block">
          <Image src="/camera.png" alt="Camera" width={80} height={80} className="mx-auto" style={{ imageRendering: 'pixelated' }} unoptimized />
        </div>
        <p className="font-headline text-[11px] text-white/70 mb-1">Scan a basketball card</p>
        <p className="font-headline text-[10px] text-white/30 mb-5">Point camera at an NBA or basketball card</p>
        <button onClick={startCamera}
          className="w-full py-3 rounded-lg font-retro text-[9px] transition-all flex items-center justify-center gap-2"
          style={{ background: '#f97316', color: '#0f0a00' }}>
          <Image src="/camera.png" alt="" width={16} height={16} style={{ imageRendering: 'pixelated' }} unoptimized />
          Open Camera
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden border border-bball-border bg-bball-dark" style={{ minHeight: 260 }}>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto max-h-80 object-cover" style={{ minHeight: 260 }} />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-56 h-36 border-2 rounded-lg" style={{ borderColor: 'rgba(249,115,22,0.6)', boxShadow: '0 0 12px rgba(249,115,22,0.3)' }} />
        </div>
        {!videoReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-bball-dark/80">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bball-orange mx-auto mb-2" />
              <p className="font-retro text-[8px] text-bball-orange/60">Starting camera…</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={captureAndAnalyze} disabled={!videoReady}
          className="flex-1 py-3 rounded-lg font-retro text-[9px] disabled:opacity-30 transition-all"
          style={{ background: '#f97316', color: '#0f0a00' }}>
          📸 Capture
        </button>
        <button onClick={stopCamera}
          className="px-4 py-3 rounded-lg font-retro text-[9px] border border-bball-border text-white/60 hover:text-white transition-colors">
          Cancel
        </button>
      </div>
      <p className="font-headline text-[10px] text-white/30 text-center">Align card inside the frame, then tap Capture</p>
    </div>
  );
}

const POS_COLORS: Record<BasketballPosition, string> = {
  PG: '#f97316', SG: '#fbbf24', SF: '#fb923c', PF: '#f59e0b', C: '#ef4444',
};

export default function BasketballTeamBuilder() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<BasketballPlayer[]>([]);
  const [selectedLineup, setSelectedLineup] = useState('Standard');
  const [teamName, setTeamName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');

  useEffect(() => { if (!loading && !user) router.push('/basketball'); }, [user, loading, router]);

  const getStarting5 = (): BasketballPlayer[] => {
    const seen = new Set<string>();
    const result: BasketballPlayer[] = [];
    for (const pos of BASKETBALL_POSITION_ORDER) {
      const p = players.find(pl => pl.position === pos && !seen.has(pl.id));
      if (p) { result.push(p); seen.add(p.id); }
    }
    return result;
  };

  const handleSave = async () => {
    if (!teamName.trim()) { setMessage('Enter a team name.'); setMessageType('error'); return; }
    const starting5 = getStarting5();
    if (starting5.length < 5) { setMessage(`Need all 5 positions — missing ${5 - starting5.length}.`); setMessageType('error'); return; }
    setSaving(true);
    try {
      await saveBasketballTeam({ name: teamName, userId: user!.uid, lineup: selectedLineup, players: starting5 });
      setMessage('Team saved!');
      setMessageType('success');
      setTimeout(() => router.push('/basketball/teams'), 1500);
    } catch {
      setMessage('Error saving team. Try again.');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
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

  const grouped: Record<string, number> = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 };
  players.forEach(p => { if (grouped[p.position] !== undefined) grouped[p.position]++; });
  const starting5 = getStarting5();

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f0a00 0%, #1c1200 60%, #0f0a00 100%)' }}>
      {/* Nav */}
      <nav style={{ background: '#0f0a00', borderBottom: '1px solid #3d2c00' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-4 flex-wrap">
          <h1 className="font-retro text-[11px] tracking-wider" style={{ color: '#f97316' }}>🏀 PlayMatch</h1>
          <div className="flex gap-2 items-center flex-wrap">
            <button onClick={() => router.push('/basketball/teams')}
              className="font-retro text-[9px] py-1.5 px-3 rounded-lg border transition-colors"
              style={{ borderColor: '#3d2c00', color: 'rgba(255,255,255,0.6)' }}>
              ← My Teams
            </button>
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
        <h2 className="font-retro text-[13px] mb-6 tracking-wider" style={{ color: '#f97316' }}>🏗 Team Builder</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: scanner + players */}
          <div className="lg:col-span-1 space-y-4">
            {/* Scanner */}
            <div className="rounded-xl border p-5" style={{ background: '#1c1200', borderColor: '#3d2c00' }}>
              <h3 className="font-retro text-[10px] mb-4 tracking-wider flex items-center gap-2" style={{ color: '#f97316' }}>
                <Image src="/camera.png" alt="" width={14} height={14} style={{ imageRendering: 'pixelated' }} unoptimized />
                Scan Cards
              </h3>
              <BasketballCardUploader
                onPlayerAdded={p => setPlayers(prev => [...prev, p])}
                onError={msg => { setMessage(msg); setMessageType('error'); }}
                onSuccess={msg => { setMessage(msg); setMessageType('success'); }}
              />
              {message && (
                <p className={`mt-3 font-headline text-[10px] text-center ${messageType === 'success' ? 'text-bball-orange' : 'text-red-400'}`}>{message}</p>
              )}
            </div>

            {/* Scanned players */}
            <div className="rounded-xl border p-5" style={{ background: '#1c1200', borderColor: '#3d2c00' }}>
              <h3 className="font-retro text-[10px] mb-4 tracking-wider" style={{ color: '#f97316' }}>
                Scanned Players ({players.length})
              </h3>

              {/* Position breakdown */}
              {players.length > 0 && (
                <div className="grid grid-cols-5 gap-1 mb-4">
                  {BASKETBALL_POSITION_ORDER.map(pos => (
                    <div key={pos} className="rounded-lg p-2 text-center" style={{ background: '#0f0a00', border: '1px solid #3d2c00' }}>
                      <div className="font-retro text-[7px] mb-0.5" style={{ color: POS_COLORS[pos] }}>{pos}</div>
                      <div className="font-headline text-[12px] text-white">
                        {grouped[pos]}<span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>/{BASKETBALL_ROSTER_REQUIREMENTS[pos]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {players.length === 0 ? (
                <p className="font-retro text-[8px] text-center py-4" style={{ color: 'rgba(255,255,255,0.3)' }}>No players yet — scan cards to start</p>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {players.map(p => (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors"
                      style={{ background: '#0f0a00', borderColor: '#3d2c00' }}>
                      <span className="font-retro text-[7px] w-6 flex-shrink-0" style={{ color: POS_COLORS[p.position] }}>{p.position}</span>
                      <span className="font-headline text-[11px] text-white flex-1 truncate">{p.name}</span>
                      <span className="font-headline text-[10px] font-bold"
                        style={{ color: p.rating >= 90 ? '#fbbf24' : p.rating >= 80 ? '#f97316' : 'rgba(255,255,255,0.5)' }}>
                        {p.rating}
                      </span>
                      <button onClick={() => setPlayers(prev => prev.filter(x => x.id !== p.id))}
                        className="text-white/20 hover:text-red-400 p-0.5 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: lineup + save */}
          <div className="lg:col-span-2 space-y-4">
            {/* Starting 5 */}
            <div className="rounded-xl border p-5" style={{ background: '#1c1200', borderColor: '#3d2c00' }}>
              <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
                <h3 className="font-retro text-[10px] tracking-wider" style={{ color: '#f97316' }}>
                  Starting 5
                  <span className="ml-2" style={{ color: starting5.length === 5 ? '#f97316' : 'rgba(255,255,255,0.3)' }}>
                    ({starting5.length}/5)
                  </span>
                </h3>
                <select value={selectedLineup}
                  onChange={e => setSelectedLineup(e.target.value)}
                  className="px-3 py-1.5 rounded-lg font-headline text-[11px] focus:outline-none focus:ring-1"
                  style={{ background: '#0f0a00', border: '1px solid #3d2c00', color: '#f1efe3', outlineColor: '#f97316' }}>
                  {Object.keys(BASKETBALL_LINEUPS).map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <p className="font-headline text-[9px] mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {BASKETBALL_LINEUPS[selectedLineup]?.description}
              </p>

              {/* Position slots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BASKETBALL_POSITION_ORDER.map(pos => {
                  const player = starting5.find(p => p.position === pos);
                  return (
                    <div key={pos} className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                      style={{
                        background: player ? '#0f0a00' : 'rgba(15,10,0,0.4)',
                        borderColor: player ? POS_COLORS[pos] + '60' : '#3d2c00',
                      }}>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center font-retro text-[8px] flex-shrink-0"
                        style={{ background: player ? POS_COLORS[pos] + '20' : '#1c1200', color: POS_COLORS[pos], border: `1px solid ${POS_COLORS[pos]}40` }}>
                        {pos}
                      </div>
                      {player ? (
                        <div className="flex-1 min-w-0">
                          <div className="font-headline text-[12px] text-white truncate">{player.name}</div>
                          <div className="font-headline text-[10px] font-bold" style={{ color: player.rating >= 90 ? '#fbbf24' : player.rating >= 80 ? '#f97316' : 'rgba(255,255,255,0.5)' }}>
                            {player.rating}
                          </div>
                        </div>
                      ) : (
                        <span className="font-headline text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          No {pos} scanned yet
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save */}
            <div className="rounded-xl border p-5" style={{ background: '#1c1200', borderColor: '#3d2c00' }}>
              <h3 className="font-retro text-[10px] mb-4 tracking-wider" style={{ color: '#f97316' }}>💾 Save Team</h3>
              <div className="space-y-3">
                <input type="text" placeholder="Enter team name…" value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  className="w-full px-4 py-2.5 rounded-lg text-white font-headline text-sm focus:outline-none focus:ring-1"
                  style={{ background: '#0f0a00', border: '1px solid #3d2c00', outlineColor: '#f97316' }} />
                <button onClick={handleSave} disabled={saving || starting5.length < 5}
                  className="w-full py-3 rounded-lg font-retro text-[9px] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: '#f97316', color: '#0f0a00', boxShadow: '0 0 12px rgba(249,115,22,0.3)' }}>
                  {saving ? 'Saving…' : starting5.length < 5 ? `Need ${5 - starting5.length} more positions` : '✅ Save Team'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
