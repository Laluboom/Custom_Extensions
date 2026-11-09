# TODOs

_Ranked 2026-11-09. Last cycle's #1 — the wrong README install path — is **done** (`8f538dd`).
That was the three-cycle holdout, and with it gone there is nothing left here that stops someone
else installing these five extensions._

_What remains is one live bug, one decision that has now waited five reviews, and three cleanups.
All seven JS files pass `node --check` (re-verified today). No syntax rot, no dependency rot —
these are unbundled content scripts with no toolchain, which is why this repo keeps working._

---

### 1. `[DONE 2026-11-09]` [BUG] The Chrome waitlist badge turns into an invisible click-trap once the queue clears

Proposed last cycle, not taken. It is still the only bug here with live impact —
`mindvideo.ai` answered 200 on both `/` and `/text-to-video/` today, so this is a site you
actually use.

`Waitlist_Display_Chrome/content.js:130-137`. The hide path removes one class and nothing else:

```js
if (isDisplayVisible) {
  displayElement.classList.remove("visible");
  isDisplayVisible = false;
  // setTimeout(() => { ... display = 'none' }, 300);   // <- commented out
}
```

`visible` controls only `opacity` and `transform` (CSS at `:49-52`). The **inline**
`display = "flex"` set at `:117` is never reverted, and the base rule at `:29-48` sets no
`pointer-events`. So after the queue drains you are left with a `position: fixed`, `opacity: 0`,
~180×45px box pinned bottom-right of the page that still hit-tests — silently eating clicks on
whatever the site puts there, with `z-index: 99999` guaranteeing it wins. No visual hint why.

**Same root cause, second symptom.** The cheap fast-path at `:72`
(`document.body.innerText.toLowerCase().includes("wait:")`) exists to avoid the DOM walk at
`:75`. The badge's own literal text node `" Est. Wait: "` (built at `:20`) lives in
`document.body`. While the badge is `display: none` it is excluded from `innerText` — but the
moment `:117` flips it to `flex` it is counted, and because `:130-137` never flips it back, the
guard never short-circuits again for the life of the page. Every debounced mutation batch then
runs the full `querySelectorAll("span, div, p, li")` walk, forever, on a Next.js app.

**Fix:** add `pointer-events: none` to the `#${DISPLAY_ID}` base rule and uncomment the
`display = "none"` timeout. Two lines, both symptoms gone.

**While you are in there, and sitting in a real queue: paste the actual node text into a comment
above `WAIT_REGEX` (`:6`).** I tried again today to verify
`/Est\.\s*wait:\s*(\d+)\s*(?:person|people)/i` from outside: the served HTML for
`/text-to-video/` is 193 KB and contains no "wait", "queue", "people ahead" or "person ahead"
string anywhere — the queue UI is client-rendered behind auth. So the exact format
`Est. wait: N person` has still never been confirmed against the live DOM by anyone, and the
regex needs the period *and* the colon to match. This extension's entire function rests on one
unverified string. Thirty seconds of copy-paste is the only way it stays debuggable.

### 2. [DESIGN] Delete the Goku half — goku.sx has now failed five consecutive reviews

`goku.sx` timed out from this machine again today: 12 s, `http_code 000`, zero bytes. That is
**2026-09-15, 09-27, 10-10, 10-26 and 11-09**. Previous cycles framed this as a fork — "delete
the poll if the site loads for you, delete the half if it doesn't." Five data points is enough:
**I'm recommending the deletion outright.** If it loads fine in your browser, say so and this
collapses back to the one-line version below.

The bug that's waiting on the decision is real. `Auto_Scroll_shorts/content.js:284` calls
`tryClickNextOverlayButton("overlay-poll")` from a bare `setInterval` every
`GOKU.overlayClickRetryMs` = 1300 ms (`:17`, `:275-285`). Read the function at `:194-212`: its
only guards are `enabled`, `isGokuSeriesPage()` and `debounceReady()`. **Nothing checks playback
position** — not `currentTime`, not `duration`, not `ended`. It finds the first visible node
matching `.next-episode, .btn-next, button[title*="Next" i], …` whose `textContent` matches
`/next|episode/i` and clicks it. And `debounceReady()` wants 1200 ms (`:6`) against a 1300 ms
poll, so the debounce **can never fire**. On any series page with a visible "Next Episode"
control this clicks ~1.3 s after arrival, lands on the next episode, and repeats — walking the
whole series in seconds. The `ended` / near-end listeners at `:225-231` are the correct
mechanism, and this poll actively undermines them.

- **Deleting (recommended):** drop roughly `:121-286`, the `https://goku.sx/*` match in
  `manifest.json:8`, the `GOKU` block at `:16-19`, and `gokuIframeWatcherAttached` /
  `gokuLastUrl` at `:23-24`. That leaves a clean ~140-line Shorts auto-advancer, drops a host
  permission you can't reach, and removes this item from the backlog permanently.
- **Keeping:** delete only the `:284` call, leaving `onPlaybackEnded` (`:214-218`) as the sole
  caller — it already lives there correctly as the fallback after `clickNextEpisode`. Keep the
  rest of the interval; the re-binding at `:282-283` still does work.

~45 min for the deletion, 1 min for the other branch.

### 3. [IMPROVEMENT] The speed controller forgets its own setting on every YouTube navigation, and floats over pages with no video

Two halves of one idea: follow the actual video.

**It forgets.** `playback_speed_controller/content.js:344-358` applies `yts-saved-speed` exactly
once per script injection, via a 500 ms `setInterval` that `clearInterval`s itself the moment it
finds a `<video>` (and gives up after 10 s at `:356`). YouTube navigates by History API, so the
content script does not re-run — the restore fires for the first video of the session and never
again. The 1 s interval at `:328-341` is the other half: it reads `video.playbackRate` *into* the
number input (`:336`) but never writes the saved speed *back*. Net effect: set 2x on a lecture,
click the next video, and the panel dutifully updates itself to display `1.00`. It watches your
speed get reset instead of preventing it.

**It floats everywhere.** `createUI`'s only guard is
`if (document.getElementById(PANEL_ID)) return;` (`:180`), and `manifest.json:17` matches
`*://*.youtube.com/*` with no path restriction, so the glass panel is appended (`:274`) and
rendered visible (`:195` defaults `isVisible` true) over the homepage, search, subscriptions and
history. Compare `Auto_Scroll_shorts`, which correctly gates on
`location.pathname.startsWith("/shorts/")`.

**Fix:** in the `:328` interval, track the last `<video>` element seen; when it changes, write
`yts-saved-speed` to the new one instead of reading from it. Gate `createUI` on a `<video>`
existing. ~40 min.

Caveat worth five seconds first: YouTube sometimes reuses the same `<video>` node across watch
pages. If the speed does *not* actually reset for you in a real tab, this collapses to just the
`<video>` gate (one line) — do that and close it.

### 4. [IMPROVEMENT] Finish converging the two waitlist copies — the drift moved, it didn't go away

`8cf9e9f` unified the scraper; both copies now share `WAIT_REGEX`, the 250 ms debounce, the
leaf-node skip and the `⏳` prefix. Four differences survived it:

- **Firefox clobbers the site's own title.** `Waitlist_Display_Firefox/content.js:29-35` writes
  `ORIGINAL_TITLE` back unconditionally whenever no number is found. Chrome guards exactly this
  with `lastTitle` (`:96`, `:125-127`) — it only restores if *it* was the one who last set the
  title. `mindvideo.ai` is a Next.js SPA that sets `document.title` on route change, so the
  Firefox copy pins the tab to whatever the title was at `document_idle` and re-asserts it every
  5 s (`:60`) and on every mutation. Port Chrome's three lines across.
- **Chrome ships a dead service worker.** `Waitlist_Display_Chrome/service_worker.js` is two
  comment lines saying it isn't needed, and `manifest.json:18-20` registers it anyway. MV3 does
  not require a background entry. Delete both.
- **The manifests disagree on scope.** Chrome matches all of `https://www.mindvideo.ai/*`
  (`manifest.json:12`), Firefox only `/text-to-video/*` (`:11`). Both answered 200 today. Pick
  one — if the queue only ever appears on `/text-to-video/`, Chrome's broader match is just
  extra injections.
- **Placeholder Gecko id.** `Waitlist_Display_Firefox/manifest.json:18` is still
  `queue-wait-tab-title@your-domain.com`. Harmless for a temporary add-on, blocks a signed build
  later.

~30 min for all four.

### 5. [CHORE] The five-minute pile — small confirmed wrongnesses, one sitting

Individually none of these earns a slot; together they're one pass:

- **`playback_speed_controller/content.js:285`** — `rangeInput.value` is only updated when
  `speed <= 4`, so above 4x the slider thumb silently lies about the current speed. Clamp it to
  the max instead of skipping the write.
- **`Auto_Scroll_shorts/manifest.json`** has no `description` — the only one of the five without
  it, so it renders as a blank line in `chrome://extensions`.
- **Dead host check, `Auto_Scroll_shorts/content.js:31`** — the second clause
  `location.hostname !== "www.youtube.com"` is unreachable; `/youtube\.com$/i` already matches
  it. `:36`'s `(^|\.)goku\.sx$` also accepts subdomains the manifest never injects into
  (`manifest.json:8` is `https://goku.sx/*` only). Moot if you take task 2's deletion.
- **`playback_speed_controller/background.js:5`** — `url.hostname.endsWith("youtube.com")` also
  accepts `notyoutube.com`, and the failure path at `:14-18` calls `chrome.scripting.executeScript`,
  so a toolbar click on such a page would inject `content.js` there. One `=== "www.youtube.com" ||
  endsWith(".youtube.com")` fixes it.
- **Redundant `[href]`** in the fallback selector at `Ctrl_Click_New_Tab/content.js:45` —
  `a[href]` is consumed at `:39-43`, so that token only ever catches non-anchor elements carrying
  an `href`. Reads as though it does more than it does.

---

## Also confirmed, not scheduled

- **`createUI()` can in principle build two panels** — `playback_speed_controller/content.js`
  guards existence at `:180`, awaits `chrome.storage.local.get` at `:186`, and doesn't
  `appendChild` until `:274`, so two calls inside that await window both pass the guard. The only
  two callers are a 1 s interval (`:329`) and the toolbar message (`:322`), so the collision
  window is the ~1 ms of one storage read — it needs a click landing inside that millisecond. The
  consequences are real if it ever happens (two `document` keydown listeners from `:293`, so `]`
  steps 0.2x; and `getElementById` returns the first panel, so the toolbar toggle at `:312-320`
  can never dismiss the duplicate). A module-level `let creatingUI = false` around the `:186`
  await fixes it in ~15 min — fold it in if you're already in the file for task 3.
- **The speed panel can be dragged off-screen permanently** — `makeDraggable` (`:144-176`) clamps
  nothing, and `closeDragElement` persists `top`/`left` to `yts-panel-pos` (`:174`). Drag it past
  the viewport edge and it's gone across every reload, with no reset in the UI; the toolbar button
  only toggles `hidden`. A clamp to `window.inner*` on restore (`:188-192`) would do it.
- **All 7 JS files pass `node --check`** (2026-11-09). Everything above is logic, config or docs.
- **`mindvideo.ai` answered 200 today** on both `/` and `/text-to-video/`; `goku.sx` did not.

## Future ideas

- **`Ctrl_Click_New_Tab` ignores middle-click** — `isCtrlLeftClick` (`:4-6`) requires
  `button === 0`, and the listener is on `click` (`:65`); middle-click fires `auxclick` with
  `button === 1` and no modifier. Middle-click is the more common new-tab gesture, and the whole
  extraction pipeline at `:36-58` already does the work — including the right thing for this case,
  since `extractNavigationUrl` returns `null` for real navigable anchors (`:39-43`) the browser
  already handles natively. One `auxclick` capture listener and one predicate, ~20 min.
  Ctrl+Shift+Click is excluded too (`!event.shiftKey` at `:5`), which is the "new tab and switch
  to it" gesture.
- **Popup toggle for `Auto_Scroll_shorts`** — `Ctrl+Shift+Y` (`:302-309`) is the only off switch
  and nothing surfaces the current state. `enabled` already persists in `chrome.storage.local`, so
  this is ~10 lines of HTML.
- **Per-site speed memory** — one global `yts-saved-speed` (`:4`), so the 2x you set for a lecture
  follows you into Shorts. Pairs with task 3.
- **SponsorBlock skip** — the old `Remove_Sponsors` placeholder idea. Nothing exists; the public
  SponsorBlock API is the research pointer if you ever want it.
- ~~Unified extension manager popup~~ — dropped. Five independent extensions that each do one
  thing don't need a shared messaging contract.
- ~~README install path / phantom fifth extension / undocumented controls~~ — **done**, `8f538dd`.
- ~~`Ctrl_Click_New_Tab` anchor branch~~ — **done**, `2d8b09f`.
- ~~Chrome waitlist regex / debounce / leaf-skip~~ — **done**, `8cf9e9f`.
