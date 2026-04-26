/**
 * Cron: nudge-inactive-users
 *
 * Runs daily (Vercel Hobby limit). Finds users who signed up at least 3 hours
 * ago and at most 14 days ago, haven't uploaded any cards or created any teams,
 * and haven't been nudged yet. Sends them a friendly onboarding email walking
 * through the four-step flow (snap a card → build a team → simulate → invite
 * a friend) and marks them as nudged in Firestore so they only get the email
 * once.
 *
 * Why a wide window: the cron only fires once per day, so a tight 3-4 hour
 * window would miss anyone who signed up at the wrong time of day. The
 * `nudgedAt` guard makes it safe to widen the window — each user is still
 * nudged at most once. The 14-day upper bound prevents emailing dormant
 * accounts that pre-date this feature.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` automatically
 * when the CRON_SECRET env var is set. We require it here so the endpoint
 * cannot be triggered by anyone else.
 */
import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getFirestore();
}

function isAuthorized(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get('authorization') || '';
  // Vercel Cron format: "Bearer <CRON_SECRET>". Also allow x-cron-secret for manual testing.
  return header === `Bearer ${expected}` || req.headers.get('x-cron-secret') === expected;
}

const APP_URL = 'https://playmatch.games';

const SUBJECT = 'Hey, your dream team is waiting 👀';

function buildText() {
  return `Hey there,

You signed up for PlayMatch a few hours ago and I noticed you haven't added any cards yet — figured I'd send a quick note so you don't get lost.

Here's the whole game in 60 seconds:

1. Snap a card
Got a physical soccer or basketball card lying around? Pull out your phone, hit "Add Player," and point your camera at it. We'll read the player off the card and turn them into something you can actually play with. (Yes, even the duds your kid keeps trying to trade you.)

2. Build a team
Once you've got a few cards, drag your players into a starting lineup. Mix eras, mix leagues — put '92 Cantona next to '24 Vinícius, no one's stopping you. Same on hoops: stick MJ next to Embiid and see what happens.

3. Simulate a match
Pick your team, pick an opponent (one of your other teams, a friend's team, or a pre-built legendary squad — Pep's Barça, the '96 Bulls, etc.), hit Simulate. Live play-by-play commentary, goals, fouls, the works. Takes about 90 seconds.

4. Drag a friend in
Every team gets a share link. Send it to a buddy, they build their own team, now you've got a rivalry. This is where it actually gets fun.

That's it. The more cards you upload, the more dangerous your team gets.

Quick start:
→ ${APP_URL}/soccer for soccer
→ ${APP_URL}/basketball for hoops

No cards on you? No problem. Skip step 1 and run a match between two of our pre-built classic squads — Pep's Barcelona vs. Klopp's Liverpool, '96 Bulls vs. 2017 Warriors, whatever combo sounds fun. You'll see how matches play out, and when you find a card later you'll know exactly where it slots in.

If anything's confusing or broken, just hit reply — I built this myself and read every email.

— Dave
PlayMatch`;
}

function buildHtml() {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060f09;font-family:Arial,sans-serif;color:#e5e7eb;">
  <div style="max-width:540px;margin:32px auto;padding:0 16px;">

    <!-- Header -->
    <div style="background:#14532d;border-radius:14px 14px 0 0;border:1px solid #1e5c33;border-bottom:none;padding:32px 32px 24px;">
      <p style="margin:0 0 8px;color:#4ade80;font-size:10px;letter-spacing:4px;font-weight:bold;text-transform:uppercase;">PlayMatch</p>
      <h1 style="margin:0 0 12px;color:#ffffff;font-size:24px;line-height:1.3;">Hey, your dream team is waiting 👀</h1>
      <p style="margin:0;color:#a3c9a8;font-size:15px;line-height:1.55;">
        You signed up a few hours ago and I noticed you haven't added any cards yet — figured I'd send a quick note so you don't get lost.
      </p>
    </div>

    <!-- 60-second rundown -->
    <div style="background:#0d3b1f;border:1px solid #1e5c33;border-top:none;border-bottom:none;padding:8px 32px 24px;">
      <p style="margin:16px 0 16px;color:#4ade80;font-size:10px;letter-spacing:3px;font-weight:bold;text-transform:uppercase;">
        ★ The whole game in 60 seconds
      </p>

      <div style="margin:0 0 18px;">
        <p style="margin:0 0 4px;color:#ffffff;font-size:15px;font-weight:bold;">1. Snap a card 📸</p>
        <p style="margin:0;color:#a3c9a8;font-size:14px;line-height:1.55;">
          Got a physical soccer or basketball card lying around? Pull out your phone, hit "Add Player," and point your camera at it. We'll read the player off the card and turn them into something you can actually play with. (Yes, even the duds your kid keeps trying to trade you.)
        </p>
      </div>

      <div style="margin:0 0 18px;">
        <p style="margin:0 0 4px;color:#ffffff;font-size:15px;font-weight:bold;">2. Build a team ⚽🏀</p>
        <p style="margin:0;color:#a3c9a8;font-size:14px;line-height:1.55;">
          Once you've got a few cards, drag your players into a starting lineup. Mix eras, mix leagues — put '92 Cantona next to '24 Vinícius, no one's stopping you. Same on hoops: stick MJ next to Embiid and see what happens.
        </p>
      </div>

      <div style="margin:0 0 18px;">
        <p style="margin:0 0 4px;color:#ffffff;font-size:15px;font-weight:bold;">3. Simulate a match 🔥</p>
        <p style="margin:0;color:#a3c9a8;font-size:14px;line-height:1.55;">
          Pick your team, pick an opponent (one of your other teams, a friend's team, or a pre-built legendary squad — Pep's Barça, the '96 Bulls, etc.), hit Simulate. Live play-by-play commentary, goals, fouls, the works. Takes about 90 seconds.
        </p>
      </div>

      <div style="margin:0 0 6px;">
        <p style="margin:0 0 4px;color:#ffffff;font-size:15px;font-weight:bold;">4. Drag a friend in 🤝</p>
        <p style="margin:0;color:#a3c9a8;font-size:14px;line-height:1.55;">
          Every team gets a share link. Send it to a buddy, they build their own team, now you've got a rivalry. This is where it actually gets fun.
        </p>
      </div>
    </div>

    <!-- CTAs -->
    <div style="background:#0d3b1f;border:1px solid #1e5c33;border-top:none;border-bottom:none;padding:8px 32px 28px;">
      <p style="margin:0 0 12px;color:#4ade80;font-size:10px;letter-spacing:3px;font-weight:bold;text-transform:uppercase;">
        Quick start
      </p>
      <a href="${APP_URL}/soccer"
        style="display:inline-block;background:#4ade80;color:#052e16;font-size:14px;font-weight:bold;
               padding:12px 22px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;margin:0 10px 8px 0;">
        ⚽ Soccer
      </a>
      <a href="${APP_URL}/basketball"
        style="display:inline-block;background:#4ade80;color:#052e16;font-size:14px;font-weight:bold;
               padding:12px 22px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;margin:0 0 8px 0;">
        🏀 Basketball
      </a>
    </div>

    <!-- No-cards fallback -->
    <div style="background:#0d3b1f;border:1px solid #1e5c33;border-top:none;border-bottom:none;padding:8px 32px 24px;">
      <p style="margin:0 0 8px;color:#4ade80;font-size:10px;letter-spacing:3px;font-weight:bold;text-transform:uppercase;">
        No cards on you?
      </p>
      <p style="margin:0;color:#a3c9a8;font-size:14px;line-height:1.55;">
        No problem. Skip step 1 and run a match between two of our pre-built classic squads — Pep's Barcelona vs. Klopp's Liverpool, '96 Bulls vs. 2017 Warriors, whatever combo sounds fun. You'll see how matches play out, and when you find a card later you'll know exactly where it slots in.
      </p>
    </div>

    <!-- Sign-off -->
    <div style="background:#0d3b1f;border:1px solid #1e5c33;border-top:none;border-radius:0 0 14px 14px;padding:8px 32px 28px;">
      <p style="margin:0 0 10px;color:#a3c9a8;font-size:14px;line-height:1.55;">
        If anything's confusing or broken, just hit reply — I built this myself and read every email.
      </p>
      <p style="margin:0;color:#ffffff;font-size:14px;font-weight:bold;">— Dave</p>
      <p style="margin:0;color:#6b9e78;font-size:12px;">PlayMatch</p>
    </div>

    <!-- Footer -->
    <p style="margin:18px 0 0;color:#374a3c;font-size:11px;text-align:center;">
      PlayMatch · playmatch.games
    </p>

  </div>
</body>
</html>`;
}

interface NudgeResult {
  scanned: number;
  nudged: number;
  skipped: number;
  errors: number;
  details: Array<{ uid: string; email: string; status: string; reason?: string }>;
}

async function runNudge(): Promise<NudgeResult> {
  const result: NudgeResult = { scanned: 0, nudged: 0, skipped: 0, errors: 0, details: [] };

  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    throw new Error('SendGrid not configured');
  }

  const db = getAdminDb();

  const now = Date.now();
  const fourteenDaysAgo = Timestamp.fromMillis(now - 14 * 24 * 60 * 60 * 1000);
  const threeHoursAgo = Timestamp.fromMillis(now - 3 * 60 * 60 * 1000);

  // Users created between 14 days and 3 hours ago. The window has to be wide
  // enough that a once-per-day cron run doesn't permanently miss users —
  // anyone who signed up at the "wrong" hour would otherwise never be picked
  // up. The `nudgedAt` guard below makes this safe: each user is nudged at
  // most once, regardless of how many cron runs they fall inside.
  const usersSnap = await db
    .collection('users')
    .where('createdAt', '>=', fourteenDaysAgo)
    .where('createdAt', '<', threeHoursAgo)
    .get();

  result.scanned = usersSnap.size;
  if (usersSnap.empty) return result;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const data = userDoc.data();
    const email = (data.email || '').trim();

    // Already nudged → skip (idempotency).
    if (data.nudgedAt) {
      result.skipped += 1;
      result.details.push({ uid, email, status: 'skipped', reason: 'already nudged' });
      continue;
    }

    // No email → can't send.
    if (!email) {
      result.skipped += 1;
      result.details.push({ uid, email, status: 'skipped', reason: 'no email' });
      continue;
    }

    try {
      // Activity check: any teams or rosters with players counts as "engaged".
      // If they've made any of these, they don't need the nudge.
      const [
        soccerTeams,
        bballTeams,
        soccerRosters,
        bballRosters,
        soccerSims,
      ] = await Promise.all([
        db.collection('teams').where('userId', '==', uid).limit(1).get(),
        db.collection('basketballTeams').where('userId', '==', uid).limit(1).get(),
        db.collection('rosters').where('userId', '==', uid).limit(1).get(),
        db.collection('basketballRosters').where('userId', '==', uid).limit(1).get(),
        db.collection('matchHistory').where('userId', '==', uid).limit(1).get(),
      ]);

      const hasRosterPlayers = (snap: FirebaseFirestore.QuerySnapshot) =>
        snap.docs.some(d => Array.isArray(d.data().players) && d.data().players.length > 0);

      const hasActivity =
        !soccerTeams.empty ||
        !bballTeams.empty ||
        !soccerSims.empty ||
        hasRosterPlayers(soccerRosters) ||
        hasRosterPlayers(bballRosters);

      if (hasActivity) {
        // Mark them so we don't re-check next hour. Treat as a "no nudge needed".
        await userDoc.ref.update({
          nudgedAt: FieldValue.serverTimestamp(),
          nudgeReason: 'engaged-before-nudge',
        });
        result.skipped += 1;
        result.details.push({ uid, email, status: 'skipped', reason: 'already engaged' });
        continue;
      }

      // Send the nudge.
      await sgMail.send({
        to: email,
        from: { email: process.env.SENDGRID_FROM_EMAIL!, name: 'Dave at PlayMatch' },
        replyTo: 'davidpolonsky@gmail.com',
        bcc: 'davidpolonsky@gmail.com',
        subject: SUBJECT,
        text: buildText(),
        html: buildHtml(),
      });

      await userDoc.ref.update({
        nudgedAt: FieldValue.serverTimestamp(),
        nudgeReason: 'inactive-3h',
      });

      result.nudged += 1;
      result.details.push({ uid, email, status: 'nudged' });
    } catch (err: any) {
      console.error(`Nudge error for ${uid} (${email}):`, err?.response?.body || err);
      result.errors += 1;
      result.details.push({ uid, email, status: 'error', reason: err?.message || 'unknown' });
    }
  }

  return result;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await runNudge();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('nudge-inactive-users cron error:', err);
    return NextResponse.json({ error: err?.message || 'Cron failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
