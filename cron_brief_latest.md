# Custom_Extensions — daily review, 2026-11-09

## What I looked at

All 16 tracked files: every `manifest.json`, all 7 JS files, the README, the previous `todo.md`
and `.gitignore`. Read the full source of `Auto_Scroll_shorts/content.js` (312 lines) and
`playback_speed_controller/content.js` (359 lines) rather than skimming, and diffed the two
waitlist copies against each other line by line. Ran `node --check` on all 7 JS files — all pass.

No browser render: these are unpacked extensions with no dev server to point Chrome at. What I
did instead was check the two hosts they depend on over HTTP, and scan the served `mindvideo.ai`
HTML for the queue wording the scraper is built around.

## What I found

**Last cycle's headline item is done.** `8f538dd` fixed the README — the Firefox install path
(which pointed at a folder renamed in `e495b44`), the phantom fifth "Remove Sponsors" extension,
the contradictory second TODO block, and the two controls documented nowhere (`Ctrl+Shift+Y`, and
the fact that the toolbar button is what summons the speed panel). That item had been proposed
three cycles running. With it gone, nothing stands between these five extensions and someone else
installing them, which was the biggest real gap in this repo.

**The one live bug is still the Chrome waitlist badge.** Proposed last cycle, not taken, and it
got more interesting on a second read. `Waitlist_Display_Chrome/content.js:130-137` hides the
badge by removing a class that controls only `opacity` and `transform` — the **inline**
`display = "flex"` set at `:117` is never reverted, and the base CSS at `:29-48` sets no
`pointer-events`. So once your queue clears you're left with an invisible, `position: fixed`,
`z-index: 99999` box in the bottom-right corner of `mindvideo.ai` that still hit-tests and
silently eats clicks.

The part I'd missed before is that this has a *second* symptom from the same cause. The cheap
guard at `:72` (`document.body.innerText.includes("wait:")`) exists to skip the DOM walk at
`:75`. The badge's own text node `" Est. Wait: "` (built at `:20`) is in `document.body` — while
the badge is `display: none` it's excluded from `innerText`, but the moment `:117` flips it to
`flex` it counts, and since the hide path never flips it back, the guard never short-circuits
again. Every debounced mutation batch runs the full `querySelectorAll("span, div, p, li")` walk
forever. Uncommenting the `display = "none"` timeout fixes both. Two lines.

**`goku.sx` failed for the fifth consecutive review** — 12 s, `http_code 000`, zero bytes,
stalling mid-TLS-handshake. That's 09-15, 09-27, 10-10, 10-26 and today. Previous cycles framed
this as a fork for the owner to settle; five data points is enough that I'm now recommending the
deletion outright. What makes it worth acting on is the bug it's blocking:
`Auto_Scroll_shorts/content.js:284` polls `tryClickNextOverlayButton` every 1300 ms with **no
playback-position check at all** (read `:194-212` — it guards only `enabled`,
`isGokuSeriesPage()` and `debounceReady()`), and the 1200 ms debounce at `:6` is shorter than the
1300 ms poll, so it can never gate. On any series page with a visible "Next Episode" control this
walks the entire series in seconds, actively undermining the correct `ended`/near-end listeners
at `:225-231`.

**I tried and failed to verify `WAIT_REGEX`, which is worth flagging as a finding in itself.**
Both waitlist copies hinge on `/Est\.\s*wait:\s*(\d+)\s*(?:person|people)/i`. `mindvideo.ai`
answered 200 on both `/` and `/text-to-video/` today, but the served HTML (193 KB) contains no
"wait", "queue", "people ahead" or "person ahead" string anywhere — the queue UI is
client-rendered behind auth. So the exact format `Est. wait: N person` has never been confirmed
against the live DOM by anyone, and the regex needs the period *and* the colon to match. The
entire function of two extensions rests on an unverified string that only the owner can check.

## What I'm proposing

1. **[QUICK WIN ~15min]** The badge click-trap — two lines, kills both symptoms. While you're in
   there and sitting in a real queue, paste the actual node text into a comment above
   `WAIT_REGEX`.
2. **[DESIGN]** Delete the Goku half (~165 lines plus the manifest match and config block). The
   one-line fallback if it actually loads for you: delete just the `:284` call.
3. **[IMPROVEMENT]** Make the speed controller follow the video — it applies the saved speed once
   per injection (`:344-358`) and YouTube navigates by History API, so the panel updates itself
   to display `1.00` rather than preventing the reset. Plus gate `createUI` on a `<video>`
   existing, so it stops floating over the homepage and search.
4. **[IMPROVEMENT]** Finish converging the waitlist pair — the Firefox copy still clobbers the
   SPA's own tab titles (no `lastTitle` guard), Chrome still ships a dead service worker, the
   manifests disagree on scope, and the Gecko id is a placeholder.
5. **[CHORE]** Five small confirmed wrongnesses in one pass, including the slider that lies above
   4x and a `hostname.endsWith("youtube.com")` that also accepts `notyoutube.com`.

## Honest read

This repo is in good shape and is being genuinely worked, not just re-reviewed — two of the last
two cycles' tasks actually landed (`8cf9e9f`, `8f538dd`). There's no rot to fight: no
dependencies, no build, no bundler, so nothing expires except the sites these scripts target.
That's exactly why the remaining backlog is all logic and config.

The single thing that would make this *finished* is removing the Goku half. It's the only part of
the codebase that can't be verified, can't be tested, and carries a known destructive bug — and
it's the only item that keeps regenerating in this file every cycle. Deleting it leaves a clean
~140-line Shorts auto-advancer and takes this repo to five extensions that all work and are all
documented. Everything else on the list is polish.
