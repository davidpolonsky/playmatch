import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();

    // Fetch all collections in parallel
    const [
      usersSnap,
      soccerTeamsSnap,
      basketballTeamsSnap,
      soccerSimsSnap,
      basketballSimsSnap,
      rateLimitsSnap,
      waitlistSnap,
    ] = await Promise.all([
      db.collection('users').get(),
      db.collection('teams').get(),
      db.collection('basketballTeams').get(),
      db.collection('matchHistory').get(),
      db.collection('basketballHistory').get(),
      db.collection('rateLimits').get(),            // soccer card uploads
      db.collection('inviteCodes').where('used', '==', false).get(), // unused codes ≈ waitlist proxy
    ]);

    // Build per-user maps
    const userEmails: Record<string, string> = {};
    usersSnap.docs.forEach(d => { userEmails[d.id] = d.data().email || ''; });

    // Soccer teams per user
    const soccerTeamsByUser: Record<string, number> = {};
    soccerTeamsSnap.docs.forEach(d => {
      const uid = d.data().userId;
      if (uid) soccerTeamsByUser[uid] = (soccerTeamsByUser[uid] || 0) + 1;
    });

    // Basketball teams per user
    const bballTeamsByUser: Record<string, number> = {};
    basketballTeamsSnap.docs.forEach(d => {
      const uid = d.data().userId;
      if (uid) bballTeamsByUser[uid] = (bballTeamsByUser[uid] || 0) + 1;
    });

    // Soccer sims per user (matchHistory has userId)
    const soccerSimsByUser: Record<string, number> = {};
    soccerSimsSnap.docs.forEach(d => {
      const uid = d.data().userId;
      if (uid) soccerSimsByUser[uid] = (soccerSimsByUser[uid] || 0) + 1;
    });

    // Basketball sims per user (basketballHistory has teamId; map via teams)
    const bballTeamOwner: Record<string, string> = {};
    basketballTeamsSnap.docs.forEach(d => { bballTeamOwner[d.id] = d.data().userId || ''; });
    const bballSimsByUser: Record<string, number> = {};
    basketballSimsSnap.docs.forEach(d => {
      const uid = bballTeamOwner[d.data().teamId] || '';
      if (uid) bballSimsByUser[uid] = (bballSimsByUser[uid] || 0) + 1;
    });

    // Soccer cards uploaded per user (rateLimits collection)
    const soccerCardsByUser: Record<string, number> = {};
    rateLimitsSnap.docs.forEach(d => {
      soccerCardsByUser[d.id] = d.data().cardUploads || 0;
    });

    // Build per-user breakdown (union of all known UIDs)
    const allUids = new Set([
      ...Object.keys(soccerTeamsByUser),
      ...Object.keys(bballTeamsByUser),
      ...Object.keys(soccerSimsByUser),
      ...Object.keys(bballSimsByUser),
      ...usersSnap.docs.map(d => d.id),
    ]);

    const perUser = Array.from(allUids).map(uid => ({
      email: userEmails[uid] || '',
      soccerTeams: soccerTeamsByUser[uid] || 0,
      basketballTeams: bballTeamsByUser[uid] || 0,
      soccerSims: soccerSimsByUser[uid] || 0,
      basketballSims: bballSimsByUser[uid] || 0,
      soccerCards: soccerCardsByUser[uid] || 0,
    }));

    return NextResponse.json({
      users: usersSnap.size,
      soccerCards: Object.values(soccerCardsByUser).reduce((a, b) => a + b, 0),
      basketballCards: 0, // basketball card uploads not tracked via rateLimits yet
      soccerTeams: soccerTeamsSnap.size,
      basketballTeams: basketballTeamsSnap.size,
      soccerSims: soccerSimsSnap.size,
      basketballSims: basketballSimsSnap.size,
      waitlist: waitlistSnap.size, // unused invite codes as a proxy
      perUser,
    });
  } catch (err: any) {
    console.error('BizIntel error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
