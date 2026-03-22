// public/sw.js  — FitTrack AI Service Worker v2
// Handles background sync so step/activity data persists when screen is off.
// Installed by src/lib/serviceWorker.js on first app load.

const CACHE = 'fittrack-v1';
const ASSETS = ['/', '/index.html'];

// ── Install: cache shell ───────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for assets, network-first for API ───────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// ── Background Sync: flush buffered step counts ────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'flush-steps') {
    e.waitUntil(flushSteps());
  }
});

async function flushSteps() {
  await notifyClients('SW_SYNC_STEPS');
}

async function notifyClients(type) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  clients.forEach(c => c.postMessage({ type }));
}

// ── Periodic background sync (Chrome Android) ─────────────────
self.addEventListener('periodicsync', e => {
  if (e.tag === 'step-heartbeat') {
    e.waitUntil(notifyClients('SW_SYNC_STEPS'));
  }
});

// ── Push messages from app ─────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data?.type === 'PING') e.source?.postMessage({ type: 'PONG' });
});
