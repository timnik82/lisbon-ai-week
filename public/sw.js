/*
 * Lisbon AI Week - service worker.
 *
 * Deliberately conservative, because the usual PWA failure mode is a user stuck
 * on a stale shell with no way to force an update:
 *
 *   - Navigations are NETWORK-FIRST. A new release is therefore picked up on the
 *     next load, and the cached shell is only used when the network fails.
 *   - Vite's content-hashed build output under /assets/ is CACHE-FIRST. Those
 *     URLs change whenever their contents change, so they can never go stale.
 *   - Everything else same-origin is served from cache and refreshed in the
 *     background, so updates land on the following load.
 *   - Cross-origin requests are not touched at all. Google Fonts is therefore
 *     not cached: offline, the app falls back to the system font rather than
 *     filling the cache with opaque responses.
 *
 * The event catalogue is bundled into the JS at build time, so caching the
 * hashed assets is enough to make the whole schedule work offline.
 *
 * Bump VERSION to invalidate every cache on the next deploy.
 */
const VERSION = 'aiw-v1'
const SHELL_CACHE = VERSION + '-shell'
const ASSET_CACHE = VERSION + '-assets'
const KEEP = [SHELL_CACHE, ASSET_CACHE]

const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/logo-aiw.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !KEEP.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

function putInCache(cacheName, request, response) {
  // Never let a cache write failure break the response the page is waiting on.
  const copy = response.clone()
  return caches
    .open(cacheName)
    .then((cache) => cache.put(request, copy))
    .catch(() => undefined)
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }
  if (url.origin !== self.location.origin) return

  // Navigations: network first, cached shell as the offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) event.waitUntil(putInCache(SHELL_CACHE, '/', response))
          return response
        })
        .catch(() =>
          caches.match('/').then((cached) => cached || new Response('Offline', { status: 503, statusText: 'Offline' })),
        ),
    )
    return
  }

  // Content-hashed build output: cache first, it cannot go stale.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) event.waitUntil(putInCache(ASSET_CACHE, request, response))
            return response
          }),
      ),
    )
    return
  }

  // Icons, manifest, favicon: serve cached, refresh in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fromNetwork = fetch(request)
        .then((response) => {
          if (!response.ok) return response
          return putInCache(SHELL_CACHE, request, response).then(() => response)
        })
        .catch(() => cached || new Response('', { status: 504, statusText: 'Offline' }))

      // waitUntil must be registered while the event is still active. This
      // callback runs while the promise handed to respondWith is still pending,
      // so it is. Calling waitUntil from inside the fetch's own .then() would
      // throw InvalidStateError whenever a cached response had already been
      // returned above, which silently disabled the background refresh.
      event.waitUntil(fromNetwork)
      return cached || fromNetwork
    }),
  )
})
