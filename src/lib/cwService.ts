import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
  getDocs, where, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { CWFormat, CWSession, FORMAT_SIZES, Notice, Player } from '../types';

// ── Horário redondo ──────────────────────────────────────────────
export function getNextRoundTime(): Date {
  const now = new Date();
  const result = new Date(now);
  const min = now.getMinutes();

  if (min < 30) result.setMinutes(30, 0, 0);
  else result.setHours(now.getHours() + 1, 0, 0, 0);

  // Mínimo 20 min no futuro
  if (result.getTime() - now.getTime() < 20 * 60 * 1000) {
    if (result.getMinutes() === 30) result.setHours(result.getHours() + 1, 0, 0, 0);
    else result.setMinutes(30, 0, 0);
  }
  return result;
}

// ── Regras de corte ─────────────────────────────────────────────
export function canJoin(closingTime: Date): { allowed: boolean; reason?: string } {
  const ms = closingTime.getTime() - Date.now();
  const min = ms / 60000;
  if (min <= 0) return { allowed: false, reason: 'CW encerrada' };
  if (min <= 5) return { allowed: false, reason: 'Bloqueado — faltam menos de 5 minutos' };
  if (min <= 10) return { allowed: false, reason: 'Bloqueado — faltam menos de 10 minutos' };
  return { allowed: true };
}

// ── Sorteio ──────────────────────────────────────────────────────
export function sortTeams(names: string[]) {
  const s = [...names].sort(() => Math.random() - 0.5);
  const h = Math.floor(s.length / 2);
  return { teamA: s.slice(0, h), teamB: s.slice(h) };
}

// ── CW Sessions ──────────────────────────────────────────────────
export async function createCW(format: CWFormat, createdBy: string, doSort: boolean) {
  const closingTime = getNextRoundTime();
  const ref = await addDoc(collection(db, 'cw_sessions'), {
    format,
    totalSlots: FORMAT_SIZES[format],
    closingTime: Timestamp.fromDate(closingTime),
    createdBy,
    createdAt: serverTimestamp(),
    status: 'open',
    sortTeams: doSort,
  });
  return ref.id;
}

export function listenSessions(cb: (s: CWSession[]) => void) {
  return onSnapshot(
    query(collection(db, 'cw_sessions'), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({
      id: d.id, ...d.data(),
      closingTime: d.data().closingTime?.toDate(),
      createdAt: d.data().createdAt?.toDate(),
    }) as CWSession))
  );
}

export async function updateStatus(cwId: string, status: CWSession['status']) {
  await updateDoc(doc(db, 'cw_sessions', cwId), { status });
}

export async function closeCW(cwId: string, names: string[], doSort: boolean) {
  const upd: Record<string, unknown> = { status: 'closed' };
  if (doSort && names.length >= 2) {
    const { teamA, teamB } = sortTeams(names);
    upd.teamA = teamA; upd.teamB = teamB;
  }
  await updateDoc(doc(db, 'cw_sessions', cwId), upd);
}

// ── Players ──────────────────────────────────────────────────────
export async function joinCW(
  cwId: string, name: string, email: string,
  notifyNewCW: boolean, notifyAlmostFull: boolean, notifyClosed: boolean,
  position: number, status: 'confirmed' | 'waiting'
) {
  await addDoc(collection(db, 'cw_players'), {
    cwId, name, email,
    notifyNewCW, notifyAlmostFull, notifyClosed,
    joinedAt: serverTimestamp(),
    status, position,
  });
}

export async function leaveCW(cwId: string, name: string) {
  const q = query(collection(db, 'cw_players'),
    where('cwId', '==', cwId), where('name', '==', name));
  const snap = await getDocs(q);
  for (const d of snap.docs) await deleteDoc(d.ref);
}

export async function promoteFirst(cwId: string) {
  const q = query(collection(db, 'cw_players'),
    where('cwId', '==', cwId), where('status', '==', 'waiting'),
    orderBy('position', 'asc'));
  const snap = await getDocs(q);
  if (!snap.empty) await updateDoc(snap.docs[0].ref, { status: 'confirmed' });
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
    playerName, text: text.slice(0, 200), createdAt: serverTimestamp(),
  });
}

export function listenNotices(cb: (n: Notice[]) => void) {
  return onSnapshot(
    query(collection(db, 'notices'), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => ({
      id: d.id, ...d.data(),
      createdAt: d.data().createdAt?.toDate(),
    }) as Notice))
  );
}
