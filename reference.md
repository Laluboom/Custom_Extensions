# Reference — Custom Extensions

_Last refreshed: 2026-09-27_

## Purpose
Five personal browser extensions, vanilla JS, no build step, no dependencies. Each folder is
a loadable unpacked extension. 976 lines of JS across 7 files.

## Install
**Chrome/Edge:** `chrome://extensions` → Developer mode → Load unpacked → pick the folder.
**Firefox:** `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → pick
`Waitlist_Display_Firefox/manifest.json`. (Temporary add-ons are dropped on Firefox restart.)

No `npm install`, no test suite, nothing to run from a terminal. `node --check` passes on all
7 JS files (verified 2026-09-27); anything beyond syntax needs a real browser.

---

## Extensions

### `playback_speed_controller` — MV3, v1.0, `*://*.youtube.com/*`
Draggable glass panel: number input (0.1–16x), slider (0.25–4x), four preset pills, `[` / `]`
hotkeys. Speed, panel position and visibility persist in `chrome.storage.local`. **Clicking
the toolbar button toggles the panel** via `background.js` → `sendMessage`, with
`chrome.scripting` re-injection as a fallback. The panel is (re)created by a 1 s
`setInterval` (`content.js:328`).
Known: no path or `<video>` gate, so the panel floats over the YouTube homepage, search and
subscriptions too (`content.js:180`). `createUI()`'s existence check sits before an `await`
(`:180` vs `:274`), so two concurrent calls can build two panels and two keydown listeners.

### `Auto_Scroll_shorts` — MV3, v1.1.0, YouTube Shorts + goku.sx
Shorts: reads the seek slider's `aria-valuenow`, dispatches `ArrowDown` at ≥99%, skips
sponsored shorts immediately. `Ctrl+Shift+Y` toggles it — the only off switch; state in
`chrome.storage.local`. Goku: `ended` / near-end `timeupdate` listeners, a `postMessage`
sniffer, a MutationObserver re-binder, and a 1300 ms overlay-button poll. Largest file here
(312 lines), about half of it Goku-only.
Known: the overlay poll at `content.js:284` checks no playback position, so on a Goku series
page it clicks "Next Episode" ~1.3 s after arrival and chains through the whole series.
**`goku.sx` timed out from this machine on both 2026-09-15 and 2026-09-27** — DNS resolves
to Cloudflare and the stall is mid-TLS-handshake, so the site is blocked here rather than
dead. Confirm in a browser before fixing or deleting that half.

### `Ctrl_Click_New_Tab` — MV3, v1.0.0, `<all_urls>`
Capture-phase click handler that re-implements Ctrl+Click for SPA links: reads `href`,
`data-href`, `data-url`, `formaction`, and three `onclick` string patterns, then
`window.open(..., "_blank")` + `stopImmediatePropagation`. 79 lines, the tidiest thing here.
Known: the anchor branch at `content.js:39-40` is wrong in both directions — it intercepts
plain `<a href>` (turning native background-tab Ctrl+Click into a foreground focus steal on
every site) *and* its early `return` shadows the `onclick`/`data-href` fallbacks, so
`<a href="#" onclick="…">` — the case this extension exists for — never reaches them.

### `Waitlist_Display_Chrome` / `Waitlist_Display_Firefox` — MV3, v1.0.0 / v1.1
Scrape `mindvideo.ai` for `Est. wait: N person` and surface N in the tab title. Chrome adds a
floating bottom-right badge; Firefox is title-only but has the better scraper (250 ms
debounce, `person|people`, leaf-node skip, 5 s safety interval). Two hand-maintained copies
that have drifted in regex, title format, observer cost and URL scope — see `todo.md` item 4.
Known: Chrome's regex is `person`-only (`content.js:73`), so it shows **nothing** once the
queue reads "2 people"; its observer is undebounced (`:130-135`). Firefox writes a bare digit
with no `⏳` marker (`:31`). `Waitlist_Display_Chrome/service_worker.js` is two comment lines
and can go. **`mindvideo.ai` answered 200 on 2026-09-27** (both `/` and `/text-to-video/`).

### `Remove_Sponsors`
Does not exist. `README.md:33-36` still describes it; it was never committed.

---

## State
Working personal toolkit. Two bugs from the 2026-09-15 review are fixed (`8f99694` waitlist
observer loop, `753dca6` toolbar icon) — the doer verified both. Standing between this and
finished: the `Ctrl_Click_New_Tab` anchor bug (it degrades every site you browse), the Goku
overlay poll, the Waitlist fork, and a README whose install steps point at a folder renamed
in May. No syntax rot; everything left is logic or config. See `todo.md`.
