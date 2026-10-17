/*
Project: SonaFrame
File: sw.js
Version: 0.5.0

Purpose:
- Offline application shell
- Versioned application cache
- Removal of outdated SonaFrame caches
*/

"use strict";

var CACHE_NAME = "sonaframe-shell-v0.5.0";

var APP_FILES = [
    "./",
    "./index.html",
    "./styles.css",
    "./app.js",
    "./midi-merge.js",
    "./midi-visualizer.js",
    "./manifest.webmanifest",
    "./icon.svg"
];

/* =====================================
   INSTALL
===================================== */

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

/* =====================================
   ACTIVATE
===================================== */

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

/* =====================================
   FETCH
===================================== */

self.addEventListener("fetch", function (event) {
    var request = event.request;

    if (request.method !== "GET") {
        return;
    }

    var requestURL = new URL(request.url);

    if (requestURL.origin !== self.location.origin) {
        return;
    }

    /*
    Navigation:
    try the network first so the latest HTML
    can be obtained when the device is online.
    Fall back to the cached application shell offline.
    */

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then(function (response) {
                    if (response && response.ok) {
                        var clone = response.clone();

                        caches.open(CACHE_NAME)
                            .then(function (cache) {
                                cache.put("./", clone);
                            });
                    }

                    return response;
                })
                .catch(function () {
                    return caches.match("./index.html")
                        .then(function (cached) {
                            return cached ||
                                caches.match("./");
                        });
                })
        );

        return;
    }

    /*
    Application assets:
    use the active versioned cache first.
    New versions receive a new cache name.
    */

    event.respondWith(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                return cache.match(request)
                    .then(function (cachedResponse) {
                        if (cachedResponse) {
                            return cachedResponse;
                        }

                        return fetch(request)
                            .then(function (response) {
                                if (
                                    response &&
                                    response.ok &&
                                    response.type === "basic"
                                ) {
                                    cache.put(
                                        request,
                                        response.clone()
                                    );
                                }

                                return response;
                            });
                    });
            })
    );
});
