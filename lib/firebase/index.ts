// Barrel file - re-export all Firebase utilities
export { auth, db, storage, googleProvider, default } from './config';
export { signInWithGoogle, signOut, onAuthChange } from './auth';
