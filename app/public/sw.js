const CACHE = "shopkeeper-v1";

// Pages to pre-cache on install
const PRECACHE_URLS = ["/tools", "/inventory"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only cache same-origin GET navigation requests (HTML pages)
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (!["navigate", "document"].includes(request.destination) && request.mode !== "navigate") return;

  // Network-first for all requests — fall back to cache when offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful HTML responses for tools and inventory
        if (
          response.ok &&
          (url.pathname.startsWith("/tools") || url.pathname.startsWith("/inventory"))
        ) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
