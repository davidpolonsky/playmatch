import {
  collection, addDoc, getDocs, getDoc, doc,
  query, where, orderBy, limit,
  deleteDoc, serverTimestamp, setDoc, increment,
} from 'firebase/firestore';
import { db } from './config';
import { BasketballTeam, BasketballPlayer } from '../types-basketball';
import { generateShareId, formatShareId, parseShareId } from './firestore';

// Re-export share ID helpers for basketball use
export { generateShareId, formatShareId, parseShareId };

// ── Collections ────────────────────────────────────────────────
const BBALL_TEAMS            = 'basketballTeams';
const BBALL_RECORDS          = 'basketballRecords';
const BBALL_LEG_RECORDS      = 'legendaryBasketballRecords';
const BBALL_HISTORY          = 'basketballHistory';
const BBALL_SAVED_TEAMS      = 'savedBasketballTeams';
const BBALL_ROSTERS          = 'basketballRosters';

// ── Team Record ────────────────────────────────────────────────
export interface BballRecord {
  wins: number;
  losses: number;
}

export const updateBballRecord = async (teamId: string, result: 'win' | 'loss') => {
  const ref = doc(db, BBALL_RECORDS, teamId);
  const field = result === 'win' ? 'wins' : 'losses';
  await setDoc(ref, { [field]: increment(1) }, { merge: true });
};

export const updateLegendaryBballRecord = async (userId: string, teamId: string, result: 'win' | 'loss') => {
  const docId = `${userId}_${teamId}`;
  const ref = doc(db, BBALL_LEG_RECORDS, docId);
  const field = result === 'win' ? 'wins' : 'losses';
  await setDoc(ref, { userId, teamId, [field]: increment(1) }, { merge: true });
};

export const getBballRecords = async (teamIds: string[]): Promise<Record<string, BballRecord>> => {
  if (teamIds.length === 0) return {};
  const snaps = await Promise.all(teamIds.map(id => getDoc(doc(db, BBALL_RECORDS, id))));
  const records: Record<string, BballRecord> = {};
  snaps.forEach((snap, i) => {
    records[teamIds[i]] = snap.exists() ? (snap.data() as BballRecord) : { wins: 0, losses: 0 };
  });
  return records;
};

export const getUserLegendaryBballRecords = async (userId: string): Promise<Record<string, BballRecord>> => {
  const q = query(collection(db, BBALL_LEG_RECORDS), where('userId', '==', userId));
  const snap = await getDocs(q);
  const records: Record<string, BballRecord> = {};
  snap.docs.forEach(d => {
    const data = d.data();
    records[data.teamId] = { wins: data.wins ?? 0, losses: data.losses ?? 0 };
  });
  return records;
};

// ── Teams ──────────────────────────────────────────────────────
export interface BballTeamDoc extends BasketballTeam {
  id?: string;
  shareId?: string;
}

export const saveBasketballTeam = async (team: Omit<BballTeamDoc, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const shareId = generateShareId();
  const ref = await addDoc(collection(db, BBALL_TEAMS), {
    ...team,
    shareId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const getUserBasketballTeams = async (userId: string): Promise<BballTeamDoc[]> => {
  const q = query(collection(db, BBALL_TEAMS), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as BballTeamDoc));
};

export const getAllBasketballTeams = async (): Promise<BballTeamDoc[]> => {
  const snap = await getDocs(collection(db, BBALL_TEAMS));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as BballTeamDoc));
};

export const getBasketballTeam = async (teamId: string): Promise<BballTeamDoc | null> => {
  const snap = await getDoc(doc(db, BBALL_TEAMS, teamId));
  return snap.exists() ? { id: snap.id, ...snap.data() } as BballTeamDoc : null;
};

export const deleteBasketballTeam = async (teamId: string): Promise<void> => {
  await deleteDoc(doc(db, BBALL_TEAMS, teamId));
};

export const getBasketballTeamByShareId = async (shareId: string): Promise<BballTeamDoc | null> => {
  const raw = parseShareId(shareId);
  const q = query(collection(db, BBALL_TEAMS), where('shareId', '==', raw), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as BballTeamDoc;
};

export const ensureBballShareId = async (teamId: string): Promise<string> => {
  const snap = await getDoc(doc(db, BBALL_TEAMS, teamId));
  if (!snap.exists()) throw new Error('Team not found');
  const data = snap.data();
  if (data.shareId) return data.shareId;
  const shareId = generateShareId();
  await setDoc(doc(db, BBALL_TEAMS, teamId), { shareId }, { merge: true });
  return shareId;
};

// ── Saved / Rival Teams ────────────────────────────────────────
export const addSavedBballTeam = async (userId: string, teamId: string): Promise<void> => {
  await setDoc(doc(db, BBALL_SAVED_TEAMS, `${userId}_${teamId}`), { userId, teamId, savedAt: serverTimestamp() });
};

export const getSavedBballTeamIds = async (userId: string): Promise<string[]> => {
  const q = query(collection(db, BBALL_SAVED_TEAMS), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data().teamId as string);
};

export const removeSavedBballTeam = async (userId: string, teamId: string): Promise<void> => {
  await deleteDoc(doc(db, BBALL_SAVED_TEAMS, `${userId}_${teamId}`));
};

// ── Match History ──────────────────────────────────────────────
export interface BballHistoryEntry {
  id?: string;
  teamId: string;
  teamName: string;
  teamScore: number;
  opponentId: string;
  opponentName: string;
  opponentScore: number;
  result: 'win' | 'loss';
  date: unknown;
}

export const saveBballHistory = async (entry: Omit<BballHistoryEntry, 'id'>): Promise<void> => {
  await addDoc(collection(db, BBALL_HISTORY), { ...entry, date: serverTimestamp() });
};

export const getBballHistory = async (teamId: string, maxResults = 10): Promise<BballHistoryEntry[]> => {
  // Use only a simple where filter (no composite index needed) and sort client-side
  const q = query(
    collection(db, BBALL_HISTORY),
    where('teamId', '==', teamId),
    limit(50)
  );
  const snap = await getDocs(q);
  const entries = snap.docs.map(d => ({ id: d.id, ...d.data() } as BballHistoryEntry));
  // Sort newest-first client-side and cap at maxResults
  return entries
    .sort((a, b) => {
      const aS = (a.date as any)?.seconds ?? 0;
      const bS = (b.date as any)?.seconds ?? 0;
      return bS - aS;
    })
    .slice(0, maxResults);
};

// ── Basketball Roster (draft player pool, persists across sessions) ─────────

export const saveBasketballRoster = async (userId: string, players: BasketballPlayer[]): Promise<void> => {
  try {
    const q = query(collection(db, BBALL_ROSTERS), where('userId', '==', userId));
    const snap = await getDocs(q);
    const data = { userId, players, updatedAt: serverTimestamp() };
    if (snap.empty) {
      await addDoc(collection(db, BBALL_ROSTERS), data);
    } else {
      await setDoc(snap.docs[0].ref, data);
    }
  } catch (error) {
    console.error('Error saving basketball roster:', error);
    throw error;
  }
};

export const getBasketballRoster = async (userId: string): Promise<BasketballPlayer[]> => {
  try {
    const q = query(collection(db, BBALL_ROSTERS), where('userId', '==', userId));
    const snap = await getDocs(q);
    if (snap.empty) return [];
    return (snap.docs[0].data().players as BasketballPlayer[]) || [];
  } catch (error) {
    console.error('Error getting basketball roster:', error);
    return [];
  }
};
