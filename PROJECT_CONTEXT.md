# SonaFrame — Project Context

## 1. Project Identity

Project name: SonaFrame
Repository: https://github.com/AriIzuP/SonaFrame
Live website: https://ariizup.github.io/SonaFrame/
Current version: 0.1.0
Current phase: Phase 0 — Foundation (initial testing completed by user; cleanup and verification remain)
Next development phase: Phase 1 — MIDI Import and Inspection

Description:
SonaFrame is a lightweight, phone-friendly creative
music application for MIDI processing, visualization,
lyric assistance, tuning planning, and music-video
creation.

The application must not be restricted to Teto, UTAU,
Vocaloid, or a particular music producer.

## 2. Target Environment

Primary target device:
- Android 7.1.1
- Approximately 2 GB RAM
- Limited internal storage
- Limited mobile data
- Browser-based access
- Offline-friendly operation

Development environment:
- Android phone
- anWriter HTML Editor
- Chrome browser
- GitHub repository for source control

Technology:
- HTML
- CSS
- Vanilla JavaScript
- Progressive Web App (PWA)
- Local-first design where practical

Design priorities:
1. Keep the application lightweight.
2. Minimize unnecessary dependencies.
3. Avoid unnecessary network requests.
4. Preserve offline functionality.
5. Make controls usable on a phone.
6. Avoid features that consume excessive RAM.
7. Test compatibility on the actual target device.

## 3. Official Roadmap

Phase 0 — Foundation:
Initial interface, project structure, responsive styling,
PWA manifest, service worker, and documentation.

Phase 1 — MIDI Import and Inspection:
Allow users to select MIDI files and inspect basic
information such as tracks, tempo when available,
duration when calculable, and note events.

Phase 2 — MIDI Editing and Export:
Merge MIDI files, arrange MIDI sections sequentially
or simultaneously, and export MIDI files.

Phase 3 — MIDI Visualizer:
Piano roll or falling-note visualization, playback
controls, colors, zoom, and lightweight effects.

Phase 4 — Local Project Management:
Save and reopen projects locally, with clear handling
of browser storage limitations.

Phase 5 — Lyric Editor:
Create and edit lyrics and organize lyric sections.

Phase 6 — Lyric Assistance:
Japanese mora support, multilingual syllable helpers,
and configurable lyric profiles.

Phase 7 — Tuning Planner:
Plan vocal tuning and provide verified tuning-related
exports where technically possible.

Phase 8 — MIDI-Based MV:
Create music-video arrangements from MIDI data.

Phase 9 — Illustrated and Hybrid MV:
Combine illustrations, lyrics, MIDI visualization,
and other visual elements.

Phase 10 — Video Export and Optimization:
Export video where feasible, optimize performance,
test compatibility, and improve the application.

Do not skip prerequisites without documenting
the reason and impact.

## 4. Current File Structure

Expected project structure:

SonaFrame/
- index.html
  Main application interface and PWA entry point.

- styles.css
  Responsive interface styling.

- app.js
  Application interactions and Service Worker
  registration logic.

- manifest.webmanifest
  PWA metadata and icon declaration.

- sw.js
  Service Worker and application-shell caching.

- icon.svg
  Intended application icon filename.

- PROJECT_CONTEXT.md
  Project status, roadmap, decisions, testing,
  and instructions for future development.

IMPORTANT:
The repository was previously inspected and the icon
file was found under the filename icon.svg.html,
while index.html and manifest.webmanifest reference
icon.svg.

The filename mismatch must be corrected.
Do not assume this issue is fixed until the repository
and deployed website have been checked again.

## 5. Implemented in Version 0.1.0

The initial foundation includes:
- Application branding.
- Initial interface and feature overview.
- Responsive CSS styling.
- Basic navigation and interface interactions.
- Online/offline connection indicator.
- PWA manifest.
- Initial Service Worker implementation.
- Initial SVG icon content.
- GitHub repository and public deployment.
- Project documentation.

## 6. Confirmed User-Reported Results

The user reports that:
- The website is published successfully.
- The website opens at the GitHub Pages address.
- The page appears normal and visually satisfactory.
- The application can be added to the phone's home screen.
- The application can be opened offline.
- Chrome's Desktop site option was enabled, and the
  user reports that the resulting appearance is good.

These results are based on user-reported testing.

Further testing is still needed to determine:
- Whether the Service Worker installed successfully.
- Which files are cached for offline startup.
- Whether all application features work offline.
- Whether the interface also works correctly with
  Chrome's Desktop site option disabled.
- Whether the icon and manifest references resolve.
- Whether offline behavior persists after clearing
  browser data or reinstalling the application.

Do not claim these additional checks have passed
until they have actually been performed.

## 7. Not Implemented Yet

The following features have not been confirmed as
implemented:

- MIDI import and parsing.
- MIDI track inspection.
- MIDI playback.
- MIDI merging.
- Sequential MIDI arrangement.
- MIDI export.
- MIDI visualizer.
- Lyric editor.
- Mora analysis.
- Syllable analysis.
- Tuning assistance.
- Voicebank integration.
- MV timeline.
- Video rendering and export.
- Complete local project persistence.

Do not present planned features as working features.

## 8. Outstanding Issues

### Issue 1 — Icon filename mismatch

Previously observed:
- Actual repository filename: icon.svg.html
- Expected filename: icon.svg
- References in index.html and manifest.webmanifest:
  icon.svg

Next action:
Rename the existing icon file to icon.svg.
Preserve its SVG content.
Check the references in index.html and
manifest.webmanifest afterward.

### Issue 2 — PWA and offline verification

The user reports successful offline access.

Next action:
Verify the deployed application, Service Worker,
cached files, and offline startup without disrupting
the currently working version.

### Issue 3 — Mobile and desktop layout

The user reports that the layout looks good with
Chrome's Desktop site option enabled.

Next action:
Check the regular mobile-browser layout as well.
Preserve both layouts where practical.

## 9. Development Rules

- Implement one roadmap phase at a time.
- Inspect the latest source before modifying it.
- If the latest source is unavailable, ask the user
  to provide the complete current file.
- Provide complete replacement files where practical.
- Identify each filename and its location.
- Prefer complete copy-pasteable code.
- Preserve existing working functionality.
- Minimize dependencies and network requests.
- Optimize for low-memory Android devices.
- Explain compatibility limitations honestly.
- Never claim an untested feature works.
- Update this document after significant progress.
- Keep a record of known bugs and test results.
- Do not assume that a previous preview guarantees
  the deployed application works identically.
- Never claim a GitHub commit or upload occurred
  unless it actually happened.

## 10. Version History

### 0.1.0 — Initial Foundation

Created:
- Initial application interface.
- CSS styling.
- Basic JavaScript interactions.
- PWA manifest.
- Service Worker implementation.
- Initial SVG icon content.
- Project documentation.

Deployment:
- Published using GitHub Pages.
- Public website:
  https://ariizup.github.io/SonaFrame/

User-reported tests:
- Online access: successful.
- Home-screen addition: successful.
- Offline opening: successful.
- Visual appearance with Desktop site enabled:
  satisfactory.

Remaining:
- Correct the icon filename mismatch.
- Verify Service Worker and offline behavior.
- Check the regular mobile layout.
- Begin MIDI import after the foundation cleanup.

## 11. Next Tasks

Recommended order:

1. Update and commit this project context document.
2. Rename icon.svg.html to icon.svg.
3. Verify the icon references in the manifest
   and HTML.
4. Recheck the deployed website.
5. Verify Service Worker and offline behavior.
6. Check the regular mobile layout.
7. Begin Phase 1: MIDI import and inspection.

Phase 1 initial goals:
- Select a MIDI file from phone storage.
- Read MIDI file data locally.
- Display basic file information.
- Inspect tracks and note events.
- Display tempo when available.
- Calculate duration when the MIDI data allows it.
- Handle invalid or unsupported files gracefully.
- Avoid uploading private MIDI files to a server.
- Keep processing lightweight for the target phone.

Do not begin by implementing every MIDI feature at
once. Start with reliable file selection and basic
inspection, then expand incrementally.

## 12. Instructions for a New Conversation

Read this document first, then inspect the latest
relevant source files in the repository.

Use this document as the primary project status
reference, but verify important details against
the current source.

Determine:
- The current development phase.
- The latest known working version.
- The current file structure.
- Confirmed test results.
- Outstanding issues.
- The next task.

Continue from the current state without restarting
the project or unnecessarily replacing working code.

The project owner works primarily from an Android
phone and prefers complete, copy-pasteable files
instead of fragmented code snippets.

Prioritize stability, low resource consumption,
offline usability, and incremental development.
