require('dotenv').config({ path: '.env.local' });
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

async function resetOnboarding(email) {
  const usersSnap = await db.collection('users').where('email', '==', email).get();

  if (usersSnap.empty) {
    console.log('User not found:', email);
    return;
  }

  const userDoc = usersSnap.docs[0];
  console.log('Found user:', userDoc.id);
  console.log('Email:', userDoc.data().email);

  await userDoc.ref.update({
    hasSeenOnboardingTour: false,
    onboardingCompletedAt: FieldValue.delete(),
  });

  console.log('✅ Reset onboarding tour flag - user will see tour on next login');
}

const email = process.argv[2] || 'davidpolonsky+1@gmail.com';
resetOnboarding(email).catch(console.error);
