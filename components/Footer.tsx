'use client';

import { useState } from 'react';

export default function Footer() {
  const [showFeedback, setShowFeedback] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
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
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Failed to send feedback');
      }

      setSent(true);
      setTimeout(() => {
        setShowFeedback(false);
        setSent(false);
        setName('');
        setEmail('');
        setMessage('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <footer className="bg-fifa-dark border-t border-fifa-border mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-retro text-[8px] text-white/30 tracking-wider">
            PlayMatch Games™ 2026
          </p>
          <button
            onClick={() => setShowFeedback(true)}
            className="font-headline text-[10px] text-fifa-mint hover:text-fifa-cream transition-colors"
          >
            💬 Send Feedback
          </button>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-fifa-mid border border-fifa-border rounded-xl shadow-retro max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowFeedback(false);
                setError('');
                setSent(false);
              }}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="font-retro text-[11px] text-fifa-mint mb-6 tracking-wider">
              💬 SEND FEEDBACK
            </h2>

            {sent ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✓</div>
                <p className="font-headline text-[13px] text-fifa-mint">
                  Feedback sent! Thank you.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block font-retro text-[8px] text-fifa-mint/70 mb-2 uppercase tracking-wider">
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2 bg-fifa-dark border border-fifa-border rounded-lg text-fifa-cream font-headline text-[11px] placeholder:text-white/25 focus:ring-1 focus:ring-fifa-mint focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-retro text-[8px] text-fifa-mint/70 mb-2 uppercase tracking-wider">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 bg-fifa-dark border border-fifa-border rounded-lg text-fifa-cream font-headline text-[11px] placeholder:text-white/25 focus:ring-1 focus:ring-fifa-mint focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-retro text-[8px] text-fifa-mint/70 mb-2 uppercase tracking-wider">
                    Message *
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Share your thoughts, report bugs, or suggest features..."
                    rows={5}
                    className="w-full px-3 py-2 bg-fifa-dark border border-fifa-border rounded-lg text-fifa-cream font-headline text-[11px] placeholder:text-white/25 focus:ring-1 focus:ring-fifa-mint focus:outline-none resize-none"
                  />
                </div>

                {error && (
                  <p className="font-headline text-[10px] text-red-400">{error}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={sending || !email || !message}
                    className="flex-1 btn-primary py-2.5 disabled:opacity-30"
                  >
                    {sending ? 'Sending…' : 'Send Feedback'}
                  </button>
                  <button
                    onClick={() => {
                      setShowFeedback(false);
                      setError('');
                    }}
                    className="btn-secondary py-2.5 px-4"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </footer>
  );
}
