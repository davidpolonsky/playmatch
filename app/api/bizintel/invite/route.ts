import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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
  const secret = process.env.ADMIN_SECRET;
  return secret && req.headers.get('x-admin-secret') === secret;
}

function formatShareId(raw: string) {
  if (raw.includes('-')) return raw;
  return raw.slice(0, 3) + '-' + raw.slice(3);
}

const SOCCER_LEGENDS = [
  { name: 'Barcelona Dream Team', description: 'Messi, Xavi, Iniesta, Puyol — the greatest club team ever assembled.' },
  { name: 'Real Madrid Galácticos', description: 'Zidane, Ronaldo, Figo, Beckham — peak Galácticos era.' },
  { name: 'Chelsea All-Time XI', description: 'Lampard, Drogba, Hazard, Terry — Stamford Bridge legends.' },
  { name: 'Brazil 1970', description: 'Pelé, Jairzinho, Rivelino — the most beautiful team in World Cup history.' },
  { name: 'Manchester United 1999', description: 'Keane, Giggs, Scholes, Sheringham — treble winners.' },
  { name: 'England 2026 World Cup', description: 'Bellingham, Kane, Saka — the golden generation.' },
];

const BASKETBALL_LEGENDS = [
  { name: '1992 USA Dream Team', description: 'Jordan, Magic, Bird, Barkley — the greatest team ever assembled.' },
  { name: '1995-96 Chicago Bulls', description: '72-10. Jordan and Pippen at peak dominance.' },
  { name: '1985-86 Boston Celtics', description: "Bird, McHale, Parish — Larry Legend's masterpiece." },
  { name: '2015-16 Golden State Warriors', description: '73-9 with Curry and the Splash Brothers.' },
  { name: 'Eurozone 2020s', description: 'Jokic, Luka, Giannis — three MVPs in one lineup.' },
];

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email, sport } = await req.json();
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

    const isBball = sport === 'basketball';
    const db = getAdminDb();

    // Fetch up to 3 real custom teams with shareIds to feature in the email
    const teamsCollection = isBball ? 'basketballTeams' : 'teams';
    const teamsSnap = await db.collection(teamsCollection)
      .where('shareId', '!=', '')
      .limit(20)
      .get();

    // Pick teams that have a shareId and a name — take 3 varied ones
    const realTeams = teamsSnap.docs
      .map(d => ({ name: d.data().name, shareId: d.data().shareId, formation: d.data().formation || d.data().lineup || '' }))
      .filter(t => t.name && t.shareId)
      .slice(0, 3);

    const legends = isBball ? BASKETBALL_LEGENDS : SOCCER_LEGENDS;
    const sportLabel = isBball ? 'Basketball 🏀' : 'Soccer ⚽';
    const appUrl = 'https://playmatch.games';

    // Build legend rows HTML
    const legendRowsHtml = legends.map(l => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1a3520;">
          <p style="margin:0 0 3px;color:#ffffff;font-size:14px;font-weight:bold;">${l.name}</p>
          <p style="margin:0;color:#6b9e78;font-size:12px;">${l.description}</p>
        </td>
      </tr>`).join('');

    // Build custom team rows HTML
    const customRowsHtml = realTeams.length > 0
      ? realTeams.map(t => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #1a3520;">
          <p style="margin:0 0 3px;color:#ffffff;font-size:14px;font-weight:bold;">${t.name}</p>
          <p style="margin:0;color:#4ade80;font-size:12px;font-family:monospace;">ID: ${formatShareId(t.shareId)}${t.formation ? ' · ' + t.formation : ''}</p>
        </td>
      </tr>`).join('')
      : `<tr><td style="padding:10px 0;color:#6b9e78;font-size:12px;">More real teams coming soon — sign up to create your own!</td></tr>`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060f09;font-family:Arial,sans-serif;color:#e5e7eb;">
  <div style="max-width:520px;margin:32px auto;padding:0 16px;">

    <!-- Header -->
    <div style="background:#14532d;border-radius:14px 14px 0 0;border:1px solid #1e5c33;border-bottom:none;padding:32px 32px 24px;">
      <p style="margin:0 0 8px;color:#4ade80;font-size:10px;letter-spacing:4px;font-weight:bold;text-transform:uppercase;">PlayMatch</p>
      <h1 style="margin:0 0 12px;color:#ffffff;font-size:26px;line-height:1.2;">You're in. 🎉</h1>
      <p style="margin:0;color:#a3c9a8;font-size:15px;line-height:1.5;">
        You're off the waitlist — PlayMatch ${sportLabel} is ready for you.
        Scan your cards, build your squad, and challenge legendary teams.
      </p>
    </div>

    <!-- CTA button -->
    <div style="background:#0d3b1f;border:1px solid #1e5c33;border-top:none;border-bottom:none;padding:24px 32px;">
      <a href="${appUrl}"
        style="display:inline-block;background:#4ade80;color:#052e16;font-size:15px;font-weight:bold;
               padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.5px;">
        Start Playing →
      </a>
      <p style="margin:12px 0 0;color:#4b7a58;font-size:11px;">${appUrl}</p>
    </div>

    <!-- Legendary teams -->
    <div style="background:#0d3b1f;border:1px solid #1e5c33;border-top:none;border-bottom:none;padding:24px 32px;">
      <p style="margin:0 0 16px;color:#4ade80;font-size:10px;letter-spacing:3px;font-weight:bold;text-transform:uppercase;">
        ★ Legendary Teams to Challenge
      </p>
      <table style="width:100%;border-collapse:collapse;">
        ${legendRowsHtml}
      </table>
      <p style="margin:14px 0 0;color:#4b7a58;font-size:11px;">
        Find all legendary teams in the ${isBball ? 'Basketball → Teams' : 'Simulate Match'} tab.
      </p>
    </div>

    <!-- Real custom teams -->
    <div style="background:#0d3b1f;border:1px solid #1e5c33;border-top:none;border-bottom:none;padding:24px 32px;">
      <p style="margin:0 0 16px;color:#4ade80;font-size:10px;letter-spacing:3px;font-weight:bold;text-transform:uppercase;">
        ⚡ Challenge a Real Player's Team
      </p>
      <table style="width:100%;border-collapse:collapse;">
        ${customRowsHtml}
      </table>
      <p style="margin:14px 0 0;color:#4b7a58;font-size:11px;">
        In the Teams tab, tap <strong style="color:#6b9e78;">"Add a Friend's Team by ID"</strong> and paste any ID above to add it as a rival.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#071a0f;border:1px solid #1e5c33;border-top:none;border-radius:0 0 14px 14px;padding:20px 32px;">
      <p style="margin:0;color:#374a3c;font-size:11px;text-align:center;">
        PlayMatch · playmatch.games<br>
        You're receiving this because you joined the waitlist.
      </p>
    </div>

  </div>
</body>
</html>`.trim();

    // Send the invite email to the waitlist person
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
      return NextResponse.json({ error: 'SendGrid not configured' }, { status: 500 });
    }

    await sgMail.send({
      to: email,
      from: { email: process.env.SENDGRID_FROM_EMAIL, name: 'PlayMatch' },
      bcc: 'davidpolonsky@gmail.com',
      subject: "You're off the waitlist — PlayMatch is ready for you 🎮",
      text: `Great news — you're off the waitlist! Start playing at ${appUrl}.\n\nLegendary teams to challenge:\n${legends.map(l => `• ${l.name} — ${l.description}`).join('\n')}\n\nReal teams to challenge:\n${realTeams.map(t => `• ${t.name} (ID: ${formatShareId(t.shareId)})`).join('\n') || '• More coming soon!'}\n\nIn the Teams tab, use "Add a Friend's Team by ID" to challenge any real team above.`,
      html,
    });

    // Mark as invited in Firestore (update any docs matching this email)
    const waitlistQuery = await db.collection('waitlist').where('email', '==', email).get();
    const batch = db.batch();
    waitlistQuery.docs.forEach(doc => {
      batch.update(doc.ref, { invitedAt: FieldValue.serverTimestamp() });
    });
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Invite error:', err?.response?.body || err);
    return NextResponse.json({ error: err?.message || 'Failed to send invite' }, { status: 500 });
  }
}
