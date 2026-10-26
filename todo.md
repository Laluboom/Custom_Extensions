# TODOs

_Ranked 2026-10-26. The headline item from 2026-10-10 is **done** (`8cf9e9f`): both waitlist
copies now share `WAIT_REGEX = /Est\.\s*wait:\s*(\d+)\s*(?:person|people)/i`, the 250 ms
debounce, the leaf-node skip and the `⏳` prefix. That was the only genuinely broken feature
here, so what's left is one doc fix, three small bugs and one decision._

_The README item below has now been proposed **three** cycles running (2026-09-27, 2026-10-10,
today) and never touched. It is not labelled a quick win this time — it's labelled #1, because
it is the thing actually standing between this repo and "finished"._

---

### 1. `[DONE 2026-10-26]` The one install instruction a new machine follows points at a folder that no longer exists

`README.md` is the restore procedure for this repo. It has four concrete wrongnesses:

- **`README.md:50`** — "Select the `manifest.json` file inside the `Waitlist Display Firefox`
  folder." With spaces. `e495b44` renamed it to `Waitlist_Display_Firefox`. That is the single
  step a human executes, and it leads to a path that isn't there.
- **`README.md:33-36`** — documents a fifth extension, "Remove Sponsors (Placeholder) — Empty
  directory." There is no `Remove_Sponsors/` in the tree and there can't be; git doesn't track
  empty directories. Move the SponsorBlock note to the Future ideas section below and delete
  the entry.
- **`README.md:54-77`** — a second "TODO List & Future Enhancements" that contradicts this file.
  It still proposes the unified manager popup this file dropped. Replace the whole block with
  one line: `See todo.md.`
- **Two controls documented nowhere.** `Ctrl+Shift+Y` (`Auto_Scroll_shorts/content.js:302-309`)
  is the *only* way to turn auto-advance off — nothing in the UI surfaces it. And the speed
  panel is shown/hidden by **clicking the toolbar button**
  (`playback_speed_controller/background.js:1`); `README.md:9-17` lists the panel's contents but
  never says how to summon or dismiss it. One line each.

~15 min, no code touched, and it is the difference between five extensions anyone can install
and five folders only you know how to load.

### 2. `[QUICK WIN ~15min]` [BUG] The Chrome waitlist badge turns into an invisible click-trap once the queue clears

`Waitlist_Display_Chrome/content.js:130-137`. The hide path removes the `visible` class and
nothing else:

```js
if (isDisplayVisible) {
  displayElement.classList.remove("visible");
  isDisplayVisible = false;
  // Optional: hide element after transition
  // setTimeout(() => { ... display = 'none' }, 300);   // <- commented out
}
```

`visible` only controls `opacity` and `transform` (CSS at `:49-52`). The inline
`display = "flex"` set at `:117` is never reverted, and the base rule at `:29-48` sets no
`pointer-events`. So after the queue drains you are left with a `position: fixed`,
`opacity: 0`, ~180×45px box pinned to the bottom-right corner of `mindvideo.ai` that still
hit-tests — it silently eats clicks on whatever the site puts there, with no visual hint why.
`z-index: 99999` guarantees it wins.

Same root cause, second symptom: the cheap fast-path at `:72`
(`document.body.innerText.toLowerCase().includes("wait:")`) exists to avoid the DOM walk at
`:75`. But the badge's own literal text `" Est. Wait: "` (built at `:20`) is in `document.body`,
and `innerText` includes it as soon as the element is rendered. So once the badge has been shown
*once*, the guard never short-circuits again for the life of the page, and every debounced
mutation batch runs the full `querySelectorAll("span, div, p, li")` walk — on a Next.js app,
forever.

**Fix:** add `pointer-events: none` to the `#${DISPLAY_ID}` rule and uncomment the
`display = "none"` timeout. Two lines, kills both symptoms.

While you are in there and actually sitting in a queue: **paste the real node text into a
comment above `WAIT_REGEX` (`:6`)**. `/text-to-video/`'s server HTML is 189 KB and contains no
"wait" string at all (checked today) — the queue UI is client-rendered, so the exact format
`Est. wait: N person` has never been verified against the live DOM by anyone. The regex needs
the period *and* the colon. Thirty seconds of copy-paste, and it's the only way this stays
debuggable.

### 3. [IMPROVEMENT] The speed controller forgets its own setting on every YouTube navigation, and floats over pages that have no video

Two halves of one idea: follow the actual video.

**It forgets.** `playback_speed_controller/content.js:344-358` applies `yts-saved-speed` exactly
once per script injection, via a 500 ms `setInterval` that `clearInterval`s itself the moment it
finds a `<video>` (and gives up after 10 s at `:356`). YouTube navigates by History API, so the
content script does not re-run — the restore fires for the first video of the session and never
again. The 1 s interval at `:328-341` is the other half: it reads `video.playbackRate` *into*
the number input (`:336`) but never writes the saved speed *back*. Net effect in code: set 2x on
a lecture, click the next video, and the panel dutifully updates itself to display `1.00`. It
watches your speed get reset instead of preventing it.

**It floats everywhere.** `createUI`'s only guard is
`if (document.getElementById(PANEL_ID)) return;` (`:180`), and `manifest.json:17` matches
`*://*.youtube.com/*` with no path restriction, so the glass panel is appended (`:274`) and
rendered visible (`:195` defaults `isVisible` true) over the homepage, search, subscriptions and
history. Compare `Auto_Scroll_shorts`, which correctly gates on
`location.pathname.startsWith("/shorts/")`.

**Fix:** in the `:328` interval, track the last `<video>` element seen; when it changes, write
`yts-saved-speed` to the new one instead of reading from it. Gate `createUI` on a `<video>`
existing. ~40 min.

Caveat worth five seconds of your time first: YouTube sometimes reuses the same `<video>` node
across watch pages. If the speed does *not* actually reset for you in a real tab, this task
collapses to just the `<video>` gate (one line) — in which case do that and close it.

### 4. [DESIGN] Delete the Goku half — goku.sx has now failed four consecutive reviews

`goku.sx` timed out from this machine again today: 12 s, `http_code 000`, zero bytes. That is
**2026-09-15, 2026-09-27, 2026-10-10 and 2026-10-26**. DNS has resolved to Cloudflare every
time and the stall is mid-TLS-handshake, so it reads as Cloudflare refusing this network rather
than a dead domain — which is precisely why I can't settle this and you can, in one browser tab.

What's waiting on the decision is a real bug. `Auto_Scroll_shorts/content.js:284` calls
`tryClickNextOverlayButton("overlay-poll")` from a bare `setInterval` every
`GOKU.overlayClickRetryMs` = 1300 ms (`:17`, `:275-285`). Read the function at `:194-212`: its
only guards are `enabled`, `isGokuSeriesPage()` and `debounceReady()`. **Nothing checks playback
position** — not `currentTime`, not `duration`, not `ended`. It finds the first visible node
matching `.next-episode, .btn-next, button[title*="Next" i], …` whose `textContent` matches
`/next|episode/i` and clicks it. And `debounceReady()` wants 1200 ms (`:6`) against a 1300 ms
poll, so the debounce can never fire. On any series page with a visible "Next Episode" control
this clicks ~1.3 s after arrival, lands on the next episode, and repeats — walking the whole
series in seconds. The `ended` / near-end listeners at `:225-231` are the correct mechanism and
this poll actively undermines them.

- **If goku.sx loads for you:** delete the `:284` call and let `onPlaybackEnded` (`:214-218`) be
  the only caller — it already lives there correctly as the fallback after `clickNextEpisode`.
  Keep the rest of the interval; the re-binding at `:282-283` is still doing work.
- **If it doesn't:** delete the Goku half outright — roughly `:121-286`, plus the
  `https://goku.sx/*` match in `manifest.json:8`, plus `GOKU` at `:16-19` and
  `gokuIframeWatcherAttached` / `gokuLastUrl` at `:23-24`. That leaves a clean ~140-line Shorts
  auto-advancer, drops the `<all_urls>`-adjacent surface, and removes this item permanently. On
  four data points, this is the likelier answer.

Either branch is under an hour. Four reviews of "can't verify" is enough.

### 5. [IMPROVEMENT] Finish converging the two waitlist copies — the drift moved, it didn't go away

`8cf9e9f` unified the scraper. Three differences survived it:

- **Firefox clobbers the site's own title.** `Waitlist_Display_Firefox/content.js:29-35` writes
  `ORIGINAL_TITLE` back unconditionally whenever no number is found. Chrome guards exactly this
  with `lastTitle` (`:96`, `:125-127`) — it only restores if *it* was the one who last set the
  title. `mindvideo.ai` is a Next.js SPA that sets `document.title` on route change, so the
  Firefox copy pins the tab to whatever the title was at `document_idle`, re-asserting it every
  5 s (`:60`) and on every mutation. Port Chrome's three lines across.
- **Chrome ships a dead service worker.** `Waitlist_Display_Chrome/service_worker.js` is two
  comment lines saying it isn't needed, and `manifest.json:17-19` registers it anyway. MV3 does
  not require a background entry. Delete both.
- **The manifests disagree on scope.** Chrome matches all of `https://www.mindvideo.ai/*`
  (`manifest.json:12`), Firefox only `/text-to-video/*` (`:11`). Both answered 200 today. Pick
  one — if the queue only ever appears on `/text-to-video/`, Chrome's broader match is just
  extra injections.

While you're in the Firefox manifest: the Gecko id at `:18` is still the placeholder
`queue-wait-tab-title@your-domain.com`. Harmless for a temporary add-on, blocks a signed build
later.

---

## Also confirmed, not scheduled

- **`createUI()` can in principle build two panels** — `playback_speed_controller/content.js`
  guards existence at `:180`, awaits `chrome.storage.local.get` at `:186`, and doesn't
  `appendChild` until `:274`, so two calls inside that await window both pass the guard. Last
  cycle listed this as task 4; downgrading it. The only two callers are a 1 s interval (`:329`)
  and the toolbar message (`:322`), so the collision window is the ~1 ms of one storage read —
  it needs a click landing inside that millisecond. The consequences are real if it ever happens
  (two `document` keydown listeners from `:293`, so `]` steps 0.2x; and `getElementById` returns
  the first panel, so the toolbar toggle at `:312-320` can never dismiss the duplicate). A
  module-level `let creatingUI = false` around the `:186` await still fixes it in ~15 min — fold
  it in if you're already in the file for task 3, but it doesn't earn its own slot.
- **Dead host check in `Auto_Scroll_shorts:31`** — the second clause
  `location.hostname !== "www.youtube.com"` is unreachable; `/youtube\.com$/i` already matches
  it. `:36`'s `(^|\.)goku\.sx$` also accepts subdomains the manifest never injects into
  (`manifest.json:8` is `https://goku.sx/*` only).
- **`Auto_Scroll_shorts/manifest.json` has no `description`** — the only one of the five without
  it, so it shows as a blank line in `chrome://extensions`.
- **`[href]` is redundant** in the fallback selector at `Ctrl_Click_New_Tab/content.js:45` —
  `a[href]` is consumed at `:39-43`, so that token only ever catches non-anchor elements carrying
  an `href`. Reads as though it does more than it does.
- **`playback_speed_controller/content.js:285`** — `rangeInput.value` is only updated when
  `speed <= 4`, so above 4x the slider thumb silently lies about the current speed.
- **All 7 JS files pass `node --check`** (2026-10-26). No syntax rot. Everything above is logic,
  config or docs.
- **`mindvideo.ai` answered 200 today** on both `/` and `/text-to-video/`.

## Future ideas

- **`Ctrl_Click_New_Tab` ignores middle-click** — `isCtrlLeftClick` (`:4-6`) requires
  `button === 0`, and the listener is on `click` (`:65`); middle-click fires `auxclick` with
  `button === 1` and no modifier. Middle-click is the more common new-tab gesture, and the whole
  extraction pipeline at `:36-58` already does the work — including the right thing for this
  case, since `extractNavigationUrl` returns `null` for real navigable anchors (`:39-43`) that
  the browser already handles natively. This is one `auxclick` capture listener and one
  predicate, ~20 min. Ctrl+Shift+Click is excluded too (`!event.shiftKey` at `:5`), which is the
  "new tab and switch to it" gesture.
- **The speed panel can be dragged off-screen permanently** — `makeDraggable` (`:144-176`) clamps
  nothing, and `closeDragElement` persists `top`/`left` to `yts-panel-pos` (`:174`). Drag it past
  the viewport edge and it's gone across every reload, with no reset in the UI; the toolbar button
  only toggles `hidden`. A clamp to `window.inner*` on restore (`:188-192`) would do it.
- **Per-site speed memory** — one global `yts-saved-speed` (`:4`), so the 2x you set for a lecture
  follows you into Shorts. Pairs with task 3.
- **Popup toggle for `Auto_Scroll_shorts`** — `Ctrl+Shift+Y` is the only off switch and nothing
  surfaces the current state. `enabled` already persists in `chrome.storage.local`, so this is
  ~10 lines of HTML.
- **SponsorBlock skip** — the old `Remove_Sponsors` placeholder idea. Nothing exists; the public
  SponsorBlock API is the research pointer if you ever want it.
- ~~Unified extension manager popup~~ — dropped. Five independent extensions that each do one
  thing don't need a shared messaging contract.
- ~~`Ctrl_Click_New_Tab` anchor branch~~ — **done**, `2d8b09f`.
- ~~Chrome waitlist regex / debounce / leaf-skip~~ — **done**, `8cf9e9f`.
