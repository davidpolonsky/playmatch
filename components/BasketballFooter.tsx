'use client';

import { useState } from 'react';

export default function BasketballFooter() {
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
    <footer style={{ background: '#0f0a00', borderTop: '1px solid #3d2c00' }} className="mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-retro text-[8px]" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
            PlayMatch Games™ 2026
          </p>
          <button
            onClick={() => setShowFeedback(true)}
            className="font-headline text-[10px] transition-colors hover:text-[#fbbf24]"
            style={{ color: '#f97316' }}
          >
            💬 Send Feedback
          </button>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl shadow-retro max-w-md w-full p-6 relative border"
            style={{ background: '#1c1200', borderColor: '#3d2c00' }}>
            <button
              onClick={() => {
                setShowFeedback(false);
                setError('');
                setSent(false);
              }}
              className="absolute top-4 right-4 transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="font-retro text-[11px] mb-6" style={{ color: '#f97316', letterSpacing: '0.1em' }}>
              💬 SEND FEEDBACK
            </h2>

            {sent ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✓</div>
                <p className="font-headline text-[13px]" style={{ color: '#f97316' }}>
                  Feedback sent! Thank you.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block font-retro text-[8px] mb-2 uppercase" style={{ color: 'rgba(249,115,22,0.7)', letterSpacing: '0.05em' }}>
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2 rounded-lg font-headline text-[11px] focus:ring-1 focus:outline-none"
                    style={{ background: '#0f0a00', border: '1px solid #3d2c00', color: '#f1efe3', outlineColor: '#f97316' }}
                  />
                </div>

                <div>
                  <label className="block font-retro text-[8px] mb-2 uppercase" style={{ color: 'rgba(249,115,22,0.7)', letterSpacing: '0.05em' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 rounded-lg font-headline text-[11px] focus:ring-1 focus:outline-none"
                    style={{ background: '#0f0a00', border: '1px solid #3d2c00', color: '#f1efe3', outlineColor: '#f97316' }}
                  />
                </div>

                <div>
                  <label className="block font-retro text-[8px] mb-2 uppercase" style={{ color: 'rgba(249,115,22,0.7)', letterSpacing: '0.05em' }}>
                    Message *
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Share your thoughts, report bugs, or suggest features..."
                    rows={5}
                    className="w-full px-3 py-2 rounded-lg font-headline text-[11px] focus:ring-1 focus:outline-none resize-none"
                    style={{ background: '#0f0a00', border: '1px solid #3d2c00', color: '#f1efe3', outlineColor: '#f97316' }}
                  />
                </div>

                {error && (
                  <p className="font-headline text-[10px] text-red-400">{error}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={sending || !email || !message}
                    className="flex-1 py-2.5 rounded-lg font-retro text-[9px] disabled:opacity-30 transition-all"
                    style={{ background: '#f97316', color: '#0f0a00' }}
                  >
                    {sending ? 'Sending…' : 'Send Feedback'}
                  </button>
                  <button
                    onClick={() => {
                      setShowFeedback(false);
                      setError('');
                    }}
                    className="py-2.5 px-4 rounded-lg font-retro text-[9px] border transition-colors"
                    style={{ borderColor: '#3d2c00', color: 'rgba(255,255,255,0.6)' }}
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
