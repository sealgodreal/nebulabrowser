window.onload = async function () {
  let scope;
  const SERVICE_PREFIX = "/service/";
  const ASSIGNMENTS_PREFIX = "/lesson/";
  const SCRAMJET_PREFIX = "/study/";
  const wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
  const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
  function currentProxy() {
    try {
      if (typeof getNebulaProxy === "function") return getNebulaProxy();
    } catch (e) {}
    return "ultraviolet";
  }
  function proxyPrefix() {
    try {
      if (typeof getNebulaProxyPrefix === "function") return getNebulaProxyPrefix();
    } catch (e) {}
    return ASSIGNMENTS_PREFIX;
  }
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
    } catch (e) {}
  }
  function getScopeOverride() {
    try {
      const q = new URLSearchParams(location.search).get("scope");
      if (q === "service") return SERVICE_PREFIX;
      if (q === "assignments" || q === "lesson") return ASSIGNMENTS_PREFIX;
      if (q === "scramjet") return SCRAMJET_PREFIX;
    } catch (e) {
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
      try { localStorage.setItem("nebulaBList", JSON.stringify({ at: now, hosts })); } catch (e) {}
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
      } catch (e) {
      }
      throw err;
    }
  }
  function hostNeedsAssignments(decodedUrl, hosts) {
    let host = null;
    try {
      host = new URL(decodedUrl).hostname.toLowerCase();
    } catch (e) {
      const low = String(decodedUrl || "").toLowerCase();
      return hosts.some((h) => low.includes(h));
    }
    return hosts.some((h) => host === h || host.endsWith("." + h));
  }
  function decodeStoredTarget(stored) {
    if (!stored) return "";
    const want = currentProxy();
    const attempts = [];
    if (want === "scramjet") {
      attempts.push(function () { return nebulaDecodeProxyUrl(stored, "scramjet"); });
      attempts.push(function () { return Ultraviolet.codec.xor.decode(stored); });
    } else {
      attempts.push(function () { return nebulaDecodeProxyUrl(stored, "ultraviolet"); });
      attempts.push(function () { return decodeURIComponent(stored); });
    }
    for (const fn of attempts) {
      try {
        const value = fn();
        if (value && /^https?:\/\//i.test(value)) return value;
      } catch (e) {}
    }
    try {
      if (typeof nebulaDecodeProxyUrl === "function") return nebulaDecodeProxyUrl(stored, want);
    } catch (e) {}
    try {
      if (typeof Ultraviolet !== "undefined" && Ultraviolet.codec && Ultraviolet.codec.xor) {
        return Ultraviolet.codec.xor.decode(stored);
      }
    } catch (e) {
    }
    return stored;
  }
  async function resolveScope() {
    const forced = getScopeOverride();
    if (forced) return forced;
    return proxyPrefix();
  }
  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      if (typeof window.isSecureContext !== "undefined" && !window.isSecureContext) {
        throw new Error(
          "Service workers need a secure context, but this page is " +
          location.protocol + "//" + location.host + ". " +
          "http://<lan-ip>:8000 is not secure, so the proxy cannot start."
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
    await navigator.serviceWorker.register("/sj.js", { scope: "/" });
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        await Promise.race([
          navigator.serviceWorker.ready,
          new Promise(function (resolve) { setTimeout(resolve, 8000); })
        ]);
      }
    } catch (e) {}
    if (currentProxy() === "scramjet") {
      try {
        if (typeof ensureNebulaScramjet === "function") await ensureNebulaScramjet();
      } catch (e) {
        console.error("Nebula Scramjet init failed:", e);
      }
      try {
        if (navigator.serviceWorker && !navigator.serviceWorker.controller) {
          await new Promise(function (resolve) {
            let done = false;
            const finish = function () {
              if (!done) {
                done = true;
                resolve();
              }
            };
            try {
              navigator.serviceWorker.addEventListener("controllerchange", finish, { once: true });
            } catch (e) {}
            setTimeout(finish, 2500);
          });
        }
        if (navigator.serviceWorker && !navigator.serviceWorker.controller) {
          let reloaded = null;
          try { reloaded = sessionStorage.getItem("nebulaSjReload"); } catch (e) {}
          if (!reloaded) {
            let armed = false;
            try {
              sessionStorage.setItem("nebulaSjReload", "1");
              armed = sessionStorage.getItem("nebulaSjReload") === "1";
            } catch (e) {}
            if (armed) {
              location.reload();
              return;
            }
          }
        } else {
          try { sessionStorage.removeItem("nebulaSjReload"); } catch (e) {}
        }
      } catch (e) {}
    }
    scope = await resolveScope();
  }
  function buildFrameElement() {
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
      "allow-popups",
      "allow-popups-to-escape-sandbox",
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
    return iframe;
  }
  async function loadFrame() {
    const targetUrl = localStorage.getItem("targeturl");
    if (!targetUrl) {
      console.warn("No targeturl found in localStorage.");
      return;
    }
    const useScope = scope || proxyPrefix();
    try {
      localStorage.setItem("proxyScope", useScope);
    } catch (e) {
    }
    if (useScope === SCRAMJET_PREFIX) {
      let controller = null;
      try {
        if (typeof ensureNebulaScramjet === "function") controller = await ensureNebulaScramjet();
      } catch (e) {
        console.error("Nebula Scramjet init failed:", e);
      }
      if (!controller) {
        const iframe = buildFrameElement();
        iframe.src = useScope + targetUrl;
        return;
      }
      const decoded = decodeStoredTarget(targetUrl);
      const frame = controller.createFrame();
      try { window.__nebulaScramjetFrame = frame; } catch (e) {}
      const iframe = frame.frame;
      iframe.name = "theiframe";
      iframe.id = "browserframe";
      iframe.setAttribute("sandbox", [
        "allow-scripts",
        "allow-same-origin",
        "allow-forms",
        "allow-pointer-lock",
        "allow-orientation-lock",
        "allow-modals",
        "allow-popups",
        "allow-popups-to-escape-sandbox",
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
      const patchPopupFallback = function () {
        try {
          const win = iframe.contentWindow;
          if (!win || !win.open) return;
          if (win.open.__nebulaPatched) return;
          const origOpen = win.open.bind(win);
          const patched = function (url, target, features) {
            let w = null;
            try {
              w = origOpen(url, target, features);
            } catch (e) {
              w = null;
            }
            if (!w && url) {
              try {
                win.location.href = url;
              } catch (e) {
              }
            }
            return w;
          };
          patched.__nebulaPatched = true;
          try {
            win.open = patched;
          } catch (e) {
          }
        } catch (e) {
        }
      };
      iframe.addEventListener("load", patchPopupFallback);
      try {
        frame.go(decoded);
      } catch (e) {
        console.error("Nebula Scramjet navigation failed:", e);
        iframe.src = useScope + targetUrl;
      }
      return;
    }
    const iframe = buildFrameElement();
    const patchPopupFallback = function () {
      try {
        const win = iframe.contentWindow;
        if (!win || !win.open) return;
        if (win.open.__nebulaPatched) return;
        const origOpen = win.open.bind(win);
        const patched = function (url, target, features) {
          let w = null;
          try {
            w = origOpen(url, target, features);
          } catch (e) {
            w = null;
          }
          if (!w && url) {
            try {
              win.location.href = url;
            } catch (e) {
            }
          }
          return w;
        };
        patched.__nebulaPatched = true;
        try {
          win.open = patched;
        } catch (e) {
        }
      } catch (e) {
      }
    };
    iframe.addEventListener("load", patchPopupFallback);
    iframe.src = useScope + targetUrl;
  }
  try {
    await registerServiceWorker();
    await loadFrame();
  } catch (error) {
    console.error("Failed to initialize:", error);
    showInitError("Nebula failed to start: " + (error && error.message ? error.message : error));
  }
};
