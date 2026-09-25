window.onload = async function () {
  let scope;
  const SERVICE_PREFIX = "/service/";
  const ASSIGNMENTS_PREFIX = "/assignments/";
  const wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
  const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

  function showInitError(message) {
    try {
      if (document.getElementById("nebula-init-error")) return;
      const box = document.createElement("div");
      box.id = "nebula-init-error";
      box.setAttribute("role", "alert");
      box.style.cssText =
        "position:fixed;left:12px;right:12px;bottom:12px;z-index:1000000;" +
        "padding:12px 14px;border-radius:10px;background:#3a1414;color:#fff;" +
        "font:13px/1.5 system-ui,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,.4);";
      box.textContent = message;
      document.body.appendChild(box);
    } catch {}
  }



  function getScopeOverride() {
    try {
      const q = new URLSearchParams(location.search).get("scope");
      if (q === "service") return SERVICE_PREFIX;
      if (q === "assignments") return ASSIGNMENTS_PREFIX;
    } catch {
    }
    return null;
  }


  let bListCache = null;
  let bListCacheAt = 0;
  const BLIST_TTL = 10 * 60 * 1000;

  function normalizeBListHost(entry) {
    let s = String(entry || "").trim().toLowerCase();
    if (!s) return null;
    const proto = s.indexOf("://");
    if (proto >= 0) s = s.slice(proto + 3);
    s = s.split("/")[0].split("?")[0].split("#")[0];
    const at = s.lastIndexOf("@");
    if (at >= 0) s = s.slice(at + 1);
    s = s.split(":")[0].trim();
    return s || null;
  }

  async function getBListHosts() {
    const now = Date.now();
    if (bListCache && now - bListCacheAt < BLIST_TTL) return bListCache;
    try {
      const response = await fetch("/data/b-list.json", { cache: "force-cache" });
      if (!response.ok) throw new Error("b-list HTTP " + response.status);
      const data = await response.json();
      const domains = data.domains || data;
      const hosts = [];
      for (const d of domains) {
        const h = normalizeBListHost(d);
        if (h) hosts.push(h);
      }
      bListCache = hosts;
      bListCacheAt = now;
      try { localStorage.setItem("nebulaBList", JSON.stringify({ at: now, hosts })); } catch {}
      return hosts;
    } catch (err) {
      try {
        const raw = localStorage.getItem("nebulaBList");
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && Array.isArray(saved.hosts)) {
            bListCache = saved.hosts;
            bListCacheAt = saved.at || 0;
            return saved.hosts;
          }
        }
      } catch {
      }
      throw err;
    }
  }

  function hostNeedsAssignments(decodedUrl, hosts) {
    let host = null;
    try {
      host = new URL(decodedUrl).hostname.toLowerCase();
    } catch {
      const low = String(decodedUrl || "").toLowerCase();
      return hosts.some((h) => low.includes(h));
    }
    return hosts.some((h) => host === h || host.endsWith("." + h));
  }

  function decodeStoredTarget(stored) {
    if (!stored) return "";
    try {
      if (typeof Ultraviolet !== "undefined" && Ultraviolet.codec && Ultraviolet.codec.xor) {
        return Ultraviolet.codec.xor.decode(stored);
      }
    } catch {
    }
    return stored;
  }

  async function resolveScope() {
    const forced = getScopeOverride();
    if (forced) return forced;
    return ASSIGNMENTS_PREFIX;
  }
  async function registerServiceWorker() {
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
      await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
    }
    await navigator.serviceWorker.register("/sw.js", { scope: SERVICE_PREFIX });
    await navigator.serviceWorker.register("/lab.js", { scope: ASSIGNMENTS_PREFIX });
    scope = await resolveScope();
  }
  function loadFrame() {
    const targetUrl = localStorage.getItem("targeturl");
    if (!targetUrl) {
      console.warn("No targeturl found in localStorage.");
      return;
    }
    const iframe = document.createElement("iframe");
    iframe.name = "theiframe";
    iframe.id = "browserframe";
    iframe.setAttribute("sandbox", [
      "allow-scripts",
      "allow-same-origin",
      "allow-forms",
      "allow-pointer-lock",
      "allow-orientation-lock",
      "allow-modals",
      "allow-top-navigation",
      "allow-downloads"
    ].join(" "));
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100vh";
    iframe.style.height = "100dvh";
    iframe.style.border = "none";
    iframe.style.zIndex = "99999";
    iframe.style.display = "block";
    iframe.style.touchAction = "auto";
    document.body.appendChild(iframe);
    const useScope = scope || ASSIGNMENTS_PREFIX;
    try {
      localStorage.setItem("proxyScope", useScope);
    } catch {
    }
    iframe.src = useScope + targetUrl;
  }
  try {
    await registerServiceWorker();
    loadFrame();
  } catch (error) {
    console.error("Failed to initialize:", error);
    showInitError("Nebula failed to start: " + (error && error.message ? error.message : error));
  }
};
