/*
Project: SonaFrame
File: app.js
Version: 0.1.0

Developed with assistance from ChatGPT.
Project owner: User.

Purpose:
Application interactions and PWA registration.
*/

(function () {
    "use strict";

    var connectionStatus =
        document.getElementById("connection-status");

    var startButton =
        document.getElementById("start-button");

    var aboutButton =
        document.getElementById("about-button");

    var workspacePanel =
        document.getElementById("workspace-panel");

    var aboutPanel =
        document.getElementById("about-panel");

    var closePanelButton =
        document.getElementById("close-panel-button");

    var closeAboutButton =
        document.getElementById("close-about-button");


    function updateConnectionStatus() {
        if (!connectionStatus) {
            return;
        }

        if (navigator.onLine) {
            connectionStatus.textContent = "Online";
        } else {
            connectionStatus.textContent = "Offline";
        }
    }


    function hidePanels() {
        workspacePanel.hidden = true;
        aboutPanel.hidden = true;
    }


    function openWorkspace() {
        hidePanels();

        workspacePanel.hidden = false;

        workspacePanel.scrollIntoView({
            behavior: "auto",
            block: "start"
        });
    }


    function openAbout() {
        hidePanels();

        aboutPanel.hidden = false;

        aboutPanel.scrollIntoView({
            behavior: "auto",
            block: "start"
        });
    }


    function closeWorkspace() {
        workspacePanel.hidden = true;
    }


    function closeAbout() {
        aboutPanel.hidden = true;
    }


    if (startButton) {
        startButton.addEventListener(
            "click",
            openWorkspace
        );
    }


    if (aboutButton) {
        aboutButton.addEventListener(
            "click",
            openAbout
        );
    }


    if (closePanelButton) {
        closePanelButton.addEventListener(
            "click",
            closeWorkspace
        );
    }


    if (closeAboutButton) {
        closeAboutButton.addEventListener(
            "click",
            closeAbout
        );
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


    /*
    Register the Service Worker only when
    the browser supports it and the application
    is served through an appropriate secure context.

    localhost is generally treated as a secure context.
    A GitHub Pages HTTPS deployment can also qualify.
    */

    if (
        "serviceWorker" in navigator &&
        window.isSecureContext
    ) {
        window.addEventListener("load", function () {
            navigator.serviceWorker
                .register("./sw.js")
                .catch(function (error) {
                    console.error(
                        "SonaFrame Service Worker error:",
                        error
                    );
                });
        });
    }

})();