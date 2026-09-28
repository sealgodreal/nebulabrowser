"use strict";

const NEBULA_TRANSPORT_KEY = "nebulaTransport";
const NEBULA_WISP_SUFFIX = "/wisp/";

function nebulaWispUrl() {
  return (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + NEBULA_WISP_SUFFIX;
}

function getNebulaTransportPref() {
  try {
    const s = typeof getNebulaSettings === "function" ? getNebulaSettings() : null;
    if (s && s.transport) return s.transport;
    return localStorage.getItem(NEBULA_TRANSPORT_KEY) || "auto";
  } catch {
    return "auto";
  }
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error((label || "transport") + " timed out after " + ms + "ms")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function nebulaTryTransport(connection, path, wispUrl) {
  await withTimeout(connection.setTransport(path, [{ wisp: wispUrl }]), 8000, path);
  if (typeof connection.getTransport === "function") {
    try { await withTimeout(connection.getTransport(), 3000, path + " verify"); } catch {}
  }
}

function nebulaTransportOrder(pref) {
  if (pref === "epoxy") return ["/epoxy/index.mjs", "/libcurl/index.mjs"];
  if (pref === "libcurl") return ["/libcurl/index.mjs", "/epoxy/index.mjs"];
  try {
    const last = localStorage.getItem(NEBULA_TRANSPORT_KEY);
    if (last === "/libcurl/index.mjs") return ["/libcurl/index.mjs", "/epoxy/index.mjs"];
  } catch {}
  return ["/epoxy/index.mjs", "/libcurl/index.mjs"];
}

async function nebulaSetTransport(connection, wispUrl) {
  const pref = getNebulaTransportPref();
  const order = nebulaTransportOrder(pref);
  const errors = [];
  for (const path of order) {
    try {
      await nebulaTryTransport(connection, path, wispUrl || nebulaWispUrl());
      try { localStorage.setItem(NEBULA_TRANSPORT_KEY, path); } catch {}
      try { document.documentElement.dataset.transport = path.includes("libcurl") ? "libcurl" : "epoxy"; } catch {}
      return path;
    } catch (err) {
      console.warn("Nebula transport failed, trying fallback:", path, err);
      errors.push(path + ": " + (err && err.message ? err.message : err));
    }
  }
  throw new Error("All transports failed. " + errors.join(" | "));
}
