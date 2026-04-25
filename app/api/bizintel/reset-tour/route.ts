import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return false;
  return req.headers.get('x-admin-secret') === expected;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: 'uid required' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('users').doc(uid).update({
      hasSeenOnboardingTour: false,
      onboardingCompletedAt: FieldValue.delete(),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('reset-tour error:', err);
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}
