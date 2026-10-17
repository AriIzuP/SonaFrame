/*
Project: SonaFrame
File: sw.js
Version: 0.5.1

Purpose:
- Offline application shell
- Versioned application cache
- Automatic cache updates
- Removal of outdated SonaFrame caches
*/

"use strict";

var CACHE_NAME = "sonaframe-shell-v0.5.1";

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
    HTML navigation:
    try the network first.
    Use cached HTML when offline.
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
                            return cached || caches.match("./");
                        });
                })
        );

        return;
    }

    /*
    Application assets:
    use the current versioned cache first.
    */

    event.respondWith(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                return cache.match(request)
                    .then(function (cached) {
                        if (cached) {
                            return cached;
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
