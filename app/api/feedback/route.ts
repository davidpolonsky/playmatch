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

    const { name, email, message } = await req.json();

    if (!email || !message) {
      return NextResponse.json({ error: 'Email and message are required' }, { status: 400 });
    }

    await sgMail.send({
      to: process.env.SENDGRID_FROM_EMAIL!,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: 'PlayMatch Feedback',
      },
      replyTo: email,
      subject: `PlayMatch Feedback from ${name || email}`,
      text: `Name: ${name || 'Anonymous'}\nEmail: ${email}\n\nMessage:\n${message}`,
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
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#14532d;border-radius:16px;border:1px solid #1e5c33;overflow:hidden;">
          <tr>
            <td style="background:#060f09;padding:24px;text-align:center;border-bottom:1px solid #1e5c33;">
              <p style="margin:0;font-size:24px;">⚽</p>
              <p style="margin:8px 0 0;color:#4ade80;font-size:13px;letter-spacing:3px;font-weight:bold;text-transform:uppercase;">PlayMatch Feedback</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;">
              <p style="margin:0 0 16px;color:#e5e7eb;font-size:14px;"><strong style="color:#4ade80;">From:</strong> ${name || 'Anonymous'}</p>
              <p style="margin:0 0 24px;color:#e5e7eb;font-size:14px;"><strong style="color:#4ade80;">Email:</strong> ${email}</p>
              <div style="background:#060f09;border:1px solid #1e5c33;border-radius:8px;padding:16px;margin-bottom:24px;">
                <p style="margin:0;color:#4ade80;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Message</p>
                <p style="margin:12px 0 0;color:#e5e7eb;font-size:15px;line-height:1.6;white-space:pre-wrap;">${message}</p>
              </div>
              <p style="margin:0;color:#6b7280;font-size:12px;text-align:center;">
                Reply directly to this email to respond
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#060f09;padding:16px;text-align:center;border-top:1px solid #1e5c33;">
              <p style="margin:0;color:#374151;font-size:11px;">© PlayMatch · playmatch.games</p>
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
    const errorMessage = err?.response?.body?.errors?.[0]?.message || err?.message || 'Failed to send feedback';
    return NextResponse.json({
      error: errorMessage,
      hint: 'Make sure SendGrid API key and sender email are configured correctly'
    }, { status: 500 });
  }
}
