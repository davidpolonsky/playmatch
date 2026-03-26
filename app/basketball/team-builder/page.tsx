'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { signOut } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import BasketballTeamBuilderContent from '@/components/BasketballTeamBuilderContent';

export default function BasketballTeamBuilder() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [soccerLabel, setSoccerLabel] = useState('Football');

  useEffect(() => { if (!loading && !user) router.push('/basketball'); }, [user, loading, router]);

  useEffect(() => {
    fetch('/api/geo').then(r => r.json()).then(d => {
      if (d.country_code === 'US') setSoccerLabel('Soccer');
    }).catch(() => {});
  }, []);

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

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f0a00 0%, #1c1200 60%, #0f0a00 100%)' }}>
      {/* Nav */}
      <nav style={{ background: '#0f0a00', borderBottom: '1px solid #3d2c00' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-4 flex-wrap">
          <h1 className="font-retro text-[11px] tracking-wider flex items-center gap-1.5" style={{ color: '#f97316' }}>
            <img src="/basketball.png" className="w-4 h-4" alt="" /> PlayMatch
          </h1>
          <div className="flex gap-2 items-center flex-wrap">
            <button onClick={() => router.push('/basketball/teams')}
              className="font-retro text-[9px] py-1.5 px-3 rounded-lg border transition-colors"
              style={{ borderColor: '#3d2c00', color: 'rgba(255,255,255,0.6)' }}>
              ← My Teams
            </button>
            <button onClick={() => router.push('/dashboard')}
              className="font-retro text-[9px] py-1.5 px-3 rounded-lg border transition-colors"
              style={{ borderColor: '#3d2c00', color: 'rgba(255,255,255,0.6)' }}>
              ⚽ {soccerLabel}
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
        <BasketballTeamBuilderContent onSaved={() => router.push('/basketball/teams')} />
      </main>
    </div>
  );
}
