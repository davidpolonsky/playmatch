'use client';

import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/firebase/auth';
import { useState } from 'react';

interface NavigationProps {
  user?: {
    displayName: string | null;
  } | null;
  currentPage?: 'dashboard' | 'teams' | 'team-builder';
}

export default function Navigation({ user, currentPage }: NavigationProps) {
  const router = useRouter();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  // Get first name from display name
  const firstName = user?.displayName?.split(' ')[0] || '';

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || inviteSending) return;
    const name = inviteName.trim() || firstName || 'A friend';
    setInviteSending(true);
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromName: name, toEmail: inviteEmail.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      setInviteSent(true);
      setTimeout(() => {
        setInviteSent(false);
        setInviteEmail('');
        setShowInvite(false);
      }, 3000);
    } catch {
      alert('Failed to send invite. Please try again.');
    } finally {
      setInviteSending(false);
    }
  };

  return (
    <nav className="bg-fifa-dark border-b border-fifa-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center gap-4 flex-wrap">
        <button
          onClick={() => router.push('/dashboard')}
          className="font-retro text-[11px] text-fifa-mint tracking-wider hover:text-fifa-cream transition-colors"
        >
          ⚽ PlayMatch
        </button>

        <div className="flex gap-2 items-center flex-wrap">
          {currentPage !== 'dashboard' && (
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-secondary text-[9px] py-1.5 px-3"
            >
              Dashboard
            </button>
          )}

          {currentPage !== 'teams' && (
            <button
              onClick={() => router.push('/teams')}
              className="btn-secondary text-[9px] py-1.5 px-3"
            >
              My Teams
            </button>
          )}

          {currentPage !== 'team-builder' && (
            <button
              onClick={() => router.push('/team-builder')}
              className="btn-primary text-[9px] py-1.5 px-3"
            >
              + New Team
            </button>
          )}

          {/* Invite Friends Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowInvite(v => !v);
                setInviteSent(false);
                setInviteEmail('');
                setInviteName(firstName);
              }}
              className="btn-secondary text-[9px] py-1.5 px-3"
            >
              📨 Invite
            </button>
            {showInvite && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-fifa-dark border border-fifa-border rounded-xl shadow-retro p-4 z-50">
                <h3 className="font-retro text-[9px] text-fifa-mint mb-3 tracking-wider">INVITE A FRIEND</h3>
                {inviteSent ? (
                  <p className="font-headline text-[11px] text-fifa-mint text-center py-2">✓ Invite sent!</p>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="font-retro text-[7px] text-white/40 uppercase tracking-wider block mb-1">Your Name</label>
                      <input
                        type="text"
                        value={inviteName}
                        onChange={e => setInviteName(e.target.value)}
                        placeholder={firstName || 'Your name'}
                        className="w-full px-3 py-1.5 bg-fifa-mid border border-fifa-border rounded-lg text-white font-headline text-[11px] placeholder:text-white/25 focus:ring-1 focus:ring-fifa-mint focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-retro text-[7px] text-white/40 uppercase tracking-wider block mb-1">Friend's Email</label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
                        placeholder="friend@example.com"
                        className="w-full px-3 py-1.5 bg-fifa-mid border border-fifa-border rounded-lg text-white font-headline text-[11px] placeholder:text-white/25 focus:ring-1 focus:ring-fifa-mint focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSendInvite}
                        disabled={!inviteEmail.trim() || inviteSending}
                        className="flex-1 btn-primary text-[8px] py-2 disabled:opacity-30"
                      >
                        {inviteSending ? 'Sending…' : 'Send Invite ⚽'}
                      </button>
                      <button onClick={() => setShowInvite(false)} className="btn-secondary text-[8px] py-2 px-3">
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {user?.displayName && (
            <span className="font-headline text-[10px] text-fifa-cream/50 hidden sm:block">
              {user.displayName}
            </span>
          )}

          <button
            onClick={handleSignOut}
            className="btn-secondary text-[9px] py-1.5 px-3"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
