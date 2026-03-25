import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
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

// Save a team to Firestore
export const saveTeam = async (team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = await addDoc(collection(db, TEAMS_COLLECTION), {
      ...team,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving team:', error);
    throw error;
  }
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

