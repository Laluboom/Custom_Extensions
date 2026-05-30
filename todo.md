# TODOs

1. **Replace `setInterval(createUI, 1000)` in `playback_speed_controller/content.js`** — the panel init loop fires every second on every YouTube page regardless of whether a video is present. Replace with a `MutationObserver` watching `document.body` for a `<video>` element being added (the same pattern Auto_Scroll_shorts already uses). Keeps the panel injection reactive rather than polling-based.

2. **Reconcile the two Waitlist Display versions** — Chrome and Firefox have diverged in opposite directions: Chrome has the floating badge but no debouncing and a noisy 1500ms poll; Firefox has debouncing and better performance optimisations but only updates the title with no badge. Merge the Firefox performance improvements (debounced observer, container-skip optimisation, 5000ms fallback) into the Chrome version, and add the floating badge to the Firefox version.

3. **Start `Remove_Sponsors`** — the directory is empty. The existing README references the SponsorBlock API (`sponsor.ajay.app`) as the approach. Begin with a proof-of-concept: fetch the segment list for the current YouTube video ID and `console.log` the returned skip intervals. No UI needed at this stage — just confirm the API call works before building skip logic.

---

## Future Ideas

4. **Add a popup toggle UI to Auto_Scroll_shorts** — currently the only way to disable auto-advance is the `Ctrl+Shift+Y` keyboard shortcut, which isn't discoverable. A simple popup (one checkbox, ten lines of HTML) would make the on/off state visible without needing to know the hotkey. The `enabled` state already persists in `chrome.storage.local`.

5. **Merge Waitlist Display into a single cross-browser build** — the two versions are nearly identical but maintained separately, so fixes made to one won't automatically apply to the other. A minimal build step (just a Makefile or shell script that copies shared logic into both manifest folders) would solve this without adding a bundler.

6. **Extend Auto_Scroll_shorts to other platforms** — the architecture already cleanly separates YouTube logic from Goku.sx logic with named platform checks. Adding Netflix, Prime Video, or Crunchyroll would follow the same pattern: a `isNetflixPage()` guard + a `findNextEpisodeButton()` selector specific to that site.

7. **Unified extension manager popup** — a single popup that shows the on/off state of all installed extensions in the suite and lets you toggle them from one place. Would require a shared messaging contract between the manager and each extension's content script — a useful architectural exercise and genuinely useful if you're regularly enabling/disabling extensions while browsing.

8. **Playback speed memory per site** — currently the saved speed in `playback_speed_controller` applies globally across all YouTube tabs. Could store speed per hostname (or per video type — shorts vs long-form) so rewatching shorts doesn't inherit the 2x speed you set for a lecture.
