importScripts("/wk/wk2.js");
importScripts("/wk/wk3.js");

var userKey = null;
try {
  userKey = new URL(location).searchParams.get('userkey');
} catch (e) {
  userKey = null;
}

importScripts("/wk/wk4.js");

const sw = new UVServiceWorker();

self.addEventListener("fetch", (event) => event.respondWith(sw.fetch(event)));
