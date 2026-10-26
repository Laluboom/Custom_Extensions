# Reference — Custom Extensions

_Last refreshed: 2026-10-26_

## Purpose
Five personal browser extensions, vanilla JS, no build step, no dependencies. Each folder is a
loadable unpacked extension. ~1000 lines of JS across 7 files.

## Install
**Chrome/Edge:** `chrome://extensions` → Developer mode → Load unpacked → pick the folder.
**Firefox:** `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → pick
`Waitlist_Display_Firefox/manifest.json`. (Temporary add-ons are dropped on Firefox restart,
which is why the Chrome build is the one that matters in practice.)

No `npm install`, no test suite, nothing to run from a terminal. `node --check` passes on all 7
JS files (verified 2026-10-26); anything beyond syntax needs a real browser.

Note: `README.md:50` still names the Firefox folder with spaces, pre-`e495b44`. Top item in
`todo.md`.

---

## Extensions

### `playback_speed_controller` — MV3, v1.0, `*://*.youtube.com/*`
Draggable glass panel: number input (0.1–16x), slider (0.25–4x), four preset pills, `[` / `]`
hotkeys. Speed, panel position and visibility persist in `chrome.storage.local`. **Clicking the
toolbar button toggles the panel** via `background.js` → `sendMessage`, with `chrome.scripting`
re-injection as the fallback. The panel is (re)created by a 1 s `setInterval` (`content.js:328`).
Known: the saved speed is applied **once** per injection (`:344-358`, self-clearing interval), so
YouTube's History API navigation loses it — the `:328` interval only reads `playbackRate` into the
input, never writes it back. No path or `<video>` gate (`:180`, `manifest.json:17`), so the panel
floats over the homepage, search and subscriptions. Above 4x the slider thumb stops tracking
(`:285`).

### `Auto_Scroll_shorts` — MV3, v1.1.0, YouTube Shorts + goku.sx
Shorts: reads the seek slider's `aria-valuenow`, dispatches `ArrowDown` at ≥99%, skips sponsored
shorts immediately. `Ctrl+Shift+Y` toggles it — the only off switch; state in
`chrome.storage.local`. Goku: `ended` / near-end `timeupdate` listeners, a `postMessage` sniffer,
a MutationObserver re-binder, and a 1300 ms overlay-button poll. Largest file here (312 lines),
about half of it Goku-only.
Known: the overlay poll at `content.js:284` checks no playback position, so on a Goku series page
it clicks "Next Episode" ~1.3 s after arrival and chains through the series; the 1200 ms debounce
can't throttle a 1300 ms poll. **`goku.sx` has now timed out from this machine on 2026-09-15,
09-27, 10-10 and 10-26** (12 s, 0 bytes, mid-TLS-handshake; DNS resolves to Cloudflare). Reads as
a network block, not a dead site. On four data points, deleting the Goku half is the likely call.

### `Ctrl_Click_New_Tab` — MV3, v1.0.0, `<all_urls>`
Capture-phase click handler that re-implements Ctrl+Click for SPA links: anchors with a real
navigable `href` are left to the browser (`content.js:39-43`), everything else falls through to
`data-href`, `data-url`, `formaction` and three `onclick` string patterns, then
`window.open(..., "_blank")` + `stopImmediatePropagation`. 82 lines, the tidiest thing here and
still the only extension with no open bug.
Gap, not a bug: middle-click is ignored (`auxclick` / `button === 1` are never handled), as is
Ctrl+Shift+Click.

### `Waitlist_Display_Chrome` / `Waitlist_Display_Firefox` — MV3, v1.0.0 / v1.1
Scrape `mindvideo.ai` for `Est. wait: N person|people` and surface N as `⏳ N` in the tab title.
Chrome adds a floating bottom-right badge; Firefox is title-only. `8cf9e9f` unified the scraper —
same regex, 250 ms debounce, leaf-node skip, 100-char cap, `⏳` prefix in both.
Known: Chrome's badge is hidden by dropping a CSS class but keeps `display: flex` and has no
`pointer-events: none` (`content.js:117`, `:130-137`), so after the queue clears an invisible box
sits in the bottom-right corner eating clicks — and its own text defeats the `innerText`
fast-path at `:72` for the rest of the page's life. Firefox lacks Chrome's `lastTitle` guard
(`:29-35` vs `:96`/`:125-127`), so it clobbers the site's own SPA title changes.
`service_worker.js` is two comment lines plus a pointless `manifest.json:17-19` block; the Gecko
id is a placeholder; the two manifests disagree on URL scope.
**`mindvideo.ai` answered 200 on 2026-10-26** (both `/` and `/text-to-video/`). The queue UI is
client-rendered — "wait" appears nowhere in the 189 KB of server HTML — so the scraped string
format has never been confirmed against the real DOM.

### `Remove_Sponsors`
Does not exist. `README.md:33-36` still describes it; it was never committed.

---

## State
Nearly finished. The review loop is landing changes — four bugs fixed across three cycles
(`8f99694` observer loop, `753dca6` toolbar icon, `2d8b09f` anchor branch, `8cf9e9f` the
waitlist regex). After `8cf9e9f` there is **no longer anything here that is outright broken**.
Standing between this and done: a README whose install step points at a folder renamed in
`e495b44` (now proposed three cycles running, never touched), an invisible click-trap left by the
Chrome badge, the speed controller forgetting its setting on every YouTube navigation, and one
decision — keep or delete the Goku half. No syntax rot; everything left is logic, config or docs.
See `todo.md`.
