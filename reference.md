# Reference — Custom Extensions

_Last refreshed: 2026-10-10_

## Purpose
Five personal browser extensions, vanilla JS, no build step, no dependencies. Each folder is
a loadable unpacked extension. 979 lines of JS across 7 files.

## Install
**Chrome/Edge:** `chrome://extensions` → Developer mode → Load unpacked → pick the folder.
**Firefox:** `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → pick
`Waitlist_Display_Firefox/manifest.json`. (Temporary add-ons are dropped on Firefox restart,
which is why the Chrome build is the one that matters in practice.)

No `npm install`, no test suite, nothing to run from a terminal. `node --check` passes on all
7 JS files (verified 2026-10-10); anything beyond syntax needs a real browser.

---

## Extensions

### `playback_speed_controller` — MV3, v1.0, `*://*.youtube.com/*`
Draggable glass panel: number input (0.1–16x), slider (0.25–4x), four preset pills, `[` / `]`
hotkeys. Speed, panel position and visibility persist in `chrome.storage.local`. **Clicking
the toolbar button toggles the panel** via `background.js` → `sendMessage`, with
`chrome.scripting` re-injection as a fallback. The panel is (re)created by a 1 s
`setInterval` (`content.js:328`).
Known: the saved speed is applied **once** per page load (`:344-358`, self-clearing
interval), so YouTube's SPA navigation loses it on the next video — the `:328` interval only
reads `playbackRate` into the input, never writes it back. No path or `<video>` gate, so the
panel floats over the homepage, search and subscriptions. `createUI()`'s existence check
(`:180`) sits before an `await` (`:186`) while the append is at `:274`, so two concurrent
calls build two panels and two keydown listeners — and only the first is toggleable.

### `Auto_Scroll_shorts` — MV3, v1.1.0, YouTube Shorts + goku.sx
Shorts: reads the seek slider's `aria-valuenow`, dispatches `ArrowDown` at ≥99%, skips
sponsored shorts immediately. `Ctrl+Shift+Y` toggles it — the only off switch; state in
`chrome.storage.local`. Goku: `ended` / near-end `timeupdate` listeners, a `postMessage`
sniffer, a MutationObserver re-binder, and a 1300 ms overlay-button poll. Largest file here
(312 lines), about half of it Goku-only.
Known: the overlay poll at `content.js:284` checks no playback position, so on a Goku series
page it clicks "Next Episode" ~1.3 s after arrival and chains through the series; the 1200 ms
debounce can't throttle a 1300 ms poll. **`goku.sx` has now timed out from this machine on
2026-09-15, 2026-09-27 and 2026-10-10** (12 s, 0 bytes, mid-TLS-handshake; DNS resolves to
Cloudflare). Reads as a network block, not a dead site — confirm in a browser, then either
gate the poll or delete the Goku half.

### `Ctrl_Click_New_Tab` — MV3, v1.0.0, `<all_urls>`
Capture-phase click handler that re-implements Ctrl+Click for SPA links: anchors with a real
navigable `href` are left to the browser (`content.js:39-43`), everything else falls through
to `data-href`, `data-url`, `formaction` and three `onclick` string patterns, then
`window.open(..., "_blank")` + `stopImmediatePropagation`. 82 lines, the tidiest thing here
and now the only extension with no open bug — `2d8b09f` fixed the anchor branch and all four
paths re-trace correctly (`/page` → native, `#` + `onclick` → extracted, `javascript:` →
falls through, `href=""` → no duplicate tab).
Gap, not a bug: middle-click is ignored (`auxclick` / `button === 1` are never handled).

### `Waitlist_Display_Chrome` / `Waitlist_Display_Firefox` — MV3, v1.0.0 / v1.1
Scrape `mindvideo.ai` for `Est. wait: N person` and surface N in the tab title. Chrome adds a
floating bottom-right badge; Firefox is title-only but has the better scraper (250 ms
debounce, `person|people`, leaf-node skip, 100-char cap). Two hand-maintained copies that
have drifted in regex, title format, observer cost and URL scope.
Known, and the top item in `todo.md`: **Chrome's regex is `person`-only
(`content.js:73`), so it shows nothing once the queue reads "2 people"** — verified in node
today against four sample strings. Its observer is undebounced (`:130-135`) and its scraper
reads full-subtree `textContent` off every `span, div, p, li` (`:69-77`). Firefox writes a
bare digit with no `⏳` marker (`:31`). `service_worker.js` is two comment lines and can go
with its `manifest.json:17-19` block; the Gecko id is still a placeholder.
**`mindvideo.ai` answered 200 on 2026-10-10** (both `/` and `/text-to-video/`).

### `Remove_Sponsors`
Does not exist. `README.md:33-36` still describes it; it was never committed.

---

## State
Working personal toolkit, and the review loop is landing changes: three bugs fixed across the
last two cycles (`8f99694` waitlist observer loop, `753dca6` toolbar icon, `2d8b09f` the
`Ctrl_Click_New_Tab` anchor branch). Standing between this and finished: one genuinely broken
feature (Chrome waitlist above 1 person), a README whose install step points at a folder
renamed in May, the speed controller forgetting its own setting on every YouTube navigation,
and a decision about the Goku half. No syntax rot; everything left is logic, config or docs.
See `todo.md`.
