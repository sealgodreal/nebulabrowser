const ENC_KEY = "bebula";
const REDIRECT_URLS = [
    "https://www.blooket.com/",
    "https://kahoot.it/",
    "https://www.clever.com/",
    "https://quizlet.com/",
    "https://classroom.google.com/",
    "https://canvas.instructure.com/",
    "https://www.khanacademy.org/",
    "https://www.ixl.com/",
    "https://www.desmos.com/",
    "https://www.geogebra.org/",
    "https://www.ck12.org/",
    "https://www.pbslearningmedia.org/",
    "https://www.edpuzzle.com/",
    "https://www.nearpod.com/",
    "https://www.typingclub.com/",
    "https://www.duolingo.com/",
    "https://www.scholastic.com/",
    "https://www.readworks.org/",
    "https://www.commonlit.org/",
    "https://www.oercommons.org/"
];

let historyStack = [];
let historyIndex = -1;
let loadProgress = 0;
let loadProgressInterval = null;
let isLoading = false;
let miniBarTimeout = null;
let miniBarHidden = false;
let miniBarAnimating = false;
let currentTheme = "default";
let settingsOpen = false;
let altHeld = false;
let tapCount = 0;
let tapTimer = null;
let cloakWindow = null;

const MINI_BAR_HIDE_DELAY = 3000;

const SUBTEXTS = [
    "usenebula.netlify.app",
    "if the proxy doesnt work for you, please try using another browser",
    "if cloud gaming doesnt work then uhh idk",
    "yes i used the big gpt for the logo",
    "is nebula gonna be the next MASSIVE proxy??",
    "scramjet is lwk pretty tuff",
    "should i make a discord server?",
    "sub to the yt channel: @nebulaunblocking",
    "follow the tt: @nebulaunbl0cking",
    "unblocked gta6? (please cyberleek)",
    "ur my baka now",
    '<img src="./assets/images/CatEatingChips.gif" width="80" height="80">',
    '<img src="./assets/images/AlienCatEatingChips.gif" width="80" height="80">',
    '<img src="./assets/images/letskeepthings.png" width="60" height="80">',
    "\"this website sucks i cant even read ao3\"",
    "\"yo bro did you know that deleting 'C:\\Windows\\System32' gives you higher fps\"",
    "sudo rm -rf --no-preserve-root /*",
    "sudo apt install opsec",
];

let currentSubtextIndex = -1;
let isSubtextChanging = false;

function getRandomSubtext() {
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * SUBTEXTS.length);
    } while (newIndex === currentSubtextIndex && SUBTEXTS.length > 1);
    currentSubtextIndex = newIndex;
    return SUBTEXTS[newIndex];
}

function initSubtext() {
    const subtextEl = document.getElementById("wordmarkSubtext");
    if (!subtextEl) return;
    subtextEl.innerHTML = getRandomSubtext();
    subtextEl.style.opacity = "1";
    subtextEl.style.transform = "translateY(0)";
    subtextEl.removeEventListener("click", handleSubtextClick);
    subtextEl.addEventListener("click", handleSubtextClick);
}

function handleSubtextClick() {
    if (isSubtextChanging) return;
    isSubtextChanging = true;

    const subtextEl = document.getElementById("wordmarkSubtext");
    if (!subtextEl) {
        isSubtextChanging = false;
        return;
    }

    subtextEl.classList.add("fading");

    setTimeout(() => {
        subtextEl.innerHTML = getRandomSubtext();
        subtextEl.classList.remove("fading");
        isSubtextChanging = false;
    }, 300);
}

function clearAllData() {
    if (!confirm("Are you sure you want to clear all local data?")) return;
    localStorage.clear();
    location.reload();
}

function nebulaToast(text, isWarning) {
    const notif = document.getElementById("toastNotification");
    const notifText = document.getElementById("toastNotificationText");
    const notifIcon = document.getElementById("toastNotificationIcon");
    if (notifText) notifText.textContent = text || "Notification";
    if (notifIcon) notifIcon.innerHTML = isWarning ? "&#33;" : "&#10003;";
    if (notif) {
        notif.classList.toggle("warning", !!isWarning);
        notif.classList.add("show");
        setTimeout(() => notif.classList.remove("show"), 3000);
    }
}

let _p = "";
(async function () {
    const keys = await caches.keys();
    for (const key of keys) await caches.delete(key);
    sessionStorage.clear();

    const proxyUrls = [
        "https://brooklyn-oval-bike-tourism.trycloudflare.com",
        "https://resources-indices-exists-maintaining.trycloudflare.com",
        "https://modules-stop-souls-precipitation.trycloudflare.com"
    ];

    const overlay = Object.assign(document.createElement("div"), {
        id: "proxyOverlay",
        style: "position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;z-index:999999;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',Arial,sans-serif;flex-direction:column;user-select:none;"
    });
    const statusText = Object.assign(document.createElement("div"), {
        id: "proxyStatus",
        style: "color:#fff;font-size:16px;font-weight:300;letter-spacing:1px;",
        textContent: "finding unblocked proxy..."
    });
    overlay.appendChild(statusText);
    document.body.appendChild(overlay);

    const probeFrame = Object.assign(document.createElement("iframe"), {
        id: "probeFrame",
        style: "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;border:0;",
        sandbox: "allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
    });
    document.body.appendChild(probeFrame);

    const isFrameBlocked = () => {
        try {
            const src = probeFrame.src;
            if (!src || src === "about:blank" || src.startsWith("about:")) return true;

            let href = null;
            try { href = probeFrame.contentWindow?.location?.href || probeFrame.src; } catch (_) { href = probeFrame.src; }

            const lower = (href || src || "").toLowerCase();
            const blockedKeywords = [
                "securly.com/broker/blocked","goguardian.com/blocked","goguardian.com/filter",
                "lightspeed.com/blocked","iboss.com/blocked","smoothwall.com/blocked",
                "fortiguard.com/blocked","opendns.com/blocked","umbrella.com/blocked",
                "zscaler.com/blocked","mcafee.com/blocked","barracuda.com/blocked",
                "forcepoint.com/blocked","netnanny.com/blocked","cyberpatrol.com/blocked",
                "surfwatch.com/blocked","covenanteyes.com/blocked","blocked","filter",
                "restricted","denied","forbidden","notallowed","policyviolation",
                "accessdenied","categoryblocked","webfilter","dnsfilter","contentfilter"
            ];
            if (blockedKeywords.some(k => lower.includes(k))) return true;

            try {
                const doc = probeFrame.contentDocument || probeFrame.contentWindow?.document;
                if (doc) {
                    const title = (doc.title || "").toLowerCase();
                    if (["blocked","securly","goguardian","access denied","forbidden","restricted","filter"].some(k => title.includes(k))) return true;
                    if (doc.body) {
                        const bodyText = (doc.body.innerText || doc.body.textContent || "").toLowerCase();
                        if (bodyText.includes("login to continue") && bodyText.includes("school email")) return true;
                        if (bodyText.trim().length < 10) return true;
                    }
                }
            } catch (_) {}
            return false;
        } catch (_) { return false; }
    };

    const fetchBlocked = async url => {
        try { await fetch(url, { method: "HEAD", mode: "no-cors", cache: "no-store" }); return false; }
        catch (_) { return true; }
    };

    const loadFrame = (url, timeout = 15000) => new Promise((resolve, reject) => {
        let timer = null;
        let settled = false;
        const cleanup = () => { if (timer) clearTimeout(timer); probeFrame.onload = null; probeFrame.onerror = null; };
        probeFrame.onload = () => { if (!settled) { settled = true; cleanup(); resolve(); } };
        probeFrame.onerror = () => { if (!settled) { settled = true; cleanup(); reject(); } };
        timer = setTimeout(() => { if (!settled) { settled = true; cleanup(); reject(); } }, timeout);
        probeFrame.src = url;
    });

    const findProxy = async () => {
        let attempt = 0;
        const maxAttempts = proxyUrls.length * 3;
        let idx = 0;

        while (attempt < maxAttempts) {
            const url = proxyUrls[idx % proxyUrls.length];
            try {
                await loadFrame(url, 18000);
                let blocked = isFrameBlocked();
                if (!blocked && await fetchBlocked(url)) {
                    const src = probeFrame.src || "";
                    if (src.includes("securly") || src.includes("goguardian") || src.includes("blocked") || src.includes("filter")) {
                        blocked = true;
                    }
                }
                const lower = url.toLowerCase();
                if (lower.includes("securly.com/broker/blocked") || lower.includes("goguardian.com/blocked")) blocked = true;
                if (!blocked) return url;
            } catch (_) {}
            idx = (idx + 1) % proxyUrls.length;
            attempt++;
            await new Promise(r => setTimeout(r, 500));
        }
        return null;
    };

    const found = await findProxy();
    const overlayEl = document.getElementById("proxyOverlay");
    const statusEl = document.getElementById("proxyStatus");

    if (found) {
        if (statusEl) statusEl.textContent = "link found! initializing...";
        _p = found + "/learn/study/";
        await new Promise(r => setTimeout(r, 100));
        if (overlayEl) overlayEl.remove();
    } else {
        if (statusEl) statusEl.textContent = "all proxy links are blocked.";
        return;
    }

    const frame = document.getElementById("probeFrame");
    if (frame) { frame.src = "about:blank"; frame.remove(); }
})();


function openAppEntry(app) {
    if (app.noP) openAppWithNoP(app.url);
    else openApp(app.url);
}

function encryptUrl(url) {
    let result = "";
    for (let i = 0; i < url.length; i++) {
        result += String.fromCharCode(url.charCodeAt(i) ^ ENC_KEY.charCodeAt(i % ENC_KEY.length));
    }
    return btoa(result).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function decryptUrl(enc) {
    let padded = enc.replace(/-/g, "+").replace(/_/g, "/");
    while (padded.length % 4) padded += "=";
    const decoded = atob(padded);
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(decoded.charCodeAt(i) ^ ENC_KEY.charCodeAt(i % ENC_KEY.length));
    }
    return result;
}

function getRandomUrl() {
    return REDIRECT_URLS[Math.floor(Math.random() * REDIRECT_URLS.length)];
}

function registerTap() {
    if (!altHeld) return;
    tapCount++;
    if (tapCount === 1) {
        tapTimer = setTimeout(() => { tapCount = 0; }, 250);
    }
    if (tapCount === 2) {
        clearTimeout(tapTimer);
        tapCount = 0;
        window.location.href = getRandomUrl();
    }
}

function looksLikeUrl(input) {
    return /^(https?:\/\/|www\.)/i.test(input) || /^[^\s]+\.[^\s]+(\/.*)?$/.test(input);
}

function getSearchUrl(query) {
    const engine = localStorage.getItem("nebula-search-engine") || "ddg";
    const q = encodeURIComponent(query);
    if (engine === "startpage") return "https://www.startpage.com/search?q=" + q;
    if (engine === "bing")      return "https://www.bing.com/search?q=" + q;
    if (engine === "brave")     return "https://search.brave.com/search?q=" + q;
    return "https://duckduckgo.com/?q=" + q + "&ia=web";
}

async function navigate(value) {
    const keys = await caches.keys();
    for (const key of keys) await caches.delete(key);
    sessionStorage.clear();
    
    value = String(value || "").trim();
    if (!value) return;

    const targetUrl = looksLikeUrl(value)
        ? (value.startsWith("http") ? value : "https://" + value)
        : getSearchUrl(value);

    try {
        const p_Url = _p.trim();
        if (!p_Url) throw new Error("Proxy URL not ready.");
        openBrowser(p_Url + encodeURIComponent(targetUrl));
    } catch (error) {
        console.error("Nebula search failed:", error);
        openBrowser(targetUrl);
    }
}

function stripP(url) {
    try {
        const decoded = decodeURIComponent(url);
        let result = decoded.startsWith(_p) ? decoded.slice(_p.length) : decoded;
        return result.replace(/^https?:\/\//, "");
    } catch {
        return url;
    }
}

function openApp(url) {
    try {
        const p_Url = _p.trim();
        if (!p_Url) throw new Error("Proxy URL not ready.");
        openBrowser(p_Url + encodeURIComponent(url));
    } catch (err) {
        console.error("Fetch failed, falling back to direct:", err);
        openBrowser(url);
    }
}

function openAppWithNoP(url) {
    openBrowser(url);
}

function startLoadingProgress() {
    isLoading = true;
    loadProgress = 0;

    const fill = document.getElementById("miniBarLoaderFill");
    const loader = document.getElementById("miniBarLoader");

    loader?.classList.add("visible");
    if (fill) fill.style.width = "0%";

    clearInterval(loadProgressInterval);

    loadProgressInterval = setInterval(() => {
        if (!isLoading) return;
        const remaining = 100 - loadProgress;
        loadProgress = Math.min(loadProgress + remaining * 0.08 + Math.random() * 2, 85);
        if (fill) fill.style.width = loadProgress + "%";
    }, 200);
}

function finishLoadingProgress() {
    isLoading = false;

    const fill = document.getElementById("miniBarLoaderFill");
    const loader = document.getElementById("miniBarLoader");

    if (fill) fill.style.width = "100%";

    setTimeout(() => {
        loader?.classList.remove("visible");
        setTimeout(() => { if (fill) fill.style.width = "0%"; }, 300);
    }, 400);

    clearInterval(loadProgressInterval);
    loadProgressInterval = null;
}

function openBrowser(url) {
    const popup = document.getElementById("tetoPopup");
    popup.classList.remove("show");
    popup.style.opacity = "0";

    document.getElementById("mainPage").style.display = "none";
    document.getElementById("browserView").style.display = "block";

    const frame = document.getElementById("browserFrame");
    const bar = document.getElementById("urlBar");

    showLoading();
    startLoadingProgress();

    if (!frame._loadListenerAdded) {
        frame._loadListenerAdded = true;
        frame.addEventListener("load", () => {
            hideLoading();
            finishLoadingProgress();
        });
    }

    frame.src = url;

    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(url);
    historyIndex++;

    bar.value = stripP(url);

    setTimeout(resetMiniBarTimer, 100);
}

function loadUrl(input) {
    input = String(input || "").trim();
    if (!input) return;

    const targetUrl = looksLikeUrl(input)
        ? (input.startsWith("http") ? input : "https://" + input)
        : "https://duckduckgo.com/?q=" + encodeURIComponent(input) + "&ia=web";

    try {
        const p_Url = _p.trim();
        if (!p_Url) throw new Error("Proxy URL not ready.");
        openBrowser(p_Url + encodeURIComponent(targetUrl));
    } catch (error) {
        console.error("Nebula URL navigation failed:", error);
        openBrowser(targetUrl);
    }
}

function showLoading() {
    const browser = document.getElementById("browserView");
    let loader = document.getElementById("loadingFrame");

    if (!loader) {
        loader = document.createElement("iframe");
        loader.id = "loadingFrame";
        loader.src = "./assets/html/loading.html";
        browser.appendChild(loader);
    }

    loader.style.display = "block";
    loader.style.opacity = "1";
}

function hideLoading() {
    setTimeout(() => {
        const loader = document.getElementById("loadingFrame");
        if (!loader) return;
        loader.style.opacity = "0";
        setTimeout(() => { loader.style.display = "none"; }, 350);
    }, 500);
}

function openGame()        { openAppWithNoP("./assets/html/educationpage.html"); }
function openTools()       { openAppWithNoP("./assets/html/learningtools.html"); }
function openAIAssistant() { openAppWithNoP("./assets/html/homeworkhelper.html"); }
function openCloudG()      { openAppWithNoP("./assets/html/cloudeducation.html"); }

window.goHome              = goHome;
window.toggleTopBar        = toggleTopBar;
window.openTools           = openTools;
window.openAppEntry        = openAppEntry;
window.toggleSettings      = toggleSettings;
window.openSettingsOverlay = openSettingsOverlay;
window.closeSettingsOverlay = closeSettingsOverlay;
window.switchSettingsTab   = switchSettingsTab;
window.renderThemeGrid     = renderThemeGrid;
window.setAnimatedBg       = setAnimatedBg;
window.setShowSeconds      = setShowSeconds;
window.setSearchEngine     = setSearchEngine;
window.goBack              = goBack;
window.goForward           = goForward;
window.reloadPage          = reloadPage;
window.goHomeFromBrowser   = goHomeFromBrowser;
window.showMiniBar         = showMiniBar;
window.loadUrl             = loadUrl;
window.navigate            = navigate;
window.triggerSearch       = triggerSearch;
window.doSearch            = doSearch;
window.showPrivacyPolicy   = showPrivacyPolicy;
window.setTheme            = setTheme;
window.openGame            = openGame;
window.openAIAssistant     = openAIAssistant;
window.openCloudG          = openCloudG;

function navigateFrame(url, updateHistory = false) {
    const frame = document.getElementById("browserFrame");
    const bar = document.getElementById("urlBar");
    if (!frame || !url) return;

    showLoading();
    startLoadingProgress();

    frame.src = url;
    if (bar) bar.value = stripP(url);

    if (updateHistory) {
        historyStack = historyStack.slice(0, historyIndex + 1);
        historyStack.push(url);
        historyIndex++;
    }
}

function goBack() {
    if (historyIndex <= 0) return;
    historyIndex--;
    navigateFrame(historyStack[historyIndex], false);
}

function goForward() {
    if (historyIndex >= historyStack.length - 1) return;
    historyIndex++;
    navigateFrame(historyStack[historyIndex], false);
}

function reloadPage() {
    const frame = document.getElementById("browserFrame");
    if (!frame) return;
    showLoading();
    startLoadingProgress();
    try {
        frame.contentWindow.location.reload();
    } catch {
        frame.src = frame.src;
    }
}

async function doSearch(event) {
    if (event.key === "Enter") await navigate(event.target.value);
}

async function triggerSearch() {
    await navigate(document.getElementById("searchInput").value);
}

function hideMiniBar() {
    const bar = document.getElementById("topBar");
    const tab = document.getElementById("miniBarTab");
    const input = document.getElementById("urlBar");

    if (document.activeElement === input) return;
    if (!bar || !tab || miniBarHidden || miniBarAnimating) return;

    miniBarAnimating = true;
    bar.classList.add("hidden");

    const frame = document.getElementById("browserFrame");
    const loadFrame = document.getElementById("loadingFrame");
    if (frame) frame.classList.add("bar-hidden");
    if (loadFrame) loadFrame.classList.add("bar-hidden");

    setTimeout(() => {
        tab.classList.add("visible");
        miniBarHidden = true;
        miniBarAnimating = false;
    }, 380);
}

function toggleTopBar() {
    miniBarHidden ? showMiniBar() : hideMiniBar();
}

function showMiniBar() {
    const bar = document.getElementById("topBar");
    const tab = document.getElementById("miniBarTab");

    if (!bar || !tab) return;

    clearTimeout(miniBarTimeout);

    if (!miniBarHidden && !miniBarAnimating) {
        resetMiniBarTimer();
        return;
    }

    if (miniBarAnimating) return;

    miniBarAnimating = true;
    tab.classList.remove("visible");
    bar.classList.remove("hidden");

    const frame = document.getElementById("browserFrame");
    const loadFrame = document.getElementById("loadingFrame");
    if (frame) frame.classList.remove("bar-hidden");
    if (loadFrame) loadFrame.classList.remove("bar-hidden");

    miniBarHidden = false;

    setTimeout(() => {
        miniBarAnimating = false;
        resetMiniBarTimer();
    }, 380);
}

function resetMiniBarTimer() {
    clearTimeout(miniBarTimeout);
    miniBarTimeout = setTimeout(hideMiniBar, MINI_BAR_HIDE_DELAY);
}

function updateClock() {
    const now = new Date();
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

    let hours = now.getHours();
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;

    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    const showSec = localStorage.getItem("nebula-clock-seconds") !== "0";
    document.getElementById("clock").textContent = showSec
        ? `${days[now.getDay()]} · ${hours}:${minutes}:${seconds} ${ampm}`
        : `${days[now.getDay()]} · ${hours}:${minutes} ${ampm}`;
}

async function updateBattery() {
    if (!navigator.getBattery) return;
    const battery = await navigator.getBattery();

    function refresh() {
        const pct = Math.round(battery.level * 100);
        const widget = document.getElementById("batteryWidget");
        const fill = document.getElementById("batteryFill");
        const text = document.getElementById("batteryText");

        widget.style.display = "flex";
        fill.style.width = pct + "%";
        text.textContent = pct + "%";

        widget.style.color = pct <= 10 ? "#ef4444" : pct <= 30 ? "#f59e0b" : "var(--text-muted)";
    }

    refresh();
    battery.addEventListener("levelchange", refresh);
    battery.addEventListener("chargingchange", refresh);
}

// replaced with mp4 shit
function updateShades() {}
function resizeCanvas() {}
function animate() {}

const THEME_CLASSES = {
    default: "",
    light: "theme-light",
    twilight: "theme-twilight",
    sakura: "theme-sakura",
    teto: "theme-teto"
};

function applyBodyClass() {
    const current = THEME_CLASSES[currentTheme] || "";
    const entered = document.body.classList.contains("entered");
    const editing = document.body.classList.contains("edit-mode");

    document.body.className = current;
    if (entered) document.body.classList.add("entered");
    if (editing) document.body.classList.add("edit-mode");
    if (settingsOpen) document.body.classList.add("settings-open");
}

function setTheme(name) {
    currentTheme = name;
    localStorage.setItem("nebula-theme", name);

    if (name === "teto") {
        localStorage.setItem("nebula-teto-popup", "1");
        location.reload();
        return;
    }

    localStorage.setItem("nebula-teto-popup", "0");

    const popup = document.getElementById("tetoPopup");
    popup.classList.remove("show");
    setTimeout(() => { popup.style.display = "none"; }, 350);

    applyBodyClass();
    updateShades(name);

    const dropdown = document.getElementById("themeDropdown");
    if (dropdown) dropdown.value = name;
}

function loadTheme() {
    currentTheme = localStorage.getItem("nebula-theme") || "default";
    applyBodyClass();
    updateShades(currentTheme);

    const dropdown = document.getElementById("themeDropdown");
    if (dropdown) dropdown.value = currentTheme;
}

function toggleSettings() {
    settingsOpen ? closeSettingsOverlay() : openSettingsOverlay();
}

function openSettingsOverlay() {
    settingsOpen = true;
    applyBodyClass();
    const overlay = document.getElementById("settingsOverlay");
    overlay.classList.add("open");
    renderThemeGrid();
    loadGeneralSettings();
}

function closeSettingsOverlay() {
    settingsOpen = false;
    applyBodyClass();
    document.getElementById("settingsOverlay").classList.remove("open");
}

function switchSettingsTab(tab) {
    ["theme", "general"].forEach(t => {
        document.getElementById("stab-" + t).classList.toggle("active", t === tab);
        const panel = document.getElementById("spanel-" + t);
        if (panel) panel.style.display = t === tab ? "flex" : "none";
    });
}

const THEME_DEFS = [
    {
        id: "default", name: "Dark",
        bg: "#070709", accent: "rgba(255,255,255,0.8)",
        dots: ["rgba(255,255,255,0.5)", "rgba(200,200,200,0.3)", "rgba(160,160,160,0.2)"]
    },
    {
        id: "light", name: "Light",
        bg: "#e9e9ec", accent: "rgba(80,80,90,0.7)",
        dots: ["rgba(0,0,0,0.25)", "rgba(60,60,60,0.15)", "rgba(120,120,120,0.1)"]
    },
    {
        id: "twilight", name: "Purple Twilight",
        bg: "#090612", accent: "rgba(167,139,250,0.9)",
        dots: ["rgba(190,150,255,0.5)", "rgba(160,110,245,0.3)", "rgba(130,80,220,0.2)"]
    },
    {
        id: "sakura", name: "Sakura",
        bg: "#10070d", accent: "rgba(244,114,182,0.9)",
        dots: ["rgba(255,170,205,0.5)", "rgba(245,130,180,0.3)", "rgba(225,110,160,0.2)"]
    },
    {
        id: "teto", name: "Kasane Teto",
        bg: "#100306", accent: "rgba(255,90,118,0.9)",
        dots: ["rgba(255,75,105,0.5)", "rgba(255,105,130,0.3)", "rgba(220,45,75,0.2)"]
    }
];

function renderThemeGrid() {
    const grid = document.getElementById("themeGrid");
    if (!grid) return;
    grid.innerHTML = THEME_DEFS.map(t => {
        const isActive = currentTheme === t.id;
        const c = t.dots[0];

        const stars = [
            { x: 12, y: 10 }, { x: 35, y: 22 }, { x: 58, y: 8  }, { x: 80, y: 28 },
            { x: 105, y: 12 }, { x: 118, y: 38 }, { x: 95, y: 50 }, { x: 68, y: 42 },
            { x: 44, y: 54 }, { x: 22, y: 44 }, { x: 6, y: 32 }, { x: 52, y: 30 },
        ];

        const links = [
            [0,1],[1,2],[2,3],[3,4],[4,5],
            [5,6],[6,7],[7,8],[8,9],[9,10],
            [1,11],[11,7],[11,3],[10,0],[6,11]
        ];

        const linesSvg = links.map(([a, b]) => {
            const s1 = stars[a], s2 = stars[b];
            const dx = s2.x - s1.x, dy = s2.y - s1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const opacity = Math.max(0.06, 0.22 - dist / 320);
            return `<line x1="${s1.x}" y1="${s1.y}" x2="${s2.x}" y2="${s2.y}" stroke="${c}" stroke-width="0.7" opacity="${opacity.toFixed(2)}"/>`;
        }).join("");

        const starsSvg = stars.map((s, i) => {
            const r = i % 4 === 0 ? 1.6 : i % 3 === 0 ? 1.2 : 0.9;
            const op = i % 4 === 0 ? 0.9 : i % 3 === 0 ? 0.7 : 0.5;
            return `<circle cx="${s.x}" cy="${s.y}" r="${r}" fill="${c}" opacity="${op}"/>`;
        }).join("");

        return `
        <div class="settings-theme-card${isActive ? " active" : ""}" onclick="setTheme('${t.id}');renderThemeGrid()">
            <div class="settings-theme-preview" style="background:${t.bg}">
                <svg width="100%" height="100%" viewBox="0 0 130 64" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                    ${linesSvg}
                    ${starsSvg}
                </svg>
            </div>
            <div class="settings-theme-name">
                ${t.name}
                <span class="settings-theme-check">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3 5.5L6.5 2.5" stroke="#000" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </span>
            </div>
        </div>`;
    }).join("");
}

function loadGeneralSettings() {
    const bgOn = localStorage.getItem("nebula-anim-bg") !== "0";
    const secOn = localStorage.getItem("nebula-clock-seconds") !== "0";
    const engine = localStorage.getItem("nebula-search-engine") || "ddg";

    const bgToggle = document.getElementById("toggleBg");
    const secToggle = document.getElementById("toggleSeconds");
    const engineSel = document.getElementById("searchEngineSelect");

    if (bgToggle) { bgToggle.checked = bgOn; bgToggle.onchange = () => setAnimatedBg(bgToggle.checked); }
    if (secToggle) { secToggle.checked = secOn; secToggle.onchange = () => setShowSeconds(secToggle.checked); }
    if (engineSel) { engineSel.value = engine; engineSel.onchange = () => setSearchEngine(engineSel.value); }
}

function setAnimatedBg(on) { localStorage.setItem("nebula-anim-bg", on ? "1" : "0"); }
function setShowSeconds(on) { localStorage.setItem("nebula-clock-seconds", on ? "1" : "0"); }
function setSearchEngine(val) { localStorage.setItem("nebula-search-engine", val); }

function goHome() {
    if (settingsOpen) closeSettingsOverlay();

    if (window.location.search) history.replaceState(null, "", window.location.pathname);

    const browser = document.getElementById("browserView");
    if (browser.style.display === "none") return;

    browser.style.opacity = "0";

    setTimeout(() => {
        browser.style.display = "none";
        browser.style.opacity = "";
        document.getElementById("browserFrame").src = "";
        document.getElementById("mainPage").style.display = "";
        initSubtext();

        if (currentTheme === "teto") {
            const popup = document.getElementById("tetoPopup");
            popup.style.display = "block";
            requestAnimationFrame(() => popup.classList.add("show"));
        }
    }, 350);
}

function goHomeFromBrowser() {
    history.replaceState(null, "", window.location.pathname);

    const browser = document.getElementById("browserView");
    const frame = document.getElementById("browserFrame");

    browser.style.opacity = "0";

    setTimeout(() => {
        browser.style.display = "none";
        browser.style.opacity = "";
        frame.src = "";
        document.getElementById("mainPage").style.display = "";
        initSubtext();

        if (currentTheme === "teto") {
            const popup = document.getElementById("tetoPopup");
            popup.style.display = "block";
            requestAnimationFrame(() => popup.classList.add("show"));
        }
    }, 350);
}

function showPrivacyPolicy() {
    const modal = document.getElementById("privacyModal");
    const body = document.getElementById("privacyModalBody");

    modal.style.display = "flex";

    body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px">
            <h2 style="font-size:18px;color:var(--text);margin:0">Privacy Policy</h2>
            <p>Updated 5/6/26</p>
            <h3 style="font-size:13px;color:var(--text);margin-top:6px">Information Automatically Received</h3>
            <p>When you use nebula, the server automatically receives certain information required for normal web communication.</p>
            <ul>
                <li>IP address</li>
                <li>User-Agent information</li>
                <li>Requested URLs and request headers</li>
                <li>Cookies used by visited websites</li>
            </ul>
            <h3 style="font-size:13px;color:var(--text);margin-top:6px">How Information Is Used</h3>
            <p>Information is used to process requests through the proxy and maintain compatibility with proxied websites.</p>
            <h3 style="font-size:13px;color:var(--text);margin-top:6px">Data Storage</h3>
            <ul>
                <li>nebula does not maintain a user database.</li>
                <li>nebula does not persistently store personal data.</li>
                <li>Temporary caching may occur for performance.</li>
            </ul>
            <h3 style="font-size:13px;color:var(--text);margin-top:6px">Data Sharing</h3>
            <p>We do not sell, share, or distribute user data.</p>
            <p>Third-party websites accessed through the proxy may collect information according to their own policies.</p>
            <h3 style="font-size:13px;color:var(--text);margin-top:6px">Important Notice</h3>
            <p>nebula is intended for browsing and educational activities. Users are responsible for how they use the service.</p>
        </div>
    `;
}

window.addEventListener("keydown", event => {
    if (event.key === "Alt") altHeld = true;
    if (event.key === "Escape" && settingsOpen) closeSettingsOverlay();
});

window.addEventListener("keyup", event => {
    if (event.key === "Alt") altHeld = false;
});

window.addEventListener("click", registerTap);
window.addEventListener("touchend", registerTap);

document.getElementById("browserView").addEventListener("mousemove", resetMiniBarTimer);
document.getElementById("browserView").addEventListener("mousedown", resetMiniBarTimer);
document.getElementById("browserView").addEventListener("touchstart", resetMiniBarTimer);

document.getElementById("topBar")?.addEventListener("mousemove", resetMiniBarTimer);
document.getElementById("topBar")?.addEventListener("mousedown", resetMiniBarTimer);

document.addEventListener("pointerdown", event => {
    const bar = document.getElementById("topBar");
    if (bar && bar.contains(event.target)) {
        bar.classList.remove("hidden");
        miniBarHidden = false;
        miniBarAnimating = false;
        clearTimeout(miniBarTimeout);
        resetMiniBarTimer();
    }
}, true);

document.getElementById("privacyModal").addEventListener("click", event => {
    if (event.target === event.currentTarget) event.currentTarget.style.display = "none";
});

async function wireNavigationInputs() {
    const search = document.getElementById("searchInput");
    const searchBtn = document.querySelector(".search-btn");
    const url = document.getElementById("urlBar");

    if (search) {
        search.disabled = false;
        search.readOnly = false;
        search.addEventListener("keydown", async event => {
            if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                await navigate(search.value);
            }
        });
        search.addEventListener("click", event => event.stopPropagation());
        search.addEventListener("pointerdown", event => event.stopPropagation());
    }

    if (searchBtn) {
        searchBtn.addEventListener("click", async event => {
            event.preventDefault();
            event.stopPropagation();
            if (search) await navigate(search.value);
        });
    }

    if (url) {
        url.disabled = false;
        url.readOnly = false;
        url.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                loadUrl(url.value);
            }
        });
        url.addEventListener("click", event => event.stopPropagation());
        url.addEventListener("pointerdown", event => event.stopPropagation());
    }
}

async function checkStorageQuota() {
    if (!navigator.storage?.estimate) return;
    const { usage, quota } = await navigator.storage.estimate();
    if (usage / quota > 0.75) {
        const keys = await caches.keys();
        for (const key of keys) await caches.delete(key);
    }
}

window.nebulaPostInit = function () {
    if (!window._nebulaClockInterval) {
        window._nebulaClockInterval = setInterval(updateClock, 1000);
    }
    updateClock();
    updateBattery();
    initSubtext();

    checkStorageQuota();
    setInterval(checkStorageQuota, 60 * 1000);

    if (currentTheme === "teto") {
        const popup = document.getElementById("tetoPopup");
        if (popup) {
            popup.style.display = "block";
            setTimeout(() => popup.classList.add("show"), 250);
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    loadTheme();
    wireNavigationInputs();
});