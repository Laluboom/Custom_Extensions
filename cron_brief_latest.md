# Daily brief — Custom_Extensions (2026-10-26)

## What I looked at

All 15 files: the seven JS files, all five manifests, `README.md`, and the previous `todo.md` /
`reference.md`. `node --check` on every JS file (all pass). Live HTTP checks against `goku.sx`
and both `mindvideo.ai` paths, and I pulled down the `/text-to-video/` HTML to see whether the
string the waitlist scraper hunts for is even in the markup.

**No browser check.** These are five unpacked extensions, not a web app — there is no dev server
to serve and a headless Chrome can't meaningfully load an unpacked extension and drive YouTube.
What I did instead was the live HTTP work above, which is where the useful finding came from.

## The headline: last cycle's top item actually landed

`8cf9e9f` fixed the Chrome waitlist regex. Both copies now share
`/Est\.\s*wait:\s*(\d+)\s*(?:person|people)/i`, the 250 ms debounce, the leaf-node skip, the
100-char cap and the `⏳` prefix. I re-read both files; it's a genuine merge, not a patch. That
was the only thing in this repo that was outright broken, which changes the character of the
review: **nothing here fails to do its job any more.** What's left is polish and one decision.

## What I found that's new

**The Chrome badge is an invisible click-trap.** This is the quick win, and it's the kind of bug
you'd never file — you'd just assume the site was being weird. `content.js:130-137` hides the
badge by removing the `visible` class, but that class only controls `opacity` and `transform`.
The inline `display = "flex"` set at `:117` is never put back (the restore is sitting there
commented out at `:133-136`), and the base CSS rule has no `pointer-events`. So once the queue
drains you're left with a `position: fixed`, `opacity: 0`, `z-index: 99999` box pinned to the
bottom-right corner of `mindvideo.ai`, invisible and still hit-testable. Two lines fixes it, and
the same fix kills a second symptom: the badge's own text `" Est. Wait: "` lives in
`document.body`, so it permanently defeats the cheap `innerText` guard at `:72` that exists to
avoid the DOM walk. Once the badge has been shown once, every mutation batch does the full walk
for the rest of the page's life.

**Nobody has ever verified the string the scraper looks for.** `/text-to-video/` serves 189 KB
of HTML and contains no case-insensitive match for "wait" anywhere — the only "queue" hits are
inside the Twitter ads pixel. The queue UI is client-rendered, so `Est. wait: N person` is a
guess that happens to have survived four reviews unexamined. The regex needs the period *and*
the colon. I've asked for a thirty-second thing: next time you're actually sitting in a queue,
paste the real node text into a comment above `WAIT_REGEX`.

**The two waitlist copies drifted again, in the other direction.** `8cf9e9f` unified the
scraper, but Firefox never got Chrome's `lastTitle` guard. `Firefox/content.js:29-35` writes
`ORIGINAL_TITLE` back unconditionally whenever it can't find a number; Chrome at `:125-127` only
restores if it was the one that set the title. On a Next.js SPA that sets `document.title` per
route, the Firefox copy pins your tab to whatever the title was at `document_idle` and
re-asserts it every five seconds.

## The thing I'm being blunt about

**`README.md:50` has now been proposed three cycles running** — 2026-09-27, 2026-10-10, today —
and never touched. It was labelled `[QUICK WIN ~15min]` twice. Proposing it a third time
identically would be theatre, so this time it's **task #1** and not the quick win.

The reason to care isn't tidiness. This README *is* the restore procedure for this repo, and its
single executable instruction tells you to select a folder called `Waitlist Display Firefox` —
with spaces — which `e495b44` renamed in May. It also documents an extension that doesn't exist
(`Remove_Sponsors`, lines 33-36), carries a second TODO list that contradicts `todo.md`, and
never mentions the two controls that aren't discoverable any other way: `Ctrl+Shift+Y` is the
*only* off switch for auto-advance, and the speed panel is summoned by clicking the toolbar
button. Fifteen minutes, no code touched, and it's the difference between five extensions
anyone can install and five folders only you know how to load.

## Also proposing

**The speed controller forgetting its own setting** is the biggest day-to-day rough edge. The
saved speed is applied exactly once per injection via a self-clearing interval (`:344-358`), and
YouTube navigates by History API so the script never re-runs. Meanwhile the 1 s interval at
`:328-341` reads `playbackRate` *into* the input but never writes the saved value back — so the
panel dutifully updates itself to show `1.00` when YouTube resets you. It watches your speed get
reset instead of preventing it. Worth five seconds of checking in a real tab first, since
YouTube sometimes reuses the same `<video>` node; if it doesn't reset for you, the task collapses
to just gating the panel on a video existing (one line, and it stops the glass panel floating
over the homepage and search).

**The Goku half should probably go.** `goku.sx` timed out again today — 12 s, zero bytes,
`http_code 000`. That's four consecutive reviews, with DNS resolving to Cloudflare every time
and the stall mid-TLS-handshake, so it reads as a network block rather than a dead domain. You
can settle in one browser tab what I've now failed to settle four times. The bug waiting on it
is real: the 1300 ms overlay poll at `Auto_Scroll_shorts/content.js:284` checks no playback
position at all, and the 1200 ms debounce can't throttle a 1300 ms poll, so on any series page
with a visible "Next Episode" control it clicks ~1.3 s after arrival and walks the whole series
in seconds — actively undermining the correct `ended`/near-end listeners twenty lines above.
Deleting the Goku half leaves a clean ~140-line Shorts auto-advancer.

## One correction to last cycle

I'm **downgrading the duplicate-panel race** that was task 4 on 2026-10-10. The flaw is real —
the existence guard at `:180` sits before an `await` and the `appendChild` isn't until `:274` —
but I overstated the trigger. The only two callers are a 1 s interval and the toolbar message, so
the collision window is the ~1 ms of a single `chrome.storage.local.get`; it needs a click landing
inside that millisecond. It's now in "also confirmed, not scheduled" with a note to fold the
`creatingUI` flag in if you're already in that file for task 3.

**Verdict: nearly finished.** No dependency rot, no syntax rot, nothing that needs scaffolding.
One stale doc, three sub-hour bugs, one decision. Two or three focused sessions from done.
