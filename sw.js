/*
Project: SonaFrame
File: sw.js
Version: 0.1.0

Developed with assistance from ChatGPT.
Project owner: User.

Purpose:
Cache the initial application shell for offline access.
*/

"use strict";

var CACHE_NAME = "sonaframe-shell-v0.1.0";

var APP_FILES = [
    "./",
    "./index.html",
    "./styles.css",
    "./app.js",
    "./manifest.webmanifest",
    "./icon.svg"
];


self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                return cache.addAll(APP_FILES);
            })
            .then(function () {
                return self.skipWaiting();
            })
    );
});


self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys()
            .then(function (cacheNames) {
                return Promise.all(
                    cacheNames.map(function (cacheName) {
                        if (
                            cacheName.indexOf(
                                "sonaframe-shell-"
                            ) === 0 &&
                            cacheName !== CACHE_NAME
                        ) {
                            return caches.delete(cacheName);
                        }

                        return Promise.resolve(false);
                    })
                );
            })
            .then(function () {
                return self.clients.claim();
            })
    );
});


self.addEventListener("fetch", function (event) {
    var request = event.request;

    if (request.method !== "GET") {
        return;
    }

    var requestURL = new URL(request.url);

    if (requestURL.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        caches.match(request)
            .then(function (cachedResponse) {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request);
            })
    );
});