'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { BasketballPlayer, BasketballPosition, BASKETBALL_LINEUPS, BASKETBALL_POSITION_ORDER, BASKETBALL_ROSTER_REQUIREMENTS } from '@/lib/types-basketball';
import { saveBasketballTeam, saveBasketballRoster, getBasketballRoster } from '@/lib/firebase/firestore-basketball';
import PixelAvatar from '@/components/PixelAvatar';

// Camera-based card uploader wired to basketball API
function BasketballCardUploader({ onPlayerAdded, onError, onSuccess }: {
  onPlayerAdded: (p: BasketballPlayer) => boolean | void;
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
        const accepted = onPlayerAdded(player);
        if (accepted !== false) {
          onSuccess?.(`🏀 ${result.name} added! (${result.position} · ${result.rating})`);
        }
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
        <div className="mb-4">
          <img src="/camera.png" className="w-16 h-16 mx-auto" alt="Camera" />
        </div>
        <p className="font-headline text-[11px] text-white/70 mb-1">Scan a basketball card</p>
        <p className="font-headline text-[10px] text-white/30 mb-5">Point camera at an NBA or basketball card</p>
        <button onClick={startCamera}
          className="w-full py-3 rounded-lg font-retro text-[9px] transition-all"
          style={{ background: '#f97316', color: '#0f0a00' }}>
          <img src="/camera.png" className="w-4 h-4 inline-block mr-1" alt="" /> Open Camera
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
          <img src="/camera.png" className="w-4 h-4 inline-block mr-1" alt="" /> Capture
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

// Auto-fill 5 slots: best rated player per position first, then best remaining bench
export function autoFillSlots(ps: BasketballPlayer[]): (BasketballPlayer | null)[] {
  const usedIds = new Set<string>();
  const newSlots: (BasketballPlayer | null)[] = Array(5).fill(null);
  for (let i = 0; i < BASKETBALL_POSITION_ORDER.length; i++) {
    const pos = BASKETBALL_POSITION_ORDER[i];
    const candidates = ps.filter(pl => pl.position === pos && !usedIds.has(pl.id));
    if (candidates.length > 0) {
      const top = [...candidates].sort((a, b) => b.rating - a.rating)[0];
      newSlots[i] = top;
      usedIds.add(top.id);
    }
  }
  const remaining = [...ps].filter(p => !usedIds.has(p.id)).sort((a, b) => b.rating - a.rating);
  for (let i = 0; i < newSlots.length; i++) {
    if (!newSlots[i] && remaining.length > 0) newSlots[i] = remaining.shift()!;
  }
  return newSlots;
}

type DragSource =
  | { from: 'slot'; slotIdx: number }
  | { from: 'bench'; playerId: string };

interface Props {
  onSaved?: () => void;
}

export default function BasketballTeamBuilderContent({ onSaved }: Props) {
  const { user } = useAuth();

  const [players, setPlayers] = useState<BasketballPlayer[]>([]);
  const [slots, setSlots] = useState<(BasketballPlayer | null)[]>(Array(5).fill(null));
  const [rosterLoaded, setRosterLoaded] = useState(false);
  const [selectedLineup, setSelectedLineup] = useState('Standard');
  const [teamName, setTeamName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const dragSourceRef = useRef<DragSource | null>(null);

  // Load saved draft roster on mount + auto-fill slots
  useEffect(() => {
    if (!user) return;
    getBasketballRoster(user.uid).then(saved => {
      if (saved.length > 0) {
        setPlayers(saved);
        setSlots(autoFillSlots(saved));
      }
      setRosterLoaded(true);
    }).catch(() => setRosterLoaded(true));
  }, [user]);

  // Persist draft roster whenever it changes (after initial load)
  useEffect(() => {
    if (!user || !rosterLoaded) return;
    saveBasketballRoster(user.uid, players).catch(() => {});
  }, [players, user, rosterLoaded]);

  // --- Slot management ---

  const removeFromSlot = (idx: number) => {
    setSlots(prev => { const n = [...prev]; n[idx] = null; return n; });
  };

  const addBenchPlayerToSlot = (p: BasketballPlayer) => {
    setSlots(prev => {
      const n = [...prev];
      if (n.some(s => s?.id === p.id)) return prev; // already slotted
      // Prefer the matching position slot
      const posIdx = BASKETBALL_POSITION_ORDER.indexOf(p.position as BasketballPosition);
      if (posIdx >= 0 && !n[posIdx]) { n[posIdx] = p; return n; }
      // Otherwise first empty slot
      const emptyIdx = n.findIndex(s => s === null);
      if (emptyIdx >= 0) { n[emptyIdx] = p; }
      return n;
    });
  };

  const removeFromRoster = (id: string) => {
    setPlayers(prev => prev.filter(x => x.id !== id));
    setSlots(prev => prev.map(s => s?.id === id ? null : s));
  };

  const handleDrop = (targetSlotIdx: number) => {
    const src = dragSourceRef.current;
    if (!src) return;
    setSlots(prev => {
      const n = [...prev];
      if (src.from === 'bench') {
        const p = players.find(x => x.id === src.playerId);
        if (!p) return prev;
        // Remove from any existing slot
        const existingIdx = n.findIndex(s => s?.id === p.id);
        if (existingIdx >= 0) n[existingIdx] = null;
        // Place into target
        n[targetSlotIdx] = p;
      } else {
        // Swap two slots
        const temp = n[targetSlotIdx];
        n[targetSlotIdx] = n[src.slotIdx];
        n[src.slotIdx] = temp;
      }
      return n;
    });
    dragSourceRef.current = null;
    setDragOverSlot(null);
  };

  // --- Player added from scanner (with year-based duplicate detection) ---

  const handlePlayerAdded = (p: BasketballPlayer): boolean | void => {
    const incomingName = (p.name || '').toLowerCase().trim();
    const incomingYear = (p.year || '').trim();
    const matches = players.filter(x => (x.name || '').toLowerCase().trim() === incomingName);
    let baseRoster = players;
    let incoming = p;

    if (matches.length > 0) {
      const sameYear = matches.some(x => (x.year || '').trim() === incomingYear);
      if (sameYear) {
        const label = incomingYear ? `${p.name} '${incomingYear.slice(-2)}` : p.name;
        setMessage(`Already have ${label} — duplicate rejected`);
        setMessageType('error');
        return false;
      }
      // Different years: suffix existing and incoming names
      const suffix = (y: string) => y ? ` '${y.slice(-2)}` : '';
      baseRoster = players.map(x => {
        if ((x.name || '').toLowerCase().trim() === incomingName && !(x.name || '').includes("'")) {
          return { ...x, name: `${x.name}${suffix(x.year || '')}` };
        }
        return x;
      });
      incoming = { ...p, name: `${p.name}${suffix(incomingYear)}` };
      setPlayers(baseRoster);
      // Update slots to reflect renamed players
      setSlots(prev => prev.map(s => {
        if (!s) return s;
        const renamed = baseRoster.find(x => x.id === s.id);
        return renamed ?? s;
      }));
    }

    const newPlayers = [...baseRoster, incoming];
    setPlayers(newPlayers);
    // Auto-slot into first matching empty slot
    setSlots(prev => {
      const n = [...prev];
      if (n.some(s => s?.id === incoming.id)) return n;
      const posIdx = BASKETBALL_POSITION_ORDER.indexOf(incoming.position as BasketballPosition);
      if (posIdx >= 0 && !n[posIdx]) { n[posIdx] = incoming; return n; }
      const emptyIdx = n.findIndex(s => s === null);
      if (emptyIdx >= 0) n[emptyIdx] = incoming;
      return n;
    });
  };

  // --- Best lineup ---

  const generateBestLineup = () => {
    const newSlots = autoFillSlots(players);
    setSlots(newSlots);
    const lineup = newSlots.filter(Boolean) as BasketballPlayer[];
    const avg = lineup.length > 0 ? Math.round(lineup.reduce((s, p) => s + p.rating, 0) / lineup.length) : 0;
    const outOfPos = newSlots.filter((p, idx) => p && p.position !== BASKETBALL_POSITION_ORDER[idx]).length;
    if (lineup.length === 5 && outOfPos === 0) {
      setMessage(`⚡ Best lineup generated! Avg rating: ${avg}`);
    } else if (lineup.length === 5) {
      setMessage(`⚡ Lineup generated! Avg: ${avg} — ${outOfPos} player${outOfPos > 1 ? 's' : ''} playing out of position`);
    } else {
      setMessage(`Partial lineup: ${lineup.length}/5 — scan more cards!`);
    }
    setMessageType(lineup.length === 5 ? 'success' : 'error');
  };

  // --- Save ---

  const handleSave = async () => {
    if (!teamName.trim()) { setMessage('Enter a team name.'); setMessageType('error'); return; }
    const starting5 = slots.filter(Boolean) as BasketballPlayer[];
    if (starting5.length < 5) { setMessage('Fill all 5 lineup slots to save.'); setMessageType('error'); return; }
    setSaving(true);
    try {
      await saveBasketballTeam({ name: teamName, userId: user!.uid, lineup: selectedLineup, players: starting5 });
      setMessage('Team saved!');
      setMessageType('success');
      setTimeout(() => onSaved?.(), 1200);
    } catch {
      setMessage('Error saving team. Try again.');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  // --- Derived state ---

  const slottedIds = new Set(slots.filter(Boolean).map(p => p!.id));
  const bench = players.filter(p => !slottedIds.has(p.id));
  const filledSlots = slots.filter(Boolean).length;

  const grouped: Record<string, number> = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 };
  players.forEach(p => { if (grouped[p.position] !== undefined) grouped[p.position]++; });

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: scanner + bench */}
        <div className="lg:col-span-1 space-y-4">

          {/* Scanner */}
          <div className="rounded-xl border p-5" style={{ background: '#1c1200', borderColor: '#3d2c00' }}>
            <h3 className="font-retro text-[10px] mb-4 tracking-wider flex items-center gap-1.5" style={{ color: '#f97316' }}>
              <img src="/camera.png" className="w-3.5 h-3.5" alt="" /> Scan Cards
            </h3>
            <BasketballCardUploader
              onPlayerAdded={handlePlayerAdded}
              onError={msg => { setMessage(msg); setMessageType('error'); }}
              onSuccess={msg => { setMessage(msg); setMessageType('success'); }}
            />
            {message && (
              <p className={`mt-3 font-headline text-[10px] text-center ${messageType === 'success' ? 'text-bball-orange' : 'text-red-400'}`}>{message}</p>
            )}
          </div>

          {/* Bench */}
          <div className="rounded-xl border p-5" style={{ background: '#1c1200', borderColor: '#3d2c00' }}>
            <h3 className="font-retro text-[10px] mb-3 tracking-wider" style={{ color: '#f97316' }}>
              Bench ({bench.length})
              {bench.length > 0 && (
                <span className="ml-2 font-headline text-[8px] normal-case" style={{ color: 'rgba(255,255,255,0.3)' }}>drag or + to slot</span>
              )}
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

            {bench.length === 0 && players.length === 0 ? (
              <p className="font-retro text-[8px] text-center py-4" style={{ color: 'rgba(255,255,255,0.3)' }}>No players yet — scan cards to start</p>
            ) : bench.length === 0 ? (
              <p className="font-retro text-[8px] text-center py-3" style={{ color: 'rgba(255,255,255,0.3)' }}>All players in lineup ✓</p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {bench.map(p => (
                  <div key={p.id}
                    draggable
                    onDragStart={() => { dragSourceRef.current = { from: 'bench', playerId: p.id }; }}
                    onDragEnd={() => { dragSourceRef.current = null; setDragOverSlot(null); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors cursor-grab active:cursor-grabbing"
                    style={{ background: '#0f0a00', borderColor: '#3d2c00' }}>
                    <PixelAvatar
                      skinTone={p.skinTone as any}
                      hairColor={p.hairColor as any}
                      hairStyle={p.hairStyle as any}
                      size={28}
                    />
                    <span className="font-retro text-[7px] w-6 flex-shrink-0" style={{ color: POS_COLORS[p.position] }}>{p.position}</span>
                    <span className="font-headline text-[11px] text-white flex-1 truncate">{p.name}</span>
                    {p.rarity === 'legendary' && (
                      <span className="font-retro text-[6px] px-1 py-0.5 rounded border flex-shrink-0"
                        style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.4)' }}>
                        ✦
                      </span>
                    )}
                    {p.rarity === 'rare' && (
                      <span className="font-retro text-[6px] px-1 py-0.5 rounded border flex-shrink-0"
                        style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderColor: 'rgba(139,92,246,0.4)' }}>
                        ◆
                      </span>
                    )}
                    <span className="font-headline text-[10px] font-bold"
                      style={{ color: p.rating >= 90 ? '#fbbf24' : p.rating >= 80 ? '#f97316' : 'rgba(255,255,255,0.5)' }}>
                      {p.rating}
                    </span>
                    <button
                      onClick={() => addBenchPlayerToSlot(p)}
                      title="Add to lineup"
                      className="w-5 h-5 flex items-center justify-center rounded transition-colors font-bold text-sm leading-none flex-shrink-0"
                      style={{ color: '#f97316', opacity: 0.7 }}>
                      +
                    </button>
                    <button
                      onClick={() => removeFromRoster(p.id)}
                      title="Remove from roster"
                      className="text-white/20 hover:text-red-400 p-0.5 transition-colors flex-shrink-0">
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
                <span className="ml-2" style={{ color: filledSlots === 5 ? '#f97316' : 'rgba(255,255,255,0.3)' }}>
                  ({filledSlots}/5)
                </span>
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={generateBestLineup}
                  disabled={players.length === 0}
                  className="font-retro text-[8px] py-1.5 px-3 rounded-lg transition-all disabled:opacity-30"
                  style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.4)', color: '#f97316' }}>
                  ⚡ Best Lineup
                </button>
                <select value={selectedLineup}
                  onChange={e => setSelectedLineup(e.target.value)}
                  className="px-3 py-1.5 rounded-lg font-headline text-[11px] focus:outline-none focus:ring-1"
                  style={{ background: '#0f0a00', border: '1px solid #3d2c00', color: '#f1efe3', outlineColor: '#f97316' }}>
                  {Object.keys(BASKETBALL_LINEUPS).map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="font-headline text-[9px] mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {BASKETBALL_LINEUPS[selectedLineup]?.description}
            </p>

            {/* Position slots — drag targets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BASKETBALL_POSITION_ORDER.map((pos, idx) => {
                const player = slots[idx] ?? null;
                const isOutOfPos = player && player.position !== pos;
                const isDragTarget = dragOverSlot === idx;
                return (
                  <div key={pos}
                    draggable={!!player}
                    onDragStart={() => { if (player) dragSourceRef.current = { from: 'slot', slotIdx: idx }; }}
                    onDragEnd={() => { dragSourceRef.current = null; setDragOverSlot(null); }}
                    onDragOver={e => { e.preventDefault(); setDragOverSlot(idx); }}
                    onDragLeave={e => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverSlot(null);
                    }}
                    onDrop={e => { e.preventDefault(); handleDrop(idx); }}
                    className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                    style={{
                      background: isDragTarget ? 'rgba(249,115,22,0.1)' : player ? '#0f0a00' : 'rgba(15,10,0,0.4)',
                      borderColor: isDragTarget
                        ? 'rgba(249,115,22,0.7)'
                        : isOutOfPos
                        ? 'rgba(251,191,36,0.5)'
                        : player
                        ? POS_COLORS[pos] + '60'
                        : '#3d2c00',
                      cursor: player ? 'grab' : 'default',
                      minHeight: 68,
                    }}>
                    {/* Avatar or position badge */}
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{
                        background: player ? POS_COLORS[pos] + '20' : '#1c1200',
                        border: `1px solid ${POS_COLORS[pos]}40`,
                      }}>
                      {player
                        ? <PixelAvatar
                            skinTone={player.skinTone as any}
                            hairColor={player.hairColor as any}
                            hairStyle={player.hairStyle as any}
                            size={48}
                          />
                        : <span className="font-retro text-[8px]" style={{ color: POS_COLORS[pos] }}>{pos}</span>
                      }
                    </div>

                    {player ? (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span className="font-retro text-[7px]" style={{ color: POS_COLORS[pos] }}>{pos}</span>
                            {isOutOfPos && (
                              <span className="font-retro text-[7px] px-1 rounded" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                                {player.position} oop
                              </span>
                            )}
                          </div>
                          <div className="font-headline text-[12px] text-white truncate">{player.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="font-headline text-[10px] font-bold"
                              style={{ color: player.rating >= 90 ? '#fbbf24' : player.rating >= 80 ? '#f97316' : 'rgba(255,255,255,0.5)' }}>
                              {player.rating}
                            </span>
                            {player.rarity === 'legendary' && (
                              <span className="font-retro text-[6px] px-1 py-0.5 rounded border"
                                style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.4)' }}>
                                ✦ LGND
                              </span>
                            )}
                            {player.rarity === 'rare' && (
                              <span className="font-retro text-[6px] px-1 py-0.5 rounded border"
                                style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderColor: 'rgba(139,92,246,0.4)' }}>
                                ◆ RARE
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromSlot(idx)}
                          title="Remove from lineup"
                          className="text-white/20 hover:text-red-400 p-0.5 transition-colors flex-shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <span className="font-headline text-[10px]" style={{ color: isDragTarget ? 'rgba(249,115,22,0.6)' : 'rgba(255,255,255,0.25)' }}>
                        {isDragTarget ? `Drop here for ${pos}` : `No ${pos} — drag or use +`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Out-of-position warning */}
            {slots.some((p, idx) => p && p.position !== BASKETBALL_POSITION_ORDER[idx]) && (
              <p className="mt-3 font-headline text-[10px] text-center" style={{ color: 'rgba(251,191,36,0.6)' }}>
                ⚠️ Out-of-position players hurt performance — but you can still save and play!
              </p>
            )}
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
              <button onClick={handleSave} disabled={saving || filledSlots < 5}
                className="w-full py-3 rounded-lg font-retro text-[9px] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: '#f97316', color: '#0f0a00', boxShadow: '0 0 12px rgba(249,115,22,0.3)' }}>
                {saving ? 'Saving…' : filledSlots < 5 ? `Fill ${5 - filledSlots} more slot${5 - filledSlots > 1 ? 's' : ''}` : '✅ Save Team'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
