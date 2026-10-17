/*
Project: SonaFrame
File: midi-transpose.js
Version: 0.1.0

Stage 5: MIDI Transpose

Features:
- Import a MIDI file locally
- Transpose notes by semitones
- Support positive and negative transpose values
- Preserve the original MIDI structure
- Export the transposed MIDI file
- No external libraries
- Mobile-first and offline-friendly

Supported:
- Standard MIDI Files with PPQ or SMPTE timing
- MIDI format 0, 1, and 2
- Running status
- Meta events and SysEx events

Safety:
- Original files are never modified
- MIDI data is processed locally
*/

(function () {
    "use strict";

    var MAX_FILE_SIZE = 50 * 1024 * 1024;

    var panel = null;
    var fileInput = null;
    var semitoneInput = null;
    var transposeButton = null;
    var downloadLink = null;
    var statusBox = null;
    var fileInfo = null;

    var selectedFile = null;
    var originalBuffer = null;
    var outputURL = null;

    var busy = false;

    /* =====================================
       ELEMENT HELPERS
    ===================================== */

    function createElement(tag, className, text) {
        var node = document.createElement(tag);

        if (className) {
            node.className = className;
        }

        if (text !== undefined && text !== null) {
            node.textContent = text;
        }

        return node;
    }

    function createButton(text, primary) {
        var button = createElement(
            "button",
            "sf-transpose-button" +
                (primary ? " sf-transpose-primary" : ""),
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

        statusBox.className = "sf-transpose-status";

        if (type) {
            statusBox.classList.add("is-" + type);
        }
    }

    function releaseOutputURL() {
        if (outputURL) {
            URL.revokeObjectURL(outputURL);
            outputURL = null;
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

    /* =====================================
       STYLES
    ===================================== */

    function addStyles() {
        if (document.getElementById("sf-transpose-styles")) {
            return;
        }

        var style = document.createElement("style");

        style.id = "sf-transpose-styles";

        style.textContent = `
            .sf-transpose-card {
                margin-top: 18px;
            }

            .sf-transpose-panel {
                margin-top: 16px;
                padding: 16px;
                border: 1px solid var(--border, #29314a);
                border-radius: 15px;
                background: var(--surface, #111525);
                color: var(--text, #f5f6ff);
            }

            .sf-transpose-panel h2,
            .sf-transpose-panel h3 {
                color: var(--text, #f5f6ff);
            }

            .sf-transpose-description,
            .sf-transpose-help {
                color: var(--muted, #a1abc4);
                font-size: 12px;
                line-height: 1.8;
            }

            .sf-transpose-label {
                display: block;
                margin: 14px 0 7px;
                color: var(--text, #f5f6ff);
                font-size: 12px;
                font-weight: 800;
            }

            .sf-transpose-file,
            .sf-transpose-number {
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

            .sf-transpose-number {
                margin-bottom: 10px;
            }

            .sf-transpose-button {
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

            .sf-transpose-primary {
                border-color: #7865d9;
                background: #44358e;
                color: #ffffff;
            }

            .sf-transpose-button:disabled {
                opacity: .45;
                cursor: not-allowed;
            }

            .sf-transpose-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 14px;
            }

            .sf-transpose-status {
                margin-top: 14px;
                padding: 11px;
                border: 1px solid var(--border, #29314a);
                border-radius: 9px;
                background: rgba(255,255,255,.025);
                color: var(--muted, #a1abc4);
                font-size: 12px;
                line-height: 1.7;
                overflow-wrap: anywhere;
            }

            .sf-transpose-status.is-success {
                border-color: #287d75;
                color: #9cf5dc;
            }

            .sf-transpose-status.is-error {
                border-color: #b84b62;
                color: #ffb8c6;
            }

            .sf-transpose-file-info {
                margin-top: 12px;
                padding: 11px;
                border: 1px solid var(--border, #29314a);
                border-radius: 9px;
                background: rgba(255,255,255,.025);
                color: var(--muted, #a1abc4);
                font-size: 12px;
                line-height: 1.8;
                overflow-wrap: anywhere;
            }

            .sf-transpose-help {
                margin-top: 13px;
            }

            @media (max-width: 360px) {
                .sf-transpose-panel {
                    padding: 12px;
                }

                .sf-transpose-actions {
                    display: grid;
                    grid-template-columns: 1fr;
                }

                .sf-transpose-button {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* =====================================
       MIDI PARSER HELPERS
    ===================================== */

    function readAscii(bytes, offset, length) {
        var result = "";

        for (var i = 0; i < length; i++) {
            result += String.fromCharCode(
                bytes[offset + i]
            );
        }

        return result;
    }

    function readUInt32(view, offset) {
        return view.getUint32(offset, false);
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

            value = (value << 7) | (byte & 0x7F);

            count++;
        } while (byte & 0x80);

        return value;
    }

    function ensureAvailable(cursor, length, end) {
        if (
            length < 0 ||
            cursor.pos + length > end
        ) {
            throw new Error(
                "The MIDI file appears to be incomplete."
            );
        }
    }

    /* =====================================
       TRANSPOSE MIDI DATA
    ===================================== */

    function transposeMidi(arrayBuffer, semitones) {
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

        var format = view.getUint16(8, false);

        var declaredTrackCount = view.getUint16(10, false);

        if (format > 2) {
            throw new Error(
                "This MIDI format is not supported."
            );
        }

        if (declaredTrackCount < 1) {
            throw new Error(
                "No MIDI tracks were declared."
            );
        }

        /*
        Make a separate output copy.
        The original MIDI buffer remains unchanged.
        */

        var output = new Uint8Array(bytes);

        var cursor = {
            pos: 8 + headerLength
        };

        var actualTrackCount = 0;
        var changedNotes = 0;

        while (
            cursor.pos + 8 <= bytes.length &&
            actualTrackCount < declaredTrackCount
        ) {
            var chunkType = readAscii(
                bytes,
                cursor.pos,
                4
            );

            var chunkLength = readUInt32(
                view,
                cursor.pos + 4
            );

            cursor.pos += 8;

            if (chunkLength > bytes.length - cursor.pos) {
                throw new Error(
                    "A MIDI chunk extends beyond the file."
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
                pos: chunkStart
            };

            var runningStatus = null;

            while (trackCursor.pos < chunkEnd) {
                readVariableLength(
                    bytes,
                    trackCursor,
                    chunkEnd
                );

                ensureAvailable(
                    trackCursor,
                    1,
                    chunkEnd
                );

                var firstByte = bytes[trackCursor.pos];

                var statusByte;

                if (firstByte >= 0x80) {
                    statusByte = firstByte;
                    trackCursor.pos++;
                } else {
                    if (runningStatus === null) {
                        throw new Error(
                            "Invalid MIDI running status."
                        );
                    }

                    statusByte = runningStatus;
                }

                /* META EVENTS */

                if (statusByte === 0xFF) {
                    runningStatus = null;

                    ensureAvailable(
                        trackCursor,
                        1,
                        chunkEnd
                    );

                    trackCursor.pos++;

                    var metaLength = readVariableLength(
                        bytes,
                        trackCursor,
                        chunkEnd
                    );

                    ensureAvailable(
                        trackCursor,
                        metaLength,
                        chunkEnd
                    );

                    trackCursor.pos += metaLength;

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
                        trackCursor,
                        chunkEnd
                    );

                    ensureAvailable(
                        trackCursor,
                        sysexLength,
                        chunkEnd
                    );

                    trackCursor.pos += sysexLength;

                    continue;
                }

                /* CHANNEL EVENTS */

                if (
                    statusByte < 0x80 ||
                    statusByte > 0xEF
                ) {
                    throw new Error(
                        "An unsupported MIDI event was encountered."
                    );
                }

                runningStatus = statusByte;

                var command = statusByte & 0xF0;

                var dataLength =
                    command === 0xC0 ||
                    command === 0xD0
                        ? 1
                        : 2;

                ensureAvailable(
                    trackCursor,
                    dataLength,
                    chunkEnd
                );

                var dataStart = trackCursor.pos;

                var noteNumber = bytes[dataStart];

                if (noteNumber >= 0x80) {
                    throw new Error(
                        "Invalid MIDI channel event data."
                    );
                }

                if (dataLength === 2) {
                    if (bytes[dataStart + 1] >= 0x80) {
                        throw new Error(
                            "Invalid MIDI channel event data."
                        );
                    }
                }

                /*
                Note Off = 0x80
                Note On  = 0x90

                Only note pitch values are changed.
                Velocity, timing, tempo, controllers,
                program changes and other events remain intact.
                */

                if (
                    (command === 0x80 || command === 0x90) &&
                    semitones !== 0
                ) {
                    var newNote = noteNumber + semitones;

                    /*
                    Keep MIDI pitches within 0-127.
                    Notes reaching either boundary are clamped.
                    */

                    if (newNote < 0) {
                        newNote = 0;
                    }

                    if (newNote > 127) {
                        newNote = 127;
                    }

                    if (newNote !== noteNumber) {
                        output[dataStart] = newNote;
                        changedNotes++;
                    }
                }

                trackCursor.pos += dataLength;
            }
        }

        if (actualTrackCount === 0) {
            throw new Error(
                "No valid MIDI tracks were found."
            );
        }

        return {
            data: output,
            format: format,
            trackCount: actualTrackCount,
            changedNotes: changedNotes
        };
    }

    /* =====================================
       FILE HELPERS
    ===================================== */

    function safeFileName(name) {
        return name
            .replace(/\.midi?$/i, "")
            .replace(/[\\/:*?"<>|]/g, "_")
            .replace(/\s+/g, "_") || "sonaframe_midi";
    }

    function readFile(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();

            reader.onload = function () {
                resolve(reader.result);
            };

            reader.onerror = function () {
                reject(
                    new Error("Unable to read the selected file.")
                );
            };

            reader.onabort = function () {
                reject(
                    new Error("File reading was cancelled.")
                );
            };

            reader.readAsArrayBuffer(file);
        });
    }

    function resetResult() {
        releaseOutputURL();

        if (downloadLink) {
            downloadLink.hidden = true;
            downloadLink.removeAttribute("href");
        }
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

        resetResult();

        selectedFile = null;
        originalBuffer = null;

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
        transposeButton.disabled = true;

        setStatus("Reading MIDI file...");

        readFile(file)
            .then(function (buffer) {
                /*
                Validate the file before accepting it.
                A zero-semitone transpose checks structure
                without changing any notes.
                */

                transposeMidi(buffer, 0);

                selectedFile = file;
                originalBuffer = buffer;

                fileInfo.textContent =
                    "File: " + file.name +
                    "\nSize: " + formatBytes(file.size);

                setStatus(
                    "MIDI file loaded successfully. Choose the transpose amount.",
                    "success"
                );
            })
            .catch(function (error) {
                selectedFile = null;
                originalBuffer = null;

                setStatus(
                    error && error.message
                        ? error.message
                        : "Unable to read this MIDI file.",
                    "error"
                );
            })
            .then(function () {
                busy = false;

                fileInput.disabled = false;

                transposeButton.disabled =
                    !originalBuffer;
            });
    }

    /* =====================================
       EXPORT TRANSPOSED MIDI
    ===================================== */

    function transposeAndExport() {
        if (
            busy ||
            !selectedFile ||
            !originalBuffer
        ) {
            setStatus(
                "Choose a valid MIDI file first.",
                "error"
            );

            return;
        }

        var semitones = Number(semitoneInput.value);

        if (
            !isFinite(semitones) ||
            Math.floor(semitones) !== semitones ||
            semitones < -24 ||
            semitones > 24
        ) {
            setStatus(
                "Enter a whole number from -24 to +24 semitones.",
                "error"
            );

            return;
        }

        resetResult();

        busy = true;

        transposeButton.disabled = true;
        fileInput.disabled = true;
        semitoneInput.disabled = true;

        setStatus("Transposing MIDI notes...");

        /*
        Defer processing briefly so the status message
        can render before parsing the file.
        */

        setTimeout(function () {
            try {
                var result = transposeMidi(
                    originalBuffer,
                    semitones
                );

                var blob = new Blob(
                    [result.data],
                    { type: "audio/midi" }
                );

                outputURL = URL.createObjectURL(blob);

                var direction =
                    semitones > 0
                        ? "+" + semitones
                        : String(semitones);

                var outputName =
                    safeFileName(selectedFile.name) +
                    "_transpose_" +
                    direction.replace("+", "plus") +
                    ".mid";

                downloadLink.href = outputURL;
                downloadLink.download = outputName;
                downloadLink.textContent = "Download MIDI";
                downloadLink.hidden = false;

                setStatus(
                    "Finished! " +
                    result.changedNotes +
                    " note event(s) changed by " +
                    direction +
                    " semitone(s). Tap Download MIDI to save the new file.",
                    "success"
                );

                fileInfo.textContent =
                    "Original: " + selectedFile.name +
                    "\nFile size: " + formatBytes(selectedFile.size) +
                    "\nMIDI format: " + result.format +
                    "\nTrack count: " + result.trackCount +
                    "\nTranspose: " + direction + " semitone(s)" +
                    "\nChanged note events: " + result.changedNotes;

            } catch (error) {
                setStatus(
                    error && error.message
                        ? error.message
                        : "Unable to transpose this MIDI file.",
                    "error"
                );

            } finally {
                busy = false;

                transposeButton.disabled =
                    !originalBuffer;

                fileInput.disabled = false;
                semitoneInput.disabled = false;
            }
        }, 30);
    }

    /* =====================================
       CREATE INTERFACE
    ===================================== */

    function createInterface() {
        if (
            document.getElementById("sf-transpose-panel")
        ) {
            return;
        }

        var featureGrid = document.querySelector(".feature-grid");

        if (!featureGrid) {
            return;
        }

        addStyles();

        /* Active tool card */

        var card = createElement(
            "article",
            "feature-card sf-transpose-card"
        );

        var topLine = createElement("div", "card-topline");

        topLine.appendChild(
            createElement(
                "div",
                "feature-icon icon-purple",
                "♯"
            )
        );

        topLine.appendChild(
            createElement(
                "span",
                "tool-number",
                "TOOL 05"
            )
        );

        card.appendChild(topLine);

        card.appendChild(
            createElement("h3", "", "MIDI Transpose")
        );

        card.appendChild(
            createElement(
                "p",
                "",
                "Raise or lower MIDI note pitches and export a new MIDI file."
            )
        );

        var openButton = createButton(
            "Open MIDI Transpose →",
            true
        );

        openButton.classList.add("card-button");

        card.appendChild(openButton);

        featureGrid.appendChild(card);

        /* Main panel */

        panel = createElement(
            "section",
            "sf-transpose-panel"
        );

        panel.id = "sf-transpose-panel";
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
            createElement("h2", "", "MIDI Transpose")
        );

        var closeButton = createButton("×", false);

        closeButton.className = "icon-button";

        closeButton.setAttribute(
            "aria-label",
            "Close MIDI Transpose"
        );

        heading.appendChild(headingText);
        heading.appendChild(closeButton);

        panel.appendChild(heading);

        panel.appendChild(
            createElement(
                "p",
                "sf-transpose-description",
                "Choose a MIDI file, set the pitch shift in semitones, and export a separate copy. Your original file will not be modified."
            )
        );

        /* File input */

        var fileLabel = createElement(
            "label",
            "sf-transpose-label",
            "Select MIDI File"
        );

        fileLabel.htmlFor = "sf-transpose-file";

        fileInput = document.createElement("input");

        fileInput.id = "sf-transpose-file";
        fileInput.className = "sf-transpose-file";
        fileInput.type = "file";
        fileInput.accept = ".mid,.midi,audio/midi,audio/x-midi";

        panel.appendChild(fileLabel);
        panel.appendChild(fileInput);

        /* Semitone input */

        var semitoneLabel = createElement(
            "label",
            "sf-transpose-label",
            "Transpose Amount (semitones)"
        );

        semitoneLabel.htmlFor = "sf-transpose-amount";

        semitoneInput = document.createElement("input");

        semitoneInput.id = "sf-transpose-amount";
        semitoneInput.className = "sf-transpose-number";
        semitoneInput.type = "number";
        semitoneInput.min = "-24";
        semitoneInput.max = "24";
        semitoneInput.step = "1";
        semitoneInput.value = "2";
        semitoneInput.inputMode = "numeric";

        panel.appendChild(semitoneLabel);
        panel.appendChild(semitoneInput);

        panel.appendChild(
            createElement(
                "p",
                "sf-transpose-help",
                "Examples: +2 raises the notes by two semitones; -2 lowers them by two semitones; +12 raises them by one octave. Values are limited to -24 through +24. Notes outside MIDI's 0–127 range are clamped to the nearest boundary."
            )
        );

        /* File info */

        fileInfo = createElement(
            "div",
            "sf-transpose-file-info",
            "No MIDI file selected."
        );

        panel.appendChild(fileInfo);

        /* Actions */

        var actions = createElement(
            "div",
            "sf-transpose-actions"
        );

        transposeButton = createButton(
            "Transpose and Prepare Download",
            true
        );

        transposeButton.disabled = true;

        downloadLink = createElement(
            "a",
            "sf-transpose-button",
            "Download MIDI"
        );

        downloadLink.hidden = true;
        downloadLink.setAttribute(
            "download",
            "sonaframe-transposed.mid"
        );

        actions.appendChild(transposeButton);
        actions.appendChild(downloadLink);

        panel.appendChild(actions);

        /* Status */

        statusBox = createElement(
            "div",
            "sf-transpose-status",
            "Choose a MIDI file to begin."
        );

        statusBox.setAttribute("role", "status");
        statusBox.setAttribute("aria-live", "polite");

        panel.appendChild(statusBox);

        panel.appendChild(
            createElement(
                "p",
                "sf-transpose-help",
                "Processing happens on your device. Keep a backup of your original MIDI file and check the exported result in your MIDI editor."
            )
        );

        /*
        Insert the panel before the planned-tools section.
        */

        var plannedSection = document.querySelector(
            ".planned-section"
        );

        if (
            plannedSection &&
            plannedSection.parentNode
        ) {
            plannedSection.parentNode.insertBefore(
                panel,
                plannedSection
            );
        } else {
            featureGrid.parentNode.appendChild(panel);
        }

        /* Events */

        openButton.addEventListener("click", function () {
            panel.hidden = false;

            panel.scrollIntoView({
                behavior: "auto",
                block: "start"
            });
        });

        closeButton.addEventListener("click", function () {
            panel.hidden = true;

            featureGrid.scrollIntoView({
                behavior: "auto",
                block: "start"
            });
        });

        fileInput.addEventListener(
            "change",
            handleFileSelection
        );

        transposeButton.addEventListener(
            "click",
            transposeAndExport
        );

        semitoneInput.addEventListener(
            "input",
            function () {
                resetResult();
            }
        );
    }

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
