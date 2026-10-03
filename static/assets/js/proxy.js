"use strict";
const NEBULA_PROXY_ULTRAVIOLET = "ultraviolet";
const NEBULA_PROXY_SCRAMJET = "scramjet";
const NEBULA_PROXY_DEFAULT = NEBULA_PROXY_ULTRAVIOLET;
const NEBULA_UV_PREFIX = "/lesson/";
const NEBULA_SJ_PREFIX = "/study/";
const NEBULA_SJ_LEGACY_PREFIX = "/scramjet/";
const NEBULA_SJ_FILES = {
  wasm: "/scram/scramjet.wasm.wasm",
  all: "/scram/scramjet.all.js",
  sync: "/scram/scramjet.sync.js"
};
function getNebulaProxy() {
  try {
    const s = typeof getNebulaSettings === "function" ? getNebulaSettings() : null;
    const p = s && s.proxy;
    if (p === NEBULA_PROXY_SCRAMJET || p === NEBULA_PROXY_ULTRAVIOLET) return p;
  } catch (e) {}
  try {
    const raw = localStorage.getItem("nebulaProxy");
    if (raw === NEBULA_PROXY_SCRAMJET || raw === NEBULA_PROXY_ULTRAVIOLET) return raw;
  } catch (e) {}
  return NEBULA_PROXY_DEFAULT;
}
function nebulaProxyForPrefix(prefix) {
  if (prefix === NEBULA_SJ_PREFIX || prefix === NEBULA_SJ_LEGACY_PREFIX) return NEBULA_PROXY_SCRAMJET;
  return NEBULA_PROXY_ULTRAVIOLET;
}
function nebulaNormalizePrefix(prefix) {
  if (prefix === NEBULA_SJ_LEGACY_PREFIX) return NEBULA_SJ_PREFIX;
  return prefix;
}
function getNebulaProxyPrefix(proxy) {
  const p = proxy || getNebulaProxy();
  if (p === NEBULA_PROXY_SCRAMJET) return NEBULA_SJ_PREFIX;
  return NEBULA_UV_PREFIX;
}
function nebulaEncodeProxyUrl(url, proxy) {
  const p = proxy || getNebulaProxy();
  const value = String(url || "");
  if (!value) return value;
  if (p === NEBULA_PROXY_SCRAMJET) {
    try {
      const controller = window.__nebulaScramjet;
      if (controller && typeof controller.encodeUrl === "function") {
        const full = controller.encodeUrl(value);
        if (full) {
          if (full.indexOf(NEBULA_SJ_PREFIX) === 0) return full.slice(NEBULA_SJ_PREFIX.length);
          if (full.indexOf(NEBULA_SJ_LEGACY_PREFIX) === 0) return full.slice(NEBULA_SJ_LEGACY_PREFIX.length);
        }
        return full;
      }
    } catch (e) {}
    return encodeURIComponent(value);
  }
  try {
    if (typeof Ultraviolet !== "undefined" && Ultraviolet.codec && Ultraviolet.codec.xor) {
      return Ultraviolet.codec.xor.encode(value);
    }
  } catch (e) {}
  try {
    if (typeof self !== "undefined" && self.__uv$config && typeof self.__uv$config.encodeUrl === "function") {
      return self.__uv$config.encodeUrl(value);
    }
  } catch (e) {}
  return encodeURIComponent(value);
}
function nebulaDecodeProxyUrl(encoded, proxy) {
  const p = proxy || getNebulaProxy();
  const value = String(encoded || "");
  if (!value) return value;
  if (p === NEBULA_PROXY_SCRAMJET) {
    try {
      return decodeURIComponent(value);
    } catch (e) {}
    return value;
  }
  try {
    if (typeof Ultraviolet !== "undefined" && Ultraviolet.codec && Ultraviolet.codec.xor) {
      return Ultraviolet.codec.xor.decode(value);
    }
  } catch (e) {}
  try {
    if (typeof self !== "undefined" && self.__uv$config && typeof self.__uv$config.decodeUrl === "function") {
      return self.__uv$config.decodeUrl(value);
    }
  } catch (e) {}
  try {
    return decodeURIComponent(value);
  } catch (e) {}
  return value;
}
function nebulaLoadScriptOnce(src) {
  return new Promise(function (resolve, reject) {
    try {
      const existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        if (existing.dataset.loaded === "1") {
          resolve();
          return;
        }
        existing.addEventListener("load", function () { resolve(); });
        existing.addEventListener("error", function (e) { reject(e); });
        return;
      }
      const el = document.createElement("script");
      el.src = src;
      el.addEventListener("load", function () {
        try { el.dataset.loaded = "1"; } catch (e) {}
        resolve();
      });
      el.addEventListener("error", function (e) { reject(e); });
      document.head.appendChild(el);
    } catch (e) {
      reject(e);
    }
  });
}
async function ensureNebulaScramjet() {
  if (window.__nebulaScramjet) return window.__nebulaScramjet;
  if (window.__nebulaScramjetPromise) return window.__nebulaScramjetPromise;
  const task = (async function () {
    if (typeof $scramjetLoadController !== "function") {
      await Promise.race([
        nebulaLoadScriptOnce("/scram/scramjet.all.js"),
        new Promise(function (resolve, reject) {
          setTimeout(function () { reject(new Error("Scramjet bundle load timed out")); }, 10000);
        })
      ]);
    }
    if (typeof $scramjetLoadController !== "function") throw new Error("Scramjet bundle unavailable");
    const holder = $scramjetLoadController();
    const ScramjetController = holder.ScramjetController;
    function buildController() {
      return new ScramjetController({
        prefix: NEBULA_SJ_PREFIX,
        files: NEBULA_SJ_FILES,
        codec: {
          encode: function (url) { return encodeURIComponent(url); },
          decode: function (url) { return decodeURIComponent(url); }
        }
      });
    }
    function initWithTimeout(controller) {
      return Promise.race([
        controller.init(),
        new Promise(function (resolve, reject) {
          setTimeout(function () { reject(new Error("Scramjet init timed out")); }, 15000);
        })
      ]);
    }
    function clearStaleDatabase() {
      return new Promise(function (resolve) {
        let done = false;
        const finish = function () {
          if (!done) {
            done = true;
            resolve();
          }
        };
        try {
          const req = indexedDB.deleteDatabase("$scramjet");
          req.onsuccess = finish;
          req.onerror = finish;
          req.onblocked = function () {};
        } catch (e) {
          finish();
          return;
        }
        setTimeout(finish, 10000);
      });
    }
    function unregisterStaleWorker() {
      return (async function () {
        try {
          if (!navigator.serviceWorker || !navigator.serviceWorker.getRegistrations) return;
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            try {
              let script = "";
              try {
                if (reg.active) script = reg.active.scriptURL || "";
                else if (reg.waiting) script = reg.waiting.scriptURL || "";
                else if (reg.installing) script = reg.installing.scriptURL || "";
              } catch (e) {}
              const scope = reg.scope || "";
              if (script.indexOf("/sj.js") >= 0 || scope === location.origin + "/") {
                try { await reg.unregister(); } catch (e) {}
              }
            } catch (e) {}
          }
        } catch (e) {}
      })();
    }
    let controller = null;
    try {
      controller = buildController();
      await initWithTimeout(controller);
    } catch (e) {
      try { controller = null; } catch (err) {}
      await unregisterStaleWorker();
      await clearStaleDatabase();
      try {
        if (navigator.serviceWorker) {
          await navigator.serviceWorker.register("/sj.js", { scope: "/" });
        }
      } catch (err) {}
      controller = buildController();
      await initWithTimeout(controller);
    }
    try { window.__nebulaScramjet = controller; } catch (e) {}
    return controller;
  })();
  try { window.__nebulaScramjetPromise = task; } catch (e) {}
  try {
    const controller = await task;
    try { window.__nebulaScramjet = controller; } catch (e) {}
    return controller;
  } catch (e) {
    try { window.__nebulaScramjetPromise = null; } catch (err) {}
    throw e;
  }
}
