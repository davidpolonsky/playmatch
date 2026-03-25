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

    const { fromName, toEmail } = await req.json();

    if (!toEmail || typeof toEmail !== 'string') {
      return NextResponse.json({ error: 'Missing recipient email' }, { status: 400 });
    }

    const senderName = (fromName || 'A friend').trim();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://playmatch.games';

    await sgMail.send({
      to: toEmail.trim(),
      from: {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: 'PlayMatch',
      },
      subject: `${senderName} challenged you to PlayMatch ⚽`,
      text: `Hey!\n\n${senderName} wants to challenge you on PlayMatch — scan soccer player cards, build your dream team, and simulate matches against friends.\n\nSign up here: ${appUrl}\n\nSee you on the pitch! ⚽\n— The PlayMatch Team`,
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
              <h1 style="margin:0 0 8px;color:#ffffff;font-size:20px;font-weight:bold;">You've been challenged! ⚡</h1>
              <p style="margin:0 0 20px;color:#4ade80;font-size:14px;">${senderName} wants to play you</p>
              <p style="margin:0 0 24px;color:#e5e7eb;font-size:15px;line-height:1.6;">
                <strong style="color:#ffffff;">${senderName}</strong> has invited you to join <strong style="color:#4ade80;">PlayMatch</strong> —
                scan real soccer player cards, build your dream team, and simulate matches against friends.
              </p>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${appUrl}" style="display:inline-block;background:#4ade80;color:#060f09;font-weight:bold;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:1px;">
                      Accept Challenge →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#6b7280;font-size:12px;text-align:center;">
                Or visit <a href="${appUrl}" style="color:#4ade80;">${appUrl}</a>
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
    const errorMessage = err?.response?.body?.errors?.[0]?.message || err?.message || 'Failed to send invite';
    return NextResponse.json({
      error: errorMessage,
      hint: 'Make sure SendGrid API key and sender email are configured correctly'
    }, { status: 500 });
  }
}
