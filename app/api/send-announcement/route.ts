import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import { adminDb } from '@/lib/firebase/admin';

// Check if SendGrid is configured
const SENDGRID_CONFIGURED = process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL;

if (SENDGRID_CONFIGURED) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
}

// Simple auth token for admin endpoints
const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN || 'change-me-in-production';

export async function POST(req: NextRequest) {
  try {
    // Verify admin token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token !== ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!SENDGRID_CONFIGURED) {
      return NextResponse.json({ error: 'SendGrid not configured' }, { status: 500 });
    }

    // Get all users from Firestore
    const usersSnapshot = await adminDb.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    })) as Array<{ uid: string; email?: string; displayName?: string }>;

    console.log(`Found ${users.length} users to email`);

    // Filter out users without email
    const usersWithEmail = users.filter((u): u is { uid: string; email: string; displayName?: string } => !!u.email);

    if (usersWithEmail.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No users with email found' });
    }

    // Email template
    const subject = '✅ Login Issues Fixed + We Want Your Feedback!';

    const emailPromises = usersWithEmail.map(async (user) => {
      const displayName = user.displayName || 'there';

      const html = `
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
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#14532d;border-radius:16px;border:1px solid #1e5c33;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#060f09;padding:24px;text-align:center;border-bottom:1px solid #1e5c33;">
              <p style="margin:0;font-size:32px;">⚽</p>
              <p style="margin:8px 0 0;color:#4ade80;font-size:14px;letter-spacing:3px;font-weight:bold;text-transform:uppercase;">PlayMatch</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 28px;">
              <h1 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:bold;">Hey ${displayName}! 👋</h1>

              <p style="margin:0 0 16px;color:#e5e7eb;font-size:15px;line-height:1.6;">
                We're reaching out because we've recently <strong style="color:#4ade80;">fixed some login issues</strong> that may have affected your experience on PlayMatch.
              </p>

              <div style="background:#060f09;border:1px solid #1e5c33;border-radius:8px;padding:20px;margin:20px 0;">
                <p style="margin:0 0 12px;color:#4ade80;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">✅ What We Fixed</p>
                <p style="margin:0;color:#e5e7eb;font-size:14px;line-height:1.6;">
                  We resolved a Firebase authentication issue that was causing intermittent login failures. If you had trouble signing in recently, it should work smoothly now!
                </p>
              </div>

              <div style="background:#0a2f1b;border:1px solid #1e5c33;border-radius:8px;padding:20px;margin:20px 0;">
                <p style="margin:0 0 12px;color:#fbbf24;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">💬 We Need Your Feedback</p>
                <p style="margin:0 0 16px;color:#e5e7eb;font-size:14px;line-height:1.6;">
                  Your input helps us make PlayMatch better! We'd love to hear:
                </p>
                <ul style="margin:0 0 16px;padding-left:20px;color:#e5e7eb;font-size:14px;line-height:1.8;">
                  <li>What do you love about PlayMatch?</li>
                  <li>What features would you like to see next?</li>
                  <li>Any bugs or issues we should know about?</li>
                </ul>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="padding-top:8px;">
                      <a href="https://playmatch.games/dashboard" style="display:inline-block;background:#fbbf24;color:#000;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:14px;letter-spacing:0.5px;">
                        Share Your Feedback
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <p style="margin:20px 0 0;color:#9ca3af;font-size:13px;line-height:1.6;">
                Thanks for being part of the PlayMatch community! 🙌
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#060f09;padding:20px;text-align:center;border-top:1px solid #1e5c33;">
              <p style="margin:0 0 8px;color:#e5e7eb;font-size:12px;">
                <a href="https://playmatch.games" style="color:#4ade80;text-decoration:none;">playmatch.games</a>
              </p>
              <p style="margin:0;color:#6b7280;font-size:11px;">
                © ${new Date().getFullYear()} PlayMatch. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();

      const text = `
Hey ${displayName}!

We're reaching out because we've recently fixed some login issues that may have affected your experience on PlayMatch.

✅ WHAT WE FIXED
We resolved a Firebase authentication issue that was causing intermittent login failures. If you had trouble signing in recently, it should work smoothly now!

💬 WE NEED YOUR FEEDBACK
Your input helps us make PlayMatch better! We'd love to hear:
- What do you love about PlayMatch?
- What features would you like to see next?
- Any bugs or issues we should know about?

Visit https://playmatch.games/dashboard to share your thoughts!

Thanks for being part of the PlayMatch community! 🙌

---
playmatch.games
      `.trim();

      try {
        await sgMail.send({
          to: user.email,
          from: {
            email: process.env.SENDGRID_FROM_EMAIL!,
            name: 'PlayMatch Team',
          },
          subject,
          text,
          html,
        });
        return { success: true, email: user.email };
      } catch (error) {
        console.error(`Failed to send to ${user.email}:`, error);
        return { success: false, email: user.email, error };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
      total: usersWithEmail.length,
      message: `Sent ${successful} emails, ${failed} failed`
    });

  } catch (error: any) {
    console.error('Send announcement error:', error);
    return NextResponse.json({
      error: 'Failed to send announcement',
      details: error.message
    }, { status: 500 });
  }
}
