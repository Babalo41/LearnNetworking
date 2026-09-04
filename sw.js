/* sw.js — network-first offline support.
   Always prefers a fresh network response (so a content/UI update is never
   stuck behind a stale cache); falls back to the cache only when the network
   fails, which is what actually matters for "still usable with no signal".
   CACHE is versioned — bump it whenever the asset list itself changes, so an
   old service worker's cache gets cleaned up on the next activate. */
const CACHE = "learnnetworking-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/app.css",
  "./content/t1-addressing.js",
  "./content/t2-switching.js",
  "./content/t3-multicast.js",
  "./content/t4-linux.js",
  "./content/t5-windows.js",
  "./content/t6-remote-tools.js",
  "./content/scenarios.js",
  "./js/core.js",
  "./js/features.js",
  "./js/net.js",
  "./js/shell.js",
  "./js/drills.js",
  "./js/ui.js",
  "./js/app.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// network-first, cache as a fallback and as a running backup
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
