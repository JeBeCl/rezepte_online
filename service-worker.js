const CACHE_NAME = "rezepte-cache-v1";

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/recipe.html",
  "/style1.css",
  "/script.js",
  "/manifest.json",
  "/Bilder/icon-192.png",
  "/Bilder/icon-512.png"
];

// Install: Dateien cachen (App-Shell)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Aktivieren: alte Caches aufräumen
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
});

// Fetch: erst Cache, dann Netzwerk (für statische Files)
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Nur GET-Anfragen cachen
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(req).catch(() =>
        new Response("Offline – Inhalte können nicht geladen werden.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        })
      );
    })
  );
});
