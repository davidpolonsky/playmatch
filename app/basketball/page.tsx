'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/config';
import { signInWithGoogle } from '@/lib/firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import Footer from '@/components/Footer';

export default function BasketballHome() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setLoading(false);
      if (user) router.push('/basketball/teams');
    });
    return () => unsub();
  }, [router]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (e: any) {
      alert('Sign in failed: ' + e.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bball-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-bball-orange mx-auto" />
          <p className="mt-4 font-retro text-[9px] text-bball-orange/50">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8"
        style={{ background: 'linear-gradient(135deg, #0f0a00 0%, #1c1200 60%, #0f0a00 100%)' }}>
        <div className="max-w-4xl w-full text-center px-4">

          {/* Sport switcher */}
          <div className="flex justify-center gap-2 mb-8">
            <button onClick={() => router.push('/')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-bball-border bg-bball-mid/50 text-white/50 font-retro text-[8px] hover:text-white/70 transition-colors">
              ⚽ Football
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-bball-orange bg-bball-orange/10 text-bball-orange font-retro text-[8px]">
              🏀 Basketball
            </button>
          </div>

          {/* Logo */}
          <div className="mb-6 text-7xl">🏀</div>

          <h1 className="font-headline text-4xl sm:text-5xl text-white mb-2 tracking-tight">
            PlayMatch
          </h1>
          <p className="font-retro text-[10px] text-bball-orange mb-2 tracking-widest uppercase">
            Basketball
          </p>
          <p className="font-headline text-[13px] sm:text-[15px] mb-8 max-w-2xl mx-auto"
            style={{ color: 'rgba(251,191,36,0.8)' }}>
            Turn your basketball cards into dream teams
          </p>

          {/* How it works */}
          <div className="rounded-xl border p-6 sm:p-8 mb-8 max-w-2xl mx-auto"
            style={{ background: '#1c1200', borderColor: '#3d2c00', boxShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>
            <h2 className="font-retro text-[11px] mb-6 tracking-wider uppercase"
              style={{ color: '#f97316' }}>How It Works</h2>
            <ol className="text-left space-y-4">
              {[
                { n: 1, title: 'Scan Your Cards:', body: 'Snap photos of your basketball player cards — NBA, college, retro' },
                { n: 2, title: 'Build Your 5:', body: 'Set your starting lineup — PG, SG, SF, PF, C — and pick a strategy' },
                { n: 3, title: 'Challenge Friends:', body: 'Share your team ID and add rivals to your roster' },
                { n: 4, title: 'Run the Game:', body: 'Live quarter-by-quarter commentary with real scoring' },
              ].map(({ n, title, body }) => (
                <li key={n} className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 font-retro text-[10px]"
                    style={{ background: '#f97316', color: '#0f0a00' }}>
                    {n}
                  </span>
                  <span className="font-headline text-[11px] sm:text-[12px] pt-1" style={{ color: 'rgba(241,239,227,0.9)' }}>
                    <strong style={{ color: '#fbbf24' }}>{title}</strong> {body}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <button onClick={handleSignIn}
            className="font-retro text-[12px] px-8 py-4 rounded-lg transition-all"
            style={{ background: '#f97316', color: '#0f0a00', boxShadow: '0 0 12px rgba(249,115,22,0.5)' }}>
            Sign in with Google to Play
          </button>

          <p className="font-headline text-[10px] mt-4 px-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Scan cards from any era — current stars to all-time legends
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
