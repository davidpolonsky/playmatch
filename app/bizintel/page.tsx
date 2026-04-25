'use client';

import { useState } from 'react';

interface WaitlistEntry {
  email: string;
  sport: string;
  createdAt: string;
  invitedAt: string | null;
}

interface BizStats {
  users: number;
  authUsers: number;
  soccerCards: number;
  basketballCards: number;
  soccerTeams: number;
  basketballTeams: number;
  soccerSims: number;
  basketballSims: number;
  perUser: {
    uid: string;
    email: string;
    soccerTeams: number;
    basketballTeams: number;
    soccerSims: number;
    basketballSims: number;
    soccerCards: number;
    basketballCards: number;
  }[];
  waitlist: number;
  waitlistEntries: WaitlistEntry[];
}

export default function BizIntel() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState<BizStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Per-email invite state: 'idle' | 'sending' | 'sent' | 'error'
  const [inviteState, setInviteState] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({});
  // Tour reset state per uid
  const [tourResetState, setTourResetState] = useState<Record<string, 'idle' | 'resetting' | 'reset' | 'error'>>({});

  const sendInvite = async (email: string, sport: string) => {
    setInviteState(s => ({ ...s, [email]: 'sending' }));
    try {
      const res = await fetch('/api/bizintel/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ email, sport }),
      });
      if (!res.ok) throw new Error('Failed');
      setInviteState(s => ({ ...s, [email]: 'sent' }));
      // Refresh stats so invitedAt shows up
      fetchStats(secret);
    } catch {
      setInviteState(s => ({ ...s, [email]: 'error' }));
    }
  };

  const resetTour = async (uid: string) => {
    setTourResetState(s => ({ ...s, [uid]: 'resetting' }));
    try {
      const res = await fetch('/api/bizintel/reset-tour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ uid }),
      });
      if (!res.ok) throw new Error('Failed');
      setTourResetState(s => ({ ...s, [uid]: 'reset' }));
      setTimeout(() => {
        setTourResetState(s => ({ ...s, [uid]: 'idle' }));
      }, 2000);
    } catch {
      setTourResetState(s => ({ ...s, [uid]: 'error' }));
    }
  };

  const fetchStats = async (s: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/bizintel', {
        headers: { 'x-admin-secret': s },
      });
      if (res.status === 401) { setError('Wrong secret.'); setLoading(false); return; }
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();
      setStats(data);
      setAuthed(true);
    } catch (e: any) {
      setError(e.message || 'Error loading stats');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStats(secret);
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-72">
          <p className="font-mono text-xs text-white/40 text-center tracking-widest uppercase">PlayMatch BizIntel</p>
          <input
            type="password"
            placeholder="Admin secret"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            className="px-4 py-3 rounded-lg font-mono text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30"
          />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button type="submit" disabled={loading || !secret}
            className="py-2 rounded-lg font-mono text-xs bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-40">
            {loading ? 'Loading\u2026' : 'Enter'}
          </button>
        </form>
      </div>
    );
  }

  if (!stats) return null;

  const totalTeams = stats.soccerTeams + stats.basketballTeams;
  const totalSims = stats.soccerSims + stats.basketballSims;
  const totalCards = stats.soccerCards + stats.basketballCards;

  // Only show users that have some activity or a real email
  const activeUsers = stats.perUser.filter(u =>
    u.email ||
    u.soccerTeams > 0 ||
    u.basketballTeams > 0 ||
    u.soccerSims > 0 ||
    u.basketballSims > 0 ||
    u.soccerCards > 0
  );

  const Stat = ({ label, value, sub }: { label: string; value: number | string; sub?: string }) => (
    <div className="rounded-xl border border-white/10 p-5 bg-white/5">
      <p className="font-mono text-[10px] text-white/40 tracking-widest uppercase mb-1">{label}</p>
      <p className="font-mono text-3xl font-bold text-white">{value}</p>
      {sub && <p className="font-mono text-[10px] text-white/30 mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="min-h-screen p-8" style={{ background: '#0a0a0a', fontFamily: 'monospace' }}>
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-white font-mono text-lg tracking-widest uppercase">PlayMatch · BizIntel</h1>
          <button onClick={() => { setAuthed(false); setStats(null); setSecret(''); }}
            className="font-mono text-[10px] text-white/30 hover:text-white/60 transition-colors">
            Sign out
          </button>
        </div>

        {/* Top-line stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Stat label="Users" value={stats.authUsers} sub={`+${stats.waitlist} waitlist`} />
          <Stat label="Cards Uploaded" value={totalCards} sub={`${stats.soccerCards} soccer · ${stats.basketballCards} bball`} />
          <Stat label="Teams Created" value={totalTeams} sub={`${stats.soccerTeams} soccer · ${stats.basketballTeams} bball`} />
          <Stat label="Simulations" value={totalSims} sub={`${stats.soccerSims} soccer · ${stats.basketballSims} bball`} />
        </div>

        {/* Per-user table */}
        <div className="rounded-xl border border-white/10 overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-white/10 bg-white/5">
            <p className="font-mono text-[10px] text-white/40 tracking-widest uppercase">Per-User Breakdown</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['User', 'Soccer Teams', 'Bball Teams', 'Soccer Sims', 'Bball Sims', 'Soccer Cards', 'Bball Cards', 'Tour'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-mono text-[9px] text-white/30 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeUsers
                .sort((a, b) => (b.soccerTeams + b.basketballTeams + b.soccerSims + b.basketballSims) - (a.soccerTeams + a.basketballTeams + a.soccerSims + a.basketballSims))
                .map((u, i) => {
                  const tourState = tourResetState[u.uid] || 'idle';
                  return (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-white/70">{u.email || '(unknown)'}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-white/50">{u.soccerTeams}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-white/50">{u.basketballTeams}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-white/50">{u.soccerSims}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-white/50">{u.basketballSims}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-white/50">{u.soccerCards}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-white/50">{u.basketballCards}</td>
                      <td className="px-4 py-2.5">
                        {tourState === 'reset' ? (
                          <span className="font-mono text-[10px] text-green-400">✓ Reset</span>
                        ) : (
                          <button
                            onClick={() => resetTour(u.uid)}
                            disabled={tourState === 'resetting'}
                            className="font-mono text-[10px] px-2 py-1 rounded border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors disabled:opacity-40"
                          >
                            {tourState === 'resetting' ? '...' : tourState === 'error' ? 'Retry' : 'Reset'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Waitlist table */}
        {stats.waitlistEntries.length > 0 && (
          <div className="rounded-xl border border-white/10 overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-white/10 bg-white/5">
              <p className="font-mono text-[10px] text-white/40 tracking-widest uppercase">
                Waitlist &mdash; {stats.waitlist} {stats.waitlist === 1 ? 'signup' : 'signups'}
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {['Email', 'Sport', 'Signed Up', 'Invite'].map(h => (
                    <th key={h} className="px-4 py-2 text-left font-mono text-[9px] text-white/30 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.waitlistEntries.map((w, i) => {
                  const state = inviteState[w.email] || 'idle';
                  const alreadyInvited = !!w.invitedAt;
                  return (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-white/70">{w.email}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-white/50 capitalize">{w.sport}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-white/40">{w.createdAt || '\u2014'}</td>
                      <td className="px-4 py-2.5">
                        {alreadyInvited && state !== 'sent' ? (
                          <span className="font-mono text-[10px] text-green-400/60">&#10003; invited {w.invitedAt}</span>
                        ) : state === 'sent' ? (
                          <span className="font-mono text-[10px] text-green-400">&#10003; Sent!</span>
                        ) : (
                          <button
                            onClick={() => sendInvite(w.email, w.sport)}
                            disabled={state === 'sending'}
                            className="font-mono text-[10px] px-3 py-1 rounded border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors disabled:opacity-40"
                          >
                            {state === 'sending' ? 'Sending\u2026' : state === 'error' ? 'Retry' : 'Send Invite'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-center font-mono text-[10px] text-white/20 mt-6">
          Last updated: {new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST
        </p>
      </div>
    </div>
  );
}
