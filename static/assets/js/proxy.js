"use strict";
const NEBULA_UV_PREFIX = "/lesson/";
function getNebulaProxy() {
  return "ultraviolet";
}
function nebulaProxyForPrefix() {
  return "ultraviolet";
}
function nebulaNormalizePrefix(prefix) {
  return prefix;
}
function getNebulaProxyPrefix() {
  return NEBULA_UV_PREFIX;
}
function nebulaEncodeProxyUrl(url) {
  const value = String(url || "");
  if (!value) return value;
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
function nebulaDecodeProxyUrl(encoded) {
  const value = String(encoded || "");
  if (!value) return value;
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
