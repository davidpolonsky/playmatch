import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getAdminApp() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
}

function getAdminDb() {
  getAdminApp();
  return getFirestore();
}

function getAdminAuth() {
  getAdminApp();
  return getAuth();
}

function isAuthorized(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  return secret && req.headers.get('x-admin-secret') === secret;
}

// Fetch all Firebase Auth users and return a uid→email map
async function getAllAuthEmails(): Promise<Record<string, string>> {
  const auth = getAdminAuth();
  const emailMap: Record<string, string> = {};
  let pageToken: string | undefined;
  do {
    const result = await auth.listUsers(1000, pageToken);
    result.users.forEach(u => {
      if (u.email) emailMap[u.uid] = u.email;
    });
    pageToken = result.pageToken;
  } while (pageToken);
  return emailMap;
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
      soccerRostersSnap,
      bballRostersSnap,
      waitlistSnap,
    ] = await Promise.all([
      db.collection('users').get(),
      db.collection('teams').get(),
      db.collection('basketballTeams').get(),
      db.collection('matchHistory').get(),
      db.collection('basketballHistory').get(),
      db.collection('rosters').get(),
      db.collection('basketballRosters').get(),
      db.collection('waitlist').orderBy('createdAt', 'desc').get(),
    ]);

    // Get all Auth user emails (covers users who existed before createUserDoc was added)
    const authEmails = await getAllAuthEmails();

    // Build email map: Firestore users collection first, then fill gaps from Auth
    const userEmails: Record<string, string> = { ...authEmails };
    usersSnap.docs.forEach(d => {
      if (d.data().email) userEmails[d.id] = d.data().email;
    });

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

    // Soccer cards: count players in each user's roster doc
    const soccerCardsByUser: Record<string, number> = {};
    soccerRostersSnap.docs.forEach(d => {
      const uid = d.data().userId;
      if (!uid) return;
      const count = Array.isArray(d.data().players) ? d.data().players.length : 0;
      soccerCardsByUser[uid] = (soccerCardsByUser[uid] || 0) + count;
    });

    // Basketball cards: count players in each user's basketball roster doc
    const bballCardsByUser: Record<string, number> = {};
    bballRostersSnap.docs.forEach(d => {
      const uid = d.data().userId;
      if (!uid) return;
      const count = Array.isArray(d.data().players) ? d.data().players.length : 0;
      bballCardsByUser[uid] = (bballCardsByUser[uid] || 0) + count;
    });

    // Build per-user breakdown (union of all known UIDs)
    const allUids = new Set([
      ...Object.keys(soccerTeamsByUser),
      ...Object.keys(bballTeamsByUser),
      ...Object.keys(soccerSimsByUser),
      ...Object.keys(bballSimsByUser),
      ...Object.keys(soccerCardsByUser),
      ...Object.keys(bballCardsByUser),
      ...Object.keys(authEmails),
      ...usersSnap.docs.map(d => d.id),
    ]);

    const perUser = Array.from(allUids).map(uid => ({
      uid,
      email: userEmails[uid] || '',
      soccerTeams: soccerTeamsByUser[uid] || 0,
      basketballTeams: bballTeamsByUser[uid] || 0,
      soccerSims: soccerSimsByUser[uid] || 0,
      basketballSims: bballSimsByUser[uid] || 0,
      soccerCards: soccerCardsByUser[uid] || 0,
      basketballCards: bballCardsByUser[uid] || 0,
    }));

    // Waitlist entries with emails + invited status
    const waitlistEntries = waitlistSnap.docs.map(d => ({
      email: d.data().email || '',
      sport: d.data().sport || 'soccer',
      createdAt: d.data().createdAt?.toDate?.()?.toLocaleString('en-US', { timeZone: 'America/New_York' }) || '',
      invitedAt: d.data().invitedAt?.toDate?.()?.toLocaleString('en-US', { timeZone: 'America/New_York' }) || null,
    }));

    return NextResponse.json({
      users: allUids.size,
      authUsers: Object.keys(authEmails).length,
      soccerCards: Object.values(soccerCardsByUser).reduce((a, b) => a + b, 0),
      basketballCards: Object.values(bballCardsByUser).reduce((a, b) => a + b, 0),
      soccerTeams: soccerTeamsSnap.size,
      basketballTeams: basketballTeamsSnap.size,
      soccerSims: soccerSimsSnap.size,
      basketballSims: basketballSimsSnap.size,
      waitlist: waitlistSnap.size,
      waitlistEntries,
      perUser,
    });
  } catch (err: any) {
    console.error('BizIntel error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
