document.addEventListener("DOMContentLoaded", () => {
  const searchForm = document.getElementById("form");
  const addressInput = document.getElementById("address");
  
  function goTo(url) {
    if (!url) return;
    if (url.startsWith("now.gg") || url.startsWith("https://now.gg") || url.startsWith("http://now.gg")) {
      alert("Hey! https://now.gg usually does not work with Ultraviolet, so you will be directed to https://nowgg.fun.");
      url = "https://nowgg.fun";
    }
    const encodedUrl = __uv$config.encodeUrl(url);
    localStorage.setItem("targeturl", encodedUrl);
    window.location.href = "/math";
  }
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const url = prepareUrl(addressInput.value);
    if (!url) return;
    addressInput.value = url;
    goTo(url);
  });
  document.querySelectorAll("[data-quick-url]").forEach((btn) => {
    btn.addEventListener("click", () => goTo(btn.getAttribute("data-quick-url")));
  });
  function prepareUrl(input) {
    let url = input.trim();
    if (!url) return null;
    if (!isUrl(url)) {
      if (typeof nebulaSearchUrl === "function") {
        url = nebulaSearchUrl(url);
      } else {
        url = "https://duckduckgo.com/?q=" + encodeURIComponent(url) + "&ia=web";
      }
    } else if (!url.startsWith("https://") && !url.startsWith("http://")) {
      url = "https://" + url;
    }
    return url;
  }
  function isUrl(value = "") {
    value = value.trim();
    if (/^https?:\/\/\S+$/i.test(value)) return true;
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(value);
  }
});
