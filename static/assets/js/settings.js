"use strict";

const NEBULA_SETTINGS_KEY = "nebulaSettings";

const NEBULA_DEFAULTS = {
  autoCloak: false,
  antiClose: false,
  subtexts: false,
  searchEngine: "duckduckgo",
  transport: "auto",
  tabDisguise: "none",
  themeAccent: "default",
};

const NEBULA_DISGUISES = {
  google: { title: "Google", icon: "/assets/icons/google.png" },
  drive: { title: "Google Drive", icon: "/assets/icons/drive.png" },
  classroom: { title: "Google Classroom", icon: "/assets/icons/classroom.ico" },
  docs: { title: "Google Docs", icon: "/assets/icons/docs.ico" },
  canvas: { title: "Canvas", icon: "/assets/icons/canvas.ico" },
  clever: { title: "Clever", icon: "/assets/icons/clever.ico" },
};

const NEBULA_DISGUISE_KEYS = ["none", "google", "drive", "classroom", "docs", "canvas", "clever"];

const NEBULA_THEME_KEYS = ["default", "oled", "soft-pink", "cotton-candy", "moss", "blue-lavender", "rose", "sand"];

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
    const merged = { ...NEBULA_DEFAULTS, ...parsed };
    delete merged.scope;
    delete merged.proxy;
    if (merged.transport !== "auto" && merged.transport !== "epoxy" && merged.transport !== "libcurl") {
      merged.transport = NEBULA_DEFAULTS.transport;
    }
    if (NEBULA_DISGUISE_KEYS.indexOf(merged.tabDisguise) < 0) {
      merged.tabDisguise = NEBULA_DEFAULTS.tabDisguise;
    }
    if (NEBULA_THEME_KEYS.indexOf(merged.themeAccent) < 0) {
      merged.themeAccent = NEBULA_DEFAULTS.themeAccent;
    }
    return merged;
  } catch {
    return { ...NEBULA_DEFAULTS };
  }
}

function saveNebulaSettings(patch) {
  const clean = { ...patch };
  delete clean.scope;
  const next = { ...getNebulaSettings(), ...clean };
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

function cloakNebulaSite(opts) {
  opts = opts || {};
  try {
    if (!opts.allowNested) {
      try {
        if (window.self !== window.top) return false;
      } catch (e) {
        return false;
      }
    }
  } catch (e) {
    return false;
  }
  if (window.__nebulaCloaked) return true;
  let popup = null;
  try {
    popup = window.open("about:blank", "_blank");
  } catch (e) {
    popup = null;
  }
  if (!popup || popup.closed) {
    if (!opts.silent) nebulaShowCloakBlocked();
    return false;
  }
  const targetUrl = nebulaCloakTargetUrl();
  try {
    popup.document.body.style.margin = "0";
    popup.document.body.style.height = "100vh";
  } catch (e) {}
  try {
    const iframe = popup.document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.bottom = "0";
    iframe.style.left = "0";
    iframe.style.right = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.margin = "0";
    iframe.style.border = "none";
    iframe.style.outline = "none";
    iframe.setAttribute("allow", "fullscreen; autoplay; clipboard-write; camera; microphone; geolocation");
    try { iframe.allowFullscreen = true; } catch (e) {}
    iframe.src = targetUrl;
    const root = popup.document.body || popup.document.documentElement;
    root.appendChild(iframe);
  } catch (e) {
    if (!opts.silent) nebulaShowCloakBlocked();
    return false;
  }
  try {
    let antiClose = false;
    try { antiClose = !!(getNebulaSettings() || {}).antiClose; } catch (e) {}
    if (antiClose) {
      const sc = popup.document.createElement("script");
      sc.textContent = "window.addEventListener(\"beforeunload\",function(e){try{e.preventDefault();}catch(_){}try{e.returnValue=\"\";}catch(_){}return \"\";});";
      popup.document.head.appendChild(sc);
    }
  } catch (e) {}
  try {
    if (popup.closed) return false;
  } catch (e) {}
  try { popup.focus(); } catch (e) {}
  try { window.__nebulaCloaked = true; } catch (e) {}
  try { nebulaDisarmAutoCloakRetry(); } catch (e) {}
  if (!opts.keepOpener) {
    nebulaSuspendAntiClose();
    const redirect = () => {
      try {
        window.location.replace("https://www.google.com");
      } catch (e) {
        try { window.location.href = "https://www.google.com"; } catch (err) {}
      }
    };
    setTimeout(redirect, 200);
  }
  return true;
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
      "width:min(400px,92vw);padding:26px 26px 20px;border:1px solid rgba(255,255,255,0.12);border-radius:14px;" +
      "background:rgba(20,20,24,0.94);box-shadow:0 14px 44px rgba(0,0,0,0.5);color:#fff;" +
      "font-family:inherit;font-size:14px;line-height:1.6;text-align:center;box-sizing:border-box;";
    const title = document.createElement("div");
    title.textContent = "Pop-ups blocked";
    title.style.cssText = "font-size:17px;font-weight:500;letter-spacing:0.01em;margin:0 0 8px;";
    const msg = document.createElement("div");
    msg.textContent = "Nebula attempted to open a cloaked window, except pop-ups are blocked. Please enable pop-ups, or click \"Cloak\".";
    msg.style.cssText = "color:rgba(255,255,255,0.6);font-size:13px;font-weight:300;margin:0 0 20px;";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Cloak";
    btn.style.cssText =
      "min-width:120px;padding:10px 26px;border:none;border-radius:999px;background:rgba(255,255,255,0.92);color:#161616;" +
      "font-size:13px;font-weight:500;cursor:pointer;";
    btn.addEventListener("click", () => {
      try { overlay.remove(); } catch {}
      cloakNebulaSite({ silent: true });
    });
    const dismiss = document.createElement("div");
    dismiss.textContent = "Don't cloak";
    dismiss.style.cssText = "margin-top:14px;font-size:12px;font-weight:300;color:rgba(255,255,255,0.45);cursor:pointer;";
    dismiss.addEventListener("click", () => {
      try { nebulaDisarmAutoCloakRetry(); } catch (e) {}
      try { overlay.remove(); } catch (e) {}
    });
    card.appendChild(title);
    card.appendChild(msg);
    card.appendChild(btn);
    card.appendChild(dismiss);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  } catch {}
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
    const overlay = document.getElementById("nebula-cloak-prompt");
    if (overlay) overlay.remove();
  } catch {}
}


function nebulaArmAutoCloakRetry() {
  try {
    if (window.__nebulaCloakGestureHandler) return;
    
    
    
    const handler = (event) => {
      try {
        const t = event && event.target;
        if (t && t.closest) {
          if (t.closest("#nebula-cloak-prompt")) return;
        }
      } catch (e) {}
      let ok = false;
      try { ok = cloakNebulaSite({ silent: true }); } catch { ok = false; }
      if (ok) nebulaDisarmAutoCloakRetry();
      else nebulaShowCloakBlocked();
    };
    window.__nebulaCloakGestureHandler = handler;
    try { document.addEventListener("pointerdown", handler, true); } catch {}
    try { document.addEventListener("touchend", handler, true); } catch {}
    try { document.addEventListener("click", handler, true); } catch {}
    try { document.addEventListener("keydown", handler, true); } catch {}
  } catch {}
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
    
    
    
    
    try {
      if (navigator.userAgent && navigator.userAgent.indexOf("Firefox") >= 0) return;
    } catch (e) {}
    const ok = cloakNebulaSite();
    if (!ok) {
      nebulaArmAutoCloakRetry();
      nebulaShowCloakBlocked();
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

function applyNebulaTabDisguise() {
  try {
    const s = getNebulaSettings();
    const key = NEBULA_DISGUISE_KEYS.indexOf(s.tabDisguise) >= 0 ? s.tabDisguise : "none";
    let title = "nebula proxy.";
    let icon = "/assets/icon.png";
    if (key !== "none" && NEBULA_DISGUISES[key]) {
      title = NEBULA_DISGUISES[key].title;
      icon = NEBULA_DISGUISES[key].icon;
    }
    try { document.title = title; } catch (e) {}
    try {
      const links = document.querySelectorAll('link[rel*="icon"]');
      if (links && links.length) {
        links.forEach((l) => {
          try { l.href = icon; } catch (e) {}
        });
      } else if (document.head) {
        const l = document.createElement("link");
        l.rel = "icon";
        l.href = icon;
        try { document.head.appendChild(l); } catch (e) {}
      }
    } catch (e) {}
  } catch (e) {}
}

try {
  applyNebulaAntiClose();
} catch {}

function applyNebulaThemeAccent() {
  try {
    const s = getNebulaSettings();
    const t = NEBULA_THEME_KEYS.indexOf(s.themeAccent) >= 0 ? s.themeAccent : "default";
    try {
      if (t === "default") document.documentElement.removeAttribute("data-theme");
      else document.documentElement.setAttribute("data-theme", t);
    } catch (e) {}
  } catch (e) {}
}

try {
  applyNebulaThemeAccent();
} catch {}

try {
  applyNebulaTabDisguise();
} catch {}

try {
  window.addEventListener("storage", function (event) {
    if (event && event.key === NEBULA_SETTINGS_KEY) {
      applyNebulaAntiClose();
      applyNebulaTabDisguise();
      applyNebulaThemeAccent();
    }
  });
} catch {}
