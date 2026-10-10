# TODOs

_Ranked 2026-10-10. The headline item from the 2026-09-27 list is **done**: the
`Ctrl_Click_New_Tab` anchor branch (`2d8b09f`) — I re-traced all four paths in the current
code and it is correct in both directions now. The README item was marked
`[QUICK WIN ~15min]` last cycle and **was not touched**; it is still here, still 15 minutes._

---

### 1. [BUG] The Chrome waitlist extension shows nothing once the queue says "2 people"

`Waitlist_Display_Chrome/content.js:73`:

```js
const m = text.match(/Est\.\s*wait:\s*(\d+)\s*person/i);
```

`person` with no alternation. Firefox got this right at `content.js:5`
(`(?:person|people)`). Verified today in node against four realistic strings:

| text | Chrome | Firefox |
|---|---|---|
| `Est. wait: 1 person` | `1` | `1` |
| `Est. wait: 2 people` | **no match** | `2` |
| `Est. wait: 12 people` | **no match** | `12` |
| `Est. Wait: 3 People ahead of you` | **no match** | `3` |

So the Chrome build — the one with the badge, the one actually installed permanently —
works only when exactly one person is ahead of you. Every other time it silently does
nothing, which is the failure mode you'd never file a bug about: it just looks like the
site isn't queueing.

While you're in the file, port Firefox's other two scraper wins, because Chrome's version
is also the expensive one:

- **Debounce.** `:130-135` runs `updateDisplay()` → `extractWaitNumber()` on *every*
  MutationObserver batch. `8f99694` stopped it feeding itself, but on a Next.js app that
  is still a full-document text walk per mutation. Firefox wraps it in a 250 ms
  `setTimeout` (`:37-40`).
- **Leaf-node skip.** `:69-77` reads full-subtree `textContent` off every `span, div, p,
  li` with no cap, so `<body>`'s entire text gets regex-tested first. Firefox skips nodes
  with >3 children and caps text at 100 chars (`:16-23`).

**Fix:** make `Waitlist_Display_Chrome/content.js` use Firefox's `extractWaitNumber` +
`debouncedUpdate` verbatim, keeping Chrome's `⏳` title format (`:64-66`) and the badge.
Then copy the merged scraper back into `Waitlist_Display_Firefox/content.js` and give it
the `⏳` prefix it's missing at `:31` (right now Firefox writes a bare digit as the whole
tab title, indistinguishable from the site's own). Same file, two folders, no build step.
~40 min.

### 2. `[QUICK WIN ~15min]` [DOCS] README still points the one install step at a folder that was renamed

Carried from 2026-09-27 untouched. Four concrete wrongnesses in one file:

- `README.md:50` — "Select the `manifest.json` file inside the `Waitlist Display Firefox`
  folder." With spaces. `e495b44` renamed it to `Waitlist_Display_Firefox`. The single
  instruction a new user follows leads to a path that doesn't exist.
- `README.md:33-36` — documents a fifth extension, "Remove Sponsors (Placeholder) — Empty
  directory." There is no `Remove_Sponsors/` in the tree and there can't be; git doesn't
  track empty directories.
- `README.md:54-77` — a second "TODO List & Future Enhancements" that contradicts this
  file. It still proposes the unified manager popup that this file dropped. Replace the
  whole block with one line pointing at `todo.md`.
- **Two controls documented nowhere at all.** `Ctrl+Shift+Y`
  (`Auto_Scroll_shorts/content.js:302-309`) is the *only* way to turn auto-advance off.
  And the speed panel is shown/hidden by **clicking the toolbar button**
  (`playback_speed_controller/background.js:1`) — the README lists the panel's contents
  but never says how to summon it. Both are one line each.

### 3. [IMPROVEMENT] The saved playback speed is forgotten on every YouTube SPA navigation

`playback_speed_controller/content.js:344-358` applies `yts-saved-speed` **once**, via a
500 ms `setInterval` that `clearInterval`s itself the moment it finds a `<video>` (and
gives up after 10 s at `:356`). YouTube navigates by History API; the content script does
not re-run. So the restore fires for the first video of the session and never again.

The 1 s interval at `:328-341` is the other half of the problem — it reads
`video.playbackRate` *into* the number input (`:336`) but never writes the saved speed
*back* to the video. Net effect in code: set 2x on a lecture, click the next video, and
the panel dutifully updates itself to show `1.00`. The extension watches your speed get
reset instead of preventing it.

Fold the two in while you're there, since they're the same "follow the actual video" idea:

- **Gate on a `<video>` existing.** `createUI`'s only guard is
  `if (document.getElementById(PANEL_ID)) return;` (`:180`) and `manifest.json:17` matches
  `*://*.youtube.com/*` with no path restriction, so the glass panel is appended (`:274`)
  and rendered visible (`:195` defaults `isVisible` true) over the homepage, search,
  subscriptions and history. Compare `Auto_Scroll_shorts`, which correctly gates on
  `location.pathname.startsWith("/shorts/")`.
- **Re-apply on video change.** Track the last `<video>` element (or last pathname) in the
  `:328` interval; when it changes, write `yts-saved-speed` to the new element.

Behaviour is inferred from reading the code, not from a browser — YouTube sometimes reuses
the same `<video>` node across watch pages, so confirm the 1x reset in a real tab first.
If it does *not* reset, this task collapses to just the `<video>` gate (one line).

### 4. [BUG] Two `createUI()` calls inside one await window build two panels, and only one is toggleable

`playback_speed_controller/content.js`: the existence guard is at `:180`, the
`await chrome.storage.local.get` is at `:186`, and `document.body.appendChild(panel)` is
not until `:274`. Anything that calls `createUI()` twice inside that await window passes
the guard twice. The realistic trigger: the 1 s interval at `:329` firing at the same
moment you click the toolbar button, which routes to `createUI()` at `:322`.

Two consequences, and the second is the annoying one:

- The keydown handler is registered **inside** `createUI` at `:293`, so you get two
  `document` listeners and `]` starts stepping speed by 0.2x.
- `getElementById(PANEL_ID)` returns the *first* panel, so the toolbar toggle at
  `:312-320` only ever touches that one. The duplicate stays on screen with no way to
  dismiss it short of a reload.

**Fix:** a module-level `let creatingUI = false` set before the `:186` await and cleared in
a `finally`. ~15 min, independent of task 3.

### 5. [DESIGN] Decide the Goku half — it has now been unreachable for 25 days

`goku.sx` timed out from this machine again today: 12 s, zero bytes, `http_code 000`.
That is **three consecutive reviews** (2026-09-15, 2026-09-27, 2026-10-10). DNS has
resolved fine every time (Cloudflare) and the stall is mid-TLS-handshake, so this reads as
Cloudflare refusing this network rather than a dead domain — which is exactly why I can't
settle it and you can, in one browser tab.

The bug waiting on that decision: `Auto_Scroll_shorts/content.js:284` calls
`tryClickNextOverlayButton("overlay-poll")` from a bare `setInterval` every
`GOKU.overlayClickRetryMs` = 1300 ms (`:17`, `:275-285`). Read the function at `:194-212` —
its only guards are `enabled`, `isGokuSeriesPage()` and `debounceReady()`. **Nothing checks
playback position**: not `currentTime`, not `duration`, not `ended`. It finds the first
visible node matching `.next-episode, .btn-next, button[title*="Next" i], …` whose
`textContent` matches `/next|episode/i` and clicks it. And `debounceReady()` needs 1200 ms
(`:6`) against a 1300 ms poll, so the debounce never fires. On any series page with a
visible "Next Episode" control this clicks ~1.3 s after arrival, lands on the next
episode, and repeats — walking the series in seconds. The `ended` / near-end listeners at
`:225-231` are the correct mechanism and the poll undermines them.

- **If goku.sx loads for you:** delete the `:284` call and let `onPlaybackEnded` (`:214-218`)
  be the only caller, where it already lives correctly as the fallback after
  `clickNextEpisode`. Keep the rest of the interval — the re-binding at `:282-283` is still
  doing work.
- **If it doesn't:** delete the Goku half outright — roughly `:121-286` plus the
  `https://goku.sx/*` match in `manifest.json:8`. That leaves a clean ~140-line Shorts
  auto-advancer and removes this item permanently. On the evidence, this is the likelier
  answer.

---

## Also confirmed, not scheduled

- **`Waitlist_Display_Chrome/service_worker.js` is two comment lines** and the
  `manifest.json:17-19` `background` block that loads it is unnecessary under MV3. Both can
  go; fold into task 1.
- **The Gecko id is still the placeholder** `queue-wait-tab-title@your-domain.com`
  (`Waitlist_Display_Firefox/manifest.json:18`). Harmless for a temporary add-on, but it's
  the kind of thing that blocks a real signed build later.
- **The two waitlist manifests disagree on scope** — Chrome matches all of
  `https://www.mindvideo.ai/*` (`manifest.json:12`), Firefox only
  `/text-to-video/*` (`:11`). Pick one. Both answered 200 today.
- **Dead host checks in `Auto_Scroll_shorts`** — `manifest.json:8` matches only
  `https://www.youtube.com/*` and `https://goku.sx/*`, but `content.js:31` and `:36` accept
  any `youtube.com` / `*.goku.sx` host, so those branches are unreachable. `:31`'s second
  clause (`location.hostname !== "www.youtube.com"`) is dead regardless — `/youtube\.com$/`
  already matches it.
- **`[href]` is redundant** in the fallback selector at `Ctrl_Click_New_Tab/content.js:45`:
  `a[href]` is consumed at `:39-43`, so that token only ever catches non-anchor elements
  carrying an `href`. Reads as though it does more than it does.
- **All 7 JS files pass `node --check`** (2026-10-10). No syntax rot. Everything above is
  logic or config.

## Future ideas

- **`Ctrl_Click_New_Tab` ignores middle-click.** `isCtrlLeftClick` (`:4-6`) requires
  `button === 0`, and the listener is on `click` (`:65`) — middle-click fires `auxclick`
  with `button === 1`. Middle-click is the more common new-tab gesture and the whole
  extraction pipeline at `:36-58` already works; this is an `auxclick` listener and one
  predicate. Ctrl+Shift+Click is excluded too (`!event.shiftKey`).
- **The speed panel can be dragged off-screen permanently.** `makeDraggable` (`:156-169`)
  clamps nothing, and `closeDragElement` persists `top`/`left` to `yts-panel-pos` (`:174`).
  Drag it past the viewport edge and it's gone across every reload with no reset in the UI —
  the toolbar button only toggles `hidden`. A clamp to `window.inner*` on restore would do.
- **Per-site speed memory** — one global `yts-saved-speed` (`:4`), so the 2x you set for a
  lecture follows you into Shorts. Pairs with task 3.
- **Popup toggle for `Auto_Scroll_shorts`** — `Ctrl+Shift+Y` is the only off switch and
  nothing surfaces the current state. `enabled` already persists in `chrome.storage.local`,
  so this is ~10 lines of HTML.
- ~~Unified extension manager popup~~ — dropped. Five independent extensions that each do
  one thing don't need a shared messaging contract.
- ~~`Ctrl_Click_New_Tab` anchor branch~~ — **done**, `2d8b09f`.
