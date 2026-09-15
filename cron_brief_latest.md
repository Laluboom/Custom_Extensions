# Custom_Extensions — review 2026-09-15

## What I looked at

All of it — the repo is ~1000 lines of JS across five extension folders, so I read every
source file end to end rather than skimming: both Waitlist content scripts, the 312-line
`Auto_Scroll_shorts/content.js`, the 360-line playback panel plus its background worker, the
79-line Ctrl+Click handler, all six manifests, and the README / reference / todo. `node --check`
passes on all seven JS files. I also probed the two target sites: `mindvideo.ai` answers 200,
`goku.sx` returned nothing (connect timeout — unreachable from here, which is suggestive but
not proof it's gone).

No commits since the folder-rename on 2026-05-30, and none of the eight items from the May
todo list were started. That's fine for a hobby toolkit that works, but it does mean the
previous list had gone stale in one specific way: item 3 asked me to start `Remove_Sponsors`,
and that directory doesn't exist — it was never committed. Both the README and the old
reference.md describe it as if it were sitting there empty.

**I did not manage a browser check.** I tried: I built a harness page wrapping the Chrome
waitlist script with a `MutationObserver` tick counter, intending to load it in Windows
headless Chrome. The scratchpad is on a WSL path Chrome can't read, and I can't create a
staging directory under `/mnt/c`. I time-boxed it and stopped. The headline finding below is
from reading the code and the microtask-drain semantics, not from watching it happen.

## What I found

**The Chrome waitlist badge feeds its own observer.** `Waitlist_Display_Chrome/content.js:88`
writes `displayElement.innerHTML` unconditionally on every `updateDisplay()`. The observer at
`:120-125` watches `document.documentElement` with `childList + subtree + characterData`, and
the badge lives in `document.body` — so the write is a mutation the observer sees. Observer
delivery is a microtask, and microtasks queued *during* a drain run in that same drain, so
this never yields to the event loop. As long as "Est. wait" is on the page, the tab spins.
The title write two lines up at `:82` is guarded by an equality check; the innerHTML write
isn't. That asymmetry is the whole bug, and it's a five-line fix.

**Ctrl_Click_New_Tab overreaches.** It's the tidiest file in the repo, but `content.js:39-40`
matches `a[href]` *before* any of the SPA fallbacks — so ordinary links, which the browser
already handles fine, get routed through `window.open(url, "_blank")`. Native Ctrl+Click opens
a background tab; `window.open` focuses it. On `<all_urls>`, that means every normal Ctrl+Click
anywhere on the web now steals focus. And `<a href="">` — a very common SPA button — falls
through to `anchor.href`, resolves to the current page, and opens a duplicate of where you
already are. The extension should only touch the `data-href` / `formaction` / `onclick` cases
at `:42-54`, which is why it was written in the first place.

**The Waitlist fork has drifted both directions.** Chrome's regex only matches "person", so it
goes blank the moment the site says "2 people" — Firefox fixed that at `content.js:5` and the
fix never came back. Firefox, meanwhile, puts a naked digit in the tab title where Chrome
renders `⏳ N`. They also match different URL scopes. Each fork holds a fix the other lacks;
that's the structural loose end.

## What I'm proposing

Two bug fixes first (waitlist loop, Ctrl+Click scope), then the 15-minute quick win — the
speed controller has no toolbar `default_icon` even though the toolbar button is the *only*
way to open the panel, and its `playback.png` is declared under the `"128"` key while actually
being 24×24. Then collapse the Waitlist fork into one shared `content.js` copied into both
manifest folders. No build script: it's two files, a Makefile would be theatre. Last, fix the
README, which currently tells a new user to load a folder whose name changed in `e495b44`.

I deliberately dropped the old "unified extension manager popup" idea. Five independent
single-purpose extensions don't need a shared messaging contract — that's more architecture
than this suite can carry. I also demoted the old top item (replace the 1 s `setInterval` with
a MutationObserver): it's a perf nit on an otherwise-idle timer. The sharper version of that
concern is that `background.js:9-20` re-injects `content.js` with no re-entry guard, which
would give you two intervals and two keydown listeners — and `]` stepping speed by 0.2x.

**Verdict: closer to finished than not.** Nothing has rotted, nothing needs rebuilding. Roughly
two focused hours of fixing code that already exists, and this is done.
