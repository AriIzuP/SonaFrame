SonaFrame — Project Context

1. Project Identity

Project name: SonaFrame
Repository: AriIzuP/SonaFrame
Deployment: GitHub Pages
Primary goal: Build a lightweight, mobile-first, offline-first music creation workspace that can eventually become an Android APK.

SonaFrame aims to bring several music-production workflows into one application, reducing the need to switch between separate apps.

The application is intended for music creators working with:

- MIDI composition and editing
- MIDI visualization and playback
- Lyrics and songwriting
- Vocal tuning workflows
- Music-video creation
- Local music project management

SonaFrame is not restricted to Kasane Teto, UTAU, Vocaloid, or any particular music producer.

The interface currently uses English to support international users.

2. Target Environment

Primary development device

- Device: OPPO A71 CPH1717
- Operating system: Android 7.1.1
- RAM: 2 GB
- Internal storage: 16 GB
- Development environment: Android phone
- Source editing: GitHub through a mobile browser or app
- No laptop or desktop computer currently available

Main constraints

- Limited RAM and storage
- Limited mobile data
- Need for offline access
- Older Android and browser compatibility
- Touchscreen-first interaction
- Avoiding unnecessarily large files and dependencies

Technology

- HTML
- CSS
- Vanilla JavaScript
- Progressive Web App (PWA)
- Service Worker caching
- Browser APIs for local file processing
- Local storage where appropriate

Design principles

1. Keep the application lightweight.
2. Prefer local processing over server uploads.
3. Avoid unnecessary external dependencies.
4. Preserve existing working features.
5. Support offline use whenever technically possible.
6. Use mobile-friendly controls.
7. Avoid unnecessarily memory-intensive processing.
8. Test compatibility on the actual target device.
9. Keep the project modular, with separate JavaScript files for independent tools.
10. Work toward Android APK compatibility without sacrificing the existing web application.

3. Development Workflow

The project owner and assistant collaborate as follows:

1. The assistant inspects the latest source code available in the GitHub repository.
2. The assistant proposes and writes the code in the conversation.
3. The project owner copies the code into GitHub and commits the changes.
4. The project owner tests the deployed application on the phone.
5. The assistant helps troubleshoot issues and prepares the next feature.

The assistant must not claim to have edited, uploaded, or committed files directly unless that action actually occurred.

Code delivery rules

- Prefer complete, copy-pasteable code for new files.
- Identify the exact filename and required location.
- For small changes to existing files, specify exactly what to add or change.
- Do not replace an entire working file unnecessarily.
- Inspect the latest source before modifying existing logic.
- Do not assume a change was saved merely because code was provided.
- Distinguish user-reported success from independently verified behavior.

4. Current Development Status

Current development focus: Expanding the music-production toolset.

Latest confirmed user report: The user reports that the Lyric Assistant and MIDI Transpose additions were successful.

The interface has changed as new tools have been added. Visual redesign is intentionally postponed until later so development can focus on the planned features first.

The exact overall application version has not been independently confirmed. Individual files maintain their own version comments where available.

Completed foundation

- Initial application interface
- Responsive CSS styling
- PWA manifest
- Service Worker
- Application-shell caching
- Online/offline status interface
- GitHub Pages deployment

Implemented music tools

MIDI Import and Inspection

The existing application includes MIDI inspection functionality in "app.js".

The inspection workflow includes information such as:

- MIDI tracks
- Tempo when available
- Duration when calculable
- MIDI note events

The existing MIDI processing logic should be preserved when adding new tools.

MIDI Merge

The "midi-merge.js" module adds a MIDI Merge tool.

Its purpose is to combine MIDI files and provide an exported MIDI result.

The implementation is separate from the main application engine.

MIDI Visualizer

The "midi-visualizer.js" module adds a MIDI visualization tool.

The project has included a piano-roll-style visualization workflow and playback-related controls.

Preserve its existing behavior when modifying the interface or adding MIDI processing features.

The exact compatibility and performance of every visualization mode should be verified through testing on the target device.

Lyric Assistant

The "lyric-assistant.js" module adds a lightweight lyric-writing workspace.

Planned and implemented functionality includes:

- Editing lyrics
- Organizing lyrics by song section
- Counting characters, words, and lines
- Saving a draft locally
- Copying lyric text
- Exporting lyrics as a TXT file

The user has reported successful implementation.

Japanese mora counting is not yet confirmed as implemented.

MIDI Transpose

The "midi-transpose.js" module adds MIDI pitch transposition.

Its functionality includes:

- Selecting a local MIDI file
- Transposing note pitches by semitones
- Supporting positive and negative values
- Supporting transpose amounts from -24 to +24 semitones
- Preparing a separate MIDI file for download
- Displaying file and processing information
- Processing MIDI data locally without uploading the selected file

The implementation attempts to preserve timing, tempo events, track structure, and other MIDI events while changing Note On and Note Off pitch values.

Notes outside the valid MIDI pitch range of 0–127 are clamped to the nearest boundary.

The user has reported successful implementation. Full compatibility with every MIDI file variant still requires testing.

5. Current Repository Structure

The relevant application files include:

- "index.html"
  
  - Main application interface
  - Application entry point
  - Script loading

- "styles.css"
  
  - Main responsive interface styling
  - Existing visual theme and layout

- "app.js"
  
  - Core application interactions
  - MIDI inspection logic
  - Application initialization and related functionality

- "midi-merge.js"
  
  - MIDI Merge tool

- "midi-visualizer.js"
  
  - MIDI Visualizer tool

- "lyric-assistant.js"
  
  - Lyric-writing workspace

- "midi-transpose.js"
  
  - MIDI Transpose tool

- "sw.js"
  
  - Service Worker
  - Offline application-shell caching
  - Cache version management

- "manifest.webmanifest"
  
  - PWA metadata

- "icon.svg"
  
  - Intended application icon

- "PROJECT_CONTEXT.md"
  
  - Project vision, implementation status, roadmap, decisions, and development instructions

Always inspect the latest repository before assuming that every listed file exists or that its contents match an earlier version.

6. Service Worker and Offline Support

The Service Worker is implemented in "sw.js".

Its intended behavior includes:

- Caching application-shell files
- Removing outdated SonaFrame caches
- Claiming active clients
- Network-first navigation with a cached-page fallback
- Cache-first handling for local application assets

The cache version was previously updated as new application features were added.

The MIDI Transpose integration requires the application cache version to be updated to "sonaframe-shell-v0.8.0" and "./midi-transpose.js" to be included in the application file list.

The latest committed version must be checked before making additional cache changes.

Offline requirements

When adding a new tool:

1. Add its script to "index.html".
2. Add the script path to the Service Worker's application file list.
3. Update the cache version.
4. Test the tool while online.
5. Allow the Service Worker to install or update.
6. Test the application offline.
7. Confirm that previously working tools still load.

Do not assume that offline functionality works merely because the main page opens without an internet connection.

Android APK consideration

The current application is web-based.

A future Android APK may require a separate native packaging and offline strategy. A browser Service Worker alone must not be assumed to provide all functionality in every Android WebView configuration.

7. Official Development Roadmap

The roadmap may evolve as features are implemented. Preserve working functionality and document changes to the order of development.

Stage 0 — Foundation

Status: Implemented.

- Initial interface
- Responsive styling
- PWA foundation
- Service Worker
- Basic application interactions
- GitHub Pages deployment

Stage 1 — MIDI Import and Inspection

Status: Implemented in the existing application; additional testing may be needed.

- Select MIDI files
- Inspect MIDI data
- Display basic file information
- Inspect note events and tracks
- Read tempo and duration when available

Stage 2 — MIDI Merge

Status: Implemented.

- MIDI Merge tool
- MIDI file combination workflow
- MIDI export

Additional MIDI arrangement improvements can be considered later.

Stage 3 — MIDI Visualizer

Status: Implemented.

- MIDI visualization module
- Piano-roll-style visualization
- Visualization controls and related playback workflow

Continue testing performance on low-memory Android hardware.

Stage 4 — Lyric Assistant

Status: Implemented; user reports success.

- Lyric editing
- Song-section organization
- Character, word, and line counters
- Local draft saving
- Copying lyrics
- TXT export

Future improvements may include Japanese mora counting and lyric-to-MIDI workflow integration.

Stage 5 — MIDI Toolbox

Status: In progress.

Implemented tools:

- MIDI inspection
- MIDI Merge
- MIDI Visualizer
- MIDI Transpose

Next proposed tool:

- MIDI Splitter

Potential future tools:

- Improved MIDI information display
- Track separation
- MIDI pitch and note editing
- Other lightweight MIDI utilities

New tools should be implemented incrementally and should not duplicate functionality already available.

Stage 6 — Local Project Management

Planned.

- Save and reopen local projects
- Organize project files
- Preserve relevant settings
- Handle browser storage limitations safely

Stage 7 — Music Player and Workspace Integration

Planned.

- Integrate relevant music-production tools
- Improve workflow between MIDI, lyrics, and audio
- Add useful playback and project controls
- Keep the application responsive

Stage 8 — Vocal Workspace

Planned.

- Vocal-production workflow
- Tuning planning
- Lyric and note coordination
- Verified import/export capabilities where technically possible

Do not promise direct support for specific voicebanks or external applications until compatibility has been tested.

Stage 9 — MIDI-Based MV Maker

Planned.

- Use MIDI data to drive music visualization
- Arrange visual elements
- Coordinate music and animation
- Support lightweight visual effects

Stage 10 — Illustrated and Hybrid MV

Planned.

- Combine illustrations, lyrics, and MIDI visualization
- Arrange visual assets
- Coordinate visual timing with music

Stage 11 — Video Export and Optimization

Planned.

- Investigate feasible video export methods
- Optimize memory use
- Improve compatibility
- Test realistic project sizes on the target device

Stage 12 — Android APK

Long-term goal.

- Package SonaFrame for Android
- Preserve offline-first behavior
- Test WebView compatibility
- Review local file access and download behavior
- Optimize performance for older phones

Do not skip technical prerequisites without recording the reason and consequences.

8. Known Constraints and Outstanding Checks

Low-memory performance

The target device has approximately 2 GB RAM and limited storage.

Avoid:

- Large external libraries without a strong reason
- Unnecessary audio or video buffers
- Excessive simultaneous animations
- Loading large assets by default
- Repeated parsing of the same large MIDI file
- Keeping unnecessary copies of large files in memory

Prefer lightweight processing and clear feedback during long operations.

MIDI compatibility

MIDI files can contain different formats, event types, timing systems, and track structures.

Every MIDI tool should:

- Validate input data
- Handle malformed files gracefully
- Preserve original data when possible
- Avoid silently corrupting unsupported structures
- Explain important limitations
- Keep the original file unchanged

Do not claim universal MIDI compatibility without testing.

File downloads

Downloads may behave differently between Chrome, installed PWAs, and Android WebView.

Test export functionality on the actual target device. If a download fails, inspect the implementation and browser behavior before replacing working MIDI-processing code.

Visual layout

The current layout has evolved as new feature cards and panels were added.

The user has explicitly chosen to postpone substantial visual polishing until later.

For now:

- Prioritize features.
- Keep controls usable.
- Avoid breaking existing layout behavior.
- Make only necessary styling changes.
- Schedule broader visual refinement after the core tools are in place.

Icon and PWA verification

The icon filename and manifest references were previously identified as an issue in an older project snapshot.

The current repository must be checked before deciding whether this issue remains unresolved.

Do not assume the old mismatch still exists or claim it has been fixed without checking the latest files.

9. Development Rules

1. Inspect the latest source before modifying existing files.
2. Implement one focused feature at a time.
3. Preserve working functionality.
4. Prefer complete, copy-pasteable files for new modules.
5. Make minimal edits to existing files when appropriate.
6. Keep JavaScript modules separate where practical.
7. Avoid unnecessary dependencies.
8. Prioritize offline use and local processing.
9. Optimize for Android 7.1.1 and low-memory devices.
10. Explain limitations honestly.
11. Test both new features and previously working features.
12. Update this document after significant progress.
13. Distinguish planned functionality from implemented functionality.
14. Never claim a commit, deployment, or test occurred unless confirmed.
15. Do not restart the project unnecessarily.
16. Keep the existing web application functional while preparing for eventual APK packaging.

10. Development History

Foundation

Created the initial web application, basic styling, PWA configuration, and Service Worker.

The user reported successful deployment and offline opening during early development.

MIDI Tools

Added MIDI inspection, MIDI Merge, and MIDI visualization modules.

These tools established the initial music-production workflow.

Lyric Assistant

Added a lyric-writing workspace with section organization, counters, local draft handling, copying, and text export.

The user reported successful implementation.

MIDI Transpose

Added a standalone MIDI transposition module.

The user reported successful implementation.

Current direction

The project is now focused on expanding the actual music-production features.

The user has chosen to postpone major visual redesign until the core planned features have progressed further.

11. Next Tasks

Recommended immediate order:

1. Verify the latest repository state.
2. Confirm that "midi-transpose.js" is loaded by "index.html".
3. Confirm that "sw.js" includes the new file and the correct cache version.
4. Test MIDI Transpose with several MIDI files.
5. Verify that MIDI Merge, MIDI Visualizer, and Lyric Assistant still work.
6. Test offline loading and file export on the phone.
7. Begin the next Stage 5 tool: MIDI Splitter.
8. Update this document after each significant implementation.
9. Continue toward local project management, workspace integration, MV creation, and eventual APK packaging.

MIDI Splitter initial goals

- Select a MIDI file locally.
- Inspect its tracks.
- Allow the user to choose a track to extract.
- Export a separate MIDI file for the selected track.
- Preserve relevant timing and track events.
- Handle malformed or unsupported files gracefully.
- Avoid modifying the original file.
- Keep memory usage low.
- Test the exported MIDI file in a MIDI editor.

Before implementing MIDI Splitter, inspect the current MIDI parser and MIDI Transpose code. Reuse only logic that is suitable and verified.

12. Instructions for Future Conversations

At the beginning of future SonaFrame development sessions:

1. Read this document.
2. Inspect the latest relevant files in the GitHub repository.
3. Confirm the current state rather than assuming it matches this document.
4. Identify the most useful next feature.
5. Preserve existing functionality.
6. Provide the code in the conversation for the project owner to copy into GitHub.
7. Explain precisely which files need to be created or changed.
8. Ask the project owner to test the changes on the phone.
9. Record the results and update this document after meaningful progress.

The project owner primarily develops from an Android phone and prefers complete, copy-pasteable code rather than fragmented snippets.

Primary development priorities: Stability, lightweight performance, offline usability, useful music-production features, and incremental progress toward an Android APK.
