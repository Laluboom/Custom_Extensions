# Daily review — Custom_Extensions (2026-10-10)

## What I looked at

All 17 tracked files: every `content.js`, both background scripts, all five manifests, the
README, and the three review artifacts from 2026-09-27. Then live checks — `curl` against
`goku.sx` and both `mindvideo.ai` paths, `node --check` on all 7 JS files, and a node
comparison of the two waitlist regexes against realistic queue strings.

**No browser.** These are unpacked extensions with no build step and no dev server, so there
is no localhost to serve. The two things a browser would actually settle — whether
`mindvideo.ai` renders the queue string the way the regex expects, and whether YouTube resets
`playbackRate` across SPA navigation — both need a logged-in session that headless Chrome
can't stand in for. I verified what was verifiable without one.

## What shipped since last review

`2d8b09f` fixed the `Ctrl_Click_New_Tab` anchor branch, which was the headline item. I
re-traced all four paths against the current `content.js:39-43` rather than taking the commit
message's word for it: plain `<a href="/page">` now returns `null` and defers to the browser
(no more focus steal on `<all_urls>`), `<a href="#" onclick="…">` falls through to the onclick
extractor at `:57`, `javascript:` falls through, and `href=""` no longer resolves to the
current page. It's correct in both directions, and that makes `Ctrl_Click_New_Tab` the only
extension in here with no open defect.

The `[QUICK WIN ~15min]` README item from that same list was **not** touched — `2d8b09f` is
the only code commit since. It's still on the list, still 15 minutes.

## What I found

**The top item is new, and it means one extension is broken most of the time.**
`Waitlist_Display_Chrome/content.js:73` matches `/Est\.\s*wait:\s*(\d+)\s*person/i` — no
`people` alternation. Firefox got this right at `content.js:5`. I ran both against four
strings in node:

```
"Est. wait: 1 person"               chrome= 1          firefox= 1
"Est. wait: 2 people"               chrome= NO MATCH   firefox= 2
"Est. wait: 12 people"              chrome= NO MATCH   firefox= 12
"Est. Wait: 3 People ahead of you"  chrome= NO MATCH   firefox= 3
```

So the Chrome build — the one with the badge, the one that stays installed, since Firefox
temporary add-ons die on restart — works only when exactly one person is ahead of you.
Every other time it silently does nothing, which is the failure you'd never report: it just
looks like the site isn't queueing you. Two-minute edit. Chrome's scraper is also the
expensive one (undebounced observer at `:130-135`, full-subtree `textContent` off every
`span, div, p, li` with no cap at `:69-77`) while Firefox has both fixes, so the task is
"port Firefox's `extractWaitNumber` into Chrome, keep Chrome's ⏳ title and badge, copy the
result back" — one file, two folders, no build tooling.

**The speed controller forgets its own setting on every YouTube navigation.**
`playback_speed_controller/content.js:344-358` applies `yts-saved-speed` exactly once, via a
500 ms interval that clears itself on the first `<video>` it finds. YouTube navigates by
History API; the content script doesn't re-run. Meanwhile the 1 s interval at `:328-341`
reads `video.playbackRate` *into* the number input but never writes the saved speed back —
so the panel's job, in code, is to watch your 2x get reset and faithfully display `1.00`.
Honest caveat: YouTube sometimes reuses the same `<video>` node across watch pages, so the
reset is inferred from the code path, not observed. Worth one browser tab before building it.
If it turns out not to reset, the task collapses to the `<video>` gate — `manifest.json:17`
matches all of `*://*.youtube.com/*` and `createUI()` never checks for a video, so the glass
panel floats over the homepage, search and subscriptions too.

**A race that produces an undismissable panel.** `createUI()`'s existence guard is at `:180`,
the `await chrome.storage.local.get` at `:186`, the `appendChild` not until `:274`. The 1 s
interval firing while you click the toolbar (which routes to `createUI()` at `:322`) gets two
panels through the guard. Two consequences: the keydown handler registers inside `createUI`
at `:293` so `]` starts stepping 0.2x, and `getElementById` returns only the first panel, so
the toggle at `:312-320` can't dismiss the duplicate short of a reload. A `creatingUI` flag
before the await fixes it in 15 minutes.

**And a decision that isn't mine to make.** `goku.sx` timed out again today — `http_code
000`, 12 s, zero bytes. That's three consecutive reviews across 25 days, with DNS resolving
to Cloudflare every time and the stall mid-TLS-handshake, which reads as a network block
rather than a dead domain. That's exactly why I can't settle it and Visesh can, in one tab.
It's holding a real bug hostage: `Auto_Scroll_shorts/content.js:284` polls
`tryClickNextOverlayButton` every 1300 ms with no check of `currentTime`, `duration` or
`ended`, and `debounceReady()`'s 1200 ms window can't throttle a 1300 ms poll — so on a
series page it clicks "Next Episode" ~1.3 s after arrival and walks the series in seconds.
If the site loads, delete the `:284` call and leave `onPlaybackEnded` as the only caller. If
it doesn't, delete the Goku half (`:121-286` plus the manifest match) and keep a clean
~140-line Shorts auto-advancer. On three reviews of evidence, the second is likelier.

## Verdict

Close to finished, and the loop is working — three fixes in two cycles. What's left is one
broken feature, one unmade decision, and a surprising amount of docs debt: roughly half the
remaining items are README, not code. The single install instruction in that file has pointed
at a folder renamed back in May for two review cycles running, and it's the only thing
standing between this and something another person could install. `mindvideo.ai` answered 200
today, so the waitlist extension is still worth fixing. No dependency rot, no syntax rot —
979 lines of vanilla JS and every remaining issue is logic, config or prose.
