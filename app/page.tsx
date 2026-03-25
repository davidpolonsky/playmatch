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
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-fifa-dark">
        <div className="max-w-4xl w-full text-center">
          {/* Logo */}
          <div className="mb-8 text-8xl">⚽</div>

          <h1 className="font-headline text-7xl text-fifa-cream mb-4 tracking-tight">
            PlayMatch
          </h1>
          <p className="font-headline text-[15px] text-fifa-mint/80 mb-8">
            Turn your soccer cards into dream teams with AI
          </p>

          <div className="bg-fifa-mid border border-fifa-border rounded-xl p-8 mb-8 max-w-2xl mx-auto shadow-retro">
            <h2 className="font-retro text-[11px] text-fifa-mint mb-6 tracking-wider uppercase">How It Works</h2>
            <ol className="text-left space-y-4">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-fifa-mint text-fifa-dark rounded-full flex items-center justify-center mr-3 font-retro text-[10px]">
                  1
                </span>
                <span className="font-headline text-[12px] text-fifa-cream/90 pt-1">
                  <strong className="text-fifa-amber">Scan Your Cards:</strong> Upload photos of your soccer player cards
                </span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-fifa-mint text-fifa-dark rounded-full flex items-center justify-center mr-3 font-retro text-[10px]">
                  2
                </span>
                <span className="font-headline text-[12px] text-fifa-cream/90 pt-1">
                  <strong className="text-fifa-amber">Build Your Team:</strong> AI analyzes your cards and helps you create your best starting 11
                </span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-fifa-mint text-fifa-dark rounded-full flex items-center justify-center mr-3 font-retro text-[10px]">
                  3
                </span>
                <span className="font-headline text-[12px] text-fifa-cream/90 pt-1">
                  <strong className="text-fifa-amber">Save & Share:</strong> Save your teams to the cloud
                </span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-8 h-8 bg-fifa-mint text-fifa-dark rounded-full flex items-center justify-center mr-3 font-retro text-[10px]">
                  4
                </span>
                <span className="font-headline text-[12px] text-fifa-cream/90 pt-1">
                  <strong className="text-fifa-amber">Simulate Matches:</strong> Watch AI simulate matches with detailed commentary
                </span>
              </li>
            </ol>
          </div>

          <button
            onClick={handleSignIn}
            className="btn-primary px-8 py-4 text-[13px] shadow-retro"
          >
            🔐 Sign in with Google to Get Started
          </button>

          <p className="font-headline text-[11px] text-white/40 mt-4">
            Mix current stars with legendary historical players!
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}