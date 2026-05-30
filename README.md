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
- **Security:** Uses `chrome.storage.local` for persistence and secure DOM manipulation.

### 2. Auto-Advance (YouTube Shorts + Goku Series)
- **Description:** Automatically moves to the next video on supported platforms.
- **Platforms:** `youtube.com/shorts`, `goku.sx`.
- **Usage:** Ideal for hands-free viewing of short-form content or series.

### 3. Ctrl Click Opens New Tab
- **Description:** Forces `Ctrl + Left Click` to open links in a new tab, even on sites with custom SPA routing that usually breaks this behavior.
- **Usage:** Works on all URLs.

### 4. Queue Wait in Tab Title (Chrome & Firefox)
- **Description:** Displays the estimated wait number directly in the browser tab title for `mindvideo.ai`.
- **Versions:** Separate builds for Chrome (Manifest V3) and Firefox.
- **Usage:** Monitor your queue position without keeping the tab active.

### 5. Remove Sponsors (Placeholder)
- **Status:** Empty directory.
- **Goal:** Future extension to identify and skip sponsor segments in videos.

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
3. Select the `manifest.json` file inside the `Waitlist Display Firefox` folder.

---

## TODO List & Future Enhancements

### General
- [ ] Implement a unified "Custom Extension Manager" popup to toggle all extensions from one place.
- [ ] Add `i18n` support for multiple languages.
- [ ] Standardize all icons across the suite.

### Playback Speed Controller
- [ ] Add more preset speed pills (e.g., 2.5x, 5.0x).
- [ ] Allow users to customize hotkeys in the options page.
- [ ] Smooth transition animations for the UI panel.

### Auto-Advance
- [ ] Add a "Toggle On/Off" button in the extension popup.
- [ ] Support more streaming platforms (e.g., Netflix, Prime Video).

### Remove Sponsors
- [ ] **Research:** Look into the SponsorBlock API for skipping segments.
- [ ] Implement basic skip logic for known patterns.

### Queue Wait Display
- [ ] Merge Chrome and Firefox versions into a single cross-browser codebase using a build script.
- [ ] Support custom site lists via an options menu.
