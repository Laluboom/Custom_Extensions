# Custom Browser Extensions

A collection of utility browser extensions for YouTube, Goku Series, and general browsing.

## Extensions Overview

### 1. Playback Speed Controller
- **Description:** Take full control of video playback speed on YouTube.
- **Features:**
  - Floating draggable panel.
  - Custom number input (0.1x to 16.0x).
  - Quick slider (0.25x to 4.0x).
  - Preset speed pills.
  - **Hotkeys:**
    - `[`: Decrease speed by 0.1x.
    - `]`: Increase speed by 0.1x.
  - Click the toolbar button to show or hide the floating panel.
- **Security:** Uses `chrome.storage.local` for persistence and secure DOM manipulation.

### 2. Auto-Advance (YouTube Shorts + Goku Series)
- **Description:** Automatically moves to the next video on supported platforms.
- **Platforms:** `youtube.com/shorts`, `goku.sx`.
- **Usage:** Ideal for hands-free viewing of short-form content or series. Press `Ctrl+Shift+Y` to turn auto-advance off (and back on).

### 3. Ctrl Click Opens New Tab
- **Description:** Forces `Ctrl + Left Click` to open links in a new tab, even on sites with custom SPA routing that usually breaks this behavior.
- **Usage:** Works on all URLs.

### 4. Queue Wait in Tab Title (Chrome & Firefox)
- **Description:** Displays the estimated wait number directly in the browser tab title for `mindvideo.ai`.
- **Versions:** Separate builds for Chrome (Manifest V3) and Firefox.
- **Usage:** Monitor your queue position without keeping the tab active.

---

## Future ideas
- **SponsorBlock:** Research the SponsorBlock API for identifying and skipping sponsor segments in videos.

---

## Installation Guide

### For Chrome/Edge:
1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked**.
4. Select the specific folder for the extension you want to install (e.g., `playback_speed_controller`).

### For Firefox:
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select the `manifest.json` file inside the `Waitlist_Display_Firefox` folder.

---

See todo.md.
