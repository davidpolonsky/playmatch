/**
 * Admin API: Generate invite codes
 *
 * POST /api/admin/invite-codes
 * Headers: x-admin-secret: <ADMIN_SECRET env var>
 * Body: { count?: number; createdFor?: string }
 *
 * Returns: { codes: string[] }
 *
 * GET /api/admin/invite-codes
 * Headers: x-admin-secret: <ADMIN_SECRET env var>
 * Returns: { codes: InviteCode[] } — all codes, newest first
 */
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

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part = '';
  for (let i = 0; i < 6; i++) part += chars[Math.floor(Math.random() * chars.length)];
  return `PLAY-${part}`;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false; // must set ADMIN_SECRET env var
  return req.headers.get('x-admin-secret') === secret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const count = Math.min(Number(body.count) || 1, 50); // max 50 at once
  const createdFor: string = body.createdFor || '';

  try {
    const db = getAdminDb();
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      const code = generateCode();
      await db.collection('inviteCodes').doc(code).set({
        code,
        used: false,
        usedBy: null,
        usedAt: null,
        createdAt: FieldValue.serverTimestamp(),
        ...(createdFor ? { createdFor } : {}),
      });
      codes.push(code);
    }

    return NextResponse.json({ codes });
  } catch (err: any) {
    console.error('Admin invite-codes error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const snap = await db
      .collection('inviteCodes')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();

    const codes = snap.docs.map(d => {
      const data = d.data();
      return {
        code: data.code,
        used: data.used,
        usedBy: data.usedBy || null,
        createdFor: data.createdFor || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        usedAt: data.usedAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ codes });
  } catch (err: any) {
    console.error('Admin invite-codes GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
