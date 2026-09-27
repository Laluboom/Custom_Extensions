# Daily brief — Custom_Extensions (2026-09-27)

## What I looked at

All 19 files, which is the whole repo: every `content.js`, both background scripts, all five
manifests, the README, and the previous review's notes. 976 lines of vanilla JS. I also ran
`node --check` over all 7 JS files (all pass, no syntax rot) and curled the two sites these
extensions actually target.

**No browser check.** This is five unpacked extensions with no build step, so there's no dev
server to serve and nothing at localhost; loading MV3 extensions headlessly against
youtube.com or mindvideo.ai would need real logged-in sessions. I verified the external
dependencies over the network instead, which is the part that actually rots here.

## The good news first

Two of the five items from the 2026-09-15 list shipped and were verified: `8f99694` killed
the Waitlist Chrome observer loop (the `lastRenderedN` guard is now at `content.js:81,95-98`)
and `753dca6` gave the speed controller a real toolbar icon. I re-read both fixes and they
hold — the badge's `classList`/`style` writes are attribute mutations and the observer only
watches `childList`/`characterData`, so there's no path back into the loop. That's a genuine
change from the last review, where nothing on the list had been touched in four months.

## What I'm proposing, and why in this order

**The one that matters is `Ctrl_Click_New_Tab/content.js:39-40.`** I'd flagged the
over-firing half last time; reading it properly this time, that single `return` is wrong in
*both* directions, and one fix settles both. It intercepts plain `<a href>` links the browser
already handles — and since native Ctrl+Click opens a *background* tab while `window.open`
*focuses* the new one, this extension turns every ordinary Ctrl+Click on the entire web into
a focus steal. Meanwhile the same early return **shadows the SPA fallbacks at `:42-54`**:
`<a href="#" onclick="location.href='/x'">`, the exact pattern this extension was written
for, matches `a[href]`, gets `null` from `toAbsoluteUrl("#")`, and returns before the
`onclick` extraction is ever reached. It's ~4 lines to fix and it's running on `<all_urls>`,
so it's the highest-value change in the repo by a distance.

**Second, `Auto_Scroll_shorts/content.js:284`.** The overlay-button poll fires from a bare
1300 ms interval and checks *no playback position at all* — not `currentTime`, not
`duration`, not `ended`. It just finds a visible "Next Episode"-ish node and clicks it. The
1200 ms debounce is shorter than the 1300 ms poll, so it never throttles anything. On a Goku
series page that means it clicks ~1.3 s after load and chains through the series. But this
needs a decision from you first: **`goku.sx` timed out again today** — second time in 12
days. DNS resolves fine to Cloudflare and the stall is mid-TLS-handshake, so it's blocked
from this machine rather than dead, and I can't tell from here whether it works for you. One
browser tab settles it, and the answer changes the task completely: gate the poll behind
end-of-playback if the site lives, or delete ~165 lines if it doesn't.

**The quick win is the README.** `README.md:50` still tells you to load
`Waitlist Display Firefox` with spaces, but `e495b44` renamed that folder to underscores back
in May — so the single instruction a new user follows leads to a path that isn't there.
`:33-36` documents a `Remove_Sponsors` extension that has never existed, and `:54-77` is a
second todo list that now contradicts `todo.md`. Two control gaps are worth adding while
you're in there: `Ctrl+Shift+Y` is the *only* way to turn auto-advance off and appears
nowhere in the docs, and the README never says the speed panel is summoned by clicking the
toolbar button.

**Fourth, the Waitlist fork**, now with a sharper reason than "they've drifted": Chrome's
regex at `content.js:73` is `person`-only, so **the Chrome build silently shows nothing the
moment the queue reads "2 people"** — which is most of the time. Firefox has handled both
since forever at `:5`. Chrome's observer is also still undebounced, doing a full-document
text walk per mutation on a React app. Firefox, conversely, writes a bare digit with no
`⏳`. One shared `content.js` — Firefox's scraper plus Chrome's title format and badge —
copied into both folders. `mindvideo.ai` answered 200 today, so this is worth fixing.

**Fifth**, a rough edge you've probably been tolerating: the speed panel floats over the
YouTube *homepage*. `manifest.json:17` matches all of `*.youtube.com` with no path gate and
`createUI()` never checks that a `<video>` exists, so it decorates search, subscriptions and
history too. One-line early return. While in there, `createUI`'s existence check at `:180`
sits before an `await` and the append is at `:274` — two calls landing in that window build
two panels and register the keydown handler twice, which is why `]` would step by 0.2x.

## Verdict

Close to finished, and actually moving now. Four of five extensions are one small fix each
from done. The honest open question is `Auto_Scroll_shorts`: half of it targets a host I
can't reach, and if you can't either, the right move is deleting 165 lines rather than
debugging them.
