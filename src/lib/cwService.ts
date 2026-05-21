import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
  getDocs, where
} from 'firebase/firestore';
import { db } from './firebase';
import { CWSession, Notice, Player } from '../types';

// ── Regras de corte por Tempo ─────────────────────────────────────────────
export function canJoin(session: CWSession, players: Player[], playerName: string): { allowed: boolean; reason?: string } {
  if (!session.closingTime) return { allowed: true };
  
  const seconds = (session.closingTime as any).seconds;
  const limit = seconds ? new Date(seconds * 1000) : new Date(session.closingTime as any);
  
  const ms = limit.getTime() - Date.now();
  const min = ms / 60000;

  if (session.status === 'closed') return { allowed: false, reason: 'Lobby já fechado' };
  if (min <= 0) return { allowed: false, reason: 'Tempo esgotado' };
  if (min <= 5) return { allowed: false, reason: 'Bloqueado (falta menos de 5 min)' };

  const inside = players.some(p => p.name === playerName);
  if (min <= 10 && !inside) {
    return { allowed: false, reason: 'Bloqueado (novas entradas suspensas a 10 min do fim)' };
  }

  return { allowed: true };
}

// ── Sessions ──────────────────────────────────────────────────────
export async function createCW(data: {
  format: string;
  totalSlots: number;
  sortTeams: boolean;
  closingTime: Date;
  createdBy: string;
}) {
  const docRef = await addDoc(collection(db, 'cw_sessions'), {
    ...data,
    status: 'open',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateStatus(id: string, status: 'open' | 'closed', format: string, totalConfirmed: number) {
  await updateDoc(doc(db, 'cw_sessions', id), { 
    status, 
    format,
    totalSlots: totalConfirmed 
  });
}

export async function closeCW(id: string, finalFormat: string) {
  await updateDoc(doc(db, 'cw_sessions', id), { 
    status: 'closed',
    format: finalFormat
  });
}

export function listenSessions(cb: (s: CWSession[]) => void) {
  return onSnapshot(
    query(collection(db, 'cw_sessions'), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }) as CWSession))
  );
}

// ── Players ──────────────────────────────────────────────────────
export async function joinCW(cwId: string, player: { name: string; pix?: string }, status: 'confirmed' | 'waiting') {
  const q = query(collection(db, 'cw_players'), where('cwId', '==', cwId), where('name', '==', player.name));
  const existing = await getDocs(q);
  if (!existing.empty) return;

  const allSnap = await getDocs(query(collection(db, 'cw_players'), where('cwId', '==', cwId)));
  const position = allSnap.size + 1;

  await addDoc(collection(db, 'cw_players'), {
    cwId,
    name: player.name,
    pix: player.pix || '',
    status,
    position,
    joinedAt: serverTimestamp(),
  });
}

export async function leaveCW(cwId: string, playerId: string) {
  await deleteDoc(doc(db, 'cw_players', playerId));
}

export async function promoteFirst(cwId: string, firstWaitingPlayer: Player) {
  if (!firstWaitingPlayer) return;
  await updateDoc(doc(db, 'cw_players', firstWaitingPlayer.id), { status: 'confirmed' });
}

export function listenPlayers(cwId: string, cb: (p: Player[]) => void) {
  return onSnapshot(
    query(collection(db, 'cw_players'),
      where('cwId', '==', cwId), orderBy('position', 'asc')),
    snap => cb(snap.docs.map(d => ({
      id: d.id, ...d.data(),
      joinedAt: d.data().joinedAt?.toDate(),
    }) as Player))
  );
}

export async function getPlayers(cwId: string): Promise<Player[]> {
  const snap = await getDocs(query(collection(db, 'cw_players'), where('cwId', '==', cwId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Player);
}

// ── Notices ──────────────────────────────────────────────────────
export async function postNotice(playerName: string, text: string) {
  await addDoc(collection(db, 'notices'), {
    playerName, text: text.slice(0, 200), createdAt: serverTimestamp()
  });
}

export function listenNotices(cb: (n: Notice[]) => void) {
  return onSnapshot(
    query(collection(db, 'notices'), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Notice))
  );
}