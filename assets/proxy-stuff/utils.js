function encodeNebula(url) {
  return encodeURIComponent(url);
}

function decodeNebula(url) {
  return decodeURIComponent(url);
}

function proxify(url, base) {
  try {
    if (
      !url ||
      url.startsWith("data:") ||
      url.startsWith("blob:") ||
      url.startsWith("javascript:") ||
      url.startsWith("#")
    ) return url;

    const abs = new URL(url, base).href;

    return `${self.__nebula$config.prefix}?${self.__nebula$config.param}=` +
      encodeNebula(abs);
  } catch {
    return url;
  }
}
