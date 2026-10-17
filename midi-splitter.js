/*
Project: SonaFrame
File: midi-splitter.js
Version: 0.1.0

Stage 5: MIDI Splitter

Features:
- Import a Standard MIDI File locally
- Inspect available MIDI tracks
- Select one track to extract
- Export the selected track as a standalone MIDI file
- Preserve event timing and track events
- Copy tempo, time signature, key signature, and SMPTE offset
  metadata from other tracks when available
- No external libraries
- Mobile-first and offline-friendly

Supported:
- Standard MIDI File format 0 and 1
- PPQ timing
- Channel events and running status
- Meta events
- System Exclusive events

Limitations:
- Format 2 and SMPTE timing are not supported
- Extracting one track does not recreate the other tracks
- Some specialized MIDI applications may use proprietary events

Safety:
- Original files are never modified
- MIDI data is processed locally
*/

(function () {
    "use strict";

    var MAX_FILE_SIZE = 50 * 1024 * 1024;

    var panel = null;
    var fileInput = null;
    var trackSelect = null;
    var extractButton = null;
    var downloadLink = null;
    var statusBox = null;
    var fileInfo = null;
    var trackInfo = null;

    var selectedFile = null;
    var parsedMidi = null;
    var outputURL = null;
    var busy = false;

    /* =====================================
       ELEMENT HELPERS
    ===================================== */

    function createElement(tag, className, text) {
        var element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined && text !== null) {
            element.textContent = text;
        }

        return element;
    }

    function createButton(text, primary) {
        var button = createElement(
            "button",
            "sf-splitter-button" +
                (primary ? " sf-splitter-primary" : ""),
            text
        );

        button.type = "button";

        return button;
    }

    function setStatus(message, type) {
        if (!statusBox) {
            return;
        }

        statusBox.textContent = message;
        statusBox.className = "sf-splitter-status";

        if (type) {
            statusBox.classList.add("is-" + type);
        }
    }

    function formatBytes(bytes) {
        if (bytes < 1024) {
            return bytes + " B";
        }

        if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(1) + " KB";
        }

        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    }

    function safeFileName(name) {
        return name
            .replace(/\.midi?$/i, "")
            .replace(/[\\/:*?"<>|]/g, "_")
            .replace(/\s+/g, "_") || "sonaframe_midi";
    }

    function releaseOutputURL() {
        if (outputURL) {
            URL.revokeObjectURL(outputURL);
            outputURL = null;
        }
    }

    function resetDownload() {
        releaseOutputURL();

        if (downloadLink) {
            downloadLink.hidden = true;
            downloadLink.removeAttribute("href");
            downloadLink.removeAttribute("download");
        }
    }

    /* =====================================
       STYLES
    ===================================== */

    function addStyles() {
        if (document.getElementById("sf-splitter-styles")) {
            return;
        }

        var style = document.createElement("style");

        style.id = "sf-splitter-styles";

        style.textContent = `
            .sf-splitter-card {
                margin-top: 18px;
            }

            .sf-splitter-panel {
                margin-top: 16px;
                padding: 16px;
                border: 1px solid var(--border, #29314a);
                border-radius: 15px;
                background: var(--surface, #111525);
                color: var(--text, #f5f6ff);
            }

            .sf-splitter-panel h2,
            .sf-splitter-panel h3 {
                color: var(--text, #f5f6ff);
            }

            .sf-splitter-description,
            .sf-splitter-help {
                color: var(--muted, #a1abc4);
                font-size: 12px;
                line-height: 1.8;
            }

            .sf-splitter-label {
                display: block;
                margin: 14px 0 7px;
                color: var(--text, #f5f6ff);
                font-size: 12px;
                font-weight: 800;
            }

            .sf-splitter-file,
            .sf-splitter-select {
                display: block;
                width: 100%;
                max-width: 100%;
                min-height: 44px;
                box-sizing: border-box;
                padding: 10px;
                border: 1px solid var(--border, #29314a);
                border-radius: 10px;
                background: var(--background, #090b14);
                color: var(--text, #f5f6ff);
                font: inherit;
                font-size: 13px;
            }

            .sf-splitter-button {
                min-height: 44px;
                padding: 10px 13px;
                border: 1px solid var(--border, #29314a);
                border-radius: 10px;
                background: var(--surface-light, #191e32);
                color: var(--text, #f5f6ff);
                font: inherit;
                font-size: 12px;
                font-weight: 800;
                cursor: pointer;
                touch-action: manipulation;
            }

            .sf-splitter-primary {
                border-color: #7865d9;
                background: #44358e;
                color: #ffffff;
            }

            .sf-splitter-button:disabled {
                opacity: .45;
                cursor: not-allowed;
            }

            .sf-splitter-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 14px;
            }

            .sf-splitter-status {
                margin-top: 14px;
                padding: 11px;
                border: 1px solid var(--border, #29314a);
                border-radius: 9px;
                background: rgba(255,255,255,.025);
                color: var(--muted, #a1abc4);
                font-size: 12px;
                line-height: 1.7;
                overflow-wrap: anywhere;
                white-space: pre-wrap;
            }

            .sf-splitter-status.is-success {
                border-color: #287d75;
                color: #9cf5dc;
            }

            .sf-splitter-status.is-error {
                border-color: #b84b62;
                color: #ffb8c6;
            }

            .sf-splitter-info {
                margin-top: 12px;
                padding: 11px;
                border: 1px solid var(--border, #29314a);
                border-radius: 9px;
                background: rgba(255,255,255,.025);
                color: var(--muted, #a1abc4);
                font-size: 12px;
                line-height: 1.8;
                overflow-wrap: anywhere;
                white-space: pre-wrap;
            }

            .sf-splitter-help {
                margin-top: 13px;
            }

            @media (max-width: 360px) {
                .sf-splitter-panel {
                    padding: 12px;
                }

                .sf-splitter-actions {
                    display: grid;
                    grid-template-columns: 1fr;
                }

                .sf-splitter-button {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* =====================================
       MIDI BINARY HELPERS
    ===================================== */

    function readAscii(bytes, offset, length) {
        var result = "";

        for (var i = 0; i < length; i++) {
            result += String.fromCharCode(bytes[offset + i]);
        }

        return result;
    }

    function readUInt16(view, offset) {
        return view.getUint16(offset, false);
    }

    function readUInt32(view, offset) {
        return view.getUint32(offset, false);
    }

    function ensureAvailable(position, length, end) {
        if (
            length < 0 ||
            position < 0 ||
            position + length > end
        ) {
            throw new Error(
                "The MIDI file appears to be incomplete."
            );
        }
    }

    function readVariableLength(bytes, cursor, end) {
        var value = 0;
        var count = 0;
        var byte;

        do {
            if (cursor.pos >= end || count >= 4) {
                throw new Error(
                    "Invalid MIDI variable-length value."
                );
            }

            byte = bytes[cursor.pos++];

            value = (value * 128) + (byte & 0x7F);

            count++;
        } while (byte & 0x80);

        return value;
    }

    function encodeVariableLength(value) {
        if (
            value < 0 ||
            value > 0x0FFFFFFF ||
            Math.floor(value) !== value
        ) {
            throw new Error(
                "An invalid MIDI event timing value was encountered."
            );
        }

        var buffer = value & 0x7F;

        while ((value = Math.floor(value / 128)) > 0) {
            buffer <<= 8;
            buffer |= ((value & 0x7F) | 0x80);
        }

        var result = [];

        while (true) {
            result.push(buffer & 0xFF);

            if (buffer & 0x80) {
                buffer >>>= 8;
            } else {
                break;
            }
        }

        return result;
    }

    function writeUInt16(value) {
        return [
            (value >> 8) & 0xFF,
            value & 0xFF
        ];
    }

    function writeUInt32(value) {
        return [
            (value >>> 24) & 0xFF,
            (value >>> 16) & 0xFF,
            (value >>> 8) & 0xFF,
            value & 0xFF
        ];
    }

    /* =====================================
       MIDI TRACK PARSER
    ===================================== */

    function parseTrack(bytes, start, end, trackIndex) {
        var cursor = {
            pos: start
        };

        var absoluteTick = 0;
        var runningStatus = null;
        var events = [];
        var trackName = "";
        var ended = false;

        while (cursor.pos < end) {
            var delta = readVariableLength(
                bytes,
                cursor,
                end
            );

            absoluteTick += delta;

            if (!isFinite(absoluteTick)) {
                throw new Error(
                    "Invalid MIDI timing information."
                );
            }

            ensureAvailable(cursor.pos, 1, end);

            var firstByte = bytes[cursor.pos];
            var status;

            if (firstByte >= 0x80) {
                status = firstByte;
                cursor.pos++;
            } else {
                if (runningStatus === null) {
                    throw new Error(
                        "Invalid MIDI running status in track " +
                        (trackIndex + 1) + "."
                    );
                }

                status = runningStatus;
            }

            /* META EVENT */

            if (status === 0xFF) {
                runningStatus = null;

                ensureAvailable(cursor.pos, 1, end);

                var metaType = bytes[cursor.pos++];

                var metaLength = readVariableLength(
                    bytes,
                    cursor,
                    end
                );

                ensureAvailable(
                    cursor.pos,
                    metaLength,
                    end
                );

                var metaData = [];

                for (var m = 0; m < metaLength; m++) {
                    metaData.push(bytes[cursor.pos++]);
                }

                var metaBytes = [
                    0xFF,
                    metaType
                ].concat(
                    encodeVariableLength(metaLength),
                    metaData
                );

                if (metaType === 0x03 && !trackName) {
                    for (var n = 0; n < metaData.length; n++) {
                        trackName += String.fromCharCode(
                            metaData[n]
                        );
                    }
                }

                events.push({
                    tick: absoluteTick,
                    bytes: metaBytes,
                    metaType: metaType,
                    metaData: metaData,
                    isEnd: metaType === 0x2F
                });

                if (metaType === 0x2F) {
                    ended = true;
                    break;
                }

                continue;
            }

            /* SYSTEM EXCLUSIVE EVENT */

            if (status === 0xF0 || status === 0xF7) {
                runningStatus = null;

                var sysexLength = readVariableLength(
                    bytes,
                    cursor,
                    end
                );

                ensureAvailable(
                    cursor.pos,
                    sysexLength,
                    end
                );

                var sysexBytes = [status].concat(
                    encodeVariableLength(sysexLength)
                );

                for (var sx = 0; sx < sysexLength; sx++) {
                    sysexBytes.push(bytes[cursor.pos++]);
                }

                events.push({
                    tick: absoluteTick,
                    bytes: sysexBytes,
                    metaType: null,
                    metaData: null,
                    isEnd: false
                });

                continue;
            }

            /* CHANNEL EVENT */

            if (status < 0x80 || status > 0xEF) {
                throw new Error(
                    "An unsupported MIDI event was found in track " +
                    (trackIndex + 1) + "."
                );
            }

            runningStatus = status;

            var command = status & 0xF0;

            var dataLength =
                command === 0xC0 ||
                command === 0xD0
                    ? 1
                    : 2;

            var eventBytes = [status];

            /*
            Running-status events do not consume the first
            data byte as a status byte.
            */

            if (firstByte < 0x80) {
                eventBytes.push(bytes[cursor.pos++]);

                for (var rd = 1; rd < dataLength; rd++) {
                    ensureAvailable(cursor.pos, 1, end);

                    var runningData = bytes[cursor.pos++];

                    if (runningData >= 0x80) {
                        throw new Error(
                            "Invalid MIDI channel event data."
                        );
                    }

                    eventBytes.push(runningData);
                }
            } else {
                for (var d = 0; d < dataLength; d++) {
                    ensureAvailable(cursor.pos, 1, end);

                    var dataByte = bytes[cursor.pos++];

                    if (dataByte >= 0x80) {
                        throw new Error(
                            "Invalid MIDI channel event data."
                        );
                    }

                    eventBytes.push(dataByte);
                }
            }

            events.push({
                tick: absoluteTick,
                bytes: eventBytes,
                metaType: null,
                metaData: null,
                isEnd: false
            });
        }

        /*
        Some MIDI files omit End of Track.
        Add one during export if necessary.
        */

        return {
            index: trackIndex,
            name: trackName,
            events: events,
            endTick: absoluteTick,
            ended: ended
        };
    }

    function parseMidi(arrayBuffer, fileName) {
        var bytes = new Uint8Array(arrayBuffer);
        var view = new DataView(arrayBuffer);

        if (bytes.length < 14) {
            throw new Error(
                "The selected file is too small to be a valid MIDI file."
            );
        }

        if (readAscii(bytes, 0, 4) !== "MThd") {
            throw new Error(
                "Invalid MIDI header. Please select a valid MIDI file."
            );
        }

        var headerLength = readUInt32(view, 4);

        if (
            headerLength < 6 ||
            8 + headerLength > bytes.length
        ) {
            throw new Error(
                "The MIDI header is invalid or incomplete."
            );
        }

        var format = readUInt16(view, 8);
        var trackCount = readUInt16(view, 10);
        var division = readUInt16(view, 12);

        if (format !== 0 && format !== 1) {
            throw new Error(
                "This tool supports MIDI format 0 and 1 only."
            );
        }

        if (trackCount < 1) {
            throw new Error(
                "No MIDI tracks were declared in this file."
            );
        }

        if (format === 0 && trackCount !== 1) {
            throw new Error(
                "This format 0 file declares an unexpected number of tracks."
            );
        }

        /*
        The high bit indicates SMPTE timing.
        This version supports PPQ timing only.
        */

        if ((division & 0x8000) !== 0 || division === 0) {
            throw new Error(
                "This version supports PPQ timing only. SMPTE-timed MIDI files are not supported yet."
            );
        }

        var position = 8 + headerLength;
        var tracks = [];

        for (var t = 0; t < trackCount; t++) {
            if (position + 8 > bytes.length) {
                throw new Error(
                    "Track " + (t + 1) +
                    " is missing or incomplete."
                );
            }

            var chunkType = readAscii(bytes, position, 4);
            var chunkLength = readUInt32(view, position + 4);

            position += 8;

            if (chunkType !== "MTrk") {
                throw new Error(
                    "Expected a MIDI track chunk at track " +
                    (t + 1) + "."
                );
            }

            if (chunkLength > bytes.length - position) {
                throw new Error(
                    "Track " + (t + 1) +
                    " extends beyond the file size."
                );
            }

            var trackEnd = position + chunkLength;

            var track = parseTrack(
                bytes,
                position,
                trackEnd,
                t
            );

            tracks.push(track);

            position = trackEnd;
        }

        return {
            format: format,
            division: division,
            tracks: tracks,
            fileName: fileName
        };
    }

    /* =====================================
       GLOBAL MIDI METADATA
    ===================================== */

    function isGlobalMetadata(event) {
        if (
            event.metaType === null ||
            event.metaType === undefined
        ) {
            return false;
        }

        /*
        Tempo, SMPTE offset, time signature, and key signature.
        */

        return (
            event.metaType === 0x51 ||
            event.metaType === 0x54 ||
            event.metaType === 0x58 ||
            event.metaType === 0x59
        );
    }

    function eventKey(event) {
        return event.tick + ":" +
            event.bytes.join(",");
    }

    function collectGlobalMetadata(midi, selectedTrackIndex) {
        var selectedTrack = midi.tracks[selectedTrackIndex];
        var collected = [];
        var seen = Object.create(null);

        /*
        Metadata already present in the selected track
        must not be duplicated.
        */

        selectedTrack.events.forEach(function (event) {
            if (isGlobalMetadata(event)) {
                seen[eventKey(event)] = true;
            }
        });

        midi.tracks.forEach(function (track, trackIndex) {
            if (trackIndex === selectedTrackIndex) {
                return;
            }

            track.events.forEach(function (event) {
                if (!isGlobalMetadata(event)) {
                    return;
                }

                var key = eventKey(event);

                if (seen[key]) {
                    return;
                }

                seen[key] = true;

                collected.push({
                    tick: event.tick,
                    bytes: event.bytes.slice(),
                    metaType: event.metaType,
                    metaData: event.metaData
                        ? event.metaData.slice()
                        : null,
                    isEnd: false
                });
            });
        });

        return collected;
    }

    /* =====================================
       BUILD EXTRACTED MIDI
    ===================================== */

    function buildExtractedMidi(midi, selectedTrackIndex) {
        if (
            !midi ||
            !midi.tracks ||
            !midi.tracks[selectedTrackIndex]
        ) {
            throw new Error(
                "Please select a valid MIDI track."
            );
        }

        var sourceTrack = midi.tracks[selectedTrackIndex];

        /*
        Exclude the original End of Track event.
        A fresh End of Track event is written after all events.
        */

        var events = sourceTrack.events.filter(function (event) {
            return !event.isEnd;
        }).map(function (event) {
            return {
                tick: event.tick,
                bytes: event.bytes.slice(),
                metaType: event.metaType,
                metaData: event.metaData
                    ? event.metaData.slice()
                    : null,
                isEnd: false,
                order: 0
            };
        });

        var globalEvents = collectGlobalMetadata(
            midi,
            selectedTrackIndex
        );

        globalEvents.forEach(function (event) {
            events.push({
                tick: event.tick,
                bytes: event.bytes.slice(),
                metaType: event.metaType,
                metaData: event.metaData
                    ? event.metaData.slice()
                    : null,
                isEnd: false,
                order: 1
            });
        });

        /*
        Preserve stable ordering for events at the same tick.
        Selected-track events are kept ahead of copied metadata.
        */

        events.sort(function (a, b) {
            if (a.tick !== b.tick) {
                return a.tick - b.tick;
            }

            return a.order - b.order;
        });

        var finalTick = sourceTrack.endTick;

        events.forEach(function (event) {
            if (event.tick > finalTick) {
                finalTick = event.tick;
            }
        });

        events.push({
            tick: finalTick,
            bytes: [0xFF, 0x2F, 0x00],
            metaType: 0x2F,
            metaData: [],
            isEnd: true,
            order: 2
        });

        var trackBytes = [];
        var previousTick = 0;

        events.forEach(function (event) {
            var delta = event.tick - previousTick;

            if (delta < 0) {
                throw new Error(
                    "Invalid MIDI event order."
                );
            }

            trackBytes.push.apply(
                trackBytes,
                encodeVariableLength(delta)
            );

            trackBytes.push.apply(
                trackBytes,
                event.bytes
            );

            previousTick = event.tick;
        });

        var output = [];

        /*
        Export as format 0 with one track.
        The original timing division is preserved.
        */

        output.push(
            0x4D, 0x54, 0x68, 0x64,
            0x00, 0x00, 0x00, 0x06
        );

        output.push(0x00, 0x00);
        output.push(0x00, 0x01);

        output.push.apply(
            output,
            writeUInt16(midi.division)
        );

        output.push(
            0x4D, 0x54, 0x72, 0x6B
        );

        output.push.apply(
            output,
            writeUInt32(trackBytes.length)
        );

        output.push.apply(
            output,
            trackBytes
        );

        return {
            buffer: new Uint8Array(output).buffer,
            eventCount: sourceTrack.events.filter(function (event) {
                return !event.isEnd;
            }).length,
            trackName: sourceTrack.name,
            sourceTrackIndex: selectedTrackIndex,
            copiedMetadataCount: globalEvents.length
        };
    }

    /* =====================================
       FILE READING
    ===================================== */

    function readFile(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();

            reader.onload = function () {
                resolve(reader.result);
            };

            reader.onerror = function () {
                reject(
                    new Error(
                        "Unable to read the selected file."
                    )
                );
            };

            reader.onabort = function () {
                reject(
                    new Error(
                        "Reading the file was cancelled."
                    )
                );
            };

            reader.readAsArrayBuffer(file);
        });
    }

    /* =====================================
       TRACK SELECTOR
    ===================================== */

    function populateTrackSelector(midi) {
        while (trackSelect.firstChild) {
            trackSelect.removeChild(trackSelect.firstChild);
        }

        midi.tracks.forEach(function (track, index) {
            var label = track.name
                ? track.name
                : "Track " + (index + 1);

            var option = createElement(
                "option",
                "",
                (index + 1) + ". " + label
            );

            option.value = String(index);

            trackSelect.appendChild(option);
        });

        trackSelect.disabled = midi.tracks.length === 0;

        updateTrackInfo();
    }

    function updateTrackInfo() {
        if (!parsedMidi || !trackSelect) {
            return;
        }

        var index = Number(trackSelect.value);
        var track = parsedMidi.tracks[index];

        if (!track) {
            trackInfo.textContent = "No track selected.";
            extractButton.disabled = true;
            return;
        }

        var noteOnCount = 0;
        var channelEventCount = 0;
        var metaEventCount = 0;

        track.events.forEach(function (event) {
            if (event.metaType !== null &&
                event.metaType !== undefined) {
                metaEventCount++;
                return;
            }

            if (
                event.bytes.length > 0 &&
                event.bytes[0] >= 0x80 &&
                event.bytes[0] <= 0xEF
            ) {
                channelEventCount++;

                var command = event.bytes[0] & 0xF0;

                if (
                    command === 0x90 &&
                    event.bytes.length >= 3 &&
                    event.bytes[2] > 0
                ) {
                    noteOnCount++;
                }
            }
        });

        trackInfo.textContent =
            "Track: " + (index + 1) +
            "\nName: " + (track.name || "Unnamed track") +
            "\nEvents: " + track.events.length +
            "\nNote On events: " + noteOnCount +
            "\nChannel events: " + channelEventCount +
            "\nMeta events: " + metaEventCount;
    }

    /* =====================================
       IMPORT MIDI
    ===================================== */

    function handleFileSelection() {
        if (busy) {
            return;
        }

        var files = fileInput.files;

        if (!files || files.length === 0) {
            return;
        }

        var file = files[0];

        resetDownload();

        selectedFile = null;
        parsedMidi = null;

        trackSelect.disabled = true;
        extractButton.disabled = true;
        trackInfo.textContent = "";
        fileInfo.textContent = "";

        if (!/\.midi?$/i.test(file.name)) {
            setStatus(
                "Please choose a .mid or .midi file.",
                "error"
            );

            fileInput.value = "";
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setStatus(
                "This file exceeds 50 MB. Please choose a smaller MIDI file.",
                "error"
            );

            fileInput.value = "";
            return;
        }

        if (file.size < 14) {
            setStatus(
                "This file is too small to be a valid MIDI file.",
                "error"
            );

            fileInput.value = "";
            return;
        }

        busy = true;
        fileInput.disabled = true;

        setStatus("Reading MIDI file...");

        readFile(file)
            .then(function (buffer) {
                setStatus("Analyzing MIDI tracks...");

                var midi = parseMidi(buffer, file.name);

                selectedFile = file;
                parsedMidi = midi;

                populateTrackSelector(midi);

                fileInfo.textContent =
                    "File: " + file.name +
                    "\nSize: " + formatBytes(file.size) +
                    "\nMIDI format: " + midi.format +
                    "\nTracks found: " + midi.tracks.length +
                    "\nTiming: PPQ (" + midi.division + ")";

                extractButton.disabled = false;

                setStatus(
                    "MIDI loaded successfully. Select the track you want to extract.",
                    "success"
                );
            })
            .catch(function (error) {
                selectedFile = null;
                parsedMidi = null;

                trackSelect.disabled = true;
                extractButton.disabled = true;

                setStatus(
                    error && error.message
                        ? error.message
                        : "Unable to analyze this MIDI file.",
                    "error"
                );
            })
            .then(function () {
                busy = false;
                fileInput.disabled = false;
            });
    }

    /* =====================================
       EXTRACT AND EXPORT
    ===================================== */

    function extractAndExport() {
        if (busy || !selectedFile || !parsedMidi) {
            setStatus(
                "Choose a valid MIDI file first.",
                "error"
            );

            return;
        }

        var selectedIndex = Number(trackSelect.value);

        if (
            !isFinite(selectedIndex) ||
            Math.floor(selectedIndex) !== selectedIndex ||
            !parsedMidi.tracks[selectedIndex]
        ) {
            setStatus(
                "Please select a valid track.",
                "error"
            );

            return;
        }

        busy = true;
        extractButton.disabled = true;
        fileInput.disabled = true;

        resetDownload();

        try {
            setStatus("Extracting the selected track...");

            var result = buildExtractedMidi(
                parsedMidi,
                selectedIndex
            );

            var blob = new Blob(
                [result.buffer],
                { type: "audio/midi" }
            );

            outputURL = URL.createObjectURL(blob);

            var baseName = safeFileName(selectedFile.name);
            var trackLabel = result.trackName
                ? safeFileName(result.trackName)
                : "track_" + (selectedIndex + 1);

            downloadLink.href = outputURL;
            downloadLink.download =
                baseName + "_" + trackLabel + ".mid";

            downloadLink.hidden = false;

            setStatus(
                "Track extracted successfully!\n" +
                "Track: " + (selectedIndex + 1) +
                "\nTrack events: " + result.eventCount +
                "\nCopied global metadata events: " +
                result.copiedMetadataCount +
                "\nOutput size: " + formatBytes(blob.size) +
                "\nTap Download Extracted MIDI to save the file.",
                "success"
            );
        } catch (error) {
            setStatus(
                "Extraction failed: " +
                (error && error.message
                    ? error.message
                    : "Unknown error."),
                "error"
            );
        } finally {
            busy = false;
            extractButton.disabled = !parsedMidi;
            fileInput.disabled = false;
        }
    }

    /* =====================================
       CREATE USER INTERFACE
    ===================================== */

    function createInterface() {
        var grid = document.querySelector(".feature-grid");

        if (!grid) {
            return;
        }

        if (document.getElementById("sf-splitter-card")) {
            return;
        }

        addStyles();

        /* FEATURE CARD */

        var card = createElement(
            "article",
            "feature-card sf-splitter-card"
        );

        card.id = "sf-splitter-card";

        var topline = createElement("div", "card-topline");

        var icon = createElement(
            "div",
            "feature-icon icon-purple",
            "⇄"
        );

        icon.setAttribute("aria-hidden", "true");

        var number = createElement(
            "span",
            "tool-number",
            "TOOL 06"
        );

        topline.appendChild(icon);
        topline.appendChild(number);

        var title = createElement(
            "h3",
            "",
            "MIDI Splitter"
        );

        var description = createElement(
            "p",
            "",
            "Separate one track from a multitrack MIDI file and export it as an independent MIDI file."
        );

        var openButton = createElement(
            "button",
            "button button-primary card-button",
            "Open MIDI Splitter →"
        );

        openButton.type = "button";

        card.appendChild(topline);
        card.appendChild(title);
        card.appendChild(description);
        card.appendChild(openButton);

        grid.appendChild(card);

        /* TOOL PANEL */

        panel = createElement(
            "section",
            "workspace-panel sf-splitter-panel"
        );

        panel.id = "midi-splitter-panel";
        panel.hidden = true;

        var heading = createElement(
            "div",
            "panel-heading"
        );

        var headingText = createElement("div");

        headingText.appendChild(
            createElement("p", "eyebrow", "STAGE 5")
        );

        headingText.appendChild(
            createElement("h2", "", "MIDI Splitter")
        );

        var closeButton = createElement(
            "button",
            "icon-button",
            "×"
        );

        closeButton.type = "button";
        closeButton.setAttribute(
            "aria-label",
            "Close MIDI Splitter"
        );

        heading.appendChild(headingText);
        heading.appendChild(closeButton);

        var intro = createElement(
            "p",
            "sf-splitter-description",
            "Choose a MIDI file, select a track, and export that track as a separate MIDI file."
        );

        var privacyNotice = createElement(
            "div",
            "notice",
            "Your MIDI file is processed locally on this device. The original file is never modified."
        );

        var fileLabel = createElement(
            "label",
            "sf-splitter-label",
            "Choose a MIDI File"
        );

        fileInput = createElement(
            "input",
            "sf-splitter-file"
        );

        fileInput.type = "file";
        fileInput.accept = ".mid,.midi,audio/midi,audio/x-midi";
        fileInput.id = "sf-splitter-file-input";

        fileLabel.htmlFor = fileInput.id;

        var trackLabel = createElement(
            "label",
            "sf-splitter-label",
            "Select Track to Extract"
        );

        trackSelect = createElement(
            "select",
            "sf-splitter-select"
        );

        trackSelect.id = "sf-splitter-track-select";
        trackSelect.disabled = true;

        trackLabel.htmlFor = trackSelect.id;

        trackInfo = createElement(
            "div",
            "sf-splitter-info",
            "Track information will appear here."
        );

        fileInfo = createElement(
            "div",
            "sf-splitter-info",
            ""
        );

        var actions = createElement(
            "div",
            "sf-splitter-actions"
        );

        extractButton = createButton(
            "Extract and Prepare MIDI",
            true
        );

        extractButton.disabled = true;

        downloadLink = createElement(
            "a",
            "sf-splitter-button sf-splitter-primary",
            "Download Extracted MIDI"
        );

        downloadLink.hidden = true;
        downloadLink.style.textDecoration = "none";
        downloadLink.style.textAlign = "center";
        downloadLink.style.display = "inline-flex";
        downloadLink.style.alignItems = "center";
        downloadLink.style.justifyContent = "center";

        actions.appendChild(extractButton);
        actions.appendChild(downloadLink);

        statusBox = createElement(
            "div",
            "sf-splitter-status",
            "No MIDI file selected."
        );

        statusBox.setAttribute("role", "status");
        statusBox.setAttribute("aria-live", "polite");

        var help = createElement(
            "p",
            "sf-splitter-help",
            "Supported: MIDI format 0 and 1 with PPQ timing. This version does not support format 2 or SMPTE-timed MIDI files. If the tempo is stored in another track, the relevant tempo metadata is copied when available."
        );

        panel.appendChild(heading);
        panel.appendChild(intro);
        panel.appendChild(privacyNotice);
        panel.appendChild(fileLabel);
        panel.appendChild(fileInput);
        panel.appendChild(fileInfo);
        panel.appendChild(trackLabel);
        panel.appendChild(trackSelect);
        panel.appendChild(trackInfo);
        panel.appendChild(actions);
        panel.appendChild(statusBox);
        panel.appendChild(help);

        /*
        Place this panel after the existing MIDI panel.
        This keeps the module independent of the planned-tools area.
        */

        var midiPanel = document.getElementById("midi-panel");

        if (midiPanel && midiPanel.parentNode) {
            midiPanel.parentNode.insertBefore(
                panel,
                midiPanel.nextSibling
            );
        } else {
            var main = document.querySelector(".main-content");

            if (main) {
                main.appendChild(panel);
            }
        }

        /* EVENTS */

        openButton.addEventListener("click", function () {
            var allPanels = document.querySelectorAll(
                ".workspace-panel"
            );

            for (var i = 0; i < allPanels.length; i++) {
                allPanels[i].hidden = true;
            }

            panel.hidden = false;

            panel.scrollIntoView();

            setStatus(
                parsedMidi
                    ? "MIDI file is ready. Select a track to continue."
                    : "Choose a MIDI file to begin."
            );
        });

        closeButton.addEventListener("click", function () {
            panel.hidden = true;
        });

        fileInput.addEventListener(
            "change",
            handleFileSelection
        );

        trackSelect.addEventListener(
            "change",
            updateTrackInfo
        );

        extractButton.addEventListener(
            "click",
            extractAndExport
        );

        window.addEventListener(
            "beforeunload",
            releaseOutputURL
        );
    }

    /* =====================================
       INITIALIZATION
    ===================================== */

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            createInterface
        );
    } else {
        createInterface();
    }
})();
