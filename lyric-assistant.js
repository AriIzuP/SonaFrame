/*
Project: SonaFrame
File: lyric-assistant.js
Version: 0.1.0

Stage 4: Lyric Assistant

Features:
- Offline lyric editor
- Song section organization
- Live character, word, and line counters
- Automatic local draft saving
- Copy lyrics
- Export TXT
- No external libraries

Compatibility:
- Mobile browsers
- Lightweight Android devices
- Android WebView, subject to host integration
*/

(function () {
    "use strict";

    var STORAGE_KEY = "sonaframe-lyric-draft-v1";

    var state = {
        title: "",
        section: "A Melody",
        lyrics: ""
    };

    var panel = null;
    var titleInput = null;
    var sectionSelect = null;
    var lyricsInput = null;
    var statusBox = null;
    var characterCount = null;
    var wordCount = null;
    var lineCount = null;
    var saveTimer = null;

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
            "sf-lyric-button" +
                (primary ? " sf-lyric-primary" : ""),
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
        statusBox.className = "sf-lyric-status";

        if (type) {
            statusBox.classList.add("is-" + type);
        }
    }

    /* =====================================
       STYLES
    ===================================== */

    function addStyles() {
        if (document.getElementById("sf-lyric-styles")) {
            return;
        }

        var style = document.createElement("style");

        style.id = "sf-lyric-styles";

        style.textContent = `
            .sf-lyric-card {
                margin-top: 18px;
            }

            .sf-lyric-panel {
                margin-top: 18px;
                padding: 16px;
                border: 1px solid var(--border, #29314a);
                border-radius: 16px;
                background: var(--surface, #111525);
                color: var(--text, #f5f6ff);
                scroll-margin-top: 78px;
            }

            .sf-lyric-panel h2,
            .sf-lyric-panel h3 {
                margin-top: 0;
            }

            .sf-lyric-description {
                color: var(--muted, #a1abc4);
                line-height: 1.7;
            }

            .sf-lyric-label {
                display: block;
                margin: 14px 0 6px;
                font-size: 13px;
                font-weight: 700;
            }

            .sf-lyric-input,
            .sf-lyric-select,
            .sf-lyric-textarea {
                display: block;
                width: 100%;
                max-width: 100%;
                box-sizing: border-box;
                border: 1px solid var(--border, #29314a);
                border-radius: 10px;
                padding: 12px;
                background: #0b0e19;
                color: #f5f6ff;
                font: inherit;
                font-size: 14px;
            }

            .sf-lyric-input,
            .sf-lyric-select {
                min-height: 44px;
            }

            .sf-lyric-textarea {
                min-height: 250px;
                resize: vertical;
                line-height: 1.8;
                tab-size: 4;
            }

            .sf-lyric-input:focus,
            .sf-lyric-select:focus,
            .sf-lyric-textarea:focus {
                outline: 2px solid var(--accent-blue, #68caff);
                outline-offset: 2px;
            }

            .sf-lyric-counters {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 8px;
                margin: 12px 0;
            }

            .sf-lyric-counter {
                min-width: 0;
                padding: 10px 6px;
                border: 1px solid var(--border, #29314a);
                border-radius: 10px;
                background: rgba(255,255,255,.025);
                text-align: center;
            }

            .sf-lyric-counter strong {
                display: block;
                font-size: 19px;
                overflow-wrap: anywhere;
            }

            .sf-lyric-counter span {
                display: block;
                margin-top: 3px;
                color: var(--muted, #a1abc4);
                font-size: 11px;
            }

            .sf-lyric-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 12px;
            }

            .sf-lyric-button {
                min-height: 44px;
                padding: 10px 13px;
                border: 1px solid var(--border, #29314a);
                border-radius: 10px;
                background: var(--surface-light, #191e32);
                color: var(--text, #f5f6ff);
                font: inherit;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                touch-action: manipulation;
            }

            .sf-lyric-primary {
                border-color: #7865d9;
                background: #44358e;
                color: #ffffff;
            }

            .sf-lyric-button:disabled {
                opacity: .5;
                cursor: not-allowed;
            }

            .sf-lyric-status {
                margin-top: 12px;
                padding: 10px 12px;
                border: 1px solid var(--border, #29314a);
                border-radius: 9px;
                color: var(--muted, #a1abc4);
                font-size: 12px;
                line-height: 1.6;
                overflow-wrap: anywhere;
            }

            .sf-lyric-status.is-success {
                border-color: #287d75;
                color: #9cf5dc;
            }

            .sf-lyric-status.is-error {
                border-color: #b84b62;
                color: #ffb8c6;
            }

            .sf-lyric-help {
                margin-top: 10px;
                color: var(--muted, #a1abc4);
                font-size: 12px;
                line-height: 1.7;
            }

            @media (max-width: 360px) {
                .sf-lyric-panel {
                    padding: 12px;
                }

                .sf-lyric-actions {
                    display: grid;
                    grid-template-columns: 1fr;
                }

                .sf-lyric-button {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* =====================================
       LOCAL STORAGE
    ===================================== */

    function loadDraft() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) {
                return;
            }

            var parsed = JSON.parse(saved);

            if (!parsed || typeof parsed !== "object") {
                return;
            }

            state.title =
                typeof parsed.title === "string"
                    ? parsed.title
                    : "";

            state.section =
                typeof parsed.section === "string"
                    ? parsed.section
                    : "A Melody";

            state.lyrics =
                typeof parsed.lyrics === "string"
                    ? parsed.lyrics
                    : "";

        } catch (error) {
            /*
            Storage may be unavailable in some browser
            or WebView configurations.
            */
        }
    }

    function saveDraft(showMessage) {
        state.title = titleInput.value;
        state.section = sectionSelect.value;
        state.lyrics = lyricsInput.value;

        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(state)
            );

            if (showMessage) {
                setStatus(
                    "Draft saved on this device.",
                    "success"
                );
            }

            return true;

        } catch (error) {
            setStatus(
                "Local saving is unavailable. Export your lyrics as TXT to keep a copy.",
                "error"
            );

            return false;
        }
    }

    function scheduleSave() {
        updateCounters();

        if (saveTimer) {
            clearTimeout(saveTimer);
        }

        saveTimer = setTimeout(function () {
            saveDraft(false);
        }, 300);

        setStatus("Unsaved changes...");
    }

    /* =====================================
       COUNTERS
    ===================================== */

    function updateCounters() {
        var text = lyricsInput.value;

        var characters = Array.from(text).length;

        var trimmed = text.trim();

        var words = trimmed
            ? trimmed.split(/\s+/).length
            : 0;

        var lines = text.length
            ? text.split(/\r\n|\r|\n/).length
            : 0;

        characterCount.textContent = String(characters);
        wordCount.textContent = String(words);
        lineCount.textContent = String(lines);
    }

    /* =====================================
       EXPORT
    ===================================== */

    function safeFileName(name) {
        var value = name
            .trim()
            .replace(/[\\/:*?"<>|]/g, "_")
            .replace(/\s+/g, "_");

        return value || "sonaframe_lyrics";
    }

    function exportLyrics() {
        saveDraft(false);

        var title = titleInput.value.trim() || "Untitled";
        var section = sectionSelect.value;
        var lyrics = lyricsInput.value;

        var content =
            "Song: " + title + "\n" +
            "Section: " + section + "\n" +
            "Created with SonaFrame Lyric Assistant\n" +
            "\n" +
            lyrics +
            "\n";

        try {
            var blob = new Blob(
                [content],
                { type: "text/plain;charset=utf-8" }
            );

            var url = URL.createObjectURL(blob);
            var link = document.createElement("a");

            link.href = url;
            link.download = safeFileName(title) + ".txt";
            link.style.display = "none";

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(function () {
                URL.revokeObjectURL(url);
            }, 1000);

            setStatus(
                "TXT export requested. Check your browser downloads.",
                "success"
            );

        } catch (error) {
            setStatus(
                "Export failed in this environment. Try copying the lyrics instead.",
                "error"
            );
        }
    }

    /* =====================================
       CLIPBOARD
    ===================================== */

    function copyFallback(text) {
        var temporary = document.createElement("textarea");

        temporary.value = text;
        temporary.setAttribute("readonly", "readonly");

        temporary.style.position = "fixed";
        temporary.style.left = "-9999px";
        temporary.style.top = "0";

        document.body.appendChild(temporary);

        temporary.select();
        temporary.setSelectionRange(0, temporary.value.length);

        var success = false;

        try {
            success = document.execCommand("copy");
        } catch (error) {
            success = false;
        }

        temporary.remove();

        return success;
    }

    function copyLyrics() {
        var text = lyricsInput.value;

        if (!text) {
            setStatus(
                "There are no lyrics to copy yet.",
                "error"
            );

            return;
        }

        if (
            navigator.clipboard &&
            navigator.clipboard.writeText
        ) {
            navigator.clipboard.writeText(text)
                .then(function () {
                    setStatus(
                        "Lyrics copied to clipboard.",
                        "success"
                    );
                })
                .catch(function () {
                    if (copyFallback(text)) {
                        setStatus(
                            "Lyrics copied to clipboard.",
                            "success"
                        );
                    } else {
                        setStatus(
                            "Clipboard access was blocked. Select and copy the text manually.",
                            "error"
                        );
                    }
                });

            return;
        }

        if (copyFallback(text)) {
            setStatus(
                "Lyrics copied to clipboard.",
                "success"
            );
        } else {
            setStatus(
                "Clipboard access was blocked. Select and copy the text manually.",
                "error"
            );
        }
    }

    /* =====================================
       CLEAR LYRICS
    ===================================== */

    function clearLyrics() {
        var confirmed = window.confirm(
            "Clear the current lyrics? This cannot be undone."
        );

        if (!confirmed) {
            return;
        }

        lyricsInput.value = "";

        updateCounters();
        saveDraft(false);

        setStatus(
            "Lyrics cleared. The empty draft was saved.",
            "success"
        );
    }

    /* =====================================
       CREATE INTERFACE
    ===================================== */

    function createInterface() {
        if (document.getElementById("sf-lyric-panel")) {
            return;
        }

        var featureGrid = document.querySelector(".feature-grid");

        if (!featureGrid) {
            return;
        }

        addStyles();
        loadDraft();

        /*
        Hide the old planned Lyric Assistant card,
        because this feature is now available.
        */

        var plannedCards = document.querySelectorAll(
            ".planned-card"
        );

        for (var i = 0; i < plannedCards.length; i++) {
            var heading = plannedCards[i].querySelector("h3");

            if (
                heading &&
                heading.textContent.trim() === "Lyric Assistant"
            ) {
                plannedCards[i].style.display = "none";
            }
        }

        /* Active feature card */

        var card = createElement(
            "article",
            "feature-card sf-lyric-card"
        );

        var icon = createElement(
            "div",
            "feature-icon icon-purple",
            "♫"
        );

        icon.setAttribute("aria-hidden", "true");

        var topLine = createElement("div", "card-topline");
        topLine.appendChild(icon);

        topLine.appendChild(
            createElement("span", "tool-number", "TOOL 04")
        );

        card.appendChild(topLine);

        card.appendChild(
            createElement("h3", "", "Lyric Assistant")
        );

        card.appendChild(
            createElement(
                "p",
                "",
                "Write song lyrics, organize sections, count text, and save a local draft."
            )
        );

        var openButton = createButton(
            "Open Lyric Assistant →",
            true
        );

        openButton.classList.add("card-button");

        card.appendChild(openButton);
        featureGrid.appendChild(card);

        /* Main editor panel */

        panel = createElement(
            "section",
            "sf-lyric-panel"
        );

        panel.id = "sf-lyric-panel";
        panel.hidden = true;

        var heading = createElement(
            "div",
            "panel-heading"
        );

        var headingText = createElement("div");

        headingText.appendChild(
            createElement("p", "eyebrow", "STAGE 4")
        );

        headingText.appendChild(
            createElement("h2", "", "Lyric Assistant")
        );

        var closeButton = createButton("×", false);

        closeButton.className = "icon-button";
        closeButton.setAttribute(
            "aria-label",
            "Close Lyric Assistant"
        );

        heading.appendChild(headingText);
        heading.appendChild(closeButton);

        panel.appendChild(heading);

        panel.appendChild(
            createElement(
                "p",
                "sf-lyric-description",
                "Write your lyrics and organize each part of the song. Your draft is saved locally when browser storage is available."
            )
        );

        /* Song title */

        var titleLabel = createElement(
            "label",
            "sf-lyric-label",
            "Song Title"
        );

        titleLabel.htmlFor = "sf-lyric-title";

        titleInput = document.createElement("input");
        titleInput.id = "sf-lyric-title";
        titleInput.className = "sf-lyric-input";
        titleInput.type = "text";
        titleInput.maxLength = 160;
        titleInput.placeholder = "Enter your song title";
        titleInput.value = state.title;

        panel.appendChild(titleLabel);
        panel.appendChild(titleInput);

        /* Song section */

        var sectionLabel = createElement(
            "label",
            "sf-lyric-label",
            "Song Section"
        );

        sectionLabel.htmlFor = "sf-lyric-section";

        sectionSelect = document.createElement("select");
        sectionSelect.id = "sf-lyric-section";
        sectionSelect.className = "sf-lyric-select";

        var sections = [
            "Intro",
            "A Melody",
            "B Melody",
            "Chorus",
            "Bridge",
            "Interlude",
            "Outro",
            "Full Lyrics"
        ];

        for (var s = 0; s < sections.length; s++) {
            var option = document.createElement("option");

            option.value = sections[s];
            option.textContent = sections[s];

            sectionSelect.appendChild(option);
        }

        sectionSelect.value = state.section;

        if (sectionSelect.value !== state.section) {
            sectionSelect.value = "A Melody";
        }

        panel.appendChild(sectionLabel);
        panel.appendChild(sectionSelect);

        /* Lyrics editor */

        var lyricsLabel = createElement(
            "label",
            "sf-lyric-label",
            "Lyrics"
        );

        lyricsLabel.htmlFor = "sf-lyric-text";

        lyricsInput = document.createElement("textarea");
        lyricsInput.id = "sf-lyric-text";
        lyricsInput.className = "sf-lyric-textarea";
        lyricsInput.placeholder =
            "Write your lyrics here...\n\nLine 1\nLine 2\nLine 3";
        lyricsInput.spellcheck = false;
        lyricsInput.value = state.lyrics;

        panel.appendChild(lyricsLabel);
        panel.appendChild(lyricsInput);

        /* Counters */

        var counters = createElement(
            "div",
            "sf-lyric-counters"
        );

        function addCounter(label) {
            var item = createElement(
                "div",
                "sf-lyric-counter"
            );

            var value = createElement("strong", "", "0");

            item.appendChild(value);
            item.appendChild(
                createElement("span", "", label)
            );

            counters.appendChild(item);

            return value;
        }

        characterCount = addCounter("Characters");
        wordCount = addCounter("Words");
        lineCount = addCounter("Lines");

        panel.appendChild(counters);

        /* Action buttons */

        var actions = createElement(
            "div",
            "sf-lyric-actions"
        );

        var saveButton = createButton(
            "Save Draft",
            true
        );

        var copyButton = createButton(
            "Copy Lyrics",
            false
        );

        var exportButton = createButton(
            "Export TXT",
            false
        );

        var clearButton = createButton(
            "Clear Lyrics",
            false
        );

        actions.appendChild(saveButton);
        actions.appendChild(copyButton);
        actions.appendChild(exportButton);
        actions.appendChild(clearButton);

        panel.appendChild(actions);

        /* Status and help */

        statusBox = createElement(
            "div",
            "sf-lyric-status",
            "Ready."
        );

        statusBox.setAttribute("role", "status");
        statusBox.setAttribute("aria-live", "polite");

        panel.appendChild(statusBox);

        panel.appendChild(
            createElement(
                "p",
                "sf-lyric-help",
                "Tip: use one lyric line per row. This version counts characters, words, and lines; Japanese mora counting and vocal-timing analysis are not included yet."
            )
        );

        /*
        Insert the editor before the planned-tools section.
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

        /* =================================
           EVENT LISTENERS
        ================================= */

        openButton.addEventListener("click", function () {
            panel.hidden = false;

            panel.scrollIntoView({
                behavior: "auto",
                block: "start"
            });

            updateCounters();
        });

        closeButton.addEventListener("click", function () {
            panel.hidden = true;

            featureGrid.scrollIntoView({
                behavior: "auto",
                block: "start"
            });
        });

        titleInput.addEventListener(
            "input",
            scheduleSave
        );

        sectionSelect.addEventListener(
            "change",
            scheduleSave
        );

        lyricsInput.addEventListener(
            "input",
            scheduleSave
        );

        saveButton.addEventListener("click", function () {
            if (saveTimer) {
                clearTimeout(saveTimer);
                saveTimer = null;
            }

            saveDraft(true);
        });

        copyButton.addEventListener(
            "click",
            copyLyrics
        );

        exportButton.addEventListener(
            "click",
            exportLyrics
        );

        clearButton.addEventListener(
            "click",
            clearLyrics
        );

        updateCounters();

        setStatus(
            "Ready. Your draft stays on this device when local storage is available."
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
