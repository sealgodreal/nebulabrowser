const stockSW = "/uv/sw.js";
const wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

async function registerSW() {
  if (!("serviceWorker" in navigator)) {
    if (typeof window.isSecureContext !== "undefined" && !window.isSecureContext) {
      throw new Error(
        "Service workers need a secure context, but this page is " +
        location.protocol + "//" + location.host + ". " +
        "http://<lan-ip>:8000 is not secure, so the proxy cannot start. " +
        "For phone/tablet testing use an https tunnel (e.g. ngrok), or open via localhost on this machine."
      );
    }

    throw new Error("Your browser doesn't support service workers.");
  }

  if (typeof nebulaSetTransport === "function") {
    await nebulaSetTransport(connection, wispUrl);
  } else {
    try {
      await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
    } catch (err) {
      console.warn("Epoxy failed on home page, trying libcurl fallback:", err);
      await connection.setTransport("/libcurl/index.mjs", [{ wisp: wispUrl }]);
    }
  }
  await window.navigator.serviceWorker.register("/sw.js", {
    scope: '/service/',
  });
  await window.navigator.serviceWorker.register("/lab.js", {
    scope: '/assignments/',
  });
}

registerSW().catch((err) => {
  console.error("Nebula service worker registration failed:", err);
});
