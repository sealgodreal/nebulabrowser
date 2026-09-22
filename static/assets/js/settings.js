"use strict";

const NEBULA_SETTINGS_KEY = "nebulaSettings";

const NEBULA_DEFAULTS = {
  autoCloak: false,
  antiClose: false,
  searchEngine: "duckduckgo",
  transport: "auto",
  scope: "auto",
};

const NEBULA_ENGINES = {
  duckduckgo: (q) => "https://duckduckgo.com/?q=" + encodeURIComponent(q) + "&ia=web",
  startpage: (q) => "https://www.startpage.com/sp/search?query=" + encodeURIComponent(q),
  google: (q) => "https://www.google.com/search?q=" + encodeURIComponent(q),
  bing: (q) => "https://www.bing.com/search?q=" + encodeURIComponent(q),
  brave: (q) => "https://search.brave.com/search?q=" + encodeURIComponent(q),
};

function getNebulaSettings() {
  try {
    const raw = localStorage.getItem(NEBULA_SETTINGS_KEY);
    if (!raw) return { ...NEBULA_DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...NEBULA_DEFAULTS, ...parsed };
  } catch {
    return { ...NEBULA_DEFAULTS };
  }
}

function saveNebulaSettings(patch) {
  const next = { ...getNebulaSettings(), ...patch };
  try {
    localStorage.setItem(NEBULA_SETTINGS_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

function nebulaSearchUrl(query) {
  const s = getNebulaSettings();
  const fn = NEBULA_ENGINES[s.searchEngine] || NEBULA_ENGINES.duckduckgo;
  return fn(query);
}

function nebulaCloakTargetUrl() {
  try {
    const href = window.location.href;
    if (/^https?:\/\//i.test(href)) return href;
  } catch {}
  try {
    return window.location.origin + "/";
  } catch {
    return "/";
  }
}

function nebulaBuildCloakHtml(targetUrl, origin) {
  const safeUrl = String(targetUrl).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return (
    '<!doctype html><html><head><meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />' +
    "<style>html,body{margin:0!important;padding:0!important;width:100%;height:100%;overflow:hidden!important;background:#fff;overscroll-behavior:none}" +
    "body{position:fixed!important;top:0!important;left:0!important;width:100%!important;height:100%!important;overflow:hidden!important}" +
    "iframe{position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;height:100dvh!important;height:100svh!important;border:0!important;display:block!important;touch-action:auto}</style>" +
    '</head><body><iframe src="' +
    safeUrl +
    '" title="content" allow="fullscreen; autoplay; clipboard-write; camera; microphone; geolocation" allowfullscreen></iframe>' +
    '<script>(function(){try{var raw=localStorage.getItem("nebulaSettings");var s=raw?JSON.parse(raw):{};if(!s||!s.antiClose)return;' +
    'var h=function(e){if(e){try{e.preventDefault();}catch(_){}try{e.returnValue="";}catch(_){}}return "";};' +
    'window.addEventListener("beforeunload",h);try{window.addEventListener("pagehide",h);}catch(_){}try{window.onbeforeunload=h;}catch(_){}}catch(_){}})();<' +
    "/script></body></html>"
  );
}

function nebulaWriteCloakDoc(popup, html) {
  try {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    return;
  } catch {}
  try {
    let done = false;
    const attempt = () => {
      if (done) return;
      try {
        if (!popup || popup.closed) return;
        const doc = popup.document;
        if (!doc) return;
        if (doc.body && doc.body.childNodes.length > 0) {
          done = true;
          return;
        }
        doc.open();
        doc.write(html);
        doc.close();
        done = true;
      } catch {}
    };
    try {
      if (popup.addEventListener) popup.addEventListener("load", attempt);
    } catch {}
    setTimeout(attempt, 150);
    setTimeout(attempt, 600);
  } catch {}
}

function nebulaShowCloakBlocked() {
  try {
    if (document.getElementById("nebula-cloak-prompt")) return;
    if (!document.body) return;
    const overlay = document.createElement("div");
    overlay.id = "nebula-cloak-prompt";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Enable cloak");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;" +
      "padding:20px;background:rgba(0,0,0,0.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-sizing:border-box;";
    const card = document.createElement("div");
    card.style.cssText =
      "width:min(420px,92vw);padding:28px 28px 22px;border:1px solid rgba(255,255,255,0.1);border-radius:16px;" +
      "background:rgba(26,26,30,0.72);backdrop-filter:blur(24px) saturate(1.4);-webkit-backdrop-filter:blur(24px) saturate(1.4);" +
      "box-shadow:0 10px 40px rgba(0,0,0,0.35);color:#fff;" +
      "font-family:inherit;font-size:14px;line-height:1.65;text-align:center;box-sizing:border-box;";
    const title = document.createElement("div");
    title.textContent = "Pop-up blocked";
    title.style.cssText = "font-size:18px;font-weight:500;letter-spacing:0.01em;margin:0 0 10px;";
    const msg = document.createElement("div");
    msg.textContent = "Nebula tried to open a cloaked window, but pop-ups are blocked. Allow pop-ups, or click \"Open now\".";
    msg.style.cssText = "color:rgba(255,255,255,0.62);font-size:14px;font-weight:300;margin:0 0 20px;";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Open now";
    btn.style.cssText =
      "padding:9px 18px;border:1.5px solid rgba(255,255,255,0.9);border-radius:10px;background:rgba(255,255,255,0.9);color:#161616;" +
      "font-size:13px;font-weight:400;cursor:pointer;";
    btn.addEventListener("click", () => {
      try { overlay.remove(); } catch {}
      cloakNebulaSite({ silent: true });
    });
    const dismiss = document.createElement("div");
    dismiss.textContent = "Dismiss";
    dismiss.style.cssText = "margin-top:14px;font-size:12px;font-weight:300;color:rgba(255,255,255,0.45);cursor:pointer;";
    dismiss.addEventListener("click", () => {
      try { overlay.remove(); } catch {}
    });
    card.appendChild(title);
    card.appendChild(msg);
    card.appendChild(btn);
    card.appendChild(dismiss);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  } catch {}
}

function nebulaIsMobileDevice() {
  try {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean") {
      return navigator.userAgentData.mobile;
    }
  } catch {}
  try {
    const ua = navigator.userAgent || "";
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
    if (navigator.maxTouchPoints > 0 && /Macintosh/.test(ua)) return true;
  } catch {}
  return false;
}

function nebulaDisarmAutoCloakRetry() {
  try {
    if (window.__nebulaCloakGestureHandler) {
      const h = window.__nebulaCloakGestureHandler;
      window.__nebulaCloakGestureHandler = null;
      try { document.removeEventListener("pointerdown", h, true); } catch {}
      try { document.removeEventListener("touchend", h, true); } catch {}
      try { document.removeEventListener("click", h, true); } catch {}
      try { document.removeEventListener("keydown", h, true); } catch {}
    }
  } catch {}
  try {
    const overlay = document.getElementById("nebula-cloak-tap");
    if (overlay) overlay.remove();
  } catch {}
}

function nebulaShowTapToCloak() {
  try {
    if (document.getElementById("nebula-cloak-tap")) return;
    if (!document.body) return;
    const overlay = document.createElement("div");
    overlay.id = "nebula-cloak-tap";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Tap to cloak");
    const mobile = nebulaIsMobileDevice();
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;" +
      "padding:20px;background:rgba(0,0,0,0.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-sizing:border-box;";
    const card = document.createElement("div");
    card.style.cssText =
      "width:min(420px,92vw);padding:28px 28px 22px;border:1px solid rgba(255,255,255,0.1);border-radius:16px;" +
      "background:rgba(26,26,30,0.72);backdrop-filter:blur(24px) saturate(1.4);-webkit-backdrop-filter:blur(24px) saturate(1.4);" +
      "box-shadow:0 10px 40px rgba(0,0,0,0.35);color:#fff;" +
      "font-family:inherit;font-size:14px;line-height:1.65;text-align:center;box-sizing:border-box;";
    const title = document.createElement("div");
    title.textContent = "Tap to hide this tab";
    title.style.cssText = "font-size:18px;font-weight:500;letter-spacing:0.01em;margin:0 0 10px;";
    const msg = document.createElement("div");
    msg.textContent = mobile
      ? "Auto-cloak needs one tap on mobile. This opens the site in an about:blank tab."
      : "Your browser blocked the cloaked window. Tap below to open the site in an about:blank tab.";
    msg.style.cssText = "color:rgba(255,255,255,0.62);font-size:14px;font-weight:300;margin:0 0 20px;";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Open about:blank";
    btn.style.cssText =
      "padding:9px 18px;border:1.5px solid rgba(255,255,255,0.9);border-radius:10px;background:rgba(255,255,255,0.9);color:#161616;" +
      "font-size:13px;font-weight:400;cursor:pointer;";
    // NOTE: window.open MUST run synchronously inside this tap or mobile
    // browsers will block it again (leaving the real URL visible).
    btn.addEventListener("click", () => {
      const ok = cloakNebulaSite({ silent: true });
      if (ok) nebulaDisarmAutoCloakRetry();
    });
    const dismiss = document.createElement("div");
    dismiss.textContent = "Dismiss";
    dismiss.style.cssText = "margin-top:14px;font-size:12px;font-weight:300;color:rgba(255,255,255,0.45);cursor:pointer;";
    dismiss.addEventListener("click", () => {
      nebulaDisarmAutoCloakRetry();
    });
    card.appendChild(title);
    card.appendChild(msg);
    card.appendChild(btn);
    card.appendChild(dismiss);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  } catch {}
}

function nebulaArmAutoCloakRetry() {
  try {
    if (window.__nebulaCloakGestureHandler) return;
    // First tap/keypress after load counts as a user gesture, so a
    // synchronous window.open("about:blank") inside it is allowed on
    // mobile Safari / Chrome iOS where load-time popups are blocked.
    const handler = () => {
      let ok = false;
      try { ok = cloakNebulaSite({ silent: true }); } catch { ok = false; }
      if (ok) nebulaDisarmAutoCloakRetry();
      else nebulaShowTapToCloak();
    };
    window.__nebulaCloakGestureHandler = handler;
    try { document.addEventListener("pointerdown", handler, true); } catch {}
    try { document.addEventListener("touchend", handler, true); } catch {}
    try { document.addEventListener("click", handler, true); } catch {}
    try { document.addEventListener("keydown", handler, true); } catch {}
  } catch {}
}

function cloakNebulaSite(opts) {
  opts = opts || {};
  try {
    if (!opts.allowNested) {
      try {
        if (window.self !== window.top) return false;
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }
  if (window.__nebulaCloaked) return true;
  let origin = "";
  try { origin = window.location.origin; } catch {}
  const targetUrl = nebulaCloakTargetUrl();
  let popup = null;
  try {
    // No feature string and no "noopener": some mobile browsers treat
    // window.open with features/noopener as a new unscriptable tab, which
    // breaks the document.write below and leaves the real URL visible.
    popup = window.open("about:blank", "_blank");
  } catch {
    popup = null;
  }
  if (!popup || popup.closed) {
    if (!opts.silent) nebulaShowCloakBlocked();
    return false;
  }
  try {
    nebulaWriteCloakDoc(popup, nebulaBuildCloakHtml(targetUrl, origin));
  } catch {
    if (!opts.silent) nebulaShowCloakBlocked();
    return false;
  }
  // If the write was blocked (e.g. delayed popup on iOS), the tab is an
  // empty about:blank — treat as failure so callers can retry on next tap.
  try {
    if (popup.closed) return false;
  } catch {}
  try { popup.focus(); } catch {}
  try { window.__nebulaCloaked = true; } catch {}
  try { nebulaDisarmAutoCloakRetry(); } catch {}
  if (!opts.keepOpener) {
    nebulaSuspendAntiClose();
    const redirect = () => {
      try {
        window.location.replace("https://www.google.com");
      } catch {
        try { window.location.href = "https://www.google.com"; } catch {}
      }
    };
    setTimeout(redirect, 200);
  }
  return true;
}

function maybeNebulaAutoCloak() {
  try {
    if (window.__nebulaCloakAttempted) return;
    window.__nebulaCloakAttempted = true;
    try {
      if (window.self !== window.top) return;
    } catch {
      return;
    }
    try { sessionStorage.removeItem("nebula_autocloaked"); } catch {}
    const s = getNebulaSettings();
    if (!s.autoCloak) return;
    // Desktop: load-time window.open usually succeeds and the new tab's
    // address bar reads "about:blank". Mobile / hardened browsers block
    // load-time popups (no user activation), so arm a retry on the first
    // tap/keypress which runs window.open synchronously in a gesture.
    const ok = cloakNebulaSite();
    if (!ok) {
      nebulaArmAutoCloakRetry();
      nebulaShowTapToCloak();
    }
  } catch {}
}

function applyNebulaAntiClose() {
  try {
    const s = getNebulaSettings();
    try { window.removeEventListener("beforeunload", nebulaBeforeUnload); } catch {}
    try { window.removeEventListener("pagehide", nebulaBeforeUnload); } catch {}
    if (s.antiClose) {
      window.addEventListener("beforeunload", nebulaBeforeUnload);
      try { window.addEventListener("pagehide", nebulaBeforeUnload); } catch {}
      try { window.onbeforeunload = nebulaBeforeUnload; } catch {}
    } else {
      try {
        if (window.onbeforeunload === nebulaBeforeUnload) window.onbeforeunload = null;
      } catch {}
    }
  } catch {}
}

function nebulaSuspendAntiClose() {
  try {
    window.removeEventListener("beforeunload", nebulaBeforeUnload);
  } catch {}
  try {
    window.removeEventListener("pagehide", nebulaBeforeUnload);
  } catch {}
  try {
    if (window.onbeforeunload === nebulaBeforeUnload) window.onbeforeunload = null;
  } catch {}
}

function nebulaBeforeUnload(e) {
  if (e) {
    try { e.preventDefault(); } catch {}
    try { e.returnValue = ""; } catch {}
  }
  return "";
}

document.addEventListener("click", function (event) {
  const t = event.target;
  const link = t && t.closest ? t.closest("a[href]") : null;
  if (!link) return;
  const href = link.getAttribute("href");
  if (!href || href.charAt(0) === "#" || href.indexOf("javascript:") === 0) return;
  if (link.target === "_blank") return;
  nebulaSuspendAntiClose();
}, true);

document.addEventListener("submit", function () {
  nebulaSuspendAntiClose();
}, true);

try {
  applyNebulaAntiClose();
} catch {}

try {
  window.addEventListener("storage", function (event) {
    if (event && event.key === NEBULA_SETTINGS_KEY) applyNebulaAntiClose();
  });
} catch {}
