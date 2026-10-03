importScripts("/scram/scramjet.all.js");
const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();
const NEBULA_SJ_EXPECTED_PREFIX = "/study/";
async function handleRequest(event) {
  try {
    await scramjet.loadConfig();
  } catch (e) {
    return fetch(event.request);
  }
  try {
    if (!scramjet.config || scramjet.config.prefix !== NEBULA_SJ_EXPECTED_PREFIX) {
      scramjet.config = null;
      await scramjet.loadConfig();
    }
  } catch (e) {}
  let routed = false;
  try {
    routed = scramjet.route(event);
  } catch (e) {
    return fetch(event.request);
  }
  if (!routed) return fetch(event.request);
  try {
    return await scramjet.fetch(event);
  } catch (e) {
    return new Response("Scramjet failed to load " + event.request.url + ": " + (e && e.message ? e.message : e), {
      status: 500,
      headers: { "content-type": "text/plain;charset=utf-8" }
    });
  }
}
self.addEventListener("fetch", function (event) {
  event.respondWith(handleRequest(event));
});
