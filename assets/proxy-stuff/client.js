(function () {
  const PREFIX = "/lessons/math";

  function proxify(url) {
    try {
      if (
        !url ||
        url.startsWith("data:") ||
        url.startsWith("blob:") ||
        url.startsWith("javascript:") ||
        url.startsWith("#") ||
        url.includes(PREFIX)
      ) return url;

      const abs = new URL(url, location.href).href;
      return PREFIX + "?url=" + encodeURIComponent(abs);
    } catch {
      return url;
    }
  }

  const origFetch = window.fetch;
  window.fetch = function (url, ...args) {
    try {
      url = typeof url === "string"
        ? proxify(url)
        : new Request(proxify(url.url), url);
    } catch {}
    return origFetch(url, ...args);
  };

  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    try { url = proxify(url); } catch {}
    return _open.call(this, method, url, ...rest);
  };

  const _WS = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    try {
      const proxied = proxify(url)
        .replace(/^https:/, "wss:")
        .replace(/^http:/, "ws:");
      return protocols ? new _WS(proxied, protocols) : new _WS(proxied);
    } catch {
      return protocols ? new _WS(url, protocols) : new _WS(url);
    }
  };

  const realLocation = window.location;
  const proxyLocation = new Proxy(realLocation, {
    get(target, prop) {
      if (prop === "href") return realLocation.href;
      if (prop === "assign") return (url) => realLocation.href = proxify(url);
      if (prop === "replace") return (url) => realLocation.replace(proxify(url));
      return target[prop];
    }
  });

  try {
    Object.defineProperty(window, "location", {
      get: () => proxyLocation
    });
  } catch {}

  document.addEventListener("click", e => {
    const a = e.target.closest("a[href]");
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href || href.includes(PREFIX)) return;

    e.preventDefault();
    location.href = proxify(href);
  }, true);

  document.addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target;
    const q = new URLSearchParams(new FormData(f)).toString();
    location.href = proxify(f.action + (q ? "?" + q : ""));
  }, true);

})();
