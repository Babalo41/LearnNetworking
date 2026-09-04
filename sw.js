/* sw.js — cache-first offline support. Bump CACHE when app files change. */
const CACHE = "learnnetworking-v1";
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

// cache-first, falling back to network, then updating the cache with any fresh response
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
