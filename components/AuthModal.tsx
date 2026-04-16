'use client';

import { useState } from 'react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset } from '@/lib/firebase/auth';

interface AuthModalProps {
  sport: 'soccer' | 'basketball';
  inviteCode?: string;
  onSignIn: (user: any) => Promise<void>;
  onError: (error: string) => void;
  loading: boolean;
}

export default function AuthModal({ sport, inviteCode = '', onSignIn, onError, loading }: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');
  const [emailMode, setEmailMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const isSoccer = sport === 'soccer';
  const primaryColor = isSoccer ? '#4ade80' : '#f97316';
  const bgColor = isSoccer ? '#14532d' : '#1c1200';
  const borderColor = isSoccer ? '#1e5c33' : '#3d2c00';
  const textColor = isSoccer ? '#f1efe3' : '#f1efe3';

  const handleGoogleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      await onSignIn(user);
    } catch (e: any) {
      onError(e.message || 'Google sign-in failed');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailMode === 'reset') {
      try {
        await sendPasswordReset(email);
        setResetSent(true);
      } catch (e: any) {
        onError(e.message || 'Failed to send reset email');
      }
      return;
    }

    try {
      const user = emailMode === 'signup'
        ? await signUpWithEmail(email, password, displayName || undefined)
        : await signInWithEmail(email, password);
      await onSignIn(user);
    } catch (e: any) {
      const msg = e.code === 'auth/email-already-in-use'
        ? 'Email already in use. Try signing in instead.'
        : e.code === 'auth/weak-password'
        ? 'Password should be at least 6 characters.'
        : e.code === 'auth/invalid-email'
        ? 'Invalid email address.'
        : e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password'
        ? 'Invalid email or password.'
        : e.message || 'Authentication failed';
      onError(msg);
    }
  };

  if (resetSent) {
    return (
      <div className="max-w-sm mx-auto">
        <div className="rounded-xl p-6 text-center" style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
          <p className="font-retro text-[11px] mb-1" style={{ color: primaryColor }}>Password reset email sent! ✓</p>
          <p className="font-headline text-[10px] text-white/40 mb-4">Check your inbox for reset instructions.</p>
          <button
            onClick={() => { setResetSent(false); setEmailMode('signin'); }}
            className="font-headline text-[10px] text-white/60 hover:text-white/80 transition-colors"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto">
      <p className="font-retro text-[10px] mb-2 tracking-wider uppercase" style={{ color: primaryColor }}>
        {emailMode === 'signup' ? 'Create Account' : emailMode === 'reset' ? 'Reset Password' : 'Sign In'}
      </p>
      <p className="font-headline text-[11px] text-white/40 mb-5">
        {emailMode === 'signup'
          ? 'Choose how you want to sign up'
          : emailMode === 'reset'
          ? 'Enter your email to receive a password reset link'
          : 'Choose how you want to sign in'}
      </p>

      {authMode === 'google' ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full px-8 py-4 rounded-lg font-retro text-[11px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: primaryColor,
              color: isSoccer ? '#060f09' : '#0f0a00',
              boxShadow: `0 0 12px ${primaryColor}40`
            }}
          >
            {loading ? 'Signing in…' : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: borderColor }}></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 font-retro text-[8px] text-white/30" style={{ background: isSoccer ? '#060f09' : '#0f0a00' }}>OR</span>
            </div>
          </div>

          <button
            onClick={() => setAuthMode('email')}
            className="w-full px-8 py-3 rounded-lg font-retro text-[10px] transition-all"
            style={{
              background: bgColor,
              border: `1px solid ${borderColor}`,
              color: textColor
            }}
          >
            Continue with Email
          </button>
        </div>
      ) : (
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg font-headline text-sm focus:outline-none focus:ring-1"
            style={{
              background: bgColor,
              border: `1px solid ${borderColor}`,
              color: textColor,
              outlineColor: primaryColor
            }}
          />

          {emailMode !== 'reset' && (
            <>
              {emailMode === 'signup' && (
                <input
                  type="text"
                  placeholder="Display name (optional)"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg font-headline text-sm focus:outline-none focus:ring-1"
                  style={{
                    background: bgColor,
                    border: `1px solid ${borderColor}`,
                    color: textColor,
                    outlineColor: primaryColor
                  }}
                />
              )}
              <input
                type="password"
                required
                placeholder={emailMode === 'signup' ? 'Password (6+ characters)' : 'Password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg font-headline text-sm focus:outline-none focus:ring-1"
                style={{
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                  outlineColor: primaryColor
                }}
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-8 py-3 rounded-lg font-retro text-[11px] transition-all disabled:opacity-50"
            style={{
              background: primaryColor,
              color: isSoccer ? '#060f09' : '#0f0a00',
              boxShadow: `0 0 12px ${primaryColor}40`
            }}
          >
            {loading ? 'Processing…' : emailMode === 'signup' ? 'Sign Up' : emailMode === 'reset' ? 'Send Reset Link' : 'Sign In'}
          </button>

          <div className="flex flex-col gap-2 items-center">
            {emailMode === 'signin' && (
              <>
                <button
                  type="button"
                  onClick={() => setEmailMode('signup')}
                  className="font-headline text-[10px] text-white/50 hover:text-white/70 transition-colors"
                >
                  Don't have an account? Sign up
                </button>
                <button
                  type="button"
                  onClick={() => setEmailMode('reset')}
                  className="font-headline text-[10px] text-white/40 hover:text-white/60 transition-colors"
                >
                  Forgot password?
                </button>
              </>
            )}
            {emailMode === 'signup' && (
              <button
                type="button"
                onClick={() => setEmailMode('signin')}
                className="font-headline text-[10px] text-white/50 hover:text-white/70 transition-colors"
              >
                Already have an account? Sign in
              </button>
            )}
            {emailMode === 'reset' && (
              <button
                type="button"
                onClick={() => setEmailMode('signin')}
                className="font-headline text-[10px] text-white/50 hover:text-white/70 transition-colors"
              >
                ← Back to sign in
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setAuthMode('google')}
            className="mt-2 font-headline text-[10px] text-white/30 hover:text-white/50 transition-colors"
          >
            ← Use Google instead
          </button>
        </form>
      )}
    </div>
  );
}
