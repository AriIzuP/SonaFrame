# SonaFrame — Project Context

## 1. Project Identity

Project name: SonaFrame
Current version: 0.1.0
Current phase: Phase 0 — Foundation
Status: Initial scaffold created; device testing pending.

Description:
A lightweight creative music application for MIDI
processing, music visualization, lyric assistance,
tuning planning, and music-video creation.

The project must not be restricted to Teto, UTAU,
Vocaloid, or a particular music producer.

## 2. Target Environment

Initial target:
- Android 7.1.1
- Device with approximately 2 GB RAM
- Limited internal storage
- Limited mobile data
- Browser-based access

Initial approach:
- HTML
- CSS
- Vanilla JavaScript
- Progressive Web App (PWA)
- Local-first design where practical

Compatibility must be tested on the actual target device.

## 3. Official Roadmap

Phase 0:
Foundation, initial interface, project structure,
PWA manifest, service worker, and documentation.

Phase 1:
MIDI import and basic file inspection.

Phase 2:
MIDI track merging, sequential MIDI arrangement,
and MIDI export.

Phase 3:
MIDI visualizer with piano roll or falling notes,
playback controls, colors, zoom, and lightweight effects.

Phase 4:
Local project management and persistence.

Phase 5:
Lyric editor and lyric timing tools.

Phase 6:
Lyric assistance, Japanese mora support,
multilingual syllable helpers, and configurable profiles.

Phase 7:
Tuning planner and verified tuning-related exports.

Phase 8:
MIDI-based MV creation.

Phase 9:
Illustrated MV and hybrid MV workflows.

Phase 10:
Video export, performance optimization,
compatibility testing, and final improvements.

Do not skip prerequisites without documenting
the reason and impact.

## 4. Current File Structure

SonaFrame/
- index.html
  Main application interface and PWA entry point.

- styles.css
  Responsive dark interface and layout styling.

- app.js
  Basic interface interactions, connection status,
  and Service Worker registration.

- manifest.webmanifest
  PWA metadata and initial icon declaration.

- sw.js
  Initial application-shell cache and offline fallback
  behavior for previously cached GET requests.

- icon.svg
  Initial application icon.

- PROJECT_CONTEXT.md
  Project status, decisions, roadmap, tests, and next task.

## 5. Implemented in Version 0.1.0

- Initial application branding.
- Responsive interface.
- Feature overview cards.
- Basic navigation between informational panels.
- Online/offline connection indicator.
- PWA manifest.
- Initial Service Worker cache implementation.
- Initial SVG icon.
- Project documentation.

## 6. Not Implemented Yet

- MIDI import.
- MIDI parsing.
- MIDI playback.
- MIDI merging.
- MIDI export.
- MIDI visualizer.
- Lyric editor.
- Mora analysis.
- Syllable analysis.
- Tuning assistance.
- Voicebank integration.
- MV timeline.
- Video rendering/export.
- Complete project persistence.
- Verified offline startup.

Do not present planned features as working features.

## 7. Testing Status

No actual-device test results recorded yet.

Pending tests:
1. Open the application through a suitable local server
   or HTTPS deployment.
2. Check the interface on the target Android browser.
3. Check that the feature cards fit the screen.
4. Test the Start Project button.
5. Test the About button.
6. Check console errors where developer tools are available.
7. Confirm Service Worker installation.
8. Confirm that required files are cached.
9. Test offline reopening after successful caching.
10. Check browser-specific PWA installation support.

Record actual results after testing.
Do not mark a test as passed without evidence.

## 8. Development Rules

- Implement one roadmap phase at a time.
- Inspect the latest code before modifying it.
- If the necessary latest source is unavailable,
  ask the user to provide it.
- Provide complete replacement files where practical.
- Identify each file and its location.
- Preserve existing working functionality.
- Minimize dependencies and unnecessary network requests.
- Optimize for low-memory devices.
- Explain compatibility limitations honestly.
- Do not claim untested features work.
- Update this file after significant changes.
- Encourage saving working versions to GitHub.
- Never claim a commit or upload occurred unless it did.

## 9. Version History

### 0.1.0 — Initial foundation

Created:
- Initial interface.
- CSS styling.
- Basic JavaScript interactions.
- PWA manifest.
- Initial Service Worker.
- SVG icon.
- Project context documentation.

Testing:
Pending actual-device verification.

## 10. Next Task

Complete Phase 0 verification.

After the user provides test results:
- Fix any startup or layout issues.
- Verify the Service Worker and offline behavior.
- Update this document with confirmed results.

Only after the foundation is sufficiently verified
should Phase 1 begin.

## 11. Instructions for a New Conversation

Read this document and inspect the latest relevant source files.

Use this document as the primary project status reference.

Do not assume the entire previous conversation is available.

First determine the current phase, latest known working
version, outstanding bugs, and next task.

Continue from that point without restarting the project
or replacing working functionality unnecessarily.