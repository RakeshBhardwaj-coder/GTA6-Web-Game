import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { CarId, GameMode, RunSummary } from './types';

export const DRIVER_NAME_MIN = 2;
export const DRIVER_NAME_MAX = 20;
export const DRIVER_NAME_PATTERN = /^[a-zA-Z0-9 _-]+$/;
const COLLECTION_NAME = 'leaderboard_entries';
const DRIVER_TAG_STORAGE_KEY = 'leonida_driver_tag_v1';

export interface LeaderboardEntry {
  id: string;
  uid: string;
  driverName: string;
  haul: number;
  distanceMeters: number;
  copsWrecked: number;
  nearMisses: number;
  maxCombo: number;
  peakStars: number;
  carId: CarId;
  mode: GameMode;
  seed: number;
  titleEarned: string;
  isVictory: boolean;
  createdAtMs: number;
}

export function sanitizeDriverName(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, DRIVER_NAME_MAX);
  return cleaned.length >= DRIVER_NAME_MIN ? cleaned : 'Street Driver';
}

export function getSavedDriverTag(fallbackDisplayName?: string | null): string {
  try {
    const stored = localStorage.getItem(DRIVER_TAG_STORAGE_KEY);
    if (stored && stored.trim().length >= DRIVER_NAME_MIN) {
      return sanitizeDriverName(stored);
    }
  } catch {
    // ignore storage errors
  }
  if (fallbackDisplayName) {
    return sanitizeDriverName(fallbackDisplayName);
  }
  return 'Street Driver';
}

export function saveDriverTagLocally(name: string): void {
  try {
    localStorage.setItem(DRIVER_TAG_STORAGE_KEY, sanitizeDriverName(name));
  } catch {
    // ignore storage errors
  }
}

export async function submitScoreToLeaderboard(
  summary: RunSummary,
  rawDriverName: string
): Promise<string> {
  const user = auth.currentUser;
  const ownerUid = user && user.emailVerified ? user.uid : 'public';

  const driverName = sanitizeDriverName(rawDriverName);
  saveDriverTagLocally(driverName);

  const safeTitle =
    summary.titleEarned
      .replace(/[^a-zA-Z0-9 _-]/g, '')
      .trim()
      .slice(0, 40) || 'Sunset Joyrider';

  const idPrefix = ownerUid === 'public' ? 'pub' : ownerUid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
  const entryId = `${idPrefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;

  const payload = {
    uid: ownerUid,
    driverName,
    haul: Math.max(0, Math.min(10000000, Math.round(summary.haul))),
    distanceMeters: Math.max(0, Math.min(500000, Math.round(summary.distanceMeters))),
    copsWrecked: Math.max(0, Math.min(5000, Math.round(summary.copsWrecked))),
    nearMisses: Math.max(0, Math.min(10000, Math.round(summary.nearMisses))),
    maxCombo: Math.max(1, Math.min(15, Math.round(summary.maxCombo))),
    peakStars: Math.max(1, Math.min(5, Math.round(summary.peakStars))),
    carId: summary.carId,
    mode: summary.mode,
    seed: Math.max(100000, Math.min(999999, Math.round(summary.seed))),
    titleEarned: safeTitle,
    isVictory: Boolean(summary.isVictory),
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, COLLECTION_NAME, entryId), payload);
    return entryId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${COLLECTION_NAME}/${entryId}`);
  }
}

export function dedupeUniqueDrivers(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const seen = new Set<string>();
  const unique: LeaderboardEntry[] = [];
  for (const entry of entries) {
    const key = entry.driverName.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
  }
  return unique;
}

export function subscribeLeaderboard(
  onData: (entries: LeaderboardEntry[]) => void,
  onError: (err: Error) => void
): () => void {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('haul', 'desc'),
    limit(150)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: LeaderboardEntry[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const createdAt = d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : Date.now();
        items.push({
          id: docSnap.id,
          uid: String(d.uid ?? ''),
          driverName: String(d.driverName ?? 'Street Driver'),
          haul: Number(d.haul ?? 0),
          distanceMeters: Number(d.distanceMeters ?? 0),
          copsWrecked: Number(d.copsWrecked ?? 0),
          nearMisses: Number(d.nearMisses ?? 0),
          maxCombo: Number(d.maxCombo ?? 1),
          peakStars: Number(d.peakStars ?? 1),
          carId: (d.carId as CarId) || 'cheetah',
          mode: 'ENDLESS',
          seed: Number(d.seed ?? 100000),
          titleEarned: String(d.titleEarned ?? 'Sunset Joyrider'),
          isVictory: Boolean(d.isVictory),
          createdAtMs: createdAt,
        });
      });
      onData(dedupeUniqueDrivers(items));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function deleteLeaderboardEntry(entryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, entryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${entryId}`);
  }
}
