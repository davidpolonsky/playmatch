import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  setDoc,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

// ── Record types ──────────────────────────────────────────────
export interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
}

const TEAM_RECORDS_COLLECTION = 'teamRecords';
const LEGENDARY_RECORDS_COLLECTION = 'legendaryRecords';
const MATCH_HISTORY_COLLECTION = 'matchHistory';

// ── Share ID helpers ───────────────────────────────────────────
// Generate a random 7-digit numeric string
export const generateShareId = (): string =>
  String(Math.floor(1000000 + Math.random() * 9000000));

// Format "1234567" → "123-4567"
export const formatShareId = (id: string): string =>
  id.length === 7 ? `${id.slice(0, 3)}-${id.slice(3)}` : id;

// Strip formatting back to raw 7 digits
export const parseShareId = (input: string): string =>
  input.replace(/\D/g, '').slice(0, 7);

// Update W/L/T for a regular team (any authenticated user can call this)
export const updateTeamRecord = async (teamId: string, result: 'win' | 'loss' | 'tie') => {
  const ref = doc(db, TEAM_RECORDS_COLLECTION, teamId);
  const field = result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'ties';
  await setDoc(ref, { [field]: increment(1) }, { merge: true });
};

// Batch-fetch records for a list of team IDs
export const getTeamRecords = async (teamIds: string[]): Promise<Record<string, TeamRecord>> => {
  if (teamIds.length === 0) return {};
  const snaps = await Promise.all(teamIds.map(id => getDoc(doc(db, TEAM_RECORDS_COLLECTION, id))));
  const records: Record<string, TeamRecord> = {};
  snaps.forEach((snap, i) => {
    records[teamIds[i]] = snap.exists()
      ? (snap.data() as TeamRecord)
      : { wins: 0, losses: 0, ties: 0 };
  });
  return records;
};

// Update legendary team record for a specific user
export const updateLegendaryRecord = async (userId: string, legendaryTeamId: string, result: 'win' | 'loss' | 'tie') => {
  const docId = `${userId}_${legendaryTeamId}`;
  const ref = doc(db, LEGENDARY_RECORDS_COLLECTION, docId);
  const field = result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'ties';
  await setDoc(ref, { userId, legendaryTeamId, [field]: increment(1) }, { merge: true });
};

// Fetch all legendary records for a user (returns map of legendaryTeamId → record)
export const getUserLegendaryRecords = async (userId: string): Promise<Record<string, TeamRecord>> => {
  const q = query(collection(db, LEGENDARY_RECORDS_COLLECTION), where('userId', '==', userId));
  const snap = await getDocs(q);
  const records: Record<string, TeamRecord> = {};
  snap.docs.forEach(d => {
    const data = d.data();
    records[data.legendaryTeamId] = { wins: data.wins ?? 0, losses: data.losses ?? 0, ties: data.ties ?? 0 };
  });
  return records;
};

export interface Player {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  rating: number;
  imageUrl: string;
  isHistorical?: boolean;
  year?: string;
}

export interface Team {
  id?: string;
  shareId?: string;
  name: string;
  formation: string;
  players: Player[];
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  wins?: number;
  losses?: number;
  ties?: number;
}

export interface MatchResult {
  id?: string;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  summary: string;
  userId: string;
  createdAt: Timestamp;
}

const TEAMS_COLLECTION = 'teams';
const MATCHES_COLLECTION = 'matches';
const SAVED_TEAMS_COLLECTION = 'savedTeams';

// ── Saved / followed teams ─────────────────────────────────────

// Save a reference to another user's team (docId = userId_teamId)
export const addSavedTeam = async (userId: string, teamId: string): Promise<void> => {
  const docId = `${userId}_${teamId}`;
  await setDoc(doc(db, SAVED_TEAMS_COLLECTION, docId), { userId, teamId }, { merge: true });
};

// Get all saved team IDs for a user
export const getSavedTeamIds = async (userId: string): Promise<string[]> => {
  const q = query(collection(db, SAVED_TEAMS_COLLECTION), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data().teamId as string);
};

// Remove a saved team reference
export const removeSavedTeam = async (userId: string, teamId: string): Promise<void> => {
  const docId = `${userId}_${teamId}`;
  await deleteDoc(doc(db, SAVED_TEAMS_COLLECTION, docId));
};

// Save a team to Firestore (auto-generates a 7-digit shareId)
export const saveTeam = async (team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const shareId = team.shareId || generateShareId();
    const docRef = await addDoc(collection(db, TEAMS_COLLECTION), {
      ...team,
      shareId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving team:', error);
    throw error;
  }
};

// Ensure an existing team has a shareId; generates + saves one if missing
export const ensureShareId = async (teamId: string): Promise<string> => {
  const ref = doc(db, TEAMS_COLLECTION, teamId);
  const snap = await getDoc(ref);
  const data = snap.data();
  if (data?.shareId) return data.shareId as string;
  const shareId = generateShareId();
  await updateDoc(ref, { shareId });
  return shareId;
};

// Find a team by its 7-digit shareId
export const getTeamByShareId = async (shareId: string): Promise<Team | null> => {
  const q = query(collection(db, TEAMS_COLLECTION), where('shareId', '==', shareId), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Team;
};

// Get all teams for a user
export const getUserTeams = async (userId: string): Promise<Team[]> => {
  try {
    const q = query(collection(db, TEAMS_COLLECTION), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Team));
  } catch (error) {
    console.error('Error getting user teams:', error);
    throw error;
  }
};

// Get a specific team
export const getTeam = async (teamId: string): Promise<Team | null> => {
  try {
    const docRef = doc(db, TEAMS_COLLECTION, teamId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Team;
    }
    return null;
  } catch (error) {
    console.error('Error getting team:', error);
    throw error;
  }
};

// Update a team
export const updateTeam = async (teamId: string, updates: Partial<Team>) => {
  try {
    const docRef = doc(db, TEAMS_COLLECTION, teamId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating team:', error);
    throw error;
  }
};

// Delete a team
export const deleteTeam = async (teamId: string) => {
  try {
    await deleteDoc(doc(db, TEAMS_COLLECTION, teamId));
  } catch (error) {
    console.error('Error deleting team:', error);
    throw error;
  }
};

// Get all teams
export const getAllTeams = async (): Promise<Team[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, TEAMS_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Team));
  } catch (error) {
    console.error('Error getting all teams:', error);
    throw error;
  }
};

// Save match result
export const saveMatchResult = async (match: Omit<MatchResult, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, MATCHES_COLLECTION), {
      ...match,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving match result:', error);
    throw error;
  }
};

// Get user's match history
export const getUserMatches = async (userId: string): Promise<MatchResult[]> => {
  try {
    const q = query(collection(db, MATCHES_COLLECTION), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MatchResult));
  } catch (error) {
    console.error('Error getting user matches:', error);
    throw error;
  }
};

export interface UserRoster {
  id?: string;
  userId: string;
  players: Player[];
  updatedAt: Timestamp;
}

const ROSTERS_COLLECTION = 'rosters';
const RATE_LIMITS_COLLECTION = 'rateLimits';
const USERS_COLLECTION = 'users';
const ADMIN_STATS_COLLECTION = 'adminStats';

// Rate limiting constants
const MAX_CARDS_PER_DAY = 50;
const MAX_TOTAL_CARDS = 75;
const MAX_SIMULATIONS_PER_DAY = 12;

const ADMIN_EMAIL = 'davidpolonsky@gmail.com';

// Rate limiting helpers
const getTodayDateString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

export const checkCardUploadLimit = async (userId: string, newCardCount: number): Promise<{ allowed: boolean; reason?: string }> => {
  const today = getTodayDateString();
  const rateLimitRef = doc(db, RATE_LIMITS_COLLECTION, `${userId}_${today}`);

  try {
    const rateLimitDoc = await getDoc(rateLimitRef);
    const currentUploads = rateLimitDoc.exists() ? (rateLimitDoc.data().cardUploads || 0) : 0;

    // Check daily limit
    if (currentUploads + newCardCount > MAX_CARDS_PER_DAY) {
      return { allowed: false, reason: `Daily limit reached. You can upload ${MAX_CARDS_PER_DAY} cards per day. Try again tomorrow!` };
    }

    // Check total cards limit
    const roster = await getUserRoster(userId);
    if (roster.length + newCardCount > MAX_TOTAL_CARDS) {
      return { allowed: false, reason: `Card limit reached. Maximum ${MAX_TOTAL_CARDS} total cards allowed.` };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking card upload limit:', error);
    return { allowed: true }; // Allow on error to not block users
  }
};

export const incrementCardUploadCount = async (userId: string, count: number = 1): Promise<void> => {
  const today = getTodayDateString();
  const rateLimitRef = doc(db, RATE_LIMITS_COLLECTION, `${userId}_${today}`);
  await setDoc(rateLimitRef, { cardUploads: increment(count), date: today }, { merge: true });
};

export const checkSimulationLimit = async (userId: string): Promise<{ allowed: boolean; reason?: string }> => {
  const today = getTodayDateString();
  const rateLimitRef = doc(db, RATE_LIMITS_COLLECTION, `${userId}_${today}`);

  try {
    const rateLimitDoc = await getDoc(rateLimitRef);
    const currentSimulations = rateLimitDoc.exists() ? (rateLimitDoc.data().simulations || 0) : 0;

    if (currentSimulations >= MAX_SIMULATIONS_PER_DAY) {
      return { allowed: false, reason: `Daily simulation limit reached. You can run ${MAX_SIMULATIONS_PER_DAY} simulations per day. Try again tomorrow!` };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking simulation limit:', error);
    return { allowed: true }; // Allow on error to not block users
  }
};

export const incrementSimulationCount = async (userId: string): Promise<void> => {
  const today = getTodayDateString();
  const rateLimitRef = doc(db, RATE_LIMITS_COLLECTION, `${userId}_${today}`);
  await setDoc(rateLimitRef, { simulations: increment(1), date: today }, { merge: true });
};

// Track new user signups and send admin notification
export const trackNewUserSignup = async (userId: string, email: string, displayName: string | null): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);

    // Only track if this is a new user
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        email,
        displayName,
        signupDate: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      // Send admin notification
      fetch('/api/admin-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_user',
          data: {
            email,
            displayName,
            timestamp: new Date().toISOString(),
          },
        }),
      }).catch(err => console.error('Failed to send admin notification:', err));
    }
  } catch (error) {
    console.error('Error tracking new user:', error);
  }
};

// Track global simulation count and send notifications every 5 (excluding admin)
export const trackSimulation = async (userEmail: string): Promise<void> => {
  try {
    // Skip if admin
    if (userEmail === ADMIN_EMAIL) return;

    const statsRef = doc(db, ADMIN_STATS_COLLECTION, 'global');
    const statsDoc = await getDoc(statsRef);

    let currentCount = 0;
    if (statsDoc.exists()) {
      currentCount = statsDoc.data().simulationCount || 0;
    }

    const newCount = currentCount + 1;

    await setDoc(statsRef, {
      simulationCount: newCount,
      lastUpdated: serverTimestamp(),
      lastUserEmail: userEmail,
    }, { merge: true });

    // Send notification every 5 simulations
    if (newCount % 5 === 0) {
      fetch('/api/admin-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'simulation_milestone',
          data: {
            count: newCount,
            lastUserEmail: userEmail,
          },
        }),
      }).catch(err => console.error('Failed to send admin notification:', err));
    }
  } catch (error) {
    console.error('Error tracking simulation:', error);
  }
};

// Save user's roster (uploaded players)
export const saveUserRoster = async (userId: string, players: Player[]) => {
  try {
    const q = query(collection(db, ROSTERS_COLLECTION), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const rosterData = {
      userId,
      players,
      updatedAt: serverTimestamp()
    };

    if (querySnapshot.empty) {
      // Create new roster
      const docRef = await addDoc(collection(db, ROSTERS_COLLECTION), rosterData);
      return docRef.id;
    } else {
      // Update existing roster
      const existingDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, ROSTERS_COLLECTION, existingDoc.id), rosterData);
      return existingDoc.id;
    }
  } catch (error) {
    console.error('Error saving user roster:', error);
    throw error;
  }
};

// Get user's roster (uploaded players)
export const getUserRoster = async (userId: string): Promise<Player[]> => {
  try {
    const q = query(collection(db, ROSTERS_COLLECTION), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return [];
    }
    
    const rosterDoc = querySnapshot.docs[0];
    const rosterData = rosterDoc.data() as UserRoster;
    return rosterData.players || [];
  } catch (error) {
    console.error('Error getting user roster:', error);
    throw error;
  }
};


// ── Match History ──────────────────────────────────────────────

export interface MatchHistoryEntry {
  id?: string;
  teamId: string;
  teamName: string;
  teamScore: number;
  opponentId: string;
  opponentName: string;
  opponentScore: number;
  result: 'win' | 'loss' | 'tie';
  date: unknown; // Firestore Timestamp
}

// Save a match history entry for one side
export const saveMatchHistory = async (entry: Omit<MatchHistoryEntry, 'id'>): Promise<void> => {
  await addDoc(collection(db, MATCH_HISTORY_COLLECTION), {
    ...entry,
    date: serverTimestamp(),
  });
};

// Get last N match history entries for a team
export const getMatchHistory = async (
  teamId: string,
  maxResults = 10
): Promise<MatchHistoryEntry[]> => {
  const q = query(
    collection(db, MATCH_HISTORY_COLLECTION),
    where('teamId', '==', teamId),
    orderBy('date', 'desc'),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as MatchHistoryEntry));
};

// ── User Preferences (Table / Standings selections) ────────────
const USER_PREFS_COLLECTION = 'userPreferences';

export const saveTablePreferences = async (userId: string, tableTeamIds: string[], standingsTeamIds?: string[]): Promise<void> => {
  const ref = doc(db, USER_PREFS_COLLECTION, userId);
  await setDoc(ref, {
    ...(tableTeamIds !== undefined && { tableTeamIds }),
    ...(standingsTeamIds !== undefined && { standingsTeamIds }),
  }, { merge: true });
};

export const getTablePreferences = async (userId: string): Promise<{ tableTeamIds: string[]; standingsTeamIds: string[] }> => {
  const ref = doc(db, USER_PREFS_COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { tableTeamIds: [], standingsTeamIds: [] };
  const data = snap.data();
  return {
    tableTeamIds: data.tableTeamIds ?? [],
    standingsTeamIds: data.standingsTeamIds ?? [],
  };
};

// ── Invite Codes ────────────────────────────────────────────────
const INVITE_CODES_COLLECTION = 'inviteCodes';

export interface InviteCode {
  code: string;
  used: boolean;
  usedBy: string | null;
  usedAt: Timestamp | null;
  createdAt: Timestamp;
  createdFor?: string; // optional label / email
}

// Generate a random invite code like PLAY-A1B2C3
export const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part = '';
  for (let i = 0; i < 6; i++) part += chars[Math.floor(Math.random() * chars.length)];
  return `PLAY-${part}`;
};

// Persist a new invite code in Firestore (doc ID = code string)
export const createInviteCode = async (code: string, createdFor?: string): Promise<void> => {
  await setDoc(doc(db, INVITE_CODES_COLLECTION, code), {
    code,
    used: false,
    usedBy: null,
    usedAt: null,
    createdAt: serverTimestamp(),
    ...(createdFor ? { createdFor } : {}),
  });
};

// Validate a code and mark it as used atomically.
// Returns 'ok' | 'invalid' | 'already_used'
// PLAY-000000 is a permanent master code that always succeeds.
export const validateAndConsumeInviteCode = async (
  code: string,
  userId: string
): Promise<'ok' | 'invalid' | 'already_used'> => {
  // Master code — always valid, never consumed from Firestore
  if (code.trim().toUpperCase() === 'PLAY-000000') return 'ok';

  const ref = doc(db, INVITE_CODES_COLLECTION, code.trim().toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) return 'invalid';
  const data = snap.data() as InviteCode;
  if (data.used) return 'already_used';
  await updateDoc(ref, { used: true, usedBy: userId, usedAt: serverTimestamp() });
  return 'ok';
};

// Check if a Firebase Auth uid has ever signed in before (has a users doc)
export const isNewUser = async (userId: string): Promise<boolean> => {
  const snap = await getDoc(doc(db, USERS_COLLECTION, userId));
  return !snap.exists();
};

// Create the users doc for a newly admitted user
export const createUserDoc = async (userId: string, email: string | null): Promise<void> => {
  await setDoc(doc(db, USERS_COLLECTION, userId), {
    uid: userId,
    email: email ?? '',
    createdAt: serverTimestamp(),
  }, { merge: true });
};
