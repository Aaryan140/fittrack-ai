// public/sw.js  — FitTrack AI Service Worker v3
// FIXED: Switched to network-first for HTML to prevent infinite refresh loop.
// Static assets (JS/CSS) are cache-first for performance.

const CACHE = 'fittrack-v3'; // bumped version so old cache is cleared immediately
const STATIC_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2'];

// ── Install: skip waiting immediately so new SW activates fast ─
self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

// ── Activate: delete ALL old caches, claim clients ────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch strategy ─────────────────────────────────────────────
// /api/*          → network only (never cache)
// JS/CSS/fonts    → cache-first (safe, they have content hashes in filenames)
// HTML / nav      → network-first (CRITICAL: fixes the infinite reload bug)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept API calls
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Never intercept Supabase / external requests
  if (!url.origin.includes(self.location.origin)) {
    e.respondWith(fetch(e.request));
    return;
  }

  const ext = url.pathname.substring(url.pathname.lastIndexOf('.'));
  const isStaticAsset = STATIC_EXTENSIONS.includes(ext);

  if (isStaticAsset) {
    // Cache-first for static assets (JS bundles have hashed names, safe to cache)
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        const response = await fetch(e.request);
        if (response.ok) cache.put(e.request, response.clone());
        return response;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // Network-first for HTML / navigation (fixes infinite reload on auth redirect)
    e.respondWith(
      fetch(e.request)
        .then(response => {
          // Only cache successful HTML responses
          if (response.ok && e.request.mode === 'navigate') {
            caches.open(CACHE).then(cache => cache.put(e.request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: serve cached index.html for navigation
          if (e.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return caches.match(e.request);
        })
    );
  }
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