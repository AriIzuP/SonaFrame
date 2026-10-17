/*
Project: SonaFrame
File: app.js
Version: 0.2.0

Purpose:
- Application navigation
- MIDI file import and inspection
- Offline status monitoring
- Service Worker registration

MIDI files are processed locally in the browser.
No MIDI file is uploaded to a server.
*/

(function () {
    "use strict";

    /* =========================================
       ELEMENTS
    ========================================= */

    var connectionStatus =
        document.getElementById("connection-status");

    var startButton =
        document.getElementById("start-button");

    var aboutButton =
        document.getElementById("about-button");

    var openMidiButton =
        document.getElementById("open-midi-button");

    var workspacePanel =
        document.getElementById("workspace-panel");

    var aboutPanel =
        document.getElementById("about-panel");

    var midiPanel =
        document.getElementById("midi-panel");

    var closePanelButton =
        document.getElementById("close-panel-button");

    var closeAboutButton =
        document.getElementById("close-about-button");

    var closeMidiButton =
        document.getElementById("close-midi-button");

    var midiFileInput =
        document.getElementById("midi-file-input");

    var midiStatus =
        document.getElementById("midi-status");

    var midiResults =
        document.getElementById("midi-results");

    var midiFileName =
        document.getElementById("midi-file-name");

    var midiFileSize =
        document.getElementById("midi-file-size");

    var midiFormat =
        document.getElementById("midi-format");

    var midiTrackCount =
        document.getElementById("midi-track-count");

    var midiNoteCount =
        document.getElementById("midi-note-count");

    var midiTempo =
        document.getElementById("midi-tempo");

    var midiDuration =
        document.getElementById("midi-duration");

    var midiDetail =
        document.getElementById("midi-detail");


    /* =========================================
       CONNECTION STATUS
    ========================================= */

    function updateConnectionStatus() {
        if (!connectionStatus) {
            return;
        }

        connectionStatus.textContent =
            navigator.onLine ? "Online" : "Offline";
    }


    window.addEventListener(
        "online",
        updateConnectionStatus
    );

    window.addEventListener(
        "offline",
        updateConnectionStatus
    );

    updateConnectionStatus();


    /* =========================================
       PANEL NAVIGATION
    ========================================= */

    function hidePanels() {
        if (workspacePanel) {
            workspacePanel.hidden = true;
        }

        if (aboutPanel) {
            aboutPanel.hidden = true;
        }

        if (midiPanel) {
            midiPanel.hidden = true;
        }
    }


    function showPanel(panel) {
        if (!panel) {
            return;
        }

        hidePanels();

        panel.hidden = false;

        panel.scrollIntoView({
            behavior: "auto",
            block: "start"
        });
    }


    if (startButton) {
        startButton.addEventListener(
            "click",
            function () {
                showPanel(workspacePanel);
            }
        );
    }


    if (aboutButton) {
        aboutButton.addEventListener(
            "click",
            function () {
                showPanel(aboutPanel);
            }
        );
    }


    if (openMidiButton) {
        openMidiButton.addEventListener(
            "click",
            function () {
                showPanel(midiPanel);
            }
        );
    }


    if (closePanelButton) {
        closePanelButton.addEventListener(
            "click",
            function () {
                workspacePanel.hidden = true;
            }
        );
    }


    if (closeAboutButton) {
        closeAboutButton.addEventListener(
            "click",
            function () {
                aboutPanel.hidden = true;
            }
        );
    }


    if (closeMidiButton) {
        closeMidiButton.addEventListener(
            "click",
            function () {
                midiPanel.hidden = true;
            }
        );
    }


    /* =========================================
       MIDI HELPERS
    ========================================= */

    function readFourCC(bytes, offset) {
        return String.fromCharCode(
            bytes[offset],
            bytes[offset + 1],
            bytes[offset + 2],
            bytes[offset + 3]
        );
    }


    function readVariableLength(bytes, cursor) {
        var value = 0;
        var count = 0;
        var byte;

        do {
            if (cursor.pos >= cursor.end) {
                throw new Error(
                    "Unexpected end of MIDI data."
                );
            }

            byte = bytes[cursor.pos++];

            value = (value << 7) | (byte & 0x7F);

            count++;

            if (count > 4) {
                throw new Error(
                    "Invalid MIDI variable-length value."
                );
            }

        } while (byte & 0x80);

        return value;
    }


    function ensureAvailable(cursor, length) {
        if (
            length < 0 ||
            cursor.pos + length > cursor.end
        ) {
            throw new Error(
                "The MIDI file appears to be incomplete."
            );
        }
    }


    function readUInt32(view, offset) {
        return view.getUint32(offset, false);
    }


    function formatFileSize(bytes) {
        if (bytes < 1024) {
            return bytes + " B";
        }

        if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(2) + " KB";
        }

        return (
            bytes / (1024 * 1024)
        ).toFixed(2) + " MB";
    }


    function formatDuration(seconds) {
        if (!isFinite(seconds) || seconds < 0) {
            return "Unknown";
        }

        var totalSeconds = Math.floor(seconds);

        var minutes = Math.floor(totalSeconds / 60);

        var remainingSeconds = totalSeconds % 60;

        var centiseconds = Math.floor(
            (seconds - totalSeconds) * 100
        );

        return (
            String(minutes).padStart(2, "0") +
            ":" +
            String(remainingSeconds).padStart(2, "0") +
            "." +
            String(centiseconds).padStart(2, "0")
        );
    }


    function showMidiStatus(message) {
        if (midiStatus) {
            midiStatus.textContent = message;
        }
    }


    function resetMidiResults() {
        if (midiResults) {
            midiResults.hidden = true;
        }

        if (midiFileName) {
            midiFileName.textContent = "-";
        }

        if (midiFileSize) {
            midiFileSize.textContent = "-";
        }

        if (midiFormat) {
            midiFormat.textContent = "-";
        }

        if (midiTrackCount) {
            midiTrackCount.textContent = "-";
        }

        if (midiNoteCount) {
            midiNoteCount.textContent = "-";
        }

        if (midiTempo) {
            midiTempo.textContent = "-";
        }

        if (midiDuration) {
            midiDuration.textContent = "-";
        }

        if (midiDetail) {
            midiDetail.textContent = "";
        }
    }


    /* =========================================
       MIDI PARSER
    ========================================= */

    function parseMidi(arrayBuffer) {
        var bytes = new Uint8Array(arrayBuffer);

        var view = new DataView(arrayBuffer);

        if (bytes.length < 14) {
            throw new Error(
                "The selected file is too small to be a valid MIDI file."
            );
        }

        if (readFourCC(bytes, 0) !== "MThd") {
            throw new Error(
                "Invalid MIDI header. Please select a valid .mid file."
            );
        }

        var headerLength = readUInt32(view, 4);

        if (headerLength < 6) {
            throw new Error(
                "The MIDI header is invalid."
            );
        }

        if (8 + headerLength > bytes.length) {
            throw new Error(
                "The MIDI header is incomplete."
            );
        }

        var format = view.getUint16(8, false);

        var declaredTrackCount =
            view.getUint16(10, false);

        var division =
            view.getUint16(12, false);

        if (format > 2) {
            throw new Error(
                "This MIDI format is not supported."
            );
        }

        if (declaredTrackCount < 1) {
            throw new Error(
                "No MIDI tracks were found."
            );
        }

        if (division === 0) {
            throw new Error(
                "The MIDI timing division is invalid."
            );
        }

        var isSMPTE = (division & 0x8000) !== 0;

        var ticksPerQuarter = division & 0x7FFF;

        var ticksPerSecond = 0;

        if (isSMPTE) {
            var frameCode = (division >> 8) & 0xFF;

            if (frameCode > 127) {
                frameCode -= 256;
            }

            var framesPerSecond = -frameCode;

            var ticksPerFrame = division & 0xFF;

            if (
                framesPerSecond === 29
            ) {
                framesPerSecond = 30000 / 1001;
            }

            if (
                framesPerSecond <= 0 ||
                ticksPerFrame === 0
            ) {
                throw new Error(
                    "The MIDI SMPTE timing is invalid."
                );
            }

            ticksPerSecond =
                framesPerSecond * ticksPerFrame;

        } else if (ticksPerQuarter === 0) {
            throw new Error(
                "The MIDI ticks-per-quarter value is invalid."
            );
        }


        var cursor = {
            pos: 8 + headerLength,
            end: bytes.length
        };

        var actualTrackCount = 0;

        var totalNotes = 0;

        var maximumTick = 0;

        var tempoEvents = [];

        var trackNames = [];

        var trackNoteCounts = [];

        var defaultMicrosecondsPerQuarter = 500000;


        /* -------------------------------------
           READ TRACKS
        ------------------------------------- */

        while (
            cursor.pos + 8 <= cursor.end &&
            actualTrackCount < declaredTrackCount
        ) {
            var chunkType = readFourCC(
                bytes,
                cursor.pos
            );

            var chunkLength = readUInt32(
                view,
                cursor.pos + 4
            );

            cursor.pos += 8;

            if (
                chunkLength >
                cursor.end - cursor.pos
            ) {
                throw new Error(
                    "A MIDI track extends beyond the file."
                );
            }

            var chunkStart = cursor.pos;

            var chunkEnd = chunkStart + chunkLength;

            cursor.pos = chunkEnd;

            if (chunkType !== "MTrk") {
                continue;
            }

            actualTrackCount++;

            var trackCursor = {
                pos: chunkStart,
                end: chunkEnd
            };

            var absoluteTick = 0;

            var runningStatus = null;

            var notesInTrack = 0;

            var currentTrackName = "";


            while (trackCursor.pos < trackCursor.end) {
                var delta = readVariableLength(
                    bytes,
                    trackCursor
                );

                absoluteTick += delta;

                if (absoluteTick > maximumTick) {
                    maximumTick = absoluteTick;
                }

                ensureAvailable(trackCursor, 1);

                var statusByte =
                    bytes[trackCursor.pos];

                if (statusByte < 0x80) {
                    if (runningStatus === null) {
                        throw new Error(
                            "Invalid MIDI event data."
                        );
                    }

                    statusByte = runningStatus;

                } else {
                    trackCursor.pos++;
                }


                /* META EVENTS */

                if (statusByte === 0xFF) {
                    runningStatus = null;

                    ensureAvailable(trackCursor, 1);

                    var metaType =
                        bytes[trackCursor.pos++];

                    var metaLength = readVariableLength(
                        bytes,
                        trackCursor
                    );

                    ensureAvailable(
                        trackCursor,
                        metaLength
                    );

                    if (
                        metaType === 0x51 &&
                        metaLength === 3
                    ) {
                        var microsecondsPerQuarter =
                            (
                                bytes[trackCursor.pos] << 16
                            ) |
                            (
                                bytes[trackCursor.pos + 1] << 8
                            ) |
                            bytes[trackCursor.pos + 2];

                        if (microsecondsPerQuarter > 0) {
                            tempoEvents.push({
                                tick: absoluteTick,
                                tempo: microsecondsPerQuarter
                            });
                        }
                    }


                    if (
                        metaType === 0x03 &&
                        metaLength > 0
                    ) {
                        var nameBytes = bytes.slice(
                            trackCursor.pos,
                            trackCursor.pos + metaLength
                        );

                        currentTrackName = "";

                        for (
                            var nameIndex = 0;
                            nameIndex < nameBytes.length;
                            nameIndex++
                        ) {
                            currentTrackName += String.fromCharCode(
                                nameBytes[nameIndex]
                            );
                        }
                    }


                    trackCursor.pos += metaLength;

                    if (metaType === 0x2F) {
                        break;
                    }

                    continue;
                }


                /* SYSTEM EXCLUSIVE EVENTS */

                if (
                    statusByte === 0xF0 ||
                    statusByte === 0xF7
                ) {
                    runningStatus = null;

                    var sysexLength = readVariableLength(
                        bytes,
                        trackCursor
                    );

                    ensureAvailable(
                        trackCursor,
                        sysexLength
                    );

                    trackCursor.pos += sysexLength;

                    continue;
                }


                /* CHANNEL EVENTS */

                if (
                    statusByte >= 0x80 &&
                    statusByte <= 0xEF
                ) {
                    runningStatus = statusByte;

                } else {
                    throw new Error(
                        "An unsupported MIDI event was encountered."
                    );
                }


                var command = statusByte & 0xF0;

                var dataLength =
                    (
                        command === 0xC0 ||
                        command === 0xD0
                    ) ? 1 : 2;

                if (
                    trackCursor.pos >= trackCursor.end
                ) {
                    throw new Error(
                        "The MIDI event is incomplete."
                    );
                }

                var firstData;

                if (bytes[trackCursor.pos] < 0x80) {
                    firstData =
                        bytes[trackCursor.pos++];

                } else {
                    throw new Error(
                        "Invalid MIDI channel event."
                    );
                }


                var secondData = 0;

                if (dataLength === 2) {
                    ensureAvailable(trackCursor, 1);

                    secondData =
                        bytes[trackCursor.pos++];

                    if (secondData >= 0x80) {
                        throw new Error(
                            "Invalid MIDI event data."
                        );
                    }
                }


                /*
                Count Note On events with velocity > 0.
                Note On with velocity 0 is treated as Note Off.
                */

                if (
                    command === 0x90 &&
                    secondData > 0
                ) {
                    totalNotes++;

                    notesInTrack++;
                }
            }


            trackNames.push(
                currentTrackName || "Track " + actualTrackCount
            );

            trackNoteCounts.push(notesInTrack);
        }


        if (actualTrackCount === 0) {
            throw new Error(
                "No valid MIDI tracks were found."
            );
        }


        /* -------------------------------------
           CALCULATE DURATION
        ------------------------------------- */

        var durationSeconds = 0;

        var firstTempo = defaultMicrosecondsPerQuarter;

        var tempoLabel = "120 BPM (default)";


        if (isSMPTE) {
            durationSeconds =
                maximumTick / ticksPerSecond;

            tempoLabel =
                "Not applicable (SMPTE timing)";

        } else {
            tempoEvents.sort(function (a, b) {
                return a.tick - b.tick;
            });

            if (tempoEvents.length > 0) {
                firstTempo = tempoEvents[0].tempo;

                var firstBpm =
                    60000000 / firstTempo;

                tempoLabel =
                    firstBpm.toFixed(2) + " BPM";
            }


            var previousTick = 0;

            var currentTempo =
                defaultMicrosecondsPerQuarter;

            var tempoIndex = 0;

            var accumulatedMicroseconds = 0;


            while (
                tempoIndex < tempoEvents.length &&
                tempoEvents[tempoIndex].tick <= maximumTick
            ) {
                var eventTick =
                    tempoEvents[tempoIndex].tick;

                if (eventTick > previousTick) {
                    accumulatedMicroseconds +=
                        (
                            eventTick - previousTick
                        ) *
                        currentTempo /
                        ticksPerQuarter;

                    previousTick = eventTick;
                }

                currentTempo =
                    tempoEvents[tempoIndex].tempo;

                tempoIndex++;
            }


            if (maximumTick > previousTick) {
                accumulatedMicroseconds +=
                    (
                        maximumTick - previousTick
                    ) *
                    currentTempo /
                    ticksPerQuarter;
            }


            durationSeconds =
                accumulatedMicroseconds / 1000000;
        }


        return {
            format: format,
            declaredTracks: declaredTrackCount,
            actualTracks: actualTrackCount,
            totalNotes: totalNotes,
            durationSeconds: durationSeconds,
            tempoLabel: tempoLabel,
            ticksPerQuarter: isSMPTE
                ? null
                : ticksPerQuarter,
            trackNames: trackNames,
            trackNoteCounts: trackNoteCounts,
            fileSize: bytes.length
        };
    }


    /* =========================================
       DISPLAY MIDI INFORMATION
    ========================================= */

    function displayMidiInfo(file, info) {
        if (midiFileName) {
            midiFileName.textContent = file.name;
        }

        if (midiFileSize) {
            midiFileSize.textContent =
                formatFileSize(file.size);
        }

        if (midiFormat) {
            midiFormat.textContent =
                "Format " + info.format;
        }

        if (midiTrackCount) {
            midiTrackCount.textContent =
                String(info.actualTracks);
        }

        if (midiNoteCount) {
            midiNoteCount.textContent =
                String(info.totalNotes);
        }

        if (midiTempo) {
            midiTempo.textContent =
                info.tempoLabel;
        }

        if (midiDuration) {
            midiDuration.textContent =
                formatDuration(info.durationSeconds);
        }


        if (midiDetail) {
            var trackSummary = [];

            var maximumTracksToShow = Math.min(
                info.trackNames.length,
                8
            );

            for (
                var i = 0;
                i < maximumTracksToShow;
                i++
            ) {
                trackSummary.push(
                    info.trackNames[i] +
                    ": " +
                    info.trackNoteCounts[i] +
                    " notes"
                );
            }

            if (info.trackNames.length > maximumTracksToShow) {
                trackSummary.push(
                    "...and " +
                    (
                        info.trackNames.length -
                        maximumTracksToShow
                    ) +
                    " more tracks."
                );
            }

            midiDetail.textContent =
                "Track details: " +
                trackSummary.join(" | ");
        }


        if (midiResults) {
            midiResults.hidden = false;
        }

        showMidiStatus(
            "MIDI file analyzed successfully."
        );
    }


    /* =========================================
       IMPORT MIDI FILE
    ========================================= */

    if (midiFileInput) {
        midiFileInput.addEventListener(
            "change",
            function (event) {
                var files = event.target.files;

                if (!files || files.length === 0) {
                    return;
                }

                var file = files[0];

                resetMidiResults();

                showMidiStatus(
                    "Reading MIDI file..."
                );


                var lowerName = file.name.toLowerCase();

                if (
                    !lowerName.endsWith(".mid") &&
                    !lowerName.endsWith(".midi")
                ) {
                    showMidiStatus(
                        "Unsupported file. Please select a .mid or .midi file."
                    );

                    midiFileInput.value = "";

                    return;
                }


                /*
                Keep the file-size limit generous but
                protect low-memory devices from very
                large files.
                */

                var maximumFileSize = 50 * 1024 * 1024;

                if (file.size > maximumFileSize) {
                    showMidiStatus(
                        "This MIDI file is larger than 50 MB. Please try a smaller file."
                    );

                    midiFileInput.value = "";

                    return;
                }


                var reader = new FileReader();


                reader.onload = function () {
                    try {
                        var info = parseMidi(
                            reader.result
                        );

                        displayMidiInfo(file, info);

                    } catch (error) {
                        console.error(
                            "SonaFrame MIDI error:",
                            error
                        );

                        showMidiStatus(
                            error && error.message
                                ? error.message
                                : "Unable to read this MIDI file."
                        );

                        if (midiResults) {
                            midiResults.hidden = true;
                        }
                    }
                };


                reader.onerror = function () {
                    showMidiStatus(
                        "Unable to read the selected file."
                    );
                };


                reader.readAsArrayBuffer(file);
            }
        );
    }


    /* =========================================
       SERVICE WORKER
    ========================================= */

    /*
    Register the Service Worker only when
    supported and running in a secure context.
    GitHub Pages uses HTTPS.
    */

    if (
        "serviceWorker" in navigator &&
        window.isSecureContext
    ) {
        window.addEventListener(
            "load",
            function () {
                navigator.serviceWorker
                    .register("./sw.js")
                    .catch(function (error) {
                        console.error(
                            "SonaFrame Service Worker error:",
                            error
                        );
                    });
            }
        );
    }

})();
