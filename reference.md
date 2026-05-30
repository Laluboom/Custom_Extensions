# Reference — Custom Extensions

_Last refreshed: 2026-05-29_

## Purpose
Suite of personal browser utility extensions (Chrome/Firefox, Manifest V3) for YouTube, streaming, and general browsing automation.

## Stack
- JavaScript (vanilla, no build step)
- Chrome Extension Manifest V3 (`chrome.storage.local`, `chrome.scripting`, service workers)
- Firefox WebExtension API (Gecko-compatible variant for Waitlist Display)

## Installation (no build step needed)
**Chrome/Edge:** `chrome://extensions` → Developer mode → Load unpacked → select the extension sub-folder  
**Firefox:** `about:debugging` → Load Temporary Add-on → select `manifest.json`

---

## Extensions

### `playback_speed_controller`
Controls YouTube video playback speed with a draggable floating panel. Hotkeys `[` / `]` adjust by 0.1x. Speed and panel position persisted via `chrome.storage.local`. Toolbar icon toggles panel visibility.
- Files: `manifest.json`, `content.js`, `background.js`, `playback.png`

### `Auto_Scroll_shorts`
Auto-advances YouTube Shorts when progress ≥ 99% and skips sponsored shorts. Also advances episodes on `goku.sx` series pages via video `ended` event + MutationObserver fallback. Toggle: `Ctrl+Shift+Y`.
- Files: `manifest.json`, `content.js`

### `Ctrl_Click_New_Tab`
Forces `Ctrl+Left Click` to open links in a new tab on all sites, including SPAs that intercept clicks and break the default browser behaviour. Handles `<a href>`, `data-href`, `data-url`, `formaction`, and `onclick` patterns.
- Files: `manifest.json`, `content.js`

### `Waitlist Display Chrome`
Scrapes `mindvideo.ai` for "Est. wait: N person" text and shows it in the tab title (`⏳ N`) plus a floating bottom-right badge. MutationObserver + 1500ms polling.
- Files: `manifest.json`, `content.js`, `service_worker.js`

### `Waitlist Display Firefox`
Firefox port of the above — title-only update (no badge), with debounced MutationObserver and a performance skip for container elements with >3 children. 5000ms fallback.
- Files: `manifest.json`, `content.js`

### `Remove_Sponsors` _(stub)_
Empty directory. Placeholder for a future sponsor-segment skipping extension.

---

## Run Status (2026-05-29)
All 7 JS files passed `node --check` syntax validation. Extensions cannot be run from CLI — must be loaded into a browser. No runtime errors confirmed (would require manual browser testing).
