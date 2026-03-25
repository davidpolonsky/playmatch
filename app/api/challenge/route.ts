import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// Check if SendGrid is configured
const SENDGRID_CONFIGURED = process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL;

if (SENDGRID_CONFIGURED) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
}

export async function POST(req: NextRequest) {
  try {
    // Check if SendGrid is configured
    if (!SENDGRID_CONFIGURED) {
      return NextResponse.json({
        error: 'Email service not configured. Please set up SendGrid in environment variables.'
      }, { status: 503 });
    }

    const { toEmail, teamName, teamId, formation, fromName } = await req.json();

    if (!toEmail || typeof toEmail !== 'string') {
      return NextResponse.json({ error: 'Missing recipient email' }, { status: 400 });
    }

    if (!teamName || !teamId) {
      return NextResponse.json({ error: 'Missing team information' }, { status: 400 });
    }

    const senderName = (fromName || 'A friend').trim();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://playmatch.games';
    const challengeUrl = `${appUrl}?challenge=${encodeURIComponent(teamId)}`;

    await sgMail.send({
      to: toEmail.trim(),
      from: {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: 'PlayMatch',
      },
      subject: `${senderName} challenged you to play their ${teamName} team! ⚽`,
      text: `Hey!\n\n${senderName} challenges you to a match on PlayMatch!\n\nTheir Team: ${teamName}\nFormation: ${formation}\n\nTo accept this challenge:\n1. Go to ${challengeUrl}\n2. Build your team and challenge them back!\n\nSee you on the pitch! ⚽\n— The PlayMatch Team`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0a2f1b;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a2f1b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#14532d;border-radius:16px;border:1px solid #1e5c33;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#060f09;padding:24px;text-align:center;border-bottom:1px solid #1e5c33;">
              <p style="margin:0;font-size:24px;">⚽</p>
              <p style="margin:8px 0 0;color:#4ade80;font-size:13px;letter-spacing:3px;font-weight:bold;text-transform:uppercase;">PlayMatch</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 28px;">
              <h1 style="margin:0 0 8px;color:#ffffff;font-size:20px;font-weight:bold;">Team Challenge! ⚡</h1>
              <p style="margin:0 0 20px;color:#4ade80;font-size:14px;">${senderName} wants to play you</p>
              <p style="margin:0 0 24px;color:#e5e7eb;font-size:15px;line-height:1.6;">
                <strong style="color:#ffffff;">${senderName}</strong> has challenged you to play against their team on <strong style="color:#4ade80;">PlayMatch</strong>!
              </p>
              <!-- Team Info -->
              <div style="background:#060f09;border:1px solid #1e5c33;border-radius:8px;padding:16px;margin-bottom:24px;">
                <p style="margin:0 0 8px;color:#4ade80;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Their Team</p>
                <p style="margin:0 0 8px;color:#ffffff;font-size:16px;font-weight:bold;">${teamName}</p>
                <p style="margin:0 0 8px;color:#e5e7eb;font-size:14px;">Formation: <strong>${formation}</strong></p>
                <p style="margin:0;color:#fbbf24;font-size:14px;">Team ID: <strong style="letter-spacing:1px;">${teamId}</strong></p>
              </div>
              <!-- Instructions -->
              <div style="background:#1e5c33;border-radius:8px;padding:16px;margin-bottom:24px;">
                <p style="margin:0 0 12px;color:#4ade80;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">How to Accept</p>
                <p style="margin:0 0 8px;color:#e5e7eb;font-size:14px;">1. Click the button below to sign up</p>
                <p style="margin:0 0 8px;color:#e5e7eb;font-size:14px;">2. Their team will be automatically added</p>
                <p style="margin:0;color:#e5e7eb;font-size:14px;">3. Build your team and challenge them back!</p>
              </div>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 16px;">
                    <a href="${challengeUrl}" style="display:inline-block;background:#4ade80;color:#060f09;font-weight:bold;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:1px;">
                      Accept Challenge →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#6b7280;font-size:12px;text-align:center;">
                Or copy this link: <a href="${challengeUrl}" style="color:#4ade80;">${challengeUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#060f09;padding:16px;text-align:center;border-top:1px solid #1e5c33;">
              <p style="margin:0;color:#374151;font-size:11px;">© PlayMatch · <a href="${appUrl}" style="color:#374151;">playmatch.games</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('SendGrid error:', err?.response?.body || err);
    const errorMessage = err?.response?.body?.errors?.[0]?.message || err?.message || 'Failed to send challenge';
    return NextResponse.json({
      error: errorMessage,
      hint: 'Make sure SendGrid API key and sender email are configured correctly'
    }, { status: 500 });
  }
}
