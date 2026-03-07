import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Team, Player } from './types';

const TEAMS_COLLECTION = 'teams';

export async function saveTeam(team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const docRef = await addDoc(collection(db, TEAMS_COLLECTION), {
      ...team,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving team:', error);
    throw error;
  }
}

export async function updateTeam(teamId: string, updates: Partial<Team>) {
  try {
    const teamRef = doc(db, TEAMS_COLLECTION, teamId);
    await updateDoc(teamRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating team:', error);
    throw error;
  }
}

export async function deleteTeam(teamId: string) {
  try {
    const teamRef = doc(db, TEAMS_COLLECTION, teamId);
    await deleteDoc(teamRef);
  } catch (error) {
    console.error('Error deleting team:', error);
    throw error;
  }
}

export async function getTeam(teamId: string): Promise<Team | null> {
  try {
    const teamRef = doc(db, TEAMS_COLLECTION, teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (teamSnap.exists()) {
      return {
        id: teamSnap.id,
        ...teamSnap.data(),
        createdAt: teamSnap.data().createdAt.toDate(),
        updatedAt: teamSnap.data().updatedAt.toDate(),
      } as Team;
    }
    return null;
  } catch (error) {
    console.error('Error getting team:', error);
    throw error;
  }
}

export async function getUserTeams(userId: string): Promise<Team[]> {
  try {
    const q = query(
      collection(db, TEAMS_COLLECTION),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate(),
    })) as Team[];
  } catch (error) {
    console.error('Error getting user teams:', error);
    throw error;
  }
}

export async function getAllTeams(): Promise<Team[]> {
  try {
    const q = query(
      collection(db, TEAMS_COLLECTION),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate(),
    })) as Team[];
  } catch (error) {
    console.error('Error getting all teams:', error);
    throw error;
  }
}
