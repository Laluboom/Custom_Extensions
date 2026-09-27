# TODOs

_Ranked 2026-09-27. Two items from the 2026-09-15 list are **done**: the Waitlist Chrome
observer loop (`8f99694`) and the playback_speed_controller toolbar icon (`753dca6`). Both
were verified by the doer. What follows is what is genuinely left._

---

### 1. [BUG] The anchor branch in Ctrl_Click_New_Tab is wrong in both directions

`Ctrl_Click_New_Tab/content.js:39-40`:

```js
const anchor = target.closest("a[href]");
if (anchor) return toAbsoluteUrl(anchor.getAttribute("href") || anchor.href);
```

That single `return` causes two opposite defects, and one fix settles both.

**It over-fires on links the browser already handles.** On `<all_urls>`, every plain
`<a href="/page">` gets routed through `window.open(url, "_blank", ...)` at `:58`. Native
Ctrl+Click opens a **background** tab; `window.open` **focuses** the new tab. So the
extension turns every ordinary Ctrl+Click on the entire web into a focus steal. The
`noreferrer` in that same call also strips the `Referer` header on links that never asked
for it.

**It shadows the SPA fallbacks it was written for.** `<a href="#" onclick="location.href='/x'">`
— the exact pattern this extension exists to fix — hits `:39`, matches `a[href]`, and
`toAbsoluteUrl("#")` returns `null` (`:11` rejects `#`). The function then **returns null
immediately** and never reaches the `onclick` / `data-href` extraction at `:42-54`. Same
for `<a href="javascript:foo()">`, rejected at `:12`. And `<a href="">` is worse than
useless: `getAttribute("href")` is `""` → falsy → falls back to `anchor.href`, which
resolves to the *current* page, so you get a duplicate tab of where you already are.

**Fix:** stop early-returning from the anchor branch. If the anchor has a real navigable
href (non-empty, not `#`, not `javascript:`), return `null` and let the browser do what it
already does correctly. Otherwise fall **through** to the `data-href`/`formaction`/`onclick`
branch at `:42`. Net effect: no more focus steal on normal links, and `href="#"` SPA
anchors finally work. This is ~4 lines and it is the single highest-value change in the repo.

### 2. [BUG] Auto_Scroll_shorts chain-advances a Goku series on arrival, not at end-of-video

`Auto_Scroll_shorts/content.js:284` calls `tryClickNextOverlayButton("overlay-poll")` from
a bare `setInterval` every `GOKU.overlayClickRetryMs` = 1300 ms (`:17`, `:275-285`). Read
`tryClickNextOverlayButton` at `:194-212`: its only guards are `enabled`,
`isGokuSeriesPage()`, and `debounceReady()`. **Nothing checks playback position** — not
`currentTime`, not `duration`, not `ended`. It just finds the first visible node matching
`.next-episode, .btn-next, .next-ep, button[title*="Next" i], …` (`:196-204`) whose
`textContent` matches `/next|episode/i` (`:206`) and clicks it.

`debounceReady()` needs 1200 ms since the last advance (`:6`, `:26-28`) and the poll is
1300 ms, so the debounce **never** blocks the poll. On any series page with a visible
"Next Episode" control, this clicks ~1.3 s after load, lands on the next episode, and
repeats — walking the whole series in seconds. The `ended` / near-end listeners at
`:225-231` are the correct mechanism; the poll undermines them.

**Fix, and the prerequisite:** `goku.sx` timed out from this machine again today
(12 s, no bytes) — second consecutive review, 12 days apart. DNS is healthy and resolves
to Cloudflare (`172.67.134.175`, `104.21.25.211`); the stall is mid-TLS-handshake, so this
reads as Cloudflare refusing this network, **not** a dead site. You can settle it in one
browser tab in five seconds, and that decides the work:

- **If it loads for you:** gate the overlay poll behind end-of-playback. Only call
  `tryClickNextOverlayButton` from `onPlaybackEnded` (`:214-218`), where it already
  correctly lives as the fallback after `clickNextEpisode`. Delete the call at `:284` and
  keep the rest of that interval (the re-binding at `:282-283` is still useful).
- **If it does not:** delete the Goku half outright — roughly `:121-286` plus the
  `https://goku.sx/*` match in `manifest.json:8`. That turns this into a clean ~140-line
  Shorts auto-advancer, removes this bug, and removes the dead-host item below.

### 3. [QUICK WIN ~15min] [DOCS] README's install steps point at a folder that no longer exists

`README.md:50` tells you to load `Waitlist Display Firefox` — with spaces. Commit `e495b44`
renamed every waitlist folder to underscores (`Waitlist_Display_Firefox`) back in May, so
the one instruction a new user follows leads to a path that isn't there. `README.md:33-36`
also documents a fifth extension, "Remove Sponsors (Placeholder) — Empty directory"; there
is no `Remove_Sponsors/` in the tree and there never was (empty dirs don't survive git).

Two more real gaps while you're in the file — both are controls with **no** documentation
anywhere:

- `Ctrl+Shift+Y` (`Auto_Scroll_shorts/content.js:302-309`) is the *only* way to turn
  auto-advance off, and nothing in the README mentions it.
- The README never says the speed panel is shown/hidden by **clicking the toolbar button**
  (`playback_speed_controller/background.js:1`). It documents the panel's contents but not
  how to summon it.

Finally, collapse `README.md:54-77`. That "TODO List & Future Enhancements" block is a
second, staler todo list that now contradicts this file (it still proposes the unified
manager popup, which was dropped). Replace it with one line pointing at `todo.md`.

### 4. [IMPROVEMENT] Retire the Waitlist Chrome/Firefox fork — Chrome silently fails on "2 people"

Two hand-maintained copies that have drifted, and each has a fix the other lacks:

| | Chrome | Firefox |
|---|---|---|
| wait regex | `person` only (`content.js:73`) | `person\|people` (`content.js:5`) |
| title format | `⏳ N` (`content.js:65`) | bare `N`, no marker (`content.js:31`) |
| observer | undebounced, fires per mutation (`content.js:130-135`) | debounced 250 ms (`content.js:37-40`) |
| scrape cost | every `span,div,p,li`, full-subtree `textContent` (`content.js:69-77`) | skips containers >3 children, caps text at 100 chars (`content.js:16-23`) |
| url scope | all of `mindvideo.ai` (`manifest.json:12`) | `/text-to-video/*` only (`manifest.json:11`) |
| badge | yes | no |

The consequences are concrete. **Chrome shows nothing the moment the queue says
"2 people"** — `/…\s*person/i` does not match `people`, so the whole feature silently
switches off above one person in line, which is most of the time. And Chrome's observer
still calls `updateDisplay()` → `extractWaitNumber()` on *every single DOM mutation* with
no debounce; the `8f99694` fix stopped the unbounded self-feeding loop, but on a React app
that is still a full-document text walk per mutation. Firefox, meanwhile, puts a naked
digit in the tab with no `⏳` marker, so you can't tell it apart from the site's own title.

**Fix:** write one `content.js` — Firefox's scraper (debounce, `person|people`, leaf-node
skip, 5 s safety interval) plus Chrome's `⏳` title format and badge — and copy the same
file into both folders. Two manifests, one script, no build tooling for two files. While in
there: delete `Waitlist_Display_Chrome/service_worker.js` (it is two comment lines; MV3
does not require a background script) along with its `manifest.json:17-19` block, and
replace the placeholder Gecko id `queue-wait-tab-title@your-domain.com` at
`Waitlist_Display_Firefox/manifest.json:18`.

`mindvideo.ai` answered 200 today on both `/` and `/text-to-video/`, so this extension is
still worth fixing.

### 5. [IMPROVEMENT] The speed panel floats over the YouTube homepage, search, and subscriptions

`playback_speed_controller/manifest.json:17` matches `*://*.youtube.com/*` with no path
restriction, and the 1 s interval at `content.js:328-341` calls `createUI()`
unconditionally. `createUI`'s only guard is `if (document.getElementById(PANEL_ID)) return;`
(`:180`) — it never checks that a `<video>` exists. So the glass panel is appended
(`:274`) and, on a fresh install, rendered visible (`:195` defaults `isVisible` to true) on
the homepage, search results, subscriptions, the history page: every YouTube surface where
there is nothing to control. Compare `Auto_Scroll_shorts`, which correctly gates on
`location.pathname.startsWith("/shorts/")`.

**Fix:** early-return from `createUI()` when `document.querySelector('video')` is null, and
let the existing interval create the panel once a video appears. One line, and it stops the
extension from decorating pages it has no business on.

Worth fixing in the same pass — the guard at `:180` is checked **before** the
`await chrome.storage.local.get` at `:186`, but the panel is not appended until `:274`.
Two `createUI()` calls landing inside that await window (the interval firing at the same
moment you click the toolbar, which routes to `createUI()` at `:322`) both pass the guard
and both append a panel — and the keydown handler is registered *inside* `createUI` at
`:293`, so you get two listeners and `]` starts stepping speed by 0.2x. Set a
module-level `creatingUI` flag before the await.

---

## Also confirmed, not scheduled

- **Host-match vs. code-check mismatch** — `Auto_Scroll_shorts/manifest.json:8` matches only
  `https://www.youtube.com/*` and `https://goku.sx/*`, but `content.js:31` and `:36` accept
  any `youtube.com` / `*.goku.sx` host. On `m.youtube.com` or `www.goku.sx` the script never
  loads, so those permissive checks are unreachable. Note `:31`'s second clause
  (`location.hostname !== "www.youtube.com"`) is dead regardless: `/youtube\.com$/` already
  matches `www.youtube.com`.
- **`[href]` is redundant in the fallback selector** at `Ctrl_Click_New_Tab/content.js:42` —
  `a[href]` is already consumed by `:39`, so that token only ever catches non-anchor
  elements carrying an `href`. Harmless, but it reads as though it does more than it does.
- **All 7 JS files pass `node --check`** (2026-09-27). There is no syntax rot; every issue
  above is logic or config.

## Future ideas

- **Popup toggle for Auto_Scroll_shorts** — `Ctrl+Shift+Y` (`content.js:302`) is the only
  way to disable it and nothing surfaces the current state. The `enabled` flag already
  persists in `chrome.storage.local`, so a one-checkbox popup is ~10 lines of HTML.
- **Per-site / per-format speed memory** — `playback_speed_controller` stores one global
  `yts-saved-speed` (`content.js:4`), so the 2x you set for a lecture follows you into
  Shorts. Key it by hostname, or by shorts-vs-watch. Pairs naturally with task 5.
- **Re-apply saved speed across SPA navigation** — the restore at `content.js:344-358` runs
  once on load and stops after the first video it finds. YouTube navigates without
  re-running the content script, so the 1 s interval at `:328` only *reads* `playbackRate`
  into the input; it never re-applies your saved speed to the next video. Unverified in a
  real browser, but the code path is plainly one-shot.
- **SponsorBlock-based sponsor skipper** — genuinely a new extension, not a task. Would
  start with a `fetch` to `sponsor.ajay.app` for the current video id. Note the README has
  advertised this as an existing placeholder folder for months; see task 3.
- ~~Unified extension manager popup~~ — dropped. Five independent extensions that each do
  one thing do not need a shared messaging contract; that is more surface area than the
  suite has.
