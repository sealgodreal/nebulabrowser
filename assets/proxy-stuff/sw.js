const CACHE_NAME = 'nebula-cache-v1';

function proxify(url) {
  try {
    if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:') || url.startsWith('#')) return url;
    if (url.includes('/lessons/math?url=')) return url;
    return `/lessons/math?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => key !== CACHE_NAME && caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.protocol.startsWith('http')) {
    const proxiedUrl = proxify(url.href);

    event.respondWith(
      fetch(proxiedUrl, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'follow',
      }).catch(async () => {
        const cached = await caches.match(request);
        return cached || new Response('Network error', { status: 504 });
      })
    );
  }
});
