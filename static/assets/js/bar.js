"use strict";

const browserUrl = document.getElementById("browser-url");
const backBtn = document.getElementById("back-btn");
const forwardBtn = document.getElementById("forward-btn");
const reloadBtn = document.getElementById("reload-btn");
const browserToolbar = document.getElementById("browser-toolbar");
const toolbarToggle = document.getElementById("toolbar-toggle");
const TARGET_URL = "targeturl";
const HISTORY_KEY = "browserHistory";
const HISTORY_INDEX_KEY = "browserHistoryIndex";
const SERVICE_PREFIX = "/service/";
const ASSIGNMENTS_PREFIX = "/assignments/";

function scopeOverride() {
  try {
    const q = new URLSearchParams(location.search).get("scope");
    if (q === "service") return SERVICE_PREFIX;
    if (q === "assignments") return ASSIGNMENTS_PREFIX;
  } catch {
  }
  try {
    if (typeof getNebulaSettings === "function") {
      const s = getNebulaSettings();
      if (s && s.scope === "service") return SERVICE_PREFIX;
      if (s && s.scope === "assignments") return ASSIGNMENTS_PREFIX;
    }
  } catch {
  }
  try {
    const stored = localStorage.getItem("nebulaScope");
    if (stored === "service") return SERVICE_PREFIX;
    if (stored === "assignments") return ASSIGNMENTS_PREFIX;
  } catch {
  }
  return null;
}

function isVercelHost() {


  try { localStorage.removeItem("isVercel"); } catch {}
  try {
    return location.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

function activePrefix() {
  const forced = scopeOverride();
  if (forced) return forced;
  try {
    const stored = localStorage.getItem("proxyScope");
    if (stored === ASSIGNMENTS_PREFIX || stored === SERVICE_PREFIX) return stored;
  } catch {
  }
  if (isVercelHost()) return ASSIGNMENTS_PREFIX;
  return SERVICE_PREFIX;
}

function rememberPrefix(prefix) {
  try {
    if (prefix === ASSIGNMENTS_PREFIX || prefix === SERVICE_PREFIX) {
      localStorage.setItem("proxyScope", prefix);
    }
  } catch {
  }
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

async function resolvePrefixForUrl(decodedUrl) {
  const forced = scopeOverride();
  if (forced) {
    rememberPrefix(forced);
    return forced;
  }
  if (isVercelHost()) return ASSIGNMENTS_PREFIX;
  try {
    const hosts = await getBListHosts();
    if (decodedUrl && hostNeedsAssignments(decodedUrl, hosts)) {
      return ASSIGNMENTS_PREFIX;
    }
  } catch (error) {
    console.warn("Could not resolve proxy scope, defaulting to /service/:", error);
  }
  return SERVICE_PREFIX;
}

function encodeUrl(url) {
  if (!url) return url;
  if (typeof Ultraviolet !== "undefined" && Ultraviolet.codec && Ultraviolet.codec.xor) {
    return Ultraviolet.codec.xor.encode(url);
  }
  if (typeof self !== "undefined" && self.__uv$config && typeof self.__uv$config.encodeUrl === "function") {
    return self.__uv$config.encodeUrl(url);
  }
  console.warn("Ultraviolet codec is not available. Make sure wk2.js is loaded first.");
  return encodeURIComponent(url);
}

function decodeUrl(encodedUrl) {
  if (!encodedUrl) return encodedUrl;
  if (typeof Ultraviolet !== "undefined" && Ultraviolet.codec && Ultraviolet.codec.xor) {
    return Ultraviolet.codec.xor.decode(encodedUrl);
  }
  if (typeof self !== "undefined" && self.__uv$config && typeof self.__uv$config.decodeUrl === "function") {
    return self.__uv$config.decodeUrl(encodedUrl);
  }
  console.warn("Ultraviolet codec is not available. Make sure wk2.js is loaded first.");
  try {
    return decodeURIComponent(encodedUrl);
  } catch {
    return encodedUrl;
  }
}

if (browserToolbar && toolbarToggle) {
  toolbarToggle.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    const isExpanded = browserToolbar.classList.toggle("toolbar-expanded");
    toolbarToggle.classList.toggle("expanded", isExpanded);
    toolbarToggle.setAttribute("aria-expanded", String(isExpanded));
    toolbarToggle.setAttribute("aria-label", isExpanded ? "Collapse browser toolbar" : "Expand browser toolbar");
  });
}

function getBrowserFrame() {
  return document.getElementById("browserframe");
}

function waitForFrame(timeout = 10000) {
  return new Promise(function (resolve) {
    const existing = getBrowserFrame();
    if (existing) {
      resolve(existing);
      return;
    }
    const observer = new MutationObserver(function () {
      const frame = getBrowserFrame();
      if (frame) {
        observer.disconnect();
        resolve(frame);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () {
      observer.disconnect();
      resolve(getBrowserFrame());
    }, timeout);
  });
}

function isValidPrefix(p) {
  return p === ASSIGNMENTS_PREFIX || p === SERVICE_PREFIX;
}



function getBrowserHistory() {
  try {
    const value = localStorage.getItem(HISTORY_KEY);
    if (!value) return [];
    const history = JSON.parse(value);
    if (!Array.isArray(history)) return [];
    const out = [];
    for (const entry of history) {
      if (typeof entry === "string" && entry) out.push({ e: entry, p: null });
      else if (entry && typeof entry.e === "string" && entry.e) {
        out.push({ e: entry.e, p: isValidPrefix(entry.p) ? entry.p : null });
      }
    }
    return out;
  } catch {
    return [];
  }
}

function saveBrowserHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function getHistoryIndex() {
  const value = localStorage.getItem(HISTORY_INDEX_KEY);
  if (value === null) return -1;
  const index = Number.parseInt(value, 10);
  return Number.isNaN(index) ? -1 : index;
}

function saveHistoryIndex(index) {
  localStorage.setItem(HISTORY_INDEX_KEY, String(index));
}

function updateButtons() {
  const history = getBrowserHistory();
  const index = getHistoryIndex();
  if (backBtn) backBtn.disabled = history.length === 0 || index <= 0;
  if (forwardBtn) forwardBtn.disabled = history.length === 0 || index < 0 || index >= history.length - 1;
}

function historyEntryEquals(a, b) {
  return !!a && !!b && a.e === b.e;
}

function addToHistory(encodedUrl, prefix) {
  if (!encodedUrl) return;
  const entry = { e: encodedUrl, p: isValidPrefix(prefix) ? prefix : null };
  let history = getBrowserHistory();
  let index = getHistoryIndex();
  if (index >= 0 && index < history.length - 1) {
    history = history.slice(0, index + 1);
  }
  if (history.length === 0 || !historyEntryEquals(history[history.length - 1], entry)) {
    history.push(entry);
  } else if (!history[history.length - 1].p && entry.p) {
    history[history.length - 1].p = entry.p;
  }
  index = history.length - 1;
  saveBrowserHistory(history);
  saveHistoryIndex(index);
  updateButtons();
}

function entryTargetUrl(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  return entry.e || null;
}

async function entryPrefix(entry) {
  if (entry && isValidPrefix(entry.p)) return entry.p;
  const encoded = entryTargetUrl(entry);
  if (!encoded) return activePrefix();
  let decoded = null;
  try {
    decoded = decodeUrl(encoded);
  } catch {
    decoded = null;
  }
  const prefix = await resolvePrefixForUrl(decoded || encoded);
  entry.p = prefix;
  return prefix;
}

function persistEntryPrefix(encodedUrl, prefix) {
  if (!encodedUrl || !isValidPrefix(prefix)) return;
  try {
    const history = getBrowserHistory();
    let changed = false;
    for (const entry of history) {
      if (entryTargetUrl(entry) === encodedUrl && !entry.p) {
        entry.p = prefix;
        changed = true;
      }
    }
    if (changed) saveBrowserHistory(history);
  } catch {
  }
}

function initializeHistory() {
  const target = localStorage.getItem(TARGET_URL);
  const history = getBrowserHistory();
  const index = getHistoryIndex();
  if (target && history.length === 0) {
    saveBrowserHistory([{ e: target, p: null }]);
    saveHistoryIndex(0);
  } else if (target && (index < 0 || index >= history.length)) {
    const existingIndex = history.findIndex((entry) => entryTargetUrl(entry) === target);
    if (existingIndex >= 0) {
      saveHistoryIndex(existingIndex);
    } else {
      history.push({ e: target, p: null });
      saveBrowserHistory(history);
      saveHistoryIndex(history.length - 1);
    }
  }
}

async function loadEncodedUrl(encodedUrl, prefix) {
  if (!encodedUrl) return;
  localStorage.setItem(TARGET_URL, encodedUrl);
  const usePrefix = prefix || activePrefix();
  rememberPrefix(usePrefix);
  lastSyncedEncoded = encodedUrl;
  const frame = getBrowserFrame() || await waitForFrame();
  if (!frame) {
    console.warn("Could not find browserframe.");
    return;
  }
  frame.src = usePrefix + encodedUrl;
  if (browserUrl) {
    try {
      browserUrl.value = decodeUrl(encodedUrl);
    } catch {
      browserUrl.value = encodedUrl;
    }
  }
}

async function navigateTo(url) {
  if (!url) return;
  url = url.trim();
  if (!url) return;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  const encoded = encodeUrl(url);
  const prefix = await resolvePrefixForUrl(url);
  rememberPrefix(prefix);
  localStorage.setItem(TARGET_URL, encoded);
  addToHistory(encoded, prefix);
  await loadEncodedUrl(encoded, prefix);
}

if (backBtn) {
  backBtn.addEventListener("click", async function (event) {
    event.preventDefault();
    event.stopPropagation();
    const history = getBrowserHistory();
    let index = getHistoryIndex();
    if (history.length === 0 || index <= 0) {
      updateButtons();
      return;
    }
    index--;
    saveHistoryIndex(index);
    await loadEncodedUrl(entryTargetUrl(history[index]), await entryPrefix(history[index]));
    persistEntryPrefix(entryTargetUrl(history[index]), history[index] && history[index].p);
    updateButtons();
  });
}

if (forwardBtn) {
  forwardBtn.addEventListener("click", async function (event) {
    event.preventDefault();
    event.stopPropagation();
    const history = getBrowserHistory();
    let index = getHistoryIndex();
    if (history.length === 0 || index < 0 || index >= history.length - 1) {
      updateButtons();
      return;
    }
    index++;
    saveHistoryIndex(index);
    await loadEncodedUrl(entryTargetUrl(history[index]), await entryPrefix(history[index]));
    persistEntryPrefix(entryTargetUrl(history[index]), history[index] && history[index].p);
    updateButtons();
  });
}

if (reloadBtn) {
  reloadBtn.addEventListener("click", async function (event) {
    event.preventDefault();
    event.stopPropagation();
    const frame = getBrowserFrame() || await waitForFrame();
    if (!frame) return;
    try {
      frame.contentWindow.location.reload();
    } catch {
      const current = localStorage.getItem(TARGET_URL);
      if (current) {
        const cur = getFramePrefix(frame.getAttribute("src") || frame.src) || activePrefix();
        frame.src = cur + current;
      }
    }
  });
}

if (browserUrl) {
  browserUrl.addEventListener("keydown", async function (event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const value = browserUrl.value.trim();
    if (!value) return;
    let url;
    if (value.startsWith("http://") || value.startsWith("https://")) {
      url = value;
    } else if (value.includes(".") && !value.includes(" ")) {
      url = "https://" + value;
    } else {
      if (typeof nebulaSearchUrl === "function") {
        url = nebulaSearchUrl(value);
      } else {
        url = "https://duckduckgo.com/?q=" + encodeURIComponent(value) + "&ia=web";
      }
    }
    await navigateTo(url);
    browserUrl.blur();
  });
}

function updateBrowserUrl() {
  if (!browserUrl) return;
  if (document.activeElement === browserUrl) return;
  const storedUrl = localStorage.getItem(TARGET_URL);
  if (!storedUrl) return;
  try {
    const decoded = decodeUrl(storedUrl);
    if (decoded) browserUrl.value = decoded;
  } catch (error) {
    console.warn("Could not decode targeturl:", storedUrl, error);
  }
}

function extractPrefix(frameUrl) {
  if (!frameUrl) return null;
  try {
    const absolute = new URL(frameUrl, window.location.origin);
    for (const prefix of [SERVICE_PREFIX, ASSIGNMENTS_PREFIX]) {
      if (absolute.pathname.startsWith(prefix)) return prefix;
    }
  } catch {
  }
  const s = String(frameUrl);
  for (const prefix of [SERVICE_PREFIX, ASSIGNMENTS_PREFIX]) {
    if (s.indexOf(prefix) >= 0) return prefix;
  }
  return null;
}

function extractEncodedUrl(frameUrl) {
  const prefix = extractPrefix(frameUrl);
  if (!prefix) return null;
  try {
    const absolute = new URL(frameUrl, window.location.origin);
    if (absolute.pathname.startsWith(prefix)) {
      const encoded = absolute.pathname.slice(prefix.length).split("/")[0];
      return encoded || null;
    }
  } catch {
    return null;
  }
  const idx = String(frameUrl).indexOf(prefix);
  if (idx >= 0) {
    const encoded = String(frameUrl).slice(idx + prefix.length).split("/")[0].split("?")[0].split("#")[0];
    return encoded || null;
  }
  return null;
}

function getFramePrefix() {
  const frame = getBrowserFrame();
  if (!frame) return null;
  return extractPrefix(frame.getAttribute("src") || frame.src);
}

function getFrameEncodedUrl() {
  const frame = getBrowserFrame();
  if (!frame) return null;
  try {
    const href = frame.contentWindow && frame.contentWindow.location && frame.contentWindow.location.href;
    const fromHref = extractEncodedUrl(href);
    if (fromHref) return fromHref;
  } catch {
  }
  const srcAttr = frame.getAttribute("src") || frame.src;
  return extractEncodedUrl(srcAttr);
}

let lastSyncedEncoded = localStorage.getItem(TARGET_URL);

function syncFrameToUrl() {
  if (!browserUrl) {
    updateButtons();
    return;
  }
  const encoded = getFrameEncodedUrl();
  if (!encoded) {
    updateBrowserUrl();
    updateButtons();
    return;
  }
  if (encoded === lastSyncedEncoded) {
    updateButtons();
    return;
  }
  lastSyncedEncoded = encoded;
  localStorage.setItem(TARGET_URL, encoded);
  const framePrefix = getFramePrefix();
  if (framePrefix) {
    rememberPrefix(framePrefix);
    persistEntryPrefix(encoded, framePrefix);
  }
  if (document.activeElement !== browserUrl) {
    try {
      browserUrl.value = decodeUrl(encoded);
    } catch {
      browserUrl.value = encoded;
    }
  }
  const history = getBrowserHistory();
  const index = getHistoryIndex();
  const current = history[index] ? entryTargetUrl(history[index]) : null;
  if (current !== encoded) {
    addToHistory(encoded, getFramePrefix() || activePrefix());
  } else {
    if (getFramePrefix()) persistEntryPrefix(encoded, getFramePrefix());
    updateButtons();
  }
}

initializeHistory();
updateBrowserUrl();
updateButtons();

waitForFrame().then(function (frame) {
  if (!frame) return;
  const target = localStorage.getItem(TARGET_URL);
  lastSyncedEncoded = target;



  const existing = frame.getAttribute("src");
  if (target && !existing) {
    frame.src = activePrefix() + target;
  }
  updateBrowserUrl();
  updateButtons();
});

const menuBtn = document.getElementById("menu-btn");
const toolbarMenu = document.getElementById("toolbar-menu");
const menuReturn = document.getElementById("menu-return");
const menuCloak = document.getElementById("menu-cloak");
const menuFullscreen = document.getElementById("menu-fullscreen");
const menuSettings = document.getElementById("menu-settings");

function isToolbarMenuOpen() {
  return Boolean(toolbarMenu) && !toolbarMenu.hasAttribute("hidden");
}

function openToolbarMenu() {
  if (!toolbarMenu || !menuBtn) return;
  toolbarMenu.hidden = false;
  menuBtn.setAttribute("aria-expanded", "true");
}

function closeToolbarMenu() {
  if (!toolbarMenu || !menuBtn) return;
  toolbarMenu.hidden = true;
  menuBtn.setAttribute("aria-expanded", "false");
}

function cloakSite() {
  if (typeof cloakNebulaSite === "function") {
    cloakNebulaSite();
    return;
  }
  const targetUrl = (() => {
    try {
      const href = window.location.href;
      if (/^https?:\/\//i.test(href)) return href;
    } catch {}
    try { return window.location.origin + "/"; } catch {}
    return "/";
  })();
  const safeUrl = String(targetUrl).replace(/"/g, "");
  let origin = "";
  try { origin = window.location.origin; } catch {}
  const icon = origin ? origin + "/assets/gclassroom.png" : "/assets/gclassroom.png";
  const popup = window.open("about:blank", "_blank");
  if (!popup) return;
  try {
    popup.document.open();
    popup.document.write(
      '<!doctype html><html><head><meta charset="utf-8" />' +
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />' +
        "<title>Home - Classroom</title>" +
        '<link rel="icon" type="image/png" href="' + icon + '" />' +
        "<style>html,body{margin:0!important;padding:0!important;width:100%;height:100%;overflow:hidden!important;background:#fff;overscroll-behavior:none}" +
        "body{position:fixed!important;top:0!important;left:0!important;width:100%!important;height:100%!important;overflow:hidden!important}" +
        "iframe{position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;height:100dvh!important;height:100svh!important;border:0!important;display:block!important;touch-action:auto}</style>" +
        '</head><body><iframe src="' +
        safeUrl +
        '" title="content" allow="fullscreen; autoplay; clipboard-write" allowfullscreen></iframe></body></html>'
    );
    popup.document.close();
    try {
      popup.focus();
    } catch {}
  } catch (error) {
    console.warn("Could not cloak site:", error);
    return;
  }
  if (typeof nebulaSuspendAntiClose === "function") nebulaSuspendAntiClose();
  setTimeout(() => {
    try { window.location.replace("https://www.google.com"); }
    catch { try { window.location.href = "https://www.google.com"; } catch {} }
  }, 200);
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  } catch (error) {
    console.warn("Could not toggle fullscreen:", error);
  }
}

if (menuBtn && toolbarMenu) {
  menuBtn.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    if (isToolbarMenuOpen()) {
      closeToolbarMenu();
    } else {
      openToolbarMenu();
    }
  });

  document.addEventListener("click", function (event) {
    if (!isToolbarMenuOpen()) return;
    if (event.target.closest && event.target.closest("#toolbar-menu, #menu-btn")) return;
    closeToolbarMenu();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isToolbarMenuOpen()) {
      event.stopPropagation();
      closeToolbarMenu();
      menuBtn.focus();
    }
  });
}

if (menuReturn) {
  menuReturn.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    closeToolbarMenu();
    if (typeof nebulaSuspendAntiClose === "function") nebulaSuspendAntiClose();
    window.location.href = "/";
  });
}

if (menuCloak) {
  menuCloak.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    closeToolbarMenu();
    cloakSite();
  });
}

if (menuFullscreen) {
  menuFullscreen.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    closeToolbarMenu();
    toggleFullscreen();
  });
}

if (menuSettings) {
  menuSettings.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    closeToolbarMenu();
    if (typeof nebulaSuspendAntiClose === "function") nebulaSuspendAntiClose();
    window.location.href = "/settings.html";
  });
}

setInterval(function () {
  syncFrameToUrl();
}, 1000);