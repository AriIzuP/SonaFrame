/*
Project: SonaFrame
File: midi-visualizer.js
Version: 0.4.0

Stage 3: MIDI Visualizer

Features:
- Import MIDI files locally
- Parse MIDI note events and tempo
- Display a scrolling piano roll
- Play, pause, and reset animation
- Responsive canvas for mobile devices
- No external libraries

Limitations:
- Visual animation only; no audio playback
- Supports MIDI format 0 and 1
- Supports PPQ timing, not SMPTE timing
*/

(function () {
    "use strict";

    var MAX_FILE_SIZE = 50 * 1024 * 1024;

    var state = {
        notes: [],
        duration: 0,
        currentTime: 0,
        playing: false,
        animationId: null,
        lastFrame: 0,
        canvas: null,
        context: null,
        panel: null,
        fileInput: null,
        status: null,
        playButton: null,
        pauseButton: null,
        resetButton: null,
        speedInput: null,
        speedLabel: null,
        fileName: null,
        tempo: 120,
        minPitch: 36,
        maxPitch: 84
    };

    function element(tag, className, text) {
        var node = document.createElement(tag);

        if (className) {
            node.className = className;
        }

        if (text !== undefined && text !== null) {
            node.textContent = text;
        }

        return node;
    }

    function button(text, className) {
        var node = element(
            "button",
            "sf-viz-button " + (className || ""),
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
        state.status.className = "sf-viz-status";

        if (type) {
            state.status.classList.add("is-" + type);
        }
    }

    function addStyles() {
        if (document.getElementById("sf-viz-styles")) {
            return;
        }

        var style = document.createElement("style");

        style.id = "sf-viz-styles";

        style.textContent = `
            .sf-viz-card {
                margin-top: 18px;
            }

            .sf-viz-panel {
                margin-top: 16px;
                padding: 15px;
                border: 1px solid var(--border, #2a354b);
                border-radius: 16px;
                background: var(--surface, #111827);
                color: var(--text, #f1f5f9);
            }

            .sf-viz-panel h2,
            .sf-viz-panel h3 {
                margin-top: 0;
            }

            .sf-viz-description,
            .sf-viz-help {
                font-size: 13px;
                line-height: 1.6;
                color: var(--muted, #a6b1c4);
            }

            .sf-viz-file {
                display: block;
                width: 100%;
                box-sizing: border-box;
                margin: 12px 0;
                padding: 12px;
                border: 1px dashed var(--border, #2a354b);
                border-radius: 10px;
                color: inherit;
                background: var(--surface-light, #192338);
                font: inherit;
            }

            .sf-viz-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin: 12px 0;
            }

            .sf-viz-button {
                min-height: 42px;
                padding: 9px 13px;
                border: 1px solid var(--border, #2a354b);
                border-radius: 10px;
                background: var(--surface-light, #192338);
                color: var(--text, #f1f5f9);
                font: inherit;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
            }

            .sf-viz-primary {
                background: var(--accent, #a78bfa);
                color: #111827;
                border-color: transparent;
            }

            .sf-viz-button:disabled {
                opacity: .45;
                cursor: not-allowed;
            }

            .sf-viz-status {
                margin: 12px 0;
                padding: 11px;
                border-radius: 9px;
                background: var(--surface-light, #192338);
                font-size: 12px;
                line-height: 1.6;
                overflow-wrap: anywhere;
            }

            .sf-viz-status.is-error {
                border: 1px solid #d55;
            }

            .sf-viz-status.is-success {
                border: 1px solid #3a8;
            }

            .sf-viz-canvas-wrap {
                width: 100%;
                margin-top: 14px;
                overflow: hidden;
                border: 1px solid var(--border, #2a354b);
                border-radius: 10px;
                background: #0b1020;
            }

            .sf-viz-canvas {
                display: block;
                width: 100%;
                height: 300px;
                touch-action: pan-y;
            }

            .sf-viz-speed {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 12px;
                font-size: 12px;
            }

            .sf-viz-speed input {
                flex: 1;
                min-width: 100px;
            }

            .sf-viz-info {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
                margin-top: 12px;
            }

            .sf-viz-info div {
                min-width: 0;
                padding: 10px;
                border: 1px solid var(--border, #2a354b);
                border-radius: 9px;
                overflow-wrap: anywhere;
            }

            .sf-viz-info span {
                display: block;
                margin-bottom: 4px;
                color: var(--muted, #a6b1c4);
                font-size: 11px;
            }

            .sf-viz-info strong {
                font-size: 13px;
            }

            @media (max-width: 360px) {
                .sf-viz-panel {
                    padding: 10px;
                }

                .sf-viz-canvas {
                    height: 250px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function createInterface() {
        if (document.getElementById("sf-viz-panel")) {
            state.panel =
                document.getElementById("sf-viz-panel");

            return;
        }

        addStyles();

        var card = element(
            "article",
            "feature-card sf-viz-card"
        );

        card.appendChild(
            element("div", "feature-icon", "▥")
        );

        card.appendChild(
            element("h3", "", "MIDI Visualizer")
        );

        card.appendChild(
            element(
                "p",
                "",
                "Animate MIDI notes in a scrolling piano roll."
            )
        );

        var openButton = button(
            "Open MIDI Visualizer",
            "sf-viz-primary"
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

        var grid = document.querySelector(".feature-grid");

        if (grid) {
            grid.appendChild(card);
        }

        var panel = element("section", "sf-viz-panel");
        panel.id = "sf-viz-panel";
        panel.hidden = true;

        state.panel = panel;

        var heading = element("div", "panel-heading");
        var headingText = document.createElement("div");

        headingText.appendChild(
            element("p", "eyebrow", "STAGE 3")
        );

        headingText.appendChild(
            element("h2", "", "MIDI Visualizer")
        );

        var closeButton = button("×");

        closeButton.setAttribute(
            "aria-label",
            "Close MIDI Visualizer"
        );

        closeButton.addEventListener("click", function () {
            stopAnimation();
            panel.hidden = true;
        });

        heading.appendChild(headingText);
        heading.appendChild(closeButton);

        panel.appendChild(heading);

        panel.appendChild(
            element(
                "p",
                "sf-viz-description",
                "Choose a MIDI file to display its notes on a scrolling piano roll. This prototype animates note positions but does not play audio."
            )
        );

        state.fileInput = document.createElement("input");

        state.fileInput.type = "file";
        state.fileInput.accept =
            ".mid,.midi,audio/midi,audio/x-midi";

        state.fileInput.className = "sf-viz-file";

        state.fileInput.setAttribute(
            "aria-label",
            "Choose a MIDI file to visualize"
        );

        state.fileInput.addEventListener(
            "change",
            handleFile
        );

        panel.appendChild(state.fileInput);

        state.fileName = element(
            "p",
            "sf-viz-help",
            "No MIDI file loaded."
        );

        panel.appendChild(state.fileName);

        state.status = element(
            "div",
            "sf-viz-status",
            "Choose a MIDI file to begin."
        );

        state.status.setAttribute("role", "status");
        state.status.setAttribute("aria-live", "polite");

        panel.appendChild(state.status);

        var actions = element("div", "sf-viz-actions");

        state.playButton = button(
            "▶ Play",
            "sf-viz-primary"
        );

        state.pauseButton = button("Ⅱ Pause");
        state.resetButton = button("↺ Reset");

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

        var speedRow = element("div", "sf-viz-speed");

        speedRow.appendChild(
            element("label", "", "Animation speed")
        );

        state.speedInput = document.createElement("input");
        state.speedInput.type = "range";
        state.speedInput.min = "25";
        state.speedInput.max = "200";
        state.speedInput.value = "100";

        state.speedInput.setAttribute(
            "aria-label",
            "Animation speed"
        );

        state.speedLabel = element("strong", "", "1.0×");

        state.speedInput.addEventListener(
            "input",
            function () {
                state.speedLabel.textContent =
                    (
                        Number(state.speedInput.value) / 100
                    ).toFixed(2) + "×";
            }
        );

        speedRow.appendChild(state.speedInput);
        speedRow.appendChild(state.speedLabel);

        panel.appendChild(speedRow);

        var canvasWrap = element(
            "div",
            "sf-viz-canvas-wrap"
        );

        state.canvas = document.createElement("canvas");
        state.canvas.className = "sf-viz-canvas";

        state.canvas.setAttribute(
            "aria-label",
            "Animated MIDI piano roll"
        );

        canvasWrap.appendChild(state.canvas);
        panel.appendChild(canvasWrap);

        state.context = state.canvas.getContext("2d");

        var info = element("div", "sf-viz-info");

        info.appendChild(makeInfoBox("Notes", "viz-note-count"));
        info.appendChild(makeInfoBox("Duration", "viz-duration"));
        info.appendChild(makeInfoBox("Tempo", "viz-tempo"));
        info.appendChild(makeInfoBox("Pitch range", "viz-pitch-range"));

        panel.appendChild(info);

        panel.appendChild(
            element(
                "p",
                "sf-viz-help",
                "Tip: longer notes appear as longer bars. The vertical piano range adjusts to the notes found in your MIDI file. All processing happens in your browser."
            )
        );

        var midiPanel = document.getElementById("midi-panel");

        if (midiPanel && midiPanel.parentNode) {
            midiPanel.parentNode.insertBefore(
                panel,
                midiPanel.nextSibling
            );
        } else {
            document.body.appendChild(panel);
        }

        resizeCanvas();
        drawFrame();
    }

    function makeInfoBox(label, id) {
        var box = document.createElement("div");

        box.appendChild(element("span", "", label));

        var value = element("strong", "", "—");
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
            count += 1;
        } while (byte & 0x80);

        return value;
    }

    function readAscii(view, offset, length) {
        var text = "";

        for (var i = 0; i < length; i += 1) {
            text += String.fromCharCode(
                view.getUint8(offset + i)
            );
        }

        return text;
    }

    function parseMidi(buffer) {
        var view = new DataView(buffer);

        if (view.byteLength < 14) {
            throw new Error("The selected file is too small to be MIDI.");
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
                "Only MIDI format 0 and format 1 are supported."
            );
        }

        if ((division & 0x8000) !== 0 || division === 0) {
            throw new Error(
                "This file must use PPQ timing, not SMPTE timing."
            );
        }

        var ppq = division;
        var position = 8 + headerLength;
        var notes = [];
        var tempos = [];
        var maxTick = 0;

        for (var trackIndex = 0; trackIndex < trackCount; trackIndex++) {
            if (
                position + 8 > view.byteLength ||
                readAscii(view, position, 4) !== "MTrk"
            ) {
                throw new Error(
                    "MIDI track " + (trackIndex + 1) + " is missing or invalid."
                );
            }

            var trackLength = view.getUint32(position + 4, false);
            var trackStart = position + 8;
            var trackEnd = trackStart + trackLength;

            if (trackEnd > view.byteLength) {
                throw new Error(
                    "A MIDI track extends beyond the end of the file."
                );
            }

            var cursor = { pos: trackStart };
            var tick = 0;
            var runningStatus = null;

            var activeNotes = Object.create(null);

            while (cursor.pos < trackEnd) {
                tick += readVLQ(view, cursor, trackEnd);

                if (tick > maxTick) {
                    maxTick = tick;
                }

                if (cursor.pos >= trackEnd) {
                    throw new Error("Incomplete MIDI event.");
                }

                var firstByte = view.getUint8(cursor.pos);
                var status;

                if (firstByte < 0x80) {
                    if (runningStatus === null) {
                        throw new Error("Invalid MIDI running status.");
                    }

                    status = runningStatus;
                } else {
                    status = firstByte;
                    cursor.pos += 1;
                }

                if (status === 0xFF) {
                    runningStatus = null;

                    if (cursor.pos >= trackEnd) {
                        throw new Error("Incomplete MIDI meta event.");
                    }

                    var metaType = view.getUint8(cursor.pos++);

                    var metaLength = readVLQ(
                        view,
                        cursor,
                        trackEnd
                    );

                    if (cursor.pos + metaLength > trackEnd) {
                        throw new Error("Invalid MIDI meta event length.");
                    }

                    if (metaType === 0x51 && metaLength === 3) {
                        var tempo =
                            (view.getUint8(cursor.pos) << 16) |
                            (view.getUint8(cursor.pos + 1) << 8) |
                            view.getUint8(cursor.pos + 2);

                        if (tempo > 0) {
                            tempos.push({
                                tick: tick,
                                tempo: tempo
                            });
                        }
                    }

                    cursor.pos += metaLength;

                    if (metaType === 0x2F) {
                        cursor.pos = trackEnd;
                    }

                    continue;
                }

                if (status === 0xF0 || status === 0xF7) {
                    runningStatus = null;

                    var sysexLength = readVLQ(
                        view,
                        cursor,
                        trackEnd
                    );

                    if (cursor.pos + sysexLength > trackEnd) {
                        throw new Error("Invalid MIDI SysEx event.");
                    }

                    cursor.pos += sysexLength;
                    continue;
                }

                if (status >= 0xF0) {
                    throw new Error("Unsupported MIDI system event.");
                }

                runningStatus = status;

                var command = status & 0xF0;
                var channel = status & 0x0F;

                var dataLength =
                    command === 0xC0 || command === 0xD0
                        ? 1
                        : 2;

                var data = [];

                for (var d = 0; d < dataLength; d++) {
                    if (cursor.pos >= trackEnd) {
                        throw new Error("Incomplete MIDI channel event.");
                    }

                    var dataByte = view.getUint8(cursor.pos);

                    if (dataByte >= 0x80) {
                        throw new Error("Invalid MIDI event data.");
                    }

                    data.push(dataByte);
                    cursor.pos += 1;
                }

                if (
                    command === 0x90 &&
                    data.length === 2 &&
                    data[1] > 0
                ) {
                    var noteKey =
                        channel + ":" + data[0];

                    if (!activeNotes[noteKey]) {
                        activeNotes[noteKey] = [];
                    }

                    activeNotes[noteKey].push({
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
                        data.length === 2 &&
                        data[1] === 0
                    )
                ) {
                    var offKey =
                        channel + ":" + data[0];

                    var queue = activeNotes[offKey];

                    if (queue && queue.length) {
                        var note = queue.shift();

                        notes.push({
                            startTick: note.tick,
                            endTick: Math.max(
                                note.tick + 1,
                                tick
                            ),
                            pitch: note.pitch,
                            velocity: note.velocity,
                            channel: note.channel,
                            track: note.track
                        });
                    }
                }
            }

            /*
            Close notes that have no matching Note Off event.
            This prevents malformed files from leaving notes open forever.
            */

            Object.keys(activeNotes).forEach(function (key) {
                var queue = activeNotes[key];

                queue.forEach(function (note) {
                    notes.push({
                        startTick: note.tick,
                        endTick: Math.max(note.tick + 1, tick),
                        pitch: note.pitch,
                        velocity: note.velocity,
                        channel: note.channel,
                        track: note.track
                    });
                });
            });

            position = trackEnd;
        }

        if (!notes.length) {
            throw new Error(
                "No playable note events were found in this MIDI file."
            );
        }

        tempos.sort(function (a, b) {
            return a.tick - b.tick;
        });

        /*
        Convert ticks into seconds using the tempo map.
        The default MIDI tempo is 120 BPM.
        */

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

        notes.forEach(function (note) {
            note.start = tickToSeconds(note.startTick);
            note.end = tickToSeconds(note.endTick);

            if (note.end <= note.start) {
                note.end = note.start + 0.02;
            }
        });

        var minPitch = 127;
        var maxPitch = 0;
        var maxSeconds = 0;

        notes.forEach(function (note) {
            minPitch = Math.min(minPitch, note.pitch);
            maxPitch = Math.max(maxPitch, note.pitch);
            maxSeconds = Math.max(maxSeconds, note.end);
        });

        return {
            notes: notes,
            duration: Math.max(
                maxSeconds,
                tickToSeconds(maxTick)
            ),
            tempo: 60000000 / uniqueTempos[0].tempo,
            minPitch: minPitch,
            maxPitch: maxPitch
        };
    }

    function handleFile(event) {
        var file = event.target.files &&
            event.target.files[0];

        if (!file) {
            return;
        }

        stopAnimation();

        if (!/\.(mid|midi)$/i.test(file.name)) {
            setStatus("Please choose a .mid or .midi file.", "error");
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setStatus(
                "This file is larger than 50 MB. Try a smaller MIDI file.",
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
                state.duration = parsed.duration;
                state.currentTime = 0;
                state.tempo = parsed.tempo;
                state.minPitch = Math.max(
                    0,
                    parsed.minPitch - 2
                );
                state.maxPitch = Math.min(
                    127,
                    parsed.maxPitch + 2
                );

                state.fileName.textContent =
                    file.name;

                setInfo(
                    "viz-note-count",
                    String(state.notes.length)
                );

                setInfo(
                    "viz-duration",
                    formatTime(state.duration)
                );

                setInfo(
                    "viz-tempo",
                    parsed.tempo.toFixed(1) + " BPM"
                );

                setInfo(
                    "viz-pitch-range",
                    state.minPitch + "–" + state.maxPitch
                );

                state.playButton.disabled = false;
                state.pauseButton.disabled = false;
                state.resetButton.disabled = false;

                resizeCanvas();
                drawFrame();

                setStatus(
                    "MIDI loaded successfully. Press Play to start the animation.",
                    "success"
                );

            } catch (error) {
                state.notes = [];
                state.duration = 0;
                state.currentTime = 0;

                drawFrame();

                setStatus(
                    error && error.message
                        ? error.message
                        : "Could not read this MIDI file.",
                    "error"
                );
            }
        };

        reader.onerror = function () {
            setStatus("Unable to read the selected file.", "error");
        };

        reader.readAsArrayBuffer(file);
    }

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

    function resizeCanvas() {
        if (!state.canvas || !state.context) {
            return;
        }

        var rect = state.canvas.getBoundingClientRect();

        if (!rect.width) {
            return;
        }

        var ratio = Math.min(
            window.devicePixelRatio || 1,
            2
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

        var context = state.context;
        var width = state.canvas.clientWidth;
        var height = state.canvas.clientHeight;

        if (!width || !height) {
            return;
        }

        context.clearRect(0, 0, width, height);

        context.fillStyle = "#0b1020";
        context.fillRect(0, 0, width, height);

        if (!state.notes.length) {
            context.fillStyle = "#a6b1c4";
            context.font = "13px system-ui";
            context.textAlign = "center";

            context.fillText(
                "Choose a MIDI file to visualize",
                width / 2,
                height / 2
            );

            return;
        }

        var left = 43;
        var top = 12;
        var bottom = 20;

        var pianoWidth = left;
        var rollHeight = height - top - bottom;

        var pitchCount = Math.max(
            1,
            state.maxPitch - state.minPitch + 1
        );

        var rowHeight = rollHeight / pitchCount;

        var pixelsPerSecond = 85;
        var playheadX = left + 8;

        /*
        Draw pitch rows and a simplified piano keyboard.
        */

        for (var pitch = state.minPitch; pitch <= state.maxPitch; pitch++) {
            var row = state.maxPitch - pitch;
            var y = top + row * rowHeight;

            var isBlack = [1, 3, 6, 8, 10].indexOf(
                pitch % 12
            ) !== -1;

            context.fillStyle = isBlack
                ? "#101a2c"
                : "#0d1525";

            context.fillRect(
                pianoWidth,
                y,
                width - pianoWidth,
                rowHeight + 0.5
            );

            context.strokeStyle = "rgba(160,180,220,0.10)";
            context.lineWidth = 1;

            context.beginPath();
            context.moveTo(pianoWidth, y);
            context.lineTo(width, y);
            context.stroke();

            context.fillStyle = isBlack
                ? "#29344a"
                : "#d9e2f2";

            context.fillRect(
                0,
                y,
                isBlack ? 26 : 37,
                Math.max(1, rowHeight - 0.5)
            );

            if (rowHeight >= 10 && pitch % 12 === 0) {
                context.fillStyle = "#111827";
                context.font = "9px system-ui";
                context.textAlign = "left";

                context.fillText(
                    "C" + (Math.floor(pitch / 12) - 1),
                    3,
                    y + rowHeight - 2
                );
            }
        }

        /*
        Draw second markers.
        */

        context.font = "10px system-ui";
        context.textAlign = "center";
        context.fillStyle = "#a6b1c4";

        var visibleSeconds = (width - playheadX) / pixelsPerSecond;
        var firstSecond = Math.floor(state.currentTime);

        for (
            var second = firstSecond;
            second <= state.currentTime + visibleSeconds + 1;
            second++
        ) {
            var markerX =
                playheadX +
                (second - state.currentTime) * pixelsPerSecond;

            if (markerX < pianoWidth || markerX > width) {
                continue;
            }

            context.strokeStyle = "rgba(160,180,220,0.18)";

            context.beginPath();
            context.moveTo(markerX, top);
            context.lineTo(markerX, height - bottom);
            context.stroke();

            context.fillText(
                formatTime(second),
                markerX,
                height - 5
            );
        }

        /*
        Draw notes.
        */

        state.notes.forEach(function (note) {
            var x =
                playheadX +
                (note.start - state.currentTime) *
                pixelsPerSecond;

            var noteWidth = Math.max(
                3,
                (note.end - note.start) * pixelsPerSecond
            );

            var y =
                top +
                (state.maxPitch - note.pitch) *
                rowHeight;

            if (
                x + noteWidth < pianoWidth ||
                x > width
            ) {
                return;
            }

            var velocityAlpha =
                0.45 + (note.velocity / 127) * 0.55;

            var hue = (note.channel * 31 + 190) % 360;

            context.fillStyle =
                "hsla(" + hue + ", 85%, 68%, " +
                velocityAlpha + ")";

            context.fillRect(
                x,
                y + 1,
                Math.min(noteWidth, width - x),
                Math.max(2, rowHeight - 2)
            );

            if (noteWidth > 10) {
                context.fillStyle = "rgba(255,255,255,0.75)";

                context.fillRect(
                    x,
                    y + 1,
                    2,
                    Math.max(2, rowHeight - 2)
                );
            }
        });

        /*
        Fixed playhead.
        */

        context.fillStyle = "#ffffff";
        context.fillRect(
            playheadX,
            top,
            2,
            height - top - bottom
        );

        context.fillStyle = "#ffffff";
        context.beginPath();
        context.moveTo(playheadX - 5, top);
        context.lineTo(playheadX + 7, top);
        context.lineTo(playheadX + 1, top + 9);
        context.closePath();
        context.fill();
    }

    function startAnimation() {
        if (!state.notes.length) {
            setStatus("Load a MIDI file first.", "error");
            return;
        }

        if (state.currentTime >= state.duration) {
            state.currentTime = 0;
        }

        state.playing = true;
        state.lastFrame = 0;

        if (state.animationId) {
            cancelAnimationFrame(state.animationId);
        }

        state.animationId = requestAnimationFrame(animate);
        setStatus("Animation playing.", "success");
    }

    function animate(timestamp) {
        if (!state.playing) {
            return;
        }

        if (!state.lastFrame) {
            state.lastFrame = timestamp;
        }

        var delta = (timestamp - state.lastFrame) / 1000;
        state.lastFrame = timestamp;

        /*
        Limit large jumps after the browser pauses the tab.
        */

        delta = Math.min(delta, 0.1);

        var speed =
            Number(state.speedInput.value) / 100;

        state.currentTime += delta * speed;

        if (state.currentTime >= state.duration) {
            state.currentTime = state.duration;
            state.playing = false;
            state.animationId = null;

            drawFrame();

            setStatus("Animation complete. Press Reset to replay.", "success");

            return;
        }

        drawFrame();

        state.animationId = requestAnimationFrame(animate);
    }

    function pauseAnimation() {
        if (!state.playing) {
            return;
        }

        state.playing = false;

        if (state.animationId) {
            cancelAnimationFrame(state.animationId);
            state.animationId = null;
        }

        state.lastFrame = 0;

        drawFrame();

        setStatus("Animation paused.");
    }

    function stopAnimation() {
        state.playing = false;

        if (state.animationId) {
            cancelAnimationFrame(state.animationId);
            state.animationId = null;
        }

        state.lastFrame = 0;
    }

    function resetAnimation() {
        stopAnimation();

        state.currentTime = 0;

        drawFrame();

        setStatus("Animation reset. Press Play to replay.");
    }

    window.addEventListener("resize", resizeCanvas);

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            pauseAnimation();
        }
    });

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            createInterface
        );
    } else {
        createInterface();
    }
})();
