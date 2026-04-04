importScripts('/assets/proxy-stuff/config.js');
importScripts('/assets/proxy-stuff/utils.js');

const CACHE = "nebula-cache-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith(self.__nebula$config.prefix)) {
    event.respondWith(handleProxy(event.request));
  }
});

async function handleProxy(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;

  try {
    const res = await fetch(req);
    const clone = res.clone();

    if (res.status === 200) {
      cache.put(req, clone);
    }

    return res;
  } catch (e) {
    return new Response("Proxy failed", { status: 500 });
  }
}
