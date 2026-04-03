'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedditRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page with PLAY-REDDIT invite code pre-filled
    router.replace('/?invite=PLAY-REDDIT');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-fifa-dark">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fifa-mint mx-auto" />
        <p className="mt-4 font-retro text-[9px] text-fifa-mint/50">Redirecting...</p>
      </div>
    </div>
  );
}
