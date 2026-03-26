'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { auth } from '@/lib/firebase/config';
import { signInWithGoogle } from '@/lib/firebase/auth';
import { signOut } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import {
  validateAndConsumeInviteCode,
  isNewUser,
  createUserDoc,
} from '@/lib/firebase/firestore';
import Footer from '@/components/Footer';

function HomeContent() {
  const [loading, setLoading] = useState(true);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistState, setWaitlistState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  // Invite-code sign-in panel
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  // ?invite=CODE pre-fills the code and opens the panel
  const inviteParam = searchParams.get('invite') || '';
  // legacy ?invited=true still opens the panel
  const isInvited = inviteParam !== '' || searchParams.get('invited') === 'true';

  useEffect(() => {
    if (inviteParam) {
      setInviteCode(inviteParam.toUpperCase());
      setShowInvitePanel(true);
    } else if (isInvited) {
      setShowInvitePanel(true);
    }
  }, [inviteParam, isInvited]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(false);
      if (user) router.push('/dashboard');
    });
    return () => unsubscribe();
  }, [router]);

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail.trim() || waitlistState === 'sending') return;
    setWaitlistState('sending');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail.trim(), sport: 'soccer' }),
      });
      if (!res.ok) throw new Error('Failed');
      setWaitlistState('sent');
    } catch {
      setWaitlistState('error');
    }
  };

  const handleInviteSignIn = async () => {
    if (inviteLoading) return;
    setInviteError('');

    // If a code is required (non-legacy flow), validate it before signing in
    const codeToValidate = inviteCode.trim().toUpperCase();
    const requiresCode = codeToValidate !== '';

    setInviteLoading(true);
    try {
      const user = await signInWithGoogle();
      if (!user) throw new Error('Sign in failed');

      const newUser = await isNewUser(user.uid);

      if (newUser) {
        // New user must have a valid invite code
        if (!codeToValidate) {
          // No code supplied — sign them out and prompt
          await signOut(auth);
          setInviteError('Please enter your invite code to create an account.');
          setInviteLoading(false);
          return;
        }

        const result = await validateAndConsumeInviteCode(codeToValidate, user.uid);
        if (result === 'invalid') {
          await signOut(auth);
          setInviteError('That invite code is not valid. Double-check and try again.');
          setInviteLoading(false);
          return;
        }
        if (result === 'already_used') {
          await signOut(auth);
          setInviteError('That invite code has already been used.');
          setInviteLoading(false);
          return;
        }
        // Code is valid — create their user doc and let them through
        await createUserDoc(user.uid, user.email);
      }

      // Existing user OR newly admitted — redirect to dashboard
      router.push('/dashboard');
    } catch (e: any) {
      setInviteError('Sign in failed: ' + (e.message || 'unknown error'));
      setInviteLoading(false);
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
              <img src="/basketball.png" className="w-4 h-4" alt="" /> Basketball
            </button>
          </div>

          {/* Logo */}
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
              {[
                { n: 1, title: 'Scan Your Cards:', body: 'Snap photos of your soccer player cards with your camera' },
                { n: 2, title: 'Build Your Squad:', body: 'Organize your players and create your perfect starting 11' },
                { n: 3, title: 'Save & Share:', body: 'Store your teams in the cloud and share with friends' },
                { n: 4, title: 'Simulate Matches:', body: 'Watch your teams compete with live play-by-play commentary' },
              ].map(({ n, title, body }) => (
                <li key={n} className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-fifa-mint text-fifa-dark rounded-full flex items-center justify-center mr-3 font-retro text-[10px]">{n}</span>
                  <span className="font-headline text-[11px] sm:text-[12px] text-fifa-cream/90 pt-1">
                    <strong className="text-fifa-amber">{title}</strong> {body}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* ── Invite sign-in panel OR waitlist ── */}
          {showInvitePanel ? (
            <div className="max-w-sm mx-auto">
              <p className="font-retro text-[10px] text-fifa-mint mb-2 tracking-widest uppercase">Sign In With Your Invite</p>
              <p className="font-headline text-[11px] text-white/40 mb-5">
                Enter your invite code, then sign in with Google to get started.
              </p>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="PLAY-XXXXXX"
                  value={inviteCode}
                  onChange={e => { setInviteCode(e.target.value.toUpperCase()); setInviteError(''); }}
                  className="w-full px-4 py-3 rounded-lg font-retro text-[11px] tracking-widest text-center focus:outline-none focus:ring-1 uppercase"
                  style={{ background: '#14532d', border: '1px solid #1e5c33', color: '#f1efe3', outlineColor: '#4ade80' }}
                />
                <button
                  onClick={handleInviteSignIn}
                  disabled={inviteLoading}
                  className="btn-primary w-full px-8 py-4 text-[12px] shadow-retro disabled:opacity-50"
                >
                  {inviteLoading ? 'Signing in…' : 'Sign in with Google to Play'}
                </button>
                {inviteError && (
                  <p className="font-headline text-[10px] text-red-400 text-center">{inviteError}</p>
                )}
              </div>
              <button
                onClick={() => { setShowInvitePanel(false); setInviteError(''); }}
                className="mt-4 font-headline text-[10px] text-white/30 hover:text-white/50 transition-colors"
              >
                ← Back to waitlist
              </button>
            </div>
          ) : (
            <div className="max-w-sm mx-auto">
              <p className="font-retro text-[10px] text-fifa-mint mb-2 tracking-wider uppercase">Join the Waitlist</p>
              <p className="font-headline text-[11px] text-white/40 mb-5">
                PlayMatch is in private beta. Drop your email and we'll let you know when a spot opens up.
              </p>
              {waitlistState === 'sent' ? (
                <div className="bg-fifa-mid border border-fifa-mint/30 rounded-xl p-6 text-center">
                  <p className="font-retro text-[11px] text-fifa-mint tracking-wider mb-1">You're on the list! ✓</p>
                  <p className="font-headline text-[10px] text-white/40">We'll reach out when your spot is ready.</p>
                </div>
              ) : (
                <form onSubmit={handleWaitlist} className="flex flex-col gap-3">
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={waitlistEmail}
                    onChange={e => setWaitlistEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg font-headline text-sm bg-fifa-mid border border-fifa-border text-fifa-cream placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-fifa-mint"
                  />
                  <button type="submit" disabled={waitlistState === 'sending' || !waitlistEmail.trim()}
                    className="btn-primary py-3 text-[11px] disabled:opacity-40">
                    {waitlistState === 'sending' ? 'Joining…' : 'Join Waitlist ⚽'}
                  </button>
                  {waitlistState === 'error' && (
                    <p className="font-headline text-[10px] text-red-400 text-center">Something went wrong — try again.</p>
                  )}
                </form>
              )}
              {/* Always-visible invite link */}
              <button
                onClick={() => { setShowInvitePanel(true); setInviteError(''); }}
                className="mt-5 font-headline text-[10px] text-white/35 hover:text-fifa-mint/70 transition-colors underline underline-offset-2"
              >
                Have an invite? Sign in here →
              </button>
            </div>
          )}

          <p className="font-headline text-[10px] sm:text-[11px] text-white/40 mt-6 px-4">
            Mix current stars with legendary players from soccer history
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-fifa-dark">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fifa-mint" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
