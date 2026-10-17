/*
Project: SonaFrame
File: sw.js
Version: 0.6.0

Purpose:
- Offline application shell
- Versioned application cache
- Automatic cache updates
- Removal of outdated SonaFrame caches
- Network-first navigation
- Cache-first local application assets

Final target:
Android APK / WebView compatibility

Note:
This Service Worker is intended for supported web origins,
such as HTTPS hosting. Android WebView APK integration
may require a separate native offline strategy.
*/

"use strict";

/* =====================================
   CACHE CONFIGURATION
===================================== */

var CACHE_NAME = "sonaframe-shell-v0.6.0";

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

    /* Only handle GET requests. */

    if (request.method !== "GET") {
        return;
    }

    var requestURL = new URL(request.url);

    /* Ignore requests outside this origin. */

    if (requestURL.origin !== self.location.origin) {
        return;
    }

    /*
    HTML navigation:
    Try the network first.
    Fall back to the cached application when offline.
    */

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then(function (response) {
                    if (response && response.ok) {
                        var responseCopy = response.clone();

                        caches.open(CACHE_NAME)
                            .then(function (cache) {
                                cache.put(
                                    "./index.html",
                                    responseCopy
                                );
                            })
                            .catch(function () {
                                /*
                                A cache update failure should not
                                prevent the page from loading.
                                */
                            });
                    }

                    return response;
                })
                .catch(function () {
                    return caches.match("./index.html")
                        .then(function (cachedPage) {
                            if (cachedPage) {
                                return cachedPage;
                            }

                            return caches.match("./");
                        });
                })
        );

        return;
    }

    /*
    Local application assets:
    Use the current cache first.
    Download and cache missing assets when online.
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
