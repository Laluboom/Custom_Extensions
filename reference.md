# Custom_Extensions — reference

Five small, independent browser extensions. No build step, no dependencies, no package.json —
every one is a plain Manifest V3 content script you load unpacked. ~1,000 lines of JS total.

## The five

| Folder | What it does | Injected into |
|---|---|---|
| `playback_speed_controller/` | Draggable glass panel: 0.1x–16x number input, 0.25x–4x slider, preset pills, `[` / `]` hotkeys. Toolbar button toggles the panel. | `*://*.youtube.com/*` |
| `Auto_Scroll_shorts/` | Auto-advances at 99% progress and skips sponsored Shorts. Also an unverifiable Goku series auto-next. `Ctrl+Shift+Y` toggles. | `www.youtube.com/*`, `goku.sx/*` |
| `Ctrl_Click_New_Tab/` | Makes Ctrl+Click open a new tab on SPA-routed pseudo-links (buttons, `data-href`, `formaction`, `onclick`). Defers to the browser for real anchors. | `<all_urls>` |
| `Waitlist_Display_Chrome/` | Puts the queue wait number in the tab title (`⏳ N`) plus a bottom-right badge. | `www.mindvideo.ai/*` |
| `Waitlist_Display_Firefox/` | Same, title only, Gecko build. | `www.mindvideo.ai/text-to-video/*` |

## Install

Chrome/Edge: `chrome://extensions` → Developer mode → Load unpacked → pick one folder.
Firefox: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → pick
`Waitlist_Display_Firefox/manifest.json`.

There is nothing to run or test. The only check that applies is `node --check <file>.js` for
syntax; all 7 JS files pass as of 2026-11-09.

## Current state

**Working and basically finished.** The speed controller and `Ctrl_Click_New_Tab` do their jobs.
`Auto_Scroll_shorts`' Shorts half works. The waitlist pair shares a scraper since `8cf9e9f`, and
`8f538dd` fixed the README so the install instructions above are now actually correct — that was
the last thing blocking someone else from using this.

Three things keep it from being *done*:

1. **The Chrome waitlist badge leaves an invisible click-trap** once the queue clears — the
   inline `display: flex` is never reverted, so an `opacity: 0` box keeps hit-testing over
   `mindvideo.ai`. Same root cause permanently defeats the cheap text fast-path. Two-line fix.
2. **`WAIT_REGEX` has never been verified against the live DOM.** Both waitlist copies match
   `/Est\.\s*wait:\s*(\d+)\s*(?:person|people)/i`. The served HTML for `/text-to-video/` (193 KB)
   contains no "wait", "queue" or "people ahead" string at all — the queue UI is client-rendered
   behind auth, so this can only be confirmed by someone actually sitting in the queue.
3. **`goku.sx` is unreachable from this machine** — five consecutive reviews, 12 s timeout,
   `http_code 000`, stalling mid-TLS-handshake (reads as Cloudflare refusing this network rather
   than a dead domain). The Goku code contains a confirmed runaway-click bug that cannot be
   tested. Recommendation is now to delete that half; see `todo.md` task 2.

Known smaller gaps: the speed panel floats over non-video YouTube pages and forgets its speed on
every History-API navigation; the Firefox waitlist copy clobbers the SPA's own tab titles;
`Waitlist_Display_Chrome/service_worker.js` is a dead file still registered in its manifest.

## Conventions

- No `innerHTML` anywhere — UI is built with `createElement` / `textContent` throughout.
- Settings persist in `chrome.storage.local` under prefixed keys (`yts-saved-speed`,
  `yts-panel-pos`, `yts-is-visible`, `enabled`).
- Each extension is self-contained; there is deliberately no shared code or messaging layer
  between them.
- The two waitlist copies are intentional duplicates (Chrome MV3 vs Gecko), not a mistake — but
  they drift, so changes to one need porting to the other.

See `todo.md` for ranked work and `cron_brief_latest.md` for the latest review.
