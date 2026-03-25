'use client';

import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/firebase/auth';

interface NavigationProps {
  user?: {
    displayName: string | null;
  };
  currentPage?: 'dashboard' | 'teams' | 'team-builder';
}

export default function Navigation({ user, currentPage }: NavigationProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
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
