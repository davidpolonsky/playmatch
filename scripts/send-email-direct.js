#!/usr/bin/env node

/**
 * Direct email sender - bypasses the API route
 * Usage: node scripts/send-email-direct.js
 */

require('dotenv').config({ path: '.env.local' });
const sgMail = require('@sendgrid/mail');
const admin = require('firebase-admin');

// Colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

async function main() {
  console.log(`${colors.yellow}PlayMatch - Send Announcement Email (Direct)${colors.reset}`);
  console.log('='.repeat(50));
  console.log('');

  // Check SendGrid
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    console.error(`${colors.red}ERROR: SendGrid not configured${colors.reset}`);
    console.log('Add SENDGRID_API_KEY and SENDGRID_FROM_EMAIL to .env.local');
    process.exit(1);
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  // Initialize Firebase Admin
  try {
    if (!admin.apps.length) {
      // Try to load from file first (for local development)
      const fs = require('fs');
      const path = require('path');
      const serviceAccountPath = path.join(__dirname, '../playmatch-service-account.json');

      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else {
        admin.initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      }
    }
  } catch (error) {
    console.error(`${colors.red}ERROR: Firebase Admin init failed${colors.reset}`);
    console.error(error.message);
    process.exit(1);
  }

  const db = admin.firestore();

  // Get all users
  console.log('Fetching users from Firestore...');
  const usersSnapshot = await db.collection('users').get();
  const users = usersSnapshot.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  }));

  console.log(`Found ${users.length} users`);

  const usersWithEmail = users.filter(u => u.email);
  console.log(`${usersWithEmail.length} users have email addresses`);
  console.log('');

  if (usersWithEmail.length === 0) {
    console.log(`${colors.yellow}No users to email. Exiting.${colors.reset}`);
    process.exit(0);
  }

  // Confirm
  console.log(`${colors.yellow}⚠️  WARNING: This will email ${usersWithEmail.length} users${colors.reset}`);
  console.log('');

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const confirmed = await new Promise(resolve => {
    readline.question('Type "yes" to continue: ', answer => {
      readline.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });

  if (!confirmed) {
    console.log('Cancelled.');
    process.exit(0);
  }

  console.log('');
  console.log('Sending emails...');

  // Send emails
  let sent = 0;
  let failed = 0;

  for (const user of usersWithEmail) {
    const displayName = user.displayName || 'there';
    const subject = '✅ Login Issues Fixed + We Want Your Feedback!';

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
          <tr>
            <td style="background:#060f09;padding:24px;text-align:center;border-bottom:1px solid #1e5c33;">
              <p style="margin:0;font-size:32px;">⚽</p>
              <p style="margin:8px 0 0;color:#4ade80;font-size:14px;letter-spacing:3px;font-weight:bold;text-transform:uppercase;">PlayMatch</p>
            </td>
          </tr>
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
          email: process.env.SENDGRID_FROM_EMAIL,
          name: 'PlayMatch Team',
        },
        subject,
        text,
        html,
      });
      sent++;
      process.stdout.write('.');
    } catch (error) {
      failed++;
      process.stdout.write('x');
      console.error(`\nFailed to send to ${user.email}:`, error.message);
    }
  }

  console.log('\n');
  console.log(`${colors.green}✅ Complete!${colors.reset}`);
  console.log(`Sent: ${sent}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${usersWithEmail.length}`);
  process.exit(0);
}

main().catch(error => {
  console.error(`${colors.red}ERROR:${colors.reset}`, error);
  process.exit(1);
});
