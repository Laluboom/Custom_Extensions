# Reference — Custom Extensions

_Last refreshed: 2026-09-15_

## Purpose
Five personal browser extensions, vanilla JS, no build step, no dependencies. Each folder is
a loadable unpacked extension. ~1000 lines of JS total.

## Install
**Chrome/Edge:** `chrome://extensions` → Developer mode → Load unpacked → pick the folder.
**Firefox:** `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → pick
`Waitlist_Display_Firefox/manifest.json`. (Temporary add-ons are dropped on Firefox restart.)

No `npm install`, no test suite, nothing to run from a terminal. `node --check` passes on all
7 JS files; anything beyond syntax needs a browser.

---

## Extensions

### `playback_speed_controller` — MV3, v1.0, YouTube
Draggable glass panel: number input (0.1–16x), slider (0.25–4x), four preset pills, `[` / `]`
hotkeys. Speed, panel position and visibility persist in `chrome.storage.local`. Toolbar
click toggles the panel via `background.js` → `sendMessage`, with `chrome.scripting`
re-injection as a fallback. Panel is re-created by a 1 s `setInterval` (`content.js:328`).
Known: no toolbar `default_icon`; the `"128"` icon is a 24×24 file; no double-injection guard.

### `Auto_Scroll_shorts` — MV3, v1.1.0, YouTube Shorts + goku.sx
Shorts: reads the seek slider's `aria-valuenow`, dispatches `ArrowDown` at ≥99%, skips
sponsored shorts immediately. Goku: `ended` / near-end `timeupdate` listeners, a
`postMessage` sniffer, a MutationObserver re-binder, and a 1300 ms overlay-button poll.
`Ctrl+Shift+Y` toggles; state in `chrome.storage.local`. Largest file here (312 lines).
Known: the overlay poll clicks on arrival, not at end-of-video (`content.js:284`).
**`goku.sx` did not respond from this machine on 2026-09-15** (connect timeout) — roughly
half this file targets a site that may no longer be reachable.

### `Ctrl_Click_New_Tab` — MV3, v1.0.0, `<all_urls>`
Capture-phase click handler that re-implements Ctrl+Click for SPA links: reads `href`,
`data-href`, `data-url`, `formaction`, and three `onclick` string patterns, then
`window.open(..., "_blank")` + `stopImmediatePropagation`. 79 lines, the tidiest thing here.
Known: it also intercepts plain `<a href>`, which the browser already handled — that turns
background-tab Ctrl+Click into a foreground focus steal on every site.

### `Waitlist_Display_Chrome` / `Waitlist_Display_Firefox` — MV3, v1.0.0 / v1.1
Scrape `mindvideo.ai` for `Est. wait: N person` and surface N in the tab title. Chrome adds a
floating bottom-right badge; Firefox is title-only but has the better scraper (debounced
observer, `person|people`, leaf-node skip, 5 s fallback). Two independently-maintained copies
that have drifted apart in regex, title format and URL scope — see `todo.md` item 4.
Known: the Chrome badge write at `content.js:88` re-triggers its own observer, which is an
unbounded loop while a queue is showing. **`mindvideo.ai` is live** (200, 2026-09-15).

### `Remove_Sponsors`
Does not exist. README still describes it; it was never committed.

---

## State
Working personal toolkit, no commits since 2026-05-30. Two confirmed bugs (waitlist observer
loop, Ctrl+Click anchor hijack) and a stale README stand between this and finished.
See `todo.md`.
