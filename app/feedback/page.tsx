'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function FeedbackPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !message) {
      setError('Email and message are required');
      return;
    }

    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim()
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Failed to send feedback');
      }

      setSent(true);
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation user={user} currentPage="feedback" />

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="font-retro text-[14px] text-fifa-mint mb-3 tracking-wider">
              💬 SEND US FEEDBACK
            </h1>
            <p className="font-headline text-[12px] text-white/60 leading-relaxed">
              We'd love to hear what you think! Share your thoughts, report bugs, or suggest new features.
            </p>
          </div>

          {/* Feedback Form */}
          <div className="bg-fifa-mid border border-fifa-border rounded-xl shadow-retro p-6 md:p-8">
            {sent ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✓</div>
                <h2 className="font-headline text-[16px] text-fifa-mint mb-2">
                  Feedback Sent!
                </h2>
                <p className="font-headline text-[12px] text-white/60 mb-4">
                  Thank you for helping us improve PlayMatch.
                </p>
                <p className="font-headline text-[11px] text-white/40">
                  Redirecting you back...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Quick Feedback Prompts */}
                <div className="bg-fifa-dark border border-fifa-border rounded-lg p-4 mb-6">
                  <p className="font-retro text-[9px] text-fifa-mint/70 mb-3 uppercase tracking-wider">
                    Need inspiration?
                  </p>
                  <ul className="space-y-2 font-headline text-[11px] text-white/60">
                    <li>💚 What do you love about PlayMatch?</li>
                    <li>🚀 What features would you like to see next?</li>
                    <li>🐛 Found a bug or something not working?</li>
                    <li>💡 Have an idea to make it better?</li>
                  </ul>
                </div>

                {/* Name Field */}
                <div>
                  <label className="block font-retro text-[9px] text-fifa-mint/70 mb-2 uppercase tracking-wider">
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-3 bg-fifa-dark border border-fifa-border rounded-lg text-fifa-cream font-headline text-[12px] placeholder:text-white/25 focus:ring-2 focus:ring-fifa-mint focus:outline-none"
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label className="block font-retro text-[9px] text-fifa-mint/70 mb-2 uppercase tracking-wider">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full px-4 py-3 bg-fifa-dark border border-fifa-border rounded-lg text-fifa-cream font-headline text-[12px] placeholder:text-white/25 focus:ring-2 focus:ring-fifa-mint focus:outline-none"
                  />
                </div>

                {/* Message Field */}
                <div>
                  <label className="block font-retro text-[9px] text-fifa-mint/70 mb-2 uppercase tracking-wider">
                    Your Feedback *
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Tell us what's on your mind..."
                    rows={8}
                    required
                    className="w-full px-4 py-3 bg-fifa-dark border border-fifa-border rounded-lg text-fifa-cream font-headline text-[12px] placeholder:text-white/25 focus:ring-2 focus:ring-fifa-mint focus:outline-none resize-none"
                  />
                  <p className="mt-2 font-headline text-[10px] text-white/40">
                    Be as detailed as you like - we read every message!
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <p className="font-headline text-[11px] text-red-400">{error}</p>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={sending || !email || !message}
                    className="flex-1 btn-primary py-3 text-[12px] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {sending ? 'Sending…' : 'Send Feedback'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="btn-secondary py-3 px-6 text-[12px]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Privacy Note */}
          <p className="text-center font-headline text-[10px] text-white/30 mt-6">
            Your feedback helps us build a better PlayMatch. We'll never share your email with third parties.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
// Force rebuild Sun Aug 23 15:34:55 EDT 2026
