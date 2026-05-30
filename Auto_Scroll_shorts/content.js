(() => {
  "use strict";

  const SETTINGS = {
    enabledByDefault: true,
    minAdvanceIntervalMs: 1200,
    pollMs: 250
  };

  const YT = {
    requireShortsPath: true,
    endThresholdPercent: 99,
    sponsoredSkipDelayMs: 150
  };

  const GOKU = {
    overlayClickRetryMs: 1300,
    nearEndSeconds: 1
  };

  let enabled = SETTINGS.enabledByDefault;
  let lastAdvanceAt = 0;
  let gokuIframeWatcherAttached = false;
  let gokuLastUrl = location.href;

  function debounceReady() {
    return Date.now() - lastAdvanceAt >= SETTINGS.minAdvanceIntervalMs;
  }

  function isYouTubeShortsPage() {
    if (!/youtube\.com$/i.test(location.hostname) && location.hostname !== "www.youtube.com") return false;
    return !YT.requireShortsPath || location.pathname.startsWith("/shorts/");
  }

  function isGokuSeriesPage() {
    return /(^|\.)goku\.sx$/i.test(location.hostname) && location.pathname.startsWith("/watch-series/");
  }

  function isElementVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function safeClick(el) {
    if (!el) return false;
    if (typeof el.click === "function") {
      el.click();
      return true;
    }
    const evt = new MouseEvent("click", { bubbles: true, cancelable: true, view: window });
    return el.dispatchEvent(evt);
  }

  // -------------------- YouTube Shorts --------------------
  function getActiveReelRoot() {
    const activeRenderer =
      document.querySelector('ytd-reel-video-renderer[is-active]') ||
      document.querySelector('ytd-reel-video-renderer[is-active=""]') ||
      document.querySelector('ytd-reel-video-renderer[is-active="true"]');
    if (!activeRenderer) return null;
    return activeRenderer.closest(".reel-video-in-sequence-new") || activeRenderer;
  }

  function getProgressPercent(root) {
    const slider = root?.querySelector('div[role="slider"][aria-label="Seek slider"]') || null;
    if (!slider) return null;
    const n = Number(slider.getAttribute("aria-valuenow"));
    return Number.isFinite(n) ? n : null;
  }

  function isAdShort(root) {
    if (root?.querySelector("reels-ad-metadata-view-model")) return true;
    const badges = root?.querySelectorAll(".yt-badge-shape__text") || [];
    for (const b of badges) {
      if ((b.textContent || "").trim().toLowerCase() === "sponsored") return true;
    }
    return false;
  }

  function dispatchArrowDown() {
    const ev = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      code: "ArrowDown",
      keyCode: 40,
      which: 40,
      bubbles: true,
      cancelable: true
    });
    const active = document.activeElement;
    if (active && typeof active.dispatchEvent === "function") active.dispatchEvent(ev);
    document.dispatchEvent(ev);
    window.dispatchEvent(ev);
  }

  function advanceToNextShort() {
    if (!enabled || !isYouTubeShortsPage() || !debounceReady()) return;
    lastAdvanceAt = Date.now();
    dispatchArrowDown();
    setTimeout(() => {
      window.scrollBy({ top: window.innerHeight * 0.9, left: 0, behavior: "smooth" });
    }, 80);
  }

  function maybeAdvanceYouTube() {
    if (!enabled || !isYouTubeShortsPage()) return;
    const root = getActiveReelRoot();
    if (!root) return;
    if (isAdShort(root)) {
      setTimeout(advanceToNextShort, YT.sponsoredSkipDelayMs);
      return;
    }
    const p = getProgressPercent(root);
    if (p != null && p >= YT.endThresholdPercent) {
      setTimeout(advanceToNextShort, 120);
    }
  }

  // -------------------- Goku series --------------------
  function getCurrentEpisodeIdFromUrl() {
    const m = location.pathname.match(/\/watch-series\/[^/]+\/(\d+)\/*$/);
    return m ? m[1] : null;
  }

  function getEpisodeLinks() {
    const root = document.querySelector("#ss-ep-content");
    if (!root) return [];
    return Array.from(root.querySelectorAll('a[href*="/watch-series/"]')).filter(isElementVisible);
  }

  function findCurrentEpisodeLink(links) {
    if (!links.length) return null;

    const epId = getCurrentEpisodeIdFromUrl();
    const normalizedPath = location.pathname.replace(/\/+$/, "");
    const activeByClass = links.find((a) => {
      const box = a.closest(".active, .current, .is-active, .is-current");
      return box || a.classList.contains("active") || a.classList.contains("current");
    });
    if (activeByClass) return activeByClass;

    if (epId) {
      const byId = links.find((a) => (a.getAttribute("href") || "").match(new RegExp(`/${epId}(?:/)?$`)));
      if (byId) return byId;
    }

    const byPath = links.find((a) => {
      try {
        return new URL(a.href, location.origin).pathname.replace(/\/+$/, "") === normalizedPath;
      } catch {
        return false;
      }
    });
    return byPath || null;
  }

  function findNextEpisodeLink() {
    const links = getEpisodeLinks();
    if (!links.length) return null;

    const current = findCurrentEpisodeLink(links);
    if (current) {
      const idx = links.indexOf(current);
      if (idx >= 0 && idx + 1 < links.length) return links[idx + 1];
    }

    const currentId = getCurrentEpisodeIdFromUrl();
    if (!currentId) return null;
    const candidates = links
      .map((a) => {
        const m = (a.getAttribute("href") || "").match(/\/(\d+)(?:\/)?$/);
        return m ? { a, id: Number(m[1]) } : null;
      })
      .filter(Boolean)
      .sort((x, y) => x.id - y.id);
    const now = Number(currentId);
    const next = candidates.find((x) => x.id > now);
    return next ? next.a : null;
  }

  function clickNextEpisode(reason = "unknown") {
    if (!enabled || !isGokuSeriesPage() || !debounceReady()) return false;
    const next = findNextEpisodeLink();
    if (!next) return false;

    lastAdvanceAt = Date.now();
    const ok = safeClick(next);
    if (ok) console.log(`[Goku Auto-Next] Clicked next episode (${reason})`);
    return ok;
  }

  function tryClickNextOverlayButton(reason = "overlay") {
    if (!enabled || !isGokuSeriesPage() || !debounceReady()) return false;
    const selector = [
      'button[title*="Next" i]',
      'a[title*="Next" i]',
      'button[aria-label*="Next" i]',
      'a[aria-label*="Next" i]',
      ".next-episode",
      ".btn-next",
      ".next-ep"
    ].join(",");
    const nodes = Array.from(document.querySelectorAll(selector)).filter(isElementVisible);
    const byText = nodes.find((el) => /next|episode/i.test((el.textContent || "").trim()));
    if (!byText) return false;
    lastAdvanceAt = Date.now();
    const ok = safeClick(byText);
    if (ok) console.log(`[Goku Auto-Next] Clicked next button (${reason})`);
    return ok;
  }

  function onPlaybackEnded(reason = "ended") {
    if (!enabled || !isGokuSeriesPage()) return;
    if (clickNextEpisode(reason)) return;
    tryClickNextOverlayButton(reason);
  }

  function attachVideoEndedListeners(doc = document) {
    const videos = doc.querySelectorAll("video");
    videos.forEach((v) => {
      if (v.dataset.autoNextBound === "1") return;
      v.dataset.autoNextBound = "1";
      v.addEventListener("ended", () => onPlaybackEnded("video-ended"));
      v.addEventListener("timeupdate", () => {
        if (!Number.isFinite(v.duration) || v.duration <= 0) return;
        if (v.duration - v.currentTime <= GOKU.nearEndSeconds) {
          onPlaybackEnded("video-near-end");
        }
      });
    });
  }

  function maybeAttachIframeVideoListeners() {
    if (!isGokuSeriesPage()) return;
    const iframe = document.querySelector("#iframe-player");
    if (!iframe) return;

    try {
      const frameDoc = iframe.contentDocument;
      if (frameDoc) attachVideoEndedListeners(frameDoc);
    } catch {
      // Cross-origin iframe. Ignore; fallback logic handles this.
    }
  }

  function setupGokuSeriesAutomation() {
    if (gokuIframeWatcherAttached) return;
    gokuIframeWatcherAttached = true;

    attachVideoEndedListeners(document);
    maybeAttachIframeVideoListeners();

    window.addEventListener("message", (event) => {
      if (!enabled || !isGokuSeriesPage()) return;
      const raw = typeof event.data === "string" ? event.data : JSON.stringify(event.data || "");
      const lower = raw.toLowerCase();
      if (
        lower.includes("ended") ||
        lower.includes("video_end") ||
        lower.includes("playback_complete") ||
        lower.includes("next_episode")
      ) {
        onPlaybackEnded("postmessage");
      }
    });

    const observer = new MutationObserver(() => {
      attachVideoEndedListeners(document);
      maybeAttachIframeVideoListeners();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    setInterval(() => {
      if (!enabled || !isGokuSeriesPage()) return;

      if (gokuLastUrl !== location.href) {
        gokuLastUrl = location.href;
      }

      attachVideoEndedListeners(document);
      maybeAttachIframeVideoListeners();
      tryClickNextOverlayButton("overlay-poll");
    }, GOKU.overlayClickRetryMs);
  }

  function runChecks() {
    maybeAdvanceYouTube();
    if (isGokuSeriesPage()) setupGokuSeriesAutomation();
  }

  function start() {
    chrome.storage.local.get({ enabled: SETTINGS.enabledByDefault }, (res) => {
      enabled = Boolean(res.enabled);
      setInterval(runChecks, SETTINGS.pollMs);
      runChecks();
    });
  }

  // Hotkey toggle: Ctrl+Shift+Y
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "y") {
      enabled = !enabled;
      chrome.storage.local.set({ enabled });
      console.log(`[Auto-Advance] ${enabled ? "ENABLED" : "DISABLED"}`);
      if (enabled) runChecks();
    }
  });

  start();
})();
