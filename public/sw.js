// ─────────────────────────────────────────────────────────────────────────────
// Rehab Allah PWA Service Worker (v2)
//
// Bulletproof audio-safe service worker:
// 1. NEVER intercepts cross-origin requests (audio CDN, APIs)
// 2. NEVER intercepts Range requests (audio seeking/buffering)
// 3. NEVER intercepts audio/video MIME types
// 4. Only caches same-origin navigation and static assets
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = "rehab-allah-v3";

// App shell files to pre-cache on install
const APP_SHELL = ["/", "/index.html"];

// Support programmatic skipWaiting triggered from PWA update prompt
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches from previous versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: audio-safe network handler
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // ── GUARD 1: Never intercept cross-origin requests ──
  if (url.origin !== self.location.origin) return;

  // ── GUARD 2: Never intercept Range requests ──
  if (event.request.headers.has("Range")) return;

  // ── GUARD 3: Never intercept audio/video requests ──
  const accept = event.request.headers.get("Accept") || "";
  if (accept.includes("audio/") || accept.includes("video/")) return;

  // ── GUARD 4: Skip blob: and data: URLs ──
  if (url.protocol === "blob:" || url.protocol === "data:") return;

  // ── GUARD 5: Skip version check files (always network-only) ──
  if (url.pathname.includes("version.json")) return;

  // ── Navigation requests: network-first with cache fallback ──
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((cached) => cached || caches.match("/index.html"))
        )
    );
    return;
  }

  // ── Same-origin static assets: cache-first with network fallback ──
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
