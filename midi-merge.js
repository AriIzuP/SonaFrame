/*
Project: SonaFrame
File: midi-merge.js
Version: 0.3.0

Stage 2:
- Sequential MIDI merge
- Simultaneous MIDI merge
- Reorder input files
- Remove input files
- Export merged MIDI
- Local browser processing

Limitations:
- Supports MIDI format 0 and format 1.
- Requires PPQ timing.
- MIDI format 2 and SMPTE timing are not supported.
*/

(function () {
    "use strict";

    var MAX_TOTAL_SIZE = 50 * 1024 * 1024;

    var mergeFiles = [];
    var mergeMode = "sequential";
    var mergeBusy = false;

    var panel;
    var fileInput;
    var fileList;
    var statusBox;
    var mergeButton;
    var clearButton;
    var downloadButton;
    var downloadURL = null;

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

    function formatBytes(bytes) {
        if (bytes < 1024) {
            return bytes + " B";
        }

        if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(1) + " KB";
        }

        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    }

    function setStatus(message, type) {
        if (!statusBox) {
            return;
        }

        statusBox.textContent = message;
        statusBox.className = "sf-merge-status";

        if (type) {
            statusBox.classList.add("is-" + type);
        }
    }

    function releaseDownloadURL() {
        if (downloadURL) {
            URL.revokeObjectURL(downloadURL);
            downloadURL = null;
        }
    }

    function addStyles() {
        if (document.getElementById("sf-merge-styles")) {
            return;
        }

        var style = document.createElement("style");
        style.id = "sf-merge-styles";

        style.textContent = `
            .sf-merge-card {
                margin-top: 18px;
            }

            .sf-merge-panel {
                margin-top: 16px;
                padding: 16px;
                border: 1px solid var(--border-color, #444);
                border-radius: 14px;
                background: var(--card-background, rgba(128,128,128,.06));
            }

            .sf-merge-panel h2,
            .sf-merge-panel h3 {
                margin-top: 0;
            }

            .sf-merge-description {
                line-height: 1.6;
                opacity: .85;
            }

            .sf-merge-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 12px;
            }

            .sf-merge-button {
                border: 1px solid var(--border-color, #666);
                border-radius: 9px;
                padding: 10px 13px;
                font: inherit;
                cursor: pointer;
                background: var(--button-background, #252525);
                color: var(--button-color, #fff);
            }

            .sf-merge-button:disabled {
                opacity: .45;
                cursor: not-allowed;
            }

            .sf-merge-primary {
                font-weight: 700;
                border-color: #6878ff;
                background: #4658d8;
                color: white;
            }

            .sf-merge-file-picker {
                display: block;
                width: 100%;
                box-sizing: border-box;
                margin: 12px 0;
                padding: 12px;
                border: 1px dashed var(--border-color, #777);
                border-radius: 10px;
                font: inherit;
            }

            .sf-merge-mode {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
                gap: 10px;
                margin: 14px 0;
            }

            .sf-merge-mode label {
                display: block;
                padding: 12px;
                border: 1px solid var(--border-color, #555);
                border-radius: 10px;
                cursor: pointer;
                line-height: 1.5;
            }

            .sf-merge-mode input {
                margin-right: 7px;
            }

            .sf-merge-file-list {
                display: grid;
                gap: 9px;
                padding: 0;
                margin: 14px 0;
                list-style: none;
            }

            .sf-merge-file-item {
                display: flex;
                align-items: center;
                gap: 9px;
                padding: 11px;
                border: 1px solid var(--border-color, #555);
                border-radius: 10px;
                min-width: 0;
            }

            .sf-merge-file-info {
                flex: 1;
                min-width: 0;
            }

            .sf-merge-file-name {
                display: block;
                overflow-wrap: anywhere;
                font-weight: 600;
            }

            .sf-merge-file-size {
                display: block;
                margin-top: 4px;
                opacity: .7;
                font-size: .85em;
            }

            .sf-merge-file-controls {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
            }

            .sf-merge-small-button {
                padding: 7px 9px;
                font-size: .85em;
            }

            .sf-merge-status {
                margin-top: 14px;
                padding: 11px;
                border-radius: 9px;
                line-height: 1.5;
                overflow-wrap: anywhere;
                background: rgba(128,128,128,.10);
            }

            .sf-merge-status.is-error {
                border: 1px solid #d55;
            }

            .sf-merge-status.is-success {
                border: 1px solid #3a8;
            }

            .sf-merge-help {
                font-size: .9em;
                line-height: 1.6;
                opacity: .8;
            }

            @media (max-width: 420px) {
                .sf-merge-file-item {
                    align-items: flex-start;
                    flex-wrap: wrap;
                }

                .sf-merge-file-controls {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function createInterface() {
        if (document.getElementById("sf-merge-panel")) {
            panel = document.getElementById("sf-merge-panel");
            return;
        }

        addStyles();

        var card = createElement("article", "feature-card sf-merge-card");
        card.appendChild(
            createElement("h3", "", "MIDI Merge")
        );
        card.appendChild(
            createElement(
                "p",
                "",
                "Combine multiple MIDI files into one file."
            )
        );

        var openButton = createElement(
            "button",
            "sf-merge-button sf-merge-primary",
            "Open MIDI Merge"
        );
        openButton.type = "button";
        openButton.addEventListener("click", function () {
            panel.hidden = !panel.hidden;

            if (!panel.hidden) {
                panel.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });

        card.appendChild(openButton);

        var featureGrid = document.querySelector(".feature-grid");

        if (featureGrid) {
            featureGrid.appendChild(card);
        } else {
            document.body.appendChild(card);
        }

        panel = createElement("section", "sf-merge-panel");
        panel.id = "sf-merge-panel";
        panel.hidden = true;

        panel.appendChild(
            createElement("h2", "", "MIDI Merge")
        );

        panel.appendChild(
            createElement(
                "p",
                "sf-merge-description",
                "Select two or more MIDI files, arrange their order, choose a merge mode, and export the result."
            )
        );

        fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".mid,.midi,audio/midi,audio/x-midi";
        fileInput.multiple = true;
        fileInput.className = "sf-merge-file-picker";
        fileInput.setAttribute("aria-label", "Select MIDI files");

        fileInput.addEventListener("change", function () {
            addSelectedFiles(fileInput.files);
            fileInput.value = "";
        });

        panel.appendChild(fileInput);

        panel.appendChild(
            createElement("h3", "", "Merge Mode")
        );

        var modeGroup = createElement("div", "sf-merge-mode");

        var sequentialLabel = createElement("label");
        var sequentialRadio = document.createElement("input");
        sequentialRadio.type = "radio";
        sequentialRadio.name = "sf-merge-mode";
        sequentialRadio.value = "sequential";
        sequentialRadio.checked = true;

        sequentialRadio.addEventListener("change", function () {
            mergeMode = "sequential";
            setStatus("Sequential mode selected.", "success");
        });

        sequentialLabel.appendChild(sequentialRadio);
        sequentialLabel.appendChild(
            document.createTextNode("Sequential Merge")
        );
        sequentialLabel.appendChild(
            createElement(
                "div",
                "sf-merge-help",
                "Play the files one after another, following the list order."
            )
        );

        var simultaneousLabel = createElement("label");
        var simultaneousRadio = document.createElement("input");
        simultaneousRadio.type = "radio";
        simultaneousRadio.name = "sf-merge-mode";
        simultaneousRadio.value = "simultaneous";

        simultaneousRadio.addEventListener("change", function () {
            mergeMode = "simultaneous";
            setStatus("Simultaneous mode selected.", "success");
        });

        simultaneousLabel.appendChild(simultaneousRadio);
        simultaneousLabel.appendChild(
            document.createTextNode("Simultaneous Merge")
        );
        simultaneousLabel.appendChild(
            createElement(
                "div",
                "sf-merge-help",
                "Start all files at the beginning so their parts can play together."
            )
        );

        modeGroup.appendChild(sequentialLabel);
        modeGroup.appendChild(simultaneousLabel);
        panel.appendChild(modeGroup);

        panel.appendChild(
            createElement("h3", "", "Selected MIDI Files")
        );

        fileList = createElement("ol", "sf-merge-file-list");
        panel.appendChild(fileList);

        var actions = createElement("div", "sf-merge-actions");

        mergeButton = createElement(
            "button",
            "sf-merge-button sf-merge-primary",
            "Merge and Export MIDI"
        );
        mergeButton.type = "button";
        mergeButton.disabled = true;
        mergeButton.addEventListener("click", mergeAndExport);

        clearButton = createElement(
            "button",
            "sf-merge-button",
            "Clear List"
        );
        clearButton.type = "button";
        clearButton.addEventListener("click", clearFiles);

        downloadButton = createElement(
            "a",
            "sf-merge-button",
            "Download Merged MIDI"
        );
        downloadButton.hidden = true;
        downloadButton.setAttribute("download", "sonaframe-merged.mid");

        actions.appendChild(mergeButton);
        actions.appendChild(clearButton);
        actions.appendChild(downloadButton);

        panel.appendChild(actions);

        statusBox = createElement(
            "div",
            "sf-merge-status",
            "Select at least two MIDI files to begin."
        );
        statusBox.setAttribute("role", "status");
        statusBox.setAttribute("aria-live", "polite");

        panel.appendChild(statusBox);

        panel.appendChild(
            createElement(
                "p",
                "sf-merge-help",
                "Files are processed locally in your browser. The app does not upload your MIDI files. Keep a backup of your original projects."
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

        renderFileList();
    }

    function addSelectedFiles(fileCollection) {
        if (!fileCollection || !fileCollection.length) {
            return;
        }

        var incoming = Array.prototype.slice.call(fileCollection);
        var existingSize = mergeFiles.reduce(function (sum, item) {
            return sum + item.file.size;
        }, 0);

        var incomingSize = incoming.reduce(function (sum, file) {
            return sum + file.size;
        }, 0);

        if (existingSize + incomingSize > MAX_TOTAL_SIZE) {
            setStatus(
                "The total selected file size exceeds 50 MB. Remove some files and try again.",
                "error"
            );
            return;
        }

        var added = 0;

        incoming.forEach(function (file) {
            if (!/\.midi?$/i.test(file.name)) {
                return;
            }

            var duplicate = mergeFiles.some(function (item) {
                return (
                    item.file.name === file.name &&
                    item.file.size === file.size &&
                    item.file.lastModified === file.lastModified
                );
            });

            if (duplicate) {
                return;
            }

            mergeFiles.push({
                id: makeId(),
                file: file
            });

            added += 1;
        });

        renderFileList();

        if (added > 0) {
            releaseDownloadURL();
            downloadButton.hidden = true;

            setStatus(
                added + " MIDI file(s) added. Arrange the list and choose a merge mode.",
                "success"
            );
        } else {
            setStatus(
                "No new MIDI files were added. Check the file types or duplicates.",
                "error"
            );
        }
    }

    function makeId() {
        return Date.now().toString(36) +
            Math.random().toString(36).slice(2);
    }

    function renderFileList() {
        if (!fileList) {
            return;
        }

        fileList.textContent = "";

        mergeFiles.forEach(function (item, index) {
            var li = createElement("li", "sf-merge-file-item");
            var info = createElement("div", "sf-merge-file-info");

            info.appendChild(
                createElement(
                    "span",
                    "sf-merge-file-name",
                    (index + 1) + ". " + item.file.name
                )
            );

            info.appendChild(
                createElement(
                    "span",
                    "sf-merge-file-size",
                    formatBytes(item.file.size)
                )
            );

            var controls = createElement("div", "sf-merge-file-controls");

            var upButton = createElement(
                "button",
                "sf-merge-button sf-merge-small-button",
                "Move Up"
            );
            upButton.type = "button";
            upButton.disabled = index === 0 || mergeBusy;
            upButton.setAttribute(
                "aria-label",
                "Move " + item.file.name + " up"
            );

            upButton.addEventListener("click", function () {
                moveFile(index, -1);
            });

            var downButton = createElement(
                "button",
                "sf-merge-button sf-merge-small-button",
                "Move Down"
            );
            downButton.type = "button";
            downButton.disabled =
                index === mergeFiles.length - 1 || mergeBusy;
            downButton.setAttribute(
                "aria-label",
                "Move " + item.file.name + " down"
            );

            downButton.addEventListener("click", function () {
                moveFile(index, 1);
            });

            var removeButton = createElement(
                "button",
                "sf-merge-button sf-merge-small-button",
                "Remove"
            );
            removeButton.type = "button";
            removeButton.disabled = mergeBusy;
            removeButton.setAttribute(
                "aria-label",
                "Remove " + item.file.name
            );

            removeButton.addEventListener("click", function () {
                removeFile(index);
            });

            controls.appendChild(upButton);
            controls.appendChild(downButton);
            controls.appendChild(removeButton);

            li.appendChild(info);
            li.appendChild(controls);

            fileList.appendChild(li);
        });

        mergeButton.disabled = mergeFiles.length < 2 || mergeBusy;
        clearButton.disabled = mergeFiles.length === 0 || mergeBusy;
        fileInput.disabled = mergeBusy;
    }

    function moveFile(index, direction) {
        var newIndex = index + direction;

        if (
            mergeBusy ||
            newIndex < 0 ||
            newIndex >= mergeFiles.length
        ) {
            return;
        }

        var temp = mergeFiles[index];
        mergeFiles[index] = mergeFiles[newIndex];
        mergeFiles[newIndex] = temp;

        releaseDownloadURL();
        downloadButton.hidden = true;

        renderFileList();
        setStatus("File order updated.", "success");
    }

    function removeFile(index) {
        if (mergeBusy) {
            return;
        }

        mergeFiles.splice(index, 1);

        releaseDownloadURL();
        downloadButton.hidden = true;

        renderFileList();
        setStatus(
            mergeFiles.length
                ? "File removed from the list."
                : "Select at least two MIDI files to begin.",
            "success"
        );
    }

    function clearFiles() {
        if (mergeBusy) {
            return;
        }

        mergeFiles = [];

        releaseDownloadURL();
        downloadButton.hidden = true;

        renderFileList();
        setStatus("File list cleared.");
    }

    function readFileAsArrayBuffer(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();

            reader.onload = function () {
                resolve(reader.result);
            };

            reader.onerror = function () {
                reject(new Error("Could not read file: " + file.name));
            };

            reader.onabort = function () {
                reject(new Error("File reading was cancelled."));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    function readAscii(view, offset, length) {
        var result = "";

        for (var i = 0; i < length; i += 1) {
            result += String.fromCharCode(view.getUint8(offset + i));
        }

        return result;
    }

    function parseVariableLength(view, state, end) {
        var value = 0;
        var byte;
        var count = 0;

        do {
            if (state.pos >= end || count >= 4) {
                throw new Error("Invalid MIDI variable-length value.");
            }

            byte = view.getUint8(state.pos);
            state.pos += 1;

            value = (value << 7) | (byte & 0x7F);
            count += 1;
        } while (byte & 0x80);

        return value;
    }

    function readMidi(arrayBuffer, fileName) {
        var view = new DataView(arrayBuffer);

        if (view.byteLength < 14) {
            throw new Error(fileName + " is too small to be a valid MIDI file.");
        }

        if (readAscii(view, 0, 4) !== "MThd") {
            throw new Error(fileName + " does not have a valid MIDI header.");
        }

        var headerLength = view.getUint32(4, false);

        if (headerLength < 6 || 8 + headerLength > view.byteLength) {
            throw new Error(fileName + " has an invalid MIDI header length.");
        }

        var format = view.getUint16(8, false);
        var trackCount = view.getUint16(10, false);
        var division = view.getUint16(12, false);

        if (format !== 0 && format !== 1) {
            throw new Error(
                fileName + ": only MIDI format 0 and 1 are supported. Format 2 is not supported."
            );
        }

        if (division & 0x8000) {
            throw new Error(
                fileName + ": SMPTE timing is not supported. The file must use PPQ timing."
            );
        }

        if (division === 0) {
            throw new Error(fileName + " has an invalid PPQ timing value.");
        }

        var position = 8 + headerLength;
        var tracks = [];
        var maxTicks = 0;
        var tempoEvents = [];
        var hasTempo = false;

        for (var t = 0; t < trackCount; t += 1) {
            if (
                position + 8 > view.byteLength ||
                readAscii(view, position, 4) !== "MTrk"
            ) {
                throw new Error(
                    fileName + ": MIDI track " + (t + 1) + " is missing or invalid."
                );
            }

            var trackLength = view.getUint32(position + 4, false);
            var trackStart = position + 8;
            var trackEnd = trackStart + trackLength;

            if (trackEnd > view.byteLength) {
                throw new Error(
                    fileName + ": MIDI track " + (t + 1) + " exceeds the file size."
                );
            }

            var state = { pos: trackStart };
            var absoluteTick = 0;
            var runningStatus = null;
            var events = [];

            while (state.pos < trackEnd) {
                var delta = parseVariableLength(view, state, trackEnd);
                absoluteTick += delta;

                if (absoluteTick > maxTicks) {
                    maxTicks = absoluteTick;
                }

                if (state.pos >= trackEnd) {
                    throw new Error(fileName + ": incomplete MIDI event.");
                }

                var statusByte = view.getUint8(state.pos);
                var status;

                if (statusByte < 0x80) {
                    if (runningStatus === null) {
                        throw new Error(
                            fileName + ": invalid MIDI running status."
                        );
                    }

                    status = runningStatus;
                } else {
                    state.pos += 1;
                    status = statusByte;
                }

                var eventData = [];

                if (status === 0xFF) {
                    runningStatus = null;

                    if (state.pos >= trackEnd) {
                        throw new Error(fileName + ": incomplete meta event.");
                    }

                    var metaType = view.getUint8(state.pos);
                    state.pos += 1;

                    var metaLength = parseVariableLength(
                        view,
                        state,
                        trackEnd
                    );

                    if (state.pos + metaLength > trackEnd) {
                        throw new Error(fileName + ": invalid meta event length.");
                    }

                    var metaData = new Uint8Array(metaLength);

                    for (var m = 0; m < metaLength; m += 1) {
                        metaData[m] = view.getUint8(state.pos + m);
                    }

                    state.pos += metaLength;

                    if (metaType === 0x51 && metaLength === 3) {
                        var tempo =
                            (metaData[0] << 16) |
                            (metaData[1] << 8) |
                            metaData[2];

                        if (tempo > 0) {
                            tempoEvents.push({
                                tick: absoluteTick,
                                tempo: tempo
                            });
                            hasTempo = true;
                        }
                    }

                    eventData = [
                        0xFF,
                        metaType
                    ].concat(
                        encodeVariableLength(metaLength),
                        Array.prototype.slice.call(metaData)
                    );

                    events.push({
                        tick: absoluteTick,
                        bytes: eventData,
                        isEnd: metaType === 0x2F,
                        isTempo: metaType === 0x51
                    });

                    if (metaType === 0x2F) {
                        state.pos = trackEnd;
                    }

                    continue;
                }

                if (status === 0xF0 || status === 0xF7) {
                    runningStatus = null;

                    var sysexLength = parseVariableLength(
                        view,
                        state,
                        trackEnd
                    );

                    if (state.pos + sysexLength > trackEnd) {
                        throw new Error(fileName + ": invalid SysEx event length.");
                    }

                    eventData.push(status);

                    eventData = eventData.concat(
                        encodeVariableLength(sysexLength)
                    );

                    for (var sx = 0; sx < sysexLength; sx += 1) {
                        eventData.push(view.getUint8(state.pos + sx));
                    }

                    state.pos += sysexLength;

                    events.push({
                        tick: absoluteTick,
                        bytes: eventData,
                        isEnd: false,
                        isTempo: false
                    });

                    continue;
                }

                if (status >= 0xF0) {
                    throw new Error(
                        fileName + ": unsupported system MIDI event."
                    );
                }

                runningStatus = status;

                var command = status & 0xF0;
                var dataLength =
                    command === 0xC0 || command === 0xD0 ? 1 : 2;

                eventData.push(status);

                if (statusByte < 0x80) {
                    eventData.push(statusByte);
                    state.pos += 1;

                    for (var rd = 1; rd < dataLength; rd += 1) {
                        if (state.pos >= trackEnd) {
                            throw new Error(fileName + ": incomplete MIDI event.");
                        }

                        eventData.push(view.getUint8(state.pos));
                        state.pos += 1;
                    }
                } else {
                    for (var d = 0; d < dataLength; d += 1) {
                        if (state.pos >= trackEnd) {
                            throw new Error(fileName + ": incomplete MIDI event.");
                        }

                        var dataByte = view.getUint8(state.pos);

                        if (dataByte >= 0x80) {
                            throw new Error(fileName + ": invalid MIDI event data.");
                        }

                        eventData.push(dataByte);
                        state.pos += 1;
                    }
                }

                events.push({
                    tick: absoluteTick,
                    bytes: eventData,
                    isEnd: false,
                    isTempo: false
                });
            }

            tracks.push({
                events: events,
                endTick: absoluteTick
            });

            position = trackEnd;
        }

        return {
            format: format,
            ppq: division,
            tracks: tracks,
            durationTicks: maxTicks,
            tempoEvents: tempoEvents,
            hasTempo: hasTempo
        };
    }

    function encodeVariableLength(value) {
        if (value < 0) {
            throw new Error("Invalid negative MIDI delta time.");
        }

        var buffer = value & 0x7F;

        while ((value >>= 7)) {
            buffer <<= 8;
            buffer |= ((value & 0x7F) | 0x80);
        }

        var result = [];

        while (true) {
            result.push(buffer & 0xFF);

            if (buffer & 0x80) {
                buffer >>= 8;
            } else {
                break;
            }
        }

        return result;
    }

    function writeUint16(value) {
        return [
            (value >> 8) & 0xFF,
            value & 0xFF
        ];
    }

    function writeUint32(value) {
        return [
            (value >>> 24) & 0xFF,
            (value >>> 16) & 0xFF,
            (value >>> 8) & 0xFF,
            value & 0xFF
        ];
    }

    function bytesToArrayBuffer(bytes) {
        return new Uint8Array(bytes).buffer;
    }

    function buildMergedMidi(parsedFiles) {
        if (parsedFiles.length < 2) {
            throw new Error("Please select at least two MIDI files.");
        }

        var ppq = parsedFiles[0].midi.ppq;

        parsedFiles.forEach(function (item) {
            if (item.midi.ppq !== ppq) {
                throw new Error(
                    "The MIDI files use different PPQ timing settings. Please use files with matching PPQ values."
                );
            }
        });

        var mergedTracks = [];
        var sequentialOffset = 0;

        parsedFiles.forEach(function (item, fileIndex) {
            var midi = item.midi;
            var offset = mergeMode === "sequential"
                ? sequentialOffset
                : 0;

            midi.tracks.forEach(function (track, trackIndex) {
                var events = [];

                track.events.forEach(function (event) {
                    if (event.isEnd) {
                        return;
                    }

                    /*
                    In simultaneous mode, tempo and time signature
                    events are retained only from the first file.
                    This prevents conflicting global timing metadata
                    from being duplicated across every input file.
                    */

                    if (
                        mergeMode === "simultaneous" &&
                        fileIndex > 0 &&
                        event.bytes.length >= 2 &&
                        event.bytes[0] === 0xFF &&
                        (
                            event.bytes[1] === 0x51 ||
                            event.bytes[1] === 0x58
                        )
                    ) {
                        return;
                    }

                    events.push({
                        tick: event.tick + offset,
                        bytes: event.bytes
                    });
                });

                events.push({
                    tick: track.endTick + offset,
                    bytes: [0xFF, 0x2F, 0x00],
                    isEnd: true
                });

                mergedTracks.push({
                    name: item.file.name,
                    originalTrackIndex: trackIndex,
                    events: events
                });
            });

            if (mergeMode === "sequential") {
                sequentialOffset += midi.durationTicks;
            }
        });

        if (!mergedTracks.length) {
            throw new Error("No MIDI tracks were found in the selected files.");
        }

        var output = [];

        output.push(
            0x4D, 0x54, 0x68, 0x64,
            0x00, 0x00, 0x00, 0x06
        );

        output.push(0x00, 0x01);
        output.push.apply(output, writeUint16(mergedTracks.length));
        output.push.apply(output, writeUint16(ppq));

        mergedTracks.forEach(function (track) {
            var sortedEvents = track.events.slice().sort(function (a, b) {
                if (a.tick !== b.tick) {
                    return a.tick - b.tick;
                }

                /*
                For events at the same tick, retain their original
                order as much as possible. This is a basic merge,
                not a full MIDI sequencer or conflict resolver.
                */

                return 0;
            });

            var trackBytes = [];
            var previousTick = 0;

            sortedEvents.forEach(function (event) {
                var delta = event.tick - previousTick;

                if (delta < 0) {
                    throw new Error("Invalid MIDI event order.");
                }

                trackBytes.push.apply(
                    trackBytes,
                    encodeVariableLength(delta)
                );

                trackBytes.push.apply(trackBytes, event.bytes);
                previousTick = event.tick;
            });

            output.push(0x4D, 0x54, 0x72, 0x6B);
            output.push.apply(output, writeUint32(trackBytes.length));
            output.push.apply(output, trackBytes);
        });

        return bytesToArrayBuffer(output);
    }

    async function mergeAndExport() {
        if (mergeBusy || mergeFiles.length < 2) {
            return;
        }

        mergeBusy = true;
        renderFileList();

        mergeButton.textContent = "Processing...";
        downloadButton.hidden = true;
        releaseDownloadURL();

        try {
            setStatus("Reading and checking MIDI files...");

            var parsedFiles = [];

            for (var i = 0; i < mergeFiles.length; i += 1) {
                var item = mergeFiles[i];

                setStatus(
                    "Reading file " + (i + 1) + " of " +
                    mergeFiles.length + ": " + item.file.name
                );

                var buffer = await readFileAsArrayBuffer(item.file);

                var parsed = readMidi(buffer, item.file.name);

                parsedFiles.push({
                    file: item.file,
                    midi: parsed
                });
            }

            setStatus("Combining MIDI tracks...");

            var mergedBuffer = buildMergedMidi(parsedFiles);

            var blob = new Blob(
                [mergedBuffer],
                { type: "audio/midi" }
            );

            downloadURL = URL.createObjectURL(blob);

            downloadButton.href = downloadURL;
            downloadButton.download = "sonaframe-merged.mid";
            downloadButton.hidden = false;

            setStatus(
                "Merge complete! Output size: " +
                formatBytes(blob.size) +
                ". Tap Download Merged MIDI to save your file.",
                "success"
            );
        } catch (error) {
            setStatus(
                "Merge failed: " +
                (error && error.message
                    ? error.message
                    : "Unknown error."),
                "error"
            );
        } finally {
            mergeBusy = false;
            mergeButton.textContent = "Merge and Export MIDI";
            renderFileList();
        }
    }

    function initialize() {
        createInterface();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }

    window.addEventListener("beforeunload", releaseDownloadURL);
})();
