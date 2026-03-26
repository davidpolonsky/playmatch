import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

const SENDGRID_CONFIGURED = process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL;
if (SENDGRID_CONFIGURED) sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { email, sport } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const sportLabel = sport === 'basketball' ? 'Basketball 🏀' : 'Soccer ⚽';
    const notifyEmail = 'info@playmatch.games';

    if (SENDGRID_CONFIGURED) {
      await sgMail.send({
        to: notifyEmail,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL!,
          name: 'PlayMatch Waitlist',
        },
        subject: `New waitlist signup — PlayMatch ${sportLabel}`,
        text: `New waitlist signup:\n\nEmail: ${email}\nSport: ${sportLabel}\n\nTo invite them, send a challenge email from within the app.`,
        html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#060f09;font-family:Arial,sans-serif;color:#e5e7eb;">
  <div style="max-width:480px;background:#14532d;border-radius:12px;border:1px solid #1e5c33;padding:28px;">
    <p style="margin:0 0 6px;color:#4ade80;font-size:11px;letter-spacing:3px;font-weight:bold;text-transform:uppercase;">PlayMatch Waitlist</p>
    <h2 style="margin:0 0 20px;color:#fff;font-size:18px;">New Signup — ${sportLabel}</h2>
    <p style="margin:0 0 8px;font-size:14px;"><strong style="color:#4ade80;">Email:</strong> ${email}</p>
    <p style="margin:0;font-size:14px;"><strong style="color:#4ade80;">Sport:</strong> ${sportLabel}</p>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #1e5c33;">
      <p style="margin:0;color:#6b7280;font-size:11px;">To let them in, send them a challenge invite from within the app — that link includes <code>?invited=true</code> so they can sign up with Google.</p>
    </div>
  </div>
</body>
</html>`.trim(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Waitlist error:', err?.response?.body || err);
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
  }
}
