/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "d53a6b13617ab1a2927a8943d527df57"
  }, {
    "url": "pwa-512x512.png",
    "revision": "6cb24aa45f348b889c9b0202f8194576"
  }, {
    "url": "pwa-192x192.png",
    "revision": "8a8bd8b7735ce6cf083abe4b1d7013d2"
  }, {
    "url": "index.html",
    "revision": "ea1dd385e7847c6b6aa340071608edbd"
  }, {
    "url": "icon.svg",
    "revision": "d2cd2cd0f0627172fde88e26273ecb70"
  }, {
    "url": "favicon.ico",
    "revision": "9ed103d43cb69a30e5f68465bf2646cc"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "e33b6273cdcec15144150eacf3a2c01e"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/spark-lineart-white.png",
    "revision": null
  }, {
    "url": "assets/spark-lineart-dark.png",
    "revision": null
  }, {
    "url": "assets/spark-lineart-blue.png",
    "revision": null
  }, {
    "url": "assets/spark-cropped.png",
    "revision": null
  }, {
    "url": "assets/index-C6ZQzb2I.js",
    "revision": null
  }, {
    "url": "assets/index-Bh5KXG4x.css",
    "revision": null
  }, {
    "url": "assets/aistudio/car2-20260824-083541_5714fd97.csv",
    "revision": null
  }, {
    "url": "assets/aistudio/PDIK5085_678d0748.png",
    "revision": null
  }, {
    "url": "pwa-192x192.png",
    "revision": "8a8bd8b7735ce6cf083abe4b1d7013d2"
  }, {
    "url": "pwa-512x512.png",
    "revision": "6cb24aa45f348b889c9b0202f8194576"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "d53a6b13617ab1a2927a8943d527df57"
  }, {
    "url": "manifest.webmanifest",
    "revision": "19d679c7ae2c8fef807b3070233bf729"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
