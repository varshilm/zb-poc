import type { FaceScanResult } from '@/hooks/useFaceScan';

export const DEMO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const DB_NAME = 'zb-demo-cache';
const DB_VERSION = 1;
const STORE_NAME = 'artifacts';
const TEETH_KEY = 'teeth-latest';
const FACE_KEY = 'face-latest';

export type CacheEnvelope<T> = {
  savedAt: number;
  expiresAt: number;
  payload: T;
};

export type TeethCache = {
  maskDataUrl: string;
  sourcePreviewUrl?: string;
};

export type FaceCache = {
  photoDataUrl: string;
  result: FaceScanResult;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Unable to open demo cache.'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

function isExpired(envelope: CacheEnvelope<unknown>, now = Date.now()): boolean {
  return envelope.expiresAt <= now;
}

export function createCacheEnvelope<T>(payload: T, now = Date.now()): CacheEnvelope<T> {
  return {
    savedAt: now,
    expiresAt: now + DEMO_CACHE_TTL_MS,
    payload,
  };
}

async function idbGet<T>(key: string): Promise<CacheEnvelope<T> | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onerror = () => reject(request.error ?? new Error('Demo cache read failed.'));
      request.onsuccess = () => {
        resolve((request.result as CacheEnvelope<T> | undefined) ?? null);
      };
    });
  } catch {
    return null;
  }
}

async function idbSet<T>(key: string, value: CacheEnvelope<T>): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onerror = () => reject(request.error ?? new Error('Demo cache write failed.'));
      request.onsuccess = () => resolve();
    });
  } catch {
    // Quota / private mode — fail soft for demo continuity.
  }
}

async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onerror = () => reject(request.error ?? new Error('Demo cache delete failed.'));
      request.onsuccess = () => resolve();
    });
  } catch {
    // ignore
  }
}

async function idbClear(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();
      request.onerror = () => reject(request.error ?? new Error('Demo cache clear failed.'));
      request.onsuccess = () => resolve();
    });
  } catch {
    // ignore
  }
}

async function getValidEnvelope<T>(key: string): Promise<CacheEnvelope<T> | null> {
  const envelope = await idbGet<T>(key);
  if (!envelope) return null;
  if (isExpired(envelope)) {
    void idbDelete(key);
    return null;
  }
  return envelope;
}

export async function getTeethCache(): Promise<TeethCache | null> {
  const envelope = await getValidEnvelope<TeethCache>(TEETH_KEY);
  return envelope?.payload ?? null;
}

export async function getTeethCacheMeta(): Promise<CacheEnvelope<TeethCache> | null> {
  return getValidEnvelope<TeethCache>(TEETH_KEY);
}

export async function setTeethCache(payload: TeethCache): Promise<void> {
  if (!payload.maskDataUrl) return;
  await idbSet(TEETH_KEY, createCacheEnvelope(payload));
}

export async function getFaceCache(): Promise<FaceCache | null> {
  const envelope = await getValidEnvelope<FaceCache>(FACE_KEY);
  return envelope?.payload ?? null;
}

export async function getFaceCacheMeta(): Promise<CacheEnvelope<FaceCache> | null> {
  return getValidEnvelope<FaceCache>(FACE_KEY);
}

export async function setFaceCache(payload: FaceCache): Promise<void> {
  if (!payload.photoDataUrl || !payload.result) return;
  await idbSet(FACE_KEY, createCacheEnvelope(payload));
}

export async function clearDemoCache(): Promise<void> {
  await idbClear();
}

/** Test helper — pure expiry check without IndexedDB. */
export function isCacheEnvelopeExpired(
  envelope: CacheEnvelope<unknown>,
  now = Date.now(),
): boolean {
  return isExpired(envelope, now);
}
