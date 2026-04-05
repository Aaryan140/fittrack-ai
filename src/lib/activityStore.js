// src/lib/activityStore.js
// Thin wrapper around IndexedDB so step/activity data survives
// page reloads, background tabs, and screen-off periods.

const DB_NAME = 'fittrack_activity';
const DB_VER  = 1;
const STORE   = 'sessions';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

// Save or update the current activity session
export async function saveSession(session) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(session);
    tx.oncomplete = () => res(session);
    tx.onerror    = e => rej(e.target.error);
  });
}

// Read the active session for today
export async function getTodaySession() {
  const db  = await openDB();
  const key = getTodayKey();
  return new Promise((res, rej) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    req.onsuccess = e => res(e.target.result || null);
    req.onerror   = e => rej(e.target.error);
  });
}

// Clear old sessions (keep last 30 days)
export async function pruneOldSessions() {
  const db   = await openDB();
  const keys = await new Promise((res, rej) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAllKeys();
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const old = keys.filter(k => new Date(k) < cutoff);
  if (old.length === 0) return;
  const tx = db.transaction(STORE, 'readwrite');
  old.forEach(k => tx.objectStore(STORE).delete(k));
}

function getTodayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
