'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { auth } from '@/lib/firebase/config';
import { signInWithGoogle } from '@/lib/firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import Footer from '@/components/Footer';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        router.push('/dashboard');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Sign in error:', error);
      alert('Failed to sign in: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-fifa-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fifa-mint mx-auto" />
          <p className="mt-4 font-retro text-[9px] text-fifa-mint/50">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-fifa-dark">
        <div className="max-w-4xl w-full text-center px-4">

          {/* Sport switcher */}
          <div className="flex justify-center gap-2 mb-8">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-fifa-mint bg-fifa-mint/10 text-fifa-mint font-retro text-[8px]">
              ⚽ Football
            </button>
            <button onClick={() => router.push('/basketball')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white/50 font-retro text-[8px] hover:text-white/70 transition-colors">
              🏀 Basketball
            </button>
          </div>

          {/* Logo - Soccer ball */}
          <div className="mb-8 inline-block">
            <Image src="/soccer.png" alt="Soccer Ball" width={96} height={96} className="mx-auto" style={{ imageRendering: 'pixelated' }} unoptimized priority />
          </div>

          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-fifa-cream mb-4 tracking-tight break-words">
            PlayMatch
          </h1>
          <p className="font-headline text-[13px] sm:text-[15px] text-fifa-mint/80 mb-8 max-w-2xl mx-auto">
            Turn your soccer cards into dream teams
          </p>

          <div className="bg-fifa-mid border border-fifa-border rounded-xl p-6 sm:p-8 mb-8 max-w-2xl mx-auto shadow-retro">
            <h2 className="font-retro text-[11px] text-fifa-mint mb-6 tracking-wider uppercase">How It Works</h2>
            <ol className="text-left space-y-4">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-fifa-mint text-fifa-dark rounded-full flex items-center justify-center mr-3 font-retro text-[10px]">
                  1
                </span>
                <span className="font-headline text-[11px] sm:text-[12px] text-fifa-cream/90 pt-1">
                  <strong className="text-fifa-amber">Scan Your Cards:</strong> Snap photos of your soccer player cards with your camera
                </span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-fifa-mint text-fifa-dark rounded-full flex items-center justify-center mr-3 font-retro text-[10px]">
                  2
                </span>
                <span className="font-headline text-[11px] sm:text-[12px] text-fifa-cream/90 pt-1">
                  <strong className="text-fifa-amber">Build Your Squad:</strong> Organize your players and create your perfect starting 11
                </span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-fifa-mint text-fifa-dark rounded-full flex items-center justify-center mr-3 font-retro text-[10px]">
                  3
                </span>
                <span className="font-headline text-[11px] sm:text-[12px] text-fifa-cream/90 pt-1">
                  <strong className="text-fifa-amber">Save & Share:</strong> Store your teams in the cloud and share with friends
                </span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-fifa-mint text-fifa-dark rounded-full flex items-center justify-center mr-3 font-retro text-[10px]">
                  4
                </span>
                <span className="font-headline text-[11px] sm:text-[12px] text-fifa-cream/90 pt-1">
                  <strong className="text-fifa-amber">Simulate Matches:</strong> Watch your teams compete with live play-by-play commentary
                </span>
              </li>
            </ol>
          </div>

          <button
            onClick={handleSignIn}
            className="btn-primary px-6 sm:px-8 py-3 sm:py-4 text-[12px] sm:text-[13px] shadow-retro"
          >
            Sign in with Google to Get Started
          </button>

          <p className="font-headline text-[10px] sm:text-[11px] text-white/40 mt-4 px-4">
            Mix current stars with legendary players from soccer history
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}