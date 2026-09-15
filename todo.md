# TODOs

_Ranked 2026-09-15. Nothing from the previous list (2026-05-29) was started — the repo
has had no commits since the folder-rename on 2026-05-30._

---

### 1. [BUG] Waitlist Chrome badge feeds its own MutationObserver — unbounded loop

`Waitlist_Display_Chrome/content.js:88` sets `displayElement.innerHTML = formatDisplay(n)`
**unconditionally** on every `updateDisplay()` call. The observer at
`Waitlist_Display_Chrome/content.js:120-125` watches `document.documentElement` with
`childList + subtree + characterData` — and `displayElement` is inside `document.body`.
So: observer fires → `updateDisplay()` → `innerHTML` write → new mutation records →
observer fires again. Observer delivery is a microtask, and microtasks queued during a
drain run in that same drain, so this does not yield to the event loop: the tab spins
as long as the "Est. wait" text is on the page.

Fix: only write when the value changed. Cache the last rendered `n`, early-return if it
matches, and build the badge with `textContent` on two child spans instead of `innerHTML`
so re-renders are cheap. The title write at `:82` already has this guard — copy the shape.
Verify with a scratch HTML page containing `Est. wait: 3 person` and a counter wrapped
around `MutationObserver`.

### 2. [BUG] Ctrl_Click_New_Tab hijacks ordinary links on every site

`Ctrl_Click_New_Tab/content.js:39-40` matches `target.closest("a[href]")` **first**, before
any of the SPA fallbacks — so plain anchors, which the browser already handles correctly,
get intercepted and routed through `window.open(url, "_blank", ...)` at `:58`. Two real
consequences, on `<all_urls>`:

- Native Ctrl+Click opens a **background** tab; `window.open` focuses the new tab. So the
  extension turns every normal Ctrl+Click on the web into a focus steal.
- `<a href="">` (common SPA button pattern) → `getAttribute("href")` is `""` → falls through
  to `anchor.href`, which resolves to the *current* page → opens a duplicate of the page
  you are on.

Fix: skip the anchor branch when the anchor has a non-empty, non-`#`, non-`javascript:`
href — let the browser do what it already does well — and keep the interception only for
the `data-href` / `data-url` / `formaction` / `onclick` cases at `:42-54`, which is the
actual reason this extension exists.

### 3. [QUICK WIN ~15min] Give playback_speed_controller a toolbar icon

The toolbar button is the *only* way to toggle the speed panel
(`playback_speed_controller/background.js:1`), but `manifest.json:6-8` declares `action`
with just a `default_title` and no `default_icon` — so the button renders as Chrome's grey
letter placeholder and is easy to lose in the overflow menu. Separately,
`manifest.json:20-22` maps `playback.png` to the `"128"` key, but the file is actually
**24×24** (`file playback_speed_controller/playback.png`), so `chrome://extensions` upscales
it 5x and it looks blurry.

Fix: move the icon to the size it really is and point the action at it —
`"icons": { "24": "playback.png" }` plus `"action": { "default_title": ..., "default_icon":
{ "24": "playback.png" } }`. Optionally re-export the source art at 128×128 and keep both keys.

### 4. [IMPROVEMENT] Retire the Waitlist Chrome/Firefox fork

The two copies have drifted in four confirmed ways, and each one has a fix the other lacks:

| | Chrome | Firefox |
|---|---|---|
| wait regex | `person` only (`content.js:67`) | `person\|people` (`content.js:5`) |
| title | `⏳ N` (`content.js:54`) | bare `N`, no marker (`content.js:31`) |
| url match | all of `mindvideo.ai` (`manifest.json:12`) | `/text-to-video/*` only (`manifest.json:11`) |
| badge | yes | no |

So the Chrome build silently shows nothing once the queue says "2 people", and the Firefox
build puts a naked digit in the tab. Make one `content.js` that is Firefox's logic (debounced
observer, `person|people`, the `>3 children` leaf-node skip, 5000 ms fallback) plus Chrome's
`⏳` title format and badge, then copy that file into both folders. Two manifests, one script
— no build tooling for two files. While in there, delete
`Waitlist_Display_Chrome/service_worker.js` and its `manifest.json:17-19` block (it is two
comment lines; MV3 does not require a background script), and replace the placeholder Gecko
id `queue-wait-tab-title@your-domain.com` at `Waitlist_Display_Firefox/manifest.json:18`.

### 5. [DOCS] README describes things that do not exist

`README.md:33-36` documents a "Remove Sponsors (Placeholder)" extension as an empty
directory — there is no `Remove_Sponsors/` directory in the tree (untracked empty dirs do
not survive git; it was never committed). `README.md:50` still tells you to load
`Waitlist Display Firefox`, but commit `e495b44` renamed those folders to underscores
(`Waitlist_Display_Firefox`), so the install instructions point at a path that isn't there.

Also worth a line in the README: `goku.sx` did not respond from this machine on 2026-09-15
(connect timeout, not a DNS failure — so possibly geo/Cloudflare rather than dead). Half of
`Auto_Scroll_shorts/content.js` — roughly lines 121-286 — exists only for that site. If it
is gone for you too, deleting the Goku half turns that extension into a clean 140-line
Shorts auto-advancer and removes item 6 below.

---

## Also confirmed, not scheduled

- **`Auto_Scroll_shorts/content.js:284`** — `tryClickNextOverlayButton("overlay-poll")` runs
  on the 1300 ms timer regardless of where playback is, and its match filter at `:206` is
  `/next|episode/i` over `textContent`. Anything on a Goku series page whose visible text
  contains "episode" and that matches the broad selector list at `:196-204` gets clicked on
  arrival, not at end-of-video. Only the 1200 ms `debounceReady()` limits it.
- **Content-script double-injection in playback_speed_controller** — `background.js:9-20`
  re-injects `content.js` whenever `sendMessage` throws, but the IIFE has no
  `window.__ytsLoaded` guard. A second injection means a second `setInterval` (`content.js:328`)
  and a second `document` keydown listener (registered *inside* `createUI`, `content.js:293`),
  at which point `]` steps speed by 0.2x instead of 0.1x. Adding a one-line re-entry guard
  is worth more than the previously-filed "replace the 1s poll with a MutationObserver",
  which is a perf nit on an otherwise-idle timer.
- **Host-match vs. code-check mismatch** — `Auto_Scroll_shorts/manifest.json:8` matches only
  `https://www.youtube.com/*` and `https://goku.sx/*`, but `content.js:31` and `:36` accept
  any `youtube.com` / `*.goku.sx` host. On `m.youtube.com` or `www.goku.sx` the script never
  loads at all, so the permissive checks are dead code.

## Future ideas

- **Popup toggle for Auto_Scroll_shorts** — `Ctrl+Shift+Y` (`content.js:302`) is the only
  way to disable it and nothing surfaces the current state. The `enabled` flag already
  persists in `chrome.storage.local`, so a one-checkbox popup is ~10 lines of HTML.
- **Per-site / per-format speed memory** — `playback_speed_controller` stores one global
  `yts-saved-speed`, so the 2x you set for a lecture follows you into Shorts. Key it by
  hostname, or by shorts-vs-watch.
- **More platforms for Auto_Scroll_shorts** — the YouTube and Goku halves are already
  cleanly separated behind `isYouTubeShortsPage()` / `isGokuSeriesPage()`; a new site is a
  guard plus a next-button selector. Do this only if the Goku half proves it still works.
- **SponsorBlock-based sponsor skipper** — genuinely a new extension, not a task. Would start
  with a `fetch` to `sponsor.ajay.app` for the current video id.
- ~~Unified extension manager popup~~ — dropped. Five independent extensions that each do one
  thing do not need a shared messaging contract; that is more surface area than the suite has.
