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
 *   - A small, explicit allowlist of static files is served from cache and
 *     refreshed in the background. Everything else same-origin is passed
 *     straight through, so a future API route cannot be silently cached and
 *     served stale out of a version-pinned cache.
 *   - Cross-origin requests are not touched at all. Google Fonts is therefore
 *     not cached: offline, the app falls back to the system font rather than
 *     filling the cache with opaque responses.
 *
 * The event catalogue is bundled into the JS at build time, so caching the
 * hashed /assets/ output is enough to make the whole schedule work offline.
 *
 * The hashed filenames are only known after a build, so they cannot be listed
 * here. On the very first visit the worker is not yet controlling the page and
 * therefore never sees those requests; the page hands us the list it actually
 * loaded via a 'warm-assets' message so that the first offline launch works
 * too. See index.tsx.
 *
 * Bump VERSION to invalidate every cache on the next deploy. A VERSION bump
 * leaves the new worker 'waiting' while the old one still controls open
 * clients: the page shows "Reload to update" and posts 'skip-waiting' back,
 * so the shell is never swapped under the user mid-session. A first install
 * (no existing worker) still activates immediately.
 */
const VERSION = 'aiw-v1'
const SHELL_CACHE = VERSION + '-shell'
const ASSET_CACHE = VERSION + '-assets'
const KEEP = [SHELL_CACHE, ASSET_CACHE]

// Without these the app cannot boot offline, so a failure here should fail the
// install and leave the previous worker in place.
const CORE_PRECACHE = ['/', '/manifest.webmanifest']

// Nice to have offline, but never worth losing the whole worker over: addAll is
// all-or-nothing, so a single renamed icon would otherwise reject the install
// and silently disable offline support entirely.
const OPTIONAL_PRECACHE = ['/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/logo-aiw.png']

// The only same-origin paths the background-refresh branch may touch.
const STATIC_PATHS = [
  '/manifest.webmanifest',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/favicon.ico',
  '/logo-aiw.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        Promise.all([
          cache.addAll(CORE_PRECACHE),
          ...OPTIONAL_PRECACHE.map((url) => cache.add(url).catch(() => undefined)),
        ]),
      ),
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

/*
 * First-visit warm-up. Registration happens on `load`, by which time the
 * browser has already fetched the hashed entry bundles without the worker
 * controlling the page. Those requests are never intercepted, so an offline
 * reload would serve the cached shell and then fail on every /assets/ request.
 * The page posts the asset URLs it actually loaded and we cache them here.
 */
self.addEventListener('message', (event) => {
  const data = event.data

  // The page chose "Reload to update": leave the waiting state so this worker
  // activates and claims its clients.
  if (data && data.type === 'skip-waiting') {
    event.waitUntil(self.skipWaiting())
    return
  }

  if (!data || data.type !== 'warm-assets' || !Array.isArray(data.urls)) return

  event.waitUntil(
    caches.open(ASSET_CACHE).then((cache) =>
      Promise.all(
        data.urls.map((raw) => {
          let url
          try {
            url = new URL(raw, self.location.origin)
          } catch {
            return undefined
          }
          // Never fetch whatever a message happens to name.
          if (url.origin !== self.location.origin) return undefined
          if (!url.pathname.startsWith('/assets/')) return undefined
          return cache.match(url.href).then((hit) => (hit ? undefined : cache.add(url.href).catch(() => undefined)))
        }),
      ),
    ),
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
          caches.match('/').then((cached) => {
            // Tell the page this load came from the cache: navigator.onLine
            // still reports true on captive-portal Wi-Fi, so the offline
            // banner needs this signal rather than the browser's guess.
            if (cached && event.clientId) {
              self.clients
                .get(event.clientId)
                .then((client) => client && client.postMessage({ type: 'served-offline-shell' }))
                .catch(() => undefined)
            }
            return cached || new Response('Offline', { status: 503, statusText: 'Offline' })
          }),
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

  // Anything else same-origin that is not on the static allowlist is left to
  // the network, so dynamic responses are never served from a pinned cache.
  if (!STATIC_PATHS.includes(url.pathname)) return

  // Static files: serve cached, refresh in the background.
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
