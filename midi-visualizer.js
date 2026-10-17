/*
Project: SonaFrame
File: midi-visualizer.js
Version: 0.5.0

Stage 3: Neon MIDI Visualizer

Features:
- Local MIDI import
- Neon horizontal note lines
- Centered playhead
- Lightweight note pulse effects
- Five color presets
- Per-track opacity and scale
- Local audio playback
- Audio offset synchronization
- Play, Pause, Reset
- Responsive Canvas
- No external libraries

Supported:
- MIDI format 0 and 1
- PPQ timing
- Local audio formats supported by the browser

Performance:
- Limited Canvas resolution
- No external rendering libraries
*/

(function () {
    "use strict";

    var MAX_FILE_SIZE = 50 * 1024 * 1024;
    var MAX_NOTES = 100000;
    var PIXELS_PER_SECOND = 90;

    var state = {
        notes: [],
        tracks: [],
        duration: 0,
        currentTime: 0,
        tempo: 120,

        playing: false,
        animationId: null,
        lastFrame: 0,

        canvas: null,
        context: null,
        panel: null,
        status: null,
        fileInput: null,

        playButton: null,
        pauseButton: null,
        resetButton: null,

        speedInput: null,
        speedLabel: null,

        audioInput: null,
        audio: null,
        audioURL: null,
        audioName: null,
        audioOffset: null,

        colorPreset: null,
        trackControls: null,

        minPitch: 36,
        maxPitch: 84,

        effects: [],
        lastEffectCheck: 0,

        settings: {},
        loaded: false
    };

    /* =====================================
       ELEMENT HELPERS
    ===================================== */

    function el(tag, className, text) {
        var node = document.createElement(tag);

        if (className) {
            node.className = className;
        }

        if (text !== undefined && text !== null) {
            node.textContent = text;
        }

        return node;
    }

    function makeButton(text, primary) {
        var node = el(
            "button",
            "sf5-button" + (primary ? " sf5-primary" : ""),
            text
        );

        node.type = "button";

        return node;
    }

    function setStatus(message, type) {
        if (!state.status) {
            return;
        }

        state.status.textContent = message;

        state.status.className = "sf5-status";

        if (type) {
            state.status.classList.add("sf5-" + type);
        }
    }

    function clamp(value, minimum, maximum) {
        return Math.max(
            minimum,
            Math.min(maximum, value)
        );
    }

    /* =====================================
       STYLES
    ===================================== */

    function addStyles() {
        if (document.getElementById("sf5-styles")) {
            return;
        }

        var style = document.createElement("style");

        style.id = "sf5-styles";

        style.textContent = `
            .sf5-card {
                margin-top: 18px;
            }

            .sf5-panel {
                margin-top: 18px;
                padding: 15px;
                border: 1px solid #263447;
                border-radius: 15px;
                background: #050609;
                color: #edf6ff;
                overflow: hidden;
            }

            .sf5-panel h2,
            .sf5-panel h3 {
                color: #f5f9ff;
            }

            .sf5-description,
            .sf5-help {
                color: #9caac0;
                font-size: 12px;
                line-height: 1.7;
            }

            .sf5-label {
                display: block;
                margin: 12px 0 6px;
                color: #c9d8ee;
                font-size: 12px;
                font-weight: 700;
            }

            .sf5-file,
            .sf5-select,
            .sf5-number {
                width: 100%;
                min-height: 42px;
                box-sizing: border-box;
                padding: 10px;
                border: 1px solid #29364a;
                border-radius: 9px;
                background: #0b0d13;
                color: #eef6ff;
                font: inherit;
                font-size: 12px;
            }

            .sf5-file {
                margin: 5px 0;
            }

            .sf5-button {
                min-height: 42px;
                padding: 9px 13px;
                border: 1px solid #29364a;
                border-radius: 9px;
                background: #111722;
                color: #eef6ff;
                font: inherit;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
            }

            .sf5-primary {
                border-color: #49d9ff;
                background: #102a38;
                color: #7ce8ff;
            }

            .sf5-button:disabled {
                opacity: .4;
                cursor: not-allowed;
            }

            .sf5-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 7px;
                margin: 12px 0;
            }

            .sf5-status {
                margin: 12px 0;
                padding: 10px;
                border: 1px solid #202b3b;
                border-radius: 8px;
                background: #090c12;
                color: #b9c9df;
                font-size: 12px;
                line-height: 1.6;
                overflow-wrap: anywhere;
            }

            .sf5-error {
                border-color: #b84b62;
                color: #ffb8c6;
            }

            .sf5-success {
                border-color: #287d75;
                color: #9cf5dc;
            }

            .sf5-canvas-wrap {
                margin-top: 14px;
                overflow: hidden;
                border: 1px solid #1c2939;
                border-radius: 10px;
                background: #000;
            }

            .sf5-canvas {
                display: block;
                width: 100%;
                height: 300px;
                background: #000;
                touch-action: pan-y;
            }

            .sf5-row {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 9px;
                margin-top: 12px;
                font-size: 12px;
            }

            .sf5-row input[type="range"] {
                flex: 1;
                min-width: 90px;
            }

            .sf5-row output {
                min-width: 42px;
                color: #65e7ff;
                text-align: right;
            }

            .sf5-info {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
                margin-top: 12px;
            }

            .sf5-info > div {
                min-width: 0;
                padding: 10px;
                border: 1px solid #1c2939;
                border-radius: 8px;
                background: #080b11;
                overflow-wrap: anywhere;
            }

            .sf5-info span {
                display: block;
                color: #899ab2;
                font-size: 10px;
            }

            .sf5-info strong {
                display: block;
                margin-top: 4px;
                color: #e7f4ff;
                font-size: 13px;
            }

            .sf5-track {
                margin-top: 10px;
                padding: 11px;
                border: 1px solid #1e2a3b;
                border-radius: 9px;
                background: #080b11;
            }

            .sf5-track-title {
                margin: 0 0 8px;
                color: #e7f4ff;
                font-size: 12px;
                overflow-wrap: anywhere;
            }

            .sf5-track .sf5-row {
                margin-top: 7px;
            }

            .sf5-muted {
                color: #899ab2;
                font-size: 11px;
            }

            @media (max-width: 360px) {
                .sf5-panel {
                    padding: 10px;
                }

                .sf5-canvas {
                    height: 250px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* =====================================
       USER INTERFACE
    ===================================== */

    function createInterface() {
        if (document.getElementById("sf5-panel")) {
            state.panel =
                document.getElementById("sf5-panel");

            return;
        }

        addStyles();

        var grid = document.querySelector(".feature-grid");

        if (!grid) {
            return;
        }

        var card = el("article", "feature-card sf5-card");

        card.appendChild(
            el("div", "feature-icon", "✧")
        );

        card.appendChild(
            el("h3", "", "Neon MIDI Visualizer")
        );

        card.appendChild(
            el(
                "p",
                "",
                "Visualize MIDI notes as glowing neon lines and synchronize them with audio."
            )
        );

        var openButton = makeButton(
            "Open Neon Visualizer",
            true
        );

        openButton.addEventListener("click", function () {
            state.panel.hidden = !state.panel.hidden;

            if (!state.panel.hidden) {
                state.panel.scrollIntoView({
                    behavior: "auto",
                    block: "start"
                });

                resizeCanvas();
                drawFrame();
            }
        });

        card.appendChild(openButton);

        grid.appendChild(card);

        var panel = el("section", "sf5-panel");
        panel.id = "sf5-panel";
        panel.hidden = true;

        state.panel = panel;

        var heading = el("div", "panel-heading");
        var headingContent = document.createElement("div");

        headingContent.appendChild(
            el("p", "eyebrow", "STAGE 3 · VERSION 0.5.0")
        );

        headingContent.appendChild(
            el("h2", "", "Neon MIDI Visualizer")
        );

        var closeButton = makeButton("×");

        closeButton.setAttribute(
            "aria-label",
            "Close visualizer"
        );

        closeButton.addEventListener("click", function () {
            pauseAnimation();
            panel.hidden = true;
        });

        heading.appendChild(headingContent);
        heading.appendChild(closeButton);

        panel.appendChild(heading);

        panel.appendChild(
            el(
                "p",
                "sf5-description",
                "Load a MIDI file to create a centered neon animation. Audio is optional and is loaded locally from your device."
            )
        );

        /* MIDI INPUT */

        panel.appendChild(
            el("label", "sf5-label", "MIDI File")
        );

        state.fileInput = document.createElement("input");

        state.fileInput.type = "file";
        state.fileInput.accept = ".mid,.midi";
        state.fileInput.className = "sf5-file";

        state.fileInput.addEventListener(
            "change",
            handleMidiFile
        );

        panel.appendChild(state.fileInput);

        /* AUDIO INPUT */

        panel.appendChild(
            el("label", "sf5-label", "Audio File (optional)")
        );

        state.audioInput = document.createElement("input");

        state.audioInput.type = "file";
        state.audioInput.accept = "audio/*";
        state.audioInput.className = "sf5-file";

        state.audioInput.addEventListener(
            "change",
            handleAudioFile
        );

        panel.appendChild(state.audioInput);

        state.audioName = el(
            "p",
            "sf5-muted",
            "No audio selected."
        );

        panel.appendChild(state.audioName);

        /* STATUS */

        state.status = el(
            "div",
            "sf5-status",
            "Choose a MIDI file to begin."
        );

        state.status.setAttribute("role", "status");
        state.status.setAttribute("aria-live", "polite");

        panel.appendChild(state.status);

        /* TRANSPORT */

        var actions = el("div", "sf5-actions");

        state.playButton = makeButton("▶ Play", true);
        state.pauseButton = makeButton("Ⅱ Pause");
        state.resetButton = makeButton("↺ Reset");

        state.playButton.disabled = true;
        state.pauseButton.disabled = true;
        state.resetButton.disabled = true;

        state.playButton.addEventListener(
            "click",
            startAnimation
        );

        state.pauseButton.addEventListener(
            "click",
            pauseAnimation
        );

        state.resetButton.addEventListener(
            "click",
            resetAnimation
        );

        actions.appendChild(state.playButton);
        actions.appendChild(state.pauseButton);
        actions.appendChild(state.resetButton);

        panel.appendChild(actions);

        /* SPEED */

        var speedRow = el("div", "sf5-row");

        speedRow.appendChild(
            el("label", "", "Playback speed")
        );

        state.speedInput = document.createElement("input");

        state.speedInput.type = "range";
        state.speedInput.min = "50";
        state.speedInput.max = "150";
        state.speedInput.value = "100";

        state.speedLabel = el("output", "", "1.00×");

        state.speedInput.addEventListener("input", function () {
            state.speedLabel.textContent =
                (Number(state.speedInput.value) / 100).toFixed(2) +
                "×";
        });

        speedRow.appendChild(state.speedInput);
        speedRow.appendChild(state.speedLabel);

        panel.appendChild(speedRow);

        /* AUDIO OFFSET */

        var offsetLabel = el(
            "label",
            "sf5-label",
            "Audio Offset (milliseconds)"
        );

        offsetLabel.htmlFor = "sf5-audio-offset";

        panel.appendChild(offsetLabel);

        state.audioOffset = document.createElement("input");

        state.audioOffset.id = "sf5-audio-offset";
        state.audioOffset.type = "number";
        state.audioOffset.className = "sf5-number";
        state.audioOffset.min = "-60000";
        state.audioOffset.max = "60000";
        state.audioOffset.step = "10";
        state.audioOffset.value = "0";

        state.audioOffset.addEventListener("change", function () {
            if (state.audio) {
                synchronizeAudio(true);
            }
        });

        panel.appendChild(state.audioOffset);

        panel.appendChild(
            el(
                "p",
                "sf5-help",
                "Positive values delay the audio relative to the MIDI timeline. Negative values move the audio earlier. Use small adjustments to align the two files."
            )
        );

        /* COLOR PRESET */

        panel.appendChild(
            el("label", "sf5-label", "Color Preset")
        );

        state.colorPreset = document.createElement("select");
        state.colorPreset.className = "sf5-select";

        [
            ["colorful", "Colorful"],
            ["hue", "Hue"],
            ["gradient", "Gradient"],
            ["white", "Full White"],
            ["black", "Full Black"]
        ].forEach(function (item) {
            var option = document.createElement("option");

            option.value = item[0];
            option.textContent = item[1];

            state.colorPreset.appendChild(option);
        });

        state.colorPreset.addEventListener("change", drawFrame);

        panel.appendChild(state.colorPreset);

        /* TRACK SETTINGS */

        panel.appendChild(
            el("h3", "", "Track Settings")
        );

        panel.appendChild(
            el(
                "p",
                "sf5-help",
                "Adjust opacity and scale separately for each MIDI track."
            )
        );

        state.trackControls = el("div", "");

        panel.appendChild(state.trackControls);

        /* CANVAS */

        var canvasWrap = el("div", "sf5-canvas-wrap");

        state.canvas = document.createElement("canvas");
        state.canvas.className = "sf5-canvas";

        state.canvas.setAttribute(
            "aria-label",
            "Centered neon MIDI visualization"
        );

        canvasWrap.appendChild(state.canvas);

        panel.appendChild(canvasWrap);

        state.context = state.canvas.getContext("2d");

        /* INFORMATION */

        var info = el("div", "sf5-info");

        info.appendChild(
            makeInfoBox("Notes", "sf5-note-count")
        );

        info.appendChild(
            makeInfoBox("Duration", "sf5-duration")
        );

        info.appendChild(
            makeInfoBox("Tempo", "sf5-tempo")
        );

        info.appendChild(
            makeInfoBox("Tracks", "sf5-track-count")
        );

        panel.appendChild(info);

        panel.appendChild(
            el(
                "p",
                "sf5-help",
                "All MIDI parsing and visualization run locally in your browser. Audio support depends on the format supported by your browser."
            )
        );

        var midiPanel = document.getElementById("midi-panel");

        if (midiPanel && midiPanel.parentNode) {
            midiPanel.parentNode.insertBefore(
                panel,
                midiPanel.nextSibling
            );
        } else {
            grid.parentNode.appendChild(panel);
        }

        resizeCanvas();
        drawFrame();
    }

    function makeInfoBox(label, id) {
        var box = document.createElement("div");

        box.appendChild(el("span", "", label));

        var value = el("strong", "", "—");
        value.id = id;

        box.appendChild(value);

        return box;
    }

    function setInfo(id, value) {
        var node = document.getElementById(id);

        if (node) {
            node.textContent = value;
        }
    }

    /* =====================================
       MIDI PARSER
    ===================================== */

    function readVLQ(view, cursor, end) {
        var value = 0;
        var count = 0;
        var byte;

        do {
            if (cursor.pos >= end || count >= 4) {
                throw new Error(
                    "Invalid MIDI variable-length value."
                );
            }

            byte = view.getUint8(cursor.pos++);

            value = (value << 7) | (byte & 0x7F);

            count++;
        } while (byte & 0x80);

        return value;
    }

    function readAscii(view, offset, length) {
        var result = "";

        for (var i = 0; i < length; i++) {
            result += String.fromCharCode(
                view.getUint8(offset + i)
            );
        }

        return result;
    }

    function parseMidi(buffer) {
        var view = new DataView(buffer);

        if (view.byteLength < 14) {
            throw new Error("The MIDI file is too small.");
        }

        if (readAscii(view, 0, 4) !== "MThd") {
            throw new Error("Invalid MIDI header.");
        }

        var headerLength = view.getUint32(4, false);

        if (
            headerLength < 6 ||
            8 + headerLength > view.byteLength
        ) {
            throw new Error("Invalid MIDI header length.");
        }

        var format = view.getUint16(8, false);
        var trackCount = view.getUint16(10, false);
        var division = view.getUint16(12, false);

        if (format !== 0 && format !== 1) {
            throw new Error(
                "Only MIDI format 0 and 1 are supported."
            );
        }

        if (division === 0 || (division & 0x8000)) {
            throw new Error(
                "This MIDI file must use PPQ timing."
            );
        }

        if (!trackCount) {
            throw new Error("No MIDI tracks were found.");
        }

        var ppq = division;
        var position = 8 + headerLength;

        var notes = [];
        var tempos = [];
        var tracks = [];
        var maximumTick = 0;

        for (
            var trackIndex = 0;
            trackIndex < trackCount;
            trackIndex++
        ) {
            if (position + 8 > view.byteLength) {
                throw new Error("A MIDI track is missing.");
            }

            var chunkType = readAscii(view, position, 4);

            var chunkLength = view.getUint32(
                position + 4,
                false
            );

            var trackStart = position + 8;
            var trackEnd = trackStart + chunkLength;

            if (
                chunkType !== "MTrk" ||
                trackEnd > view.byteLength
            ) {
                throw new Error(
                    "A MIDI track is invalid or incomplete."
                );
            }

            position = trackEnd;

            var cursor = { pos: trackStart };
            var tick = 0;
            var runningStatus = null;

            var activeNotes = Object.create(null);

            var trackInfo = {
                index: trackIndex,
                name: "Track " + (trackIndex + 1),
                noteCount: 0
            };

            while (cursor.pos < trackEnd) {
                tick += readVLQ(view, cursor, trackEnd);

                maximumTick = Math.max(maximumTick, tick);

                if (cursor.pos >= trackEnd) {
                    throw new Error("Incomplete MIDI event.");
                }

                var firstByte = view.getUint8(cursor.pos);
                var status;

                if (firstByte < 0x80) {
                    if (runningStatus === null) {
                        throw new Error(
                            "Invalid MIDI running status."
                        );
                    }

                    status = runningStatus;
                } else {
                    status = firstByte;
                    cursor.pos++;
                }

                /* META EVENTS */

                if (status === 0xFF) {
                    runningStatus = null;

                    if (cursor.pos >= trackEnd) {
                        throw new Error(
                            "Incomplete MIDI meta event."
                        );
                    }

                    var metaType = view.getUint8(cursor.pos++);

                    var metaLength = readVLQ(
                        view,
                        cursor,
                        trackEnd
                    );

                    if (
                        cursor.pos + metaLength > trackEnd
                    ) {
                        throw new Error(
                            "Invalid MIDI meta event length."
                        );
                    }

                    if (
                        metaType === 0x03 &&
                        metaLength > 0
                    ) {
                        trackInfo.name = readAscii(
                            view,
                            cursor.pos,
                            Math.min(metaLength, 200)
                        );
                    }

                    if (
                        metaType === 0x51 &&
                        metaLength === 3
                    ) {
                        var microseconds =
                            (
                                view.getUint8(cursor.pos) << 16
                            ) |
                            (
                                view.getUint8(cursor.pos + 1) << 8
                            ) |
                            view.getUint8(cursor.pos + 2);

                        if (microseconds > 0) {
                            tempos.push({
                                tick: tick,
                                tempo: microseconds
                            });
                        }
                    }

                    cursor.pos += metaLength;

                    if (metaType === 0x2F) {
                        cursor.pos = trackEnd;
                    }

                    continue;
                }

                /* SYSTEM EXCLUSIVE */

                if (status === 0xF0 || status === 0xF7) {
                    runningStatus = null;

                    var sysexLength = readVLQ(
                        view,
                        cursor,
                        trackEnd
                    );

                    if (
                        cursor.pos + sysexLength > trackEnd
                    ) {
                        throw new Error(
                            "Invalid MIDI SysEx event."
                        );
                    }

                    cursor.pos += sysexLength;

                    continue;
                }

                if (status >= 0xF0) {
                    throw new Error(
                        "Unsupported MIDI system event."
                    );
                }

                runningStatus = status;

                var command = status & 0xF0;
                var channel = status & 0x0F;

                var dataLength =
                    command === 0xC0 ||
                    command === 0xD0
                        ? 1
                        : 2;

                var data = [];

                for (var d = 0; d < dataLength; d++) {
                    if (cursor.pos >= trackEnd) {
                        throw new Error(
                            "Incomplete MIDI channel event."
                        );
                    }

                    var dataByte = view.getUint8(cursor.pos++);

                    if (dataByte >= 0x80) {
                        throw new Error(
                            "Invalid MIDI channel data."
                        );
                    }

                    data.push(dataByte);
                }

                /* NOTE ON */

                if (
                    command === 0x90 &&
                    dataLength === 2 &&
                    data[1] > 0
                ) {
                    var key = channel + ":" + data[0];

                    if (!activeNotes[key]) {
                        activeNotes[key] = [];
                    }

                    activeNotes[key].push({
                        tick: tick,
                        pitch: data[0],
                        velocity: data[1],
                        channel: channel,
                        track: trackIndex
                    });

                } else if (
                    command === 0x80 ||
                    (
                        command === 0x90 &&
                        dataLength === 2 &&
                        data[1] === 0
                    )
                ) {
                    var offKey = channel + ":" + data[0];

                    var queue = activeNotes[offKey];

                    if (queue && queue.length) {
                        var active = queue.shift();

                        if (notes.length >= MAX_NOTES) {
                            throw new Error(
                                "This MIDI has too many notes for this prototype."
                            );
                        }

                        notes.push({
                            startTick: active.tick,
                            endTick: Math.max(
                                active.tick + 1,
                                tick
                            ),
                            pitch: active.pitch,
                            velocity: active.velocity,
                            channel: active.channel,
                            track: active.track
                        });

                        trackInfo.noteCount++;
                    }
                }
            }

            /* CLOSE UNMATCHED NOTES */

            Object.keys(activeNotes).forEach(function (key) {
                activeNotes[key].forEach(function (active) {
                    if (notes.length >= MAX_NOTES) {
                        return;
                    }

                    notes.push({
                        startTick: active.tick,
                        endTick: Math.max(
                            active.tick + 1,
                            tick
                        ),
                        pitch: active.pitch,
                        velocity: active.velocity,
                        channel: active.channel,
                        track: active.track
                    });

                    trackInfo.noteCount++;
                });
            });

            tracks.push(trackInfo);
        }

        if (!notes.length) {
            throw new Error(
                "No playable MIDI notes were found."
            );
        }

        /* TEMPO MAP */

        tempos.sort(function (a, b) {
            return a.tick - b.tick;
        });

        if (!tempos.length || tempos[0].tick > 0) {
            tempos.unshift({
                tick: 0,
                tempo: 500000
            });
        }

        var uniqueTempos = [];

        tempos.forEach(function (item) {
            if (
                uniqueTempos.length &&
                uniqueTempos[uniqueTempos.length - 1].tick === item.tick
            ) {
                uniqueTempos[uniqueTempos.length - 1] = item;
            } else {
                uniqueTempos.push(item);
            }
        });

        function tickToSeconds(targetTick) {
            var seconds = 0;
            var previousTick = 0;
            var currentTempo = 500000;

            for (var i = 0; i < uniqueTempos.length; i++) {
                var event = uniqueTempos[i];

                if (event.tick > targetTick) {
                    break;
                }

                if (event.tick > previousTick) {
                    seconds +=
                        (event.tick - previousTick) *
                        currentTempo /
                        ppq /
                        1000000;

                    previousTick = event.tick;
                }

                currentTempo = event.tempo;
            }

            if (targetTick > previousTick) {
                seconds +=
                    (targetTick - previousTick) *
                    currentTempo /
                    ppq /
                    1000000;
            }

            return seconds;
        }

        var minPitch = 127;
        var maxPitch = 0;
        var duration = 0;

        notes.forEach(function (note) {
            note.start = tickToSeconds(note.startTick);
            note.end = tickToSeconds(note.endTick);

            note.end = Math.max(
                note.start + 0.02,
                note.end
            );

            minPitch = Math.min(minPitch, note.pitch);
            maxPitch = Math.max(maxPitch, note.pitch);

            duration = Math.max(duration, note.end);
        });

        duration = Math.max(
            duration,
            tickToSeconds(maximumTick)
        );

        return {
            notes: notes,
            tracks: tracks,
            duration: duration,
            tempo: 60000000 / uniqueTempos[0].tempo,
            minPitch: minPitch,
            maxPitch: maxPitch
        };
    }

    /* =====================================
       TRACK SETTINGS
    ===================================== */

    function buildTrackSettings() {
        if (!state.trackControls) {
            return;
        }

        state.trackControls.textContent = "";

        state.tracks.forEach(function (track) {
            state.settings[track.index] = {
                opacity: 0.85,
                scale: 1
            };

            var box = el("div", "sf5-track");

            box.appendChild(
                el(
                    "p",
                    "sf5-track-title",
                    track.name + " · " +
                    track.noteCount + " notes"
                )
            );

            /* OPACITY */

            var opacityRow = el("div", "sf5-row");

            opacityRow.appendChild(
                el("label", "", "Opacity")
            );

            var opacityInput = document.createElement("input");

            opacityInput.type = "range";
            opacityInput.min = "10";
            opacityInput.max = "100";
            opacityInput.value = "85";

            var opacityOutput = el("output", "", "85%");

            opacityInput.addEventListener("input", function () {
                var value = Number(opacityInput.value);

                state.settings[track.index].opacity = value / 100;

                opacityOutput.textContent = value + "%";

                drawFrame();
            });

            opacityRow.appendChild(opacityInput);
            opacityRow.appendChild(opacityOutput);

            box.appendChild(opacityRow);

            /* SCALE */

            var scaleRow = el("div", "sf5-row");

            scaleRow.appendChild(
                el("label", "", "Scale / Depth")
            );

            var scaleInput = document.createElement("input");

            scaleInput.type = "range";
            scaleInput.min = "50";
            scaleInput.max = "200";
            scaleInput.value = "100";

            var scaleOutput = el("output", "", "1.00×");

            scaleInput.addEventListener("input", function () {
                var value = Number(scaleInput.value);

                state.settings[track.index].scale = value / 100;

                scaleOutput.textContent =
                    (value / 100).toFixed(2) + "×";

                drawFrame();
            });

            scaleRow.appendChild(scaleInput);
            scaleRow.appendChild(scaleOutput);

            box.appendChild(scaleRow);

            state.trackControls.appendChild(box);
        });
    }

    /* =====================================
       MIDI FILE LOADING
    ===================================== */

    function handleMidiFile(event) {
        var file = event.target.files &&
            event.target.files[0];

        if (!file) {
            return;
        }

        pauseAnimation();

        if (!/\.(mid|midi)$/i.test(file.name)) {
            setStatus(
                "Please select a .mid or .midi file.",
                "error"
            );

            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setStatus(
                "This MIDI file exceeds 50 MB.",
                "error"
            );

            return;
        }

        setStatus("Reading MIDI file...");

        var reader = new FileReader();

        reader.onload = function () {
            try {
                var parsed = parseMidi(reader.result);

                state.notes = parsed.notes;
                state.tracks = parsed.tracks;
                state.duration = parsed.duration;
                state.tempo = parsed.tempo;

                state.currentTime = 0;

                state.minPitch = Math.max(
                    0,
                    parsed.minPitch - 2
                );

                state.maxPitch = Math.min(
                    127,
                    parsed.maxPitch + 2
                );

                state.effects = [];
                state.loaded = true;

                buildTrackSettings();

                setInfo(
                    "sf5-note-count",
                    String(state.notes.length)
                );

                setInfo(
                    "sf5-duration",
                    formatTime(state.duration)
                );

                setInfo(
                    "sf5-tempo",
                    state.tempo.toFixed(1) + " BPM"
                );

                setInfo(
                    "sf5-track-count",
                    String(state.tracks.length)
                );

                state.playButton.disabled = false;
                state.pauseButton.disabled = false;
                state.resetButton.disabled = false;

                resizeCanvas();
                drawFrame();

                setStatus(
                    "MIDI loaded. Press Play to begin.",
                    "success"
                );

            } catch (error) {
                state.notes = [];
                state.tracks = [];
                state.duration = 0;
                state.currentTime = 0;
                state.loaded = false;

                drawFrame();

                setStatus(
                    error && error.message
                        ? error.message
                        : "Unable to parse this MIDI file.",
                    "error"
                );
            }
        };

        reader.onerror = function () {
            setStatus(
                "Unable to read the selected MIDI file.",
                "error"
            );
        };

        reader.readAsArrayBuffer(file);
    }

    /* =====================================
       AUDIO LOADING
    ===================================== */

    function handleAudioFile(event) {
        var file = event.target.files &&
            event.target.files[0];

        if (!file) {
            return;
        }

        pauseAnimation();

        if (state.audio) {
            state.audio.pause();
            state.audio.removeAttribute("src");
            state.audio.load();
            state.audio = null;
        }

        if (state.audioURL) {
            URL.revokeObjectURL(state.audioURL);
            state.audioURL = null;
        }

        state.audioURL = URL.createObjectURL(file);

        state.audio = new Audio();
        state.audio.preload = "metadata";
        state.audio.src = state.audioURL;

        state.audioName.textContent = file.name;

        state.audio.addEventListener("error", function () {
            setStatus(
                "The browser could not load this audio format. Try another audio file.",
                "error"
            );
        });

        state.audio.addEventListener("loadedmetadata", function () {
            setStatus(
                "Audio loaded. Adjust Audio Offset if necessary.",
                "success"
            );
        });

        setStatus("Loading audio...");
    }

    /* =====================================
       TIME HELPERS
    ===================================== */

    function formatTime(seconds) {
        if (!isFinite(seconds) || seconds < 0) {
            return "00:00";
        }

        var total = Math.floor(seconds);
        var minutes = Math.floor(total / 60);
        var remaining = total % 60;

        return (
            String(minutes).padStart(2, "0") +
            ":" +
            String(remaining).padStart(2, "0")
        );
    }

    function getAudioOffset() {
        if (!state.audioOffset) {
            return 0;
        }

        var milliseconds = Number(state.audioOffset.value);

        if (!isFinite(milliseconds)) {
            return 0;
        }

        return clamp(milliseconds, -60000, 60000) / 1000;
    }

    /* =====================================
       AUDIO SYNCHRONIZATION
    ===================================== */

    function synchronizeAudio(forceSeek) {
        var audio = state.audio;

        if (!audio || !isFinite(audio.duration)) {
            return;
        }

        /*
        Positive offset:
        audio starts later than the MIDI timeline.

        Negative offset:
        audio starts from a later position in its file.
        */

        var offset = getAudioOffset();

        var targetAudioTime =
            state.currentTime - offset;

        if (targetAudioTime < 0) {
            audio.pause();

            if (forceSeek) {
                try {
                    audio.currentTime = 0;
                } catch (error) {
                    /* Metadata may not be ready yet. */
                }
            }

            return;
        }

        if (targetAudioTime >= audio.duration) {
            audio.pause();
            return;
        }

        var drift = Math.abs(
            audio.currentTime - targetAudioTime
        );

        if (forceSeek || drift > 0.20) {
            try {
                audio.currentTime = targetAudioTime;
            } catch (error) {
                /* The browser may not have loaded metadata. */
            }
        }

        if (state.playing && audio.paused) {
            var playPromise = audio.play();

            if (playPromise && playPromise.catch) {
                playPromise.catch(function () {
                    setStatus(
                        "Audio playback was blocked. Press Play again to allow playback.",
                        "error"
                    );
                });
            }
        }
    }

    /* =====================================
       COLOR PRESETS
    ===================================== */

    function noteColor(note, progress) {
        var preset = state.colorPreset
            ? state.colorPreset.value
            : "colorful";

        var hue;

        if (preset === "white") {
            return "255,255,255";
        }

        if (preset === "black") {
            return "80,95,115";
        }

        if (preset === "hue") {
            hue = (
                185 +
                note.pitch * 3 +
                note.channel * 19
            ) % 360;

        } else if (preset === "gradient") {
            hue = (
                180 +
                progress * 140
            ) % 360;

        } else {
            hue = (
                note.pitch * 7 +
                note.track * 67 +
                note.channel * 23
            ) % 360;
        }

        var color = hslToRgb(hue / 360, 1, 0.65);

        return color[0] + "," + color[1] + "," + color[2];
    }

    function hslToRgb(h, s, l) {
        var r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            var q = l < 0.5
                ? l * (1 + s)
                : l + s - l * s;

            var p = 2 * l - q;

            r = hueToRgb(p, q, h + 1 / 3);
            g = hueToRgb(p, q, h);
            b = hueToRgb(p, q, h - 1 / 3);
        }

        return [
            Math.round(r * 255),
            Math.round(g * 255),
            Math.round(b * 255)
        ];
    }

    function hueToRgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;

        if (t < 1 / 6) {
            return p + (q - p) * 6 * t;
        }

        if (t < 1 / 2) {
            return q;
        }

        if (t < 2 / 3) {
            return p + (q - p) * (2 / 3 - t) * 6;
        }

        return p;
    }

    /* =====================================
       CANVAS
    ===================================== */

    function resizeCanvas() {
        if (!state.canvas || !state.context) {
            return;
        }

        var rect = state.canvas.getBoundingClientRect();

        if (!rect.width || !rect.height) {
            return;
        }

        /*
        Keep the internal canvas resolution modest
        for devices with limited memory.
        */

        var ratio = Math.min(
            window.devicePixelRatio || 1,
            1.5
        );

        state.canvas.width = Math.floor(rect.width * ratio);
        state.canvas.height = Math.floor(rect.height * ratio);

        state.context.setTransform(
            ratio,
            0,
            0,
            ratio,
            0,
            0
        );

        drawFrame();
    }

    function drawFrame() {
        if (!state.canvas || !state.context) {
            return;
        }

        var ctx = state.context;

        var width = state.canvas.clientWidth;
        var height = state.canvas.clientHeight;

        if (!width || !height) {
            return;
        }

        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        if (!state.notes.length) {
            ctx.fillStyle = "#74859b";
            ctx.font = "12px sans-serif";
            ctx.textAlign = "center";

            ctx.fillText(
                "LOAD MIDI TO BEGIN",
                width / 2,
                height / 2
            );

            return;
        }

        var centerX = width / 2;
        var centerY = height / 2;

        var usableHeight = height - 30;

        var pitchRange = Math.max(
            1,
            state.maxPitch - state.minPitch + 1
        );

        var rowHeight = usableHeight / pitchRange;

        /*
        Background grid.
        */

        ctx.strokeStyle = "rgba(60,120,150,0.10)";
        ctx.lineWidth = 1;

        for (var i = 0; i < 7; i++) {
            var gridX = width * i / 6;

            ctx.beginPath();
            ctx.moveTo(gridX, 0);
            ctx.lineTo(gridX, height);
            ctx.stroke();
        }

        /*
        Centered horizontal reference.
        */

        ctx.strokeStyle = "rgba(90,210,255,0.18)";

        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        /*
        Visible note region:
        upcoming notes approach from the right;
        notes move toward the fixed center playhead.
        */

        var visibleDuration =
            width / PIXELS_PER_SECOND;

        var startTime =
            state.currentTime - visibleDuration / 2;

        var endTime =
            state.currentTime + visibleDuration / 2;

        var preset = state.colorPreset
            ? state.colorPreset.value
            : "colorful";

        /*
        Draw note lines.
        */

        for (var n = 0; n < state.notes.length; n++) {
            var note = state.notes[n];

            if (
                note.end < startTime ||
                note.start > endTime
            ) {
                continue;
            }

            var settings = state.settings[note.track] || {
                opacity: 0.85,
                scale: 1
            };

            var x1 = centerX +
                (note.start - state.currentTime) *
                PIXELS_PER_SECOND;

            var x2 = centerX +
                (note.end - state.currentTime) *
                PIXELS_PER_SECOND;

            var y =
                15 +
                (state.maxPitch - note.pitch) *
                rowHeight;

            var trackScale = settings.scale;

            var lineHeight = clamp(
                rowHeight * 0.30 * trackScale,
                1,
                7
            );

            var opacity = settings.opacity *
                (0.35 + note.velocity / 127 * 0.65);

            x1 = clamp(x1, -10, width + 10);
            x2 = clamp(x2, -10, width + 10);

            var length = x2 - x1;

            if (length <= 0) {
                continue;
            }

            var rgb = noteColor(
                note,
                note.start / Math.max(1, state.duration)
            );

            /*
            Keep the glow subtle to reduce rendering cost.
            */

            ctx.globalAlpha = opacity;

            if (preset !== "black") {
                ctx.shadowBlur = 5;
                ctx.shadowColor = "rgb(" + rgb + ")";
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.strokeStyle = "rgb(" + rgb + ")";
            ctx.lineWidth = lineHeight;

            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
            ctx.stroke();

            /*
            Bright note head.
            */

            ctx.fillStyle =
                preset === "black"
                    ? "#a8b4c6"
                    : "rgba(255,255,255,0.9)";

            ctx.fillRect(
                x1 - 1,
                y - lineHeight,
                2,
                lineHeight * 2
            );

            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        /*
        Circle effects around notes crossing
        the center playhead.
        */

        if (state.playing) {
            if (
                performance.now() - state.lastEffectCheck > 80
            ) {
                state.lastEffectCheck = performance.now();

                for (
                    var j = 0;
                    j < state.notes.length;
                    j++
                ) {
                    var effectNote = state.notes[j];

                    if (
                        Math.abs(
                            effectNote.start - state.currentTime
                        ) < 0.07
                    ) {
                        state.effects.push({
                            pitch: effectNote.pitch,
                            track: effectNote.track,
                            age: 0
                        });
                    }
                }
            }
        }

        for (
            var e = state.effects.length - 1;
            e >= 0;
            e--
        ) {
            var effect = state.effects[e];

            var effectSettings =
                state.settings[effect.track] || {
                    opacity: 0.85,
                    scale: 1
                };

            var effectY =
                15 +
                (state.maxPitch - effect.pitch) *
                rowHeight;

            var radius =
                3 +
                effect.age * 38 *
                effectSettings.scale;

            var effectAlpha =
                effectSettings.opacity *
                (1 - effect.age);

            if (effectAlpha <= 0 || effect.age >= 1) {
                state.effects.splice(e, 1);
                continue;
            }

            ctx.globalAlpha = effectAlpha;

            ctx.strokeStyle =
                preset === "white"
                    ? "#ffffff"
                    : preset === "black"
                        ? "#8290a3"
                        : "#5ceaff";

            ctx.lineWidth = 1.5;

            ctx.beginPath();

            ctx.arc(
                centerX,
                effectY,
                radius,
                0,
                Math.PI * 2
            );

            ctx.stroke();

            ctx.globalAlpha = 1;

            if (state.playing) {
                effect.age += 0.035;
            }
        }

        /*
        Fixed center playhead.
        */

        ctx.shadowBlur = 8;
        ctx.shadowColor = "#57eaff";

        ctx.strokeStyle = "#57eaff";
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);
        ctx.stroke();

        ctx.shadowBlur = 0;

        /*
        Timeline label.
        */

        ctx.fillStyle = "#8eeeff";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";

        ctx.fillText(
            formatTime(state.currentTime),
            centerX,
            height - 7
        );

        ctx.globalAlpha = 1;
    }

    /* =====================================
       PLAYBACK
    ===================================== */

    function startAnimation() {
        if (!state.loaded || !state.notes.length) {
            setStatus(
                "Load a MIDI file first.",
                "error"
            );

            return;
        }

        if (state.currentTime >= state.duration) {
            state.currentTime = 0;
            state.effects = [];
        }

        state.playing = true;
        state.lastFrame = 0;

        if (state.animationId) {
            cancelAnimationFrame(state.animationId);
        }

        synchronizeAudio(true);

        state.animationId =
            requestAnimationFrame(animate);

        setStatus("Playback started.", "success");
    }

    function animate(timestamp) {
        if (!state.playing) {
            return;
        }

        if (!state.lastFrame) {
            state.lastFrame = timestamp;
        }

        var delta =
            (timestamp - state.lastFrame) / 1000;

        state.lastFrame = timestamp;

        /*
        Avoid large jumps after browser interruptions.
        */

        delta = Math.min(delta, 0.08);

        var speed =
            Number(state.speedInput.value) / 100;

        state.currentTime += delta * speed;

        synchronizeAudio(false);

        if (state.currentTime >= state.duration) {
            state.currentTime = state.duration;

            state.playing = false;
            state.animationId = null;

            if (state.audio) {
                state.audio.pause();
            }

            drawFrame();

            setStatus(
                "Playback complete. Press Reset to replay.",
                "success"
            );

            return;
        }

        drawFrame();

        state.animationId =
            requestAnimationFrame(animate);
    }

    function pauseAnimation() {
        state.playing = false;

        if (state.animationId) {
            cancelAnimationFrame(state.animationId);
            state.animationId = null;
        }

        state.lastFrame = 0;

        if (state.audio) {
            state.audio.pause();
        }

        drawFrame();
    }

    function resetAnimation() {
        pauseAnimation();

        state.currentTime = 0;
        state.effects = [];

        if (state.audio) {
            try {
                state.audio.currentTime = Math.max(
                    0,
                    -getAudioOffset()
                );
            } catch (error) {
                /* Audio metadata may not be ready. */
            }
        }

        drawFrame();

        setStatus(
            "Playback reset. Press Play to replay."
        );
    }

    /* =====================================
       CLEANUP
    ===================================== */

    window.addEventListener(
        "resize",
        resizeCanvas
    );

    document.addEventListener(
        "visibilitychange",
        function () {
            if (document.hidden) {
                pauseAnimation();
            }
        }
    );

    window.addEventListener(
        "pagehide",
        function () {
            pauseAnimation();

            if (state.audio) {
                state.audio.pause();
            }

            if (state.audioURL) {
                URL.revokeObjectURL(state.audioURL);
                state.audioURL = null;
            }
        }
    );

    /* =====================================
       INITIALIZE
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
