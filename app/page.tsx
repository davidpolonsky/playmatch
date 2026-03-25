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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
        <div className="max-w-4xl w-full text-center">
        {/* Simple Logo */}
        <div className="mb-8 text-8xl">⚽</div>
        
        <h1 className="text-7xl font-bold text-white mb-4 tracking-tight">
          PlayMatch
        </h1>
        <p className="text-xl text-white/90 mb-8">
          Turn your soccer cards into dream teams with AI
        </p>
        
        <div className="bg-white/10 backdrop-blur-lg p-8 rounded-xl mb-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4">How It Works</h2>
          <ol className="text-left space-y-4 text-white/90">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mr-3 font-bold">
                1
              </span>
              <span>
                <strong className="text-white">Scan Your Cards:</strong> Upload photos of your soccer player cards
              </span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mr-3 font-bold">
                2
              </span>
              <span>
                <strong className="text-white">Build Your Team:</strong> AI analyzes your cards and helps you create your best starting 11
              </span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mr-3 font-bold">
                3
              </span>
              <span>
                <strong className="text-white">Save & Share:</strong> Save your teams to the cloud
              </span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mr-3 font-bold">
                4
              </span>
              <span>
                <strong className="text-white">Simulate Matches:</strong> Watch AI simulate matches with detailed commentary
              </span>
            </li>
          </ol>
        </div>

        <button
          onClick={handleSignIn}
          className="bg-white text-blue-900 px-8 py-4 rounded-lg font-bold text-xl hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
        >
          🔐 Sign in with Google to Get Started
        </button>

        <p className="text-white/70 mt-4 text-sm">
          Mix current stars with legendary historical players!
        </p>
      </div>
    </main>

      <Footer />
    </>
  );
}