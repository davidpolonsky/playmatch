'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
          {/* Logo - Pixelated soccer ball */}
          <div className="mb-8 inline-block" style={{ imageRendering: 'pixelated' }}>
            <svg width="100" height="100" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
              {/* White ball base */}
              <rect x="3" y="2" width="10" height="12" fill="#f5f5dc"/>
              <rect x="2" y="4" width="12" height="8" fill="#f5f5dc"/>
              <rect x="4" y="1" width="8" height="1" fill="#f5f5dc"/>
              <rect x="4" y="14" width="8" height="1" fill="#f5f5dc"/>

              {/* Black pentagons/hexagons pattern */}
              <rect x="6" y="3" width="4" height="2" fill="#1a1a1a"/>
              <rect x="5" y="5" width="2" height="2" fill="#1a1a1a"/>
              <rect x="9" y="5" width="2" height="2" fill="#1a1a1a"/>
              <rect x="3" y="7" width="3" height="3" fill="#1a1a1a"/>
              <rect x="10" y="7" width="3" height="3" fill="#1a1a1a"/>
              <rect x="6" y="10" width="4" height="3" fill="#1a1a1a"/>

              {/* Green border/shadow */}
              <rect x="2" y="3" width="1" height="10" fill="#4ade80" opacity="0.5"/>
              <rect x="13" y="3" width="1" height="10" fill="#4ade80" opacity="0.5"/>
              <rect x="3" y="13" width="10" height="1" fill="#4ade80" opacity="0.5"/>
            </svg>
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