import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')
const pub = (name: string) => resolve(root, 'public', name)

/** Read a PNG's intrinsic size and colour type straight out of its IHDR chunk. */
function readPng(path: string) {
  const buf = readFileSync(path)
  const signature = buf.subarray(0, 8).toString('hex')
  expect(signature).toBe('89504e470d0a1a0a')
  expect(buf.subarray(12, 16).toString('ascii')).toBe('IHDR')
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    colourType: buf.readUInt8(25),
  }
}

// PNG colour types: 2 = truecolour (no alpha), 6 = truecolour + alpha
const RGB = 2
const RGBA = 6

interface Manifest {
  name: string
  short_name: string
  start_url: string
  scope: string
  display: string
  background_color: string
  theme_color: string
  icons: { src: string; sizes: string; type: string; purpose?: string }[]
}

const manifest = JSON.parse(readFileSync(pub('manifest.webmanifest'), 'utf8')) as Manifest
const html = readFileSync(resolve(root, 'index.html'), 'utf8')

describe('web app manifest', () => {
  it('declares the fields an installable app needs', () => {
    expect(manifest.name).toBe('Lisbon AI Week')
    expect(manifest.short_name).toBe('AI Week')
    expect(manifest.short_name.length).toBeLessThanOrEqual(12)
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.background_color).toMatch(/^#[0-9A-F]{6}$/i)
    expect(manifest.theme_color).toMatch(/^#[0-9A-F]{6}$/i)
  })

  it('points at icons that exist and match their declared sizes', () => {
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2)
    for (const icon of manifest.icons) {
      const file = pub(icon.src.replace(/^\//, ''))
      expect(existsSync(file), `${icon.src} is declared but missing`).toBe(true)
      const [w, h] = icon.sizes.split('x').map(Number)
      const png = readPng(file)
      expect(png.width, `${icon.src} width`).toBe(w)
      expect(png.height, `${icon.src} height`).toBe(h)
    }
  })

  it('includes both an "any" and a "maskable" icon', () => {
    const purposes = manifest.icons.map((icon) => icon.purpose ?? 'any')
    expect(purposes).toContain('any')
    expect(purposes).toContain('maskable')
  })
})

describe('iOS home-screen icon', () => {
  it('is exactly 180x180', () => {
    const png = readPng(pub('apple-touch-icon.png'))
    expect(png.width).toBe(180)
    expect(png.height).toBe(180)
  })

  it('is fully opaque, because iOS renders transparency as black', () => {
    for (const name of ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) {
      expect(readPng(pub(name)).colourType, `${name} must have no alpha channel`).toBe(RGB)
    }
  })
})

describe('index.html', () => {
  it('links the manifest and the apple-touch-icon', () => {
    expect(html).toContain('rel="manifest"')
    expect(html).toContain('href="/manifest.webmanifest"')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(html).toContain('href="/apple-touch-icon.png"')
  })

  it('declares the iOS web-app meta tags', () => {
    expect(html).toContain('name="apple-mobile-web-app-capable"')
    expect(html).toContain('name="apple-mobile-web-app-title"')
    expect(html).toContain('name="theme-color"')
  })

  it('keeps viewport-fit=cover for the safe-area insets the layout relies on', () => {
    expect(html).toContain('viewport-fit=cover')
  })
})

describe('service worker', () => {
  const sw = readFileSync(pub('sw.js'), 'utf8')

  const listEntries = (name: string) => {
    const at = sw.indexOf(`const ${name}`)
    expect(at, `${name} not found in sw.js`).toBeGreaterThan(-1)
    const block = sw.slice(at, sw.indexOf(']', at))
    return [...block.matchAll(/'(\/[^']*)'/g)].map((m) => m[1])
  }

  it('precaches only files that exist', () => {
    const core = listEntries('CORE_PRECACHE')
    const optional = listEntries('OPTIONAL_PRECACHE')
    expect(core).toContain('/')
    expect(core.length + optional.length).toBeGreaterThan(1)
    for (const entry of [...core, ...optional].filter((e) => e !== '/')) {
      expect(existsSync(pub(entry.replace(/^\//, ''))), `${entry} is precached but missing`).toBe(true)
    }
  })

  it('only the core shell can fail the install; icons are best-effort', () => {
    // addAll is all-or-nothing, so a single renamed icon would otherwise reject
    // the install and silently disable offline support entirely.
    expect(sw).toContain('cache.addAll(CORE_PRECACHE)')
    expect(sw).toMatch(/OPTIONAL_PRECACHE\.map\(\(url\) => cache\.add\(url\)\.catch/)
  })

  it('caches the entry bundles the first visit loaded, so the first offline launch works', () => {
    // Registration happens on load, after the browser has already fetched the
    // hashed bundles without the worker controlling the page.
    expect(sw).toContain("data.type !== 'warm-assets'")
    expect(sw).toContain("url.pathname.startsWith('/assets/')")
    const entry = readFileSync(resolve(root, 'index.tsx'), 'utf8')
    expect(entry).toContain('warm-assets')
    expect(entry).toContain('getEntriesByType("resource")')
  })

  it('rejects warm-up URLs that are not same-origin build assets', () => {
    const handler = sw.slice(sw.indexOf("data.type !== 'warm-assets'"))
    expect(handler).toContain('url.origin !== self.location.origin')
  })

  it('passes through same-origin requests that are not on the static allowlist', () => {
    // Otherwise a future API route would be served stale from a pinned cache.
    expect(sw).toContain('if (!STATIC_PATHS.includes(url.pathname)) return')
  })

  it('serves navigations network-first so a stale shell cannot strand the user', () => {
    const branchStart = sw.indexOf("request.mode === 'navigate'")
    expect(branchStart, 'navigation branch not found').toBeGreaterThan(-1)
    const nav = sw.slice(branchStart)
    const fetchAt = nav.indexOf('fetch(request)')
    const cacheAt = nav.indexOf('caches.match')
    // Both probes must actually be present, otherwise a -1 would satisfy the
    // ordering check vacuously and the assertion would prove nothing.
    expect(fetchAt, 'no fetch in the navigation branch').toBeGreaterThan(-1)
    expect(cacheAt, 'no cache fallback in the navigation branch').toBeGreaterThan(-1)
    expect(fetchAt).toBeLessThan(cacheAt)
  })

  it('registers the background refresh while the fetch event is still active', () => {
    // Calling waitUntil from inside the fetch's own .then() throws
    // InvalidStateError once a cached response has been returned, which
    // silently disables the refresh. It must be registered synchronously.
    const anchor = sw.indexOf('// Static files: serve cached')
    expect(anchor, 'static-file branch not found').toBeGreaterThan(-1)
    const branch = sw.slice(anchor)
    const waitAt = branch.indexOf('event.waitUntil(fromNetwork)')
    const returnAt = branch.indexOf('return cached || fromNetwork')
    expect(waitAt, 'background refresh is not registered synchronously').toBeGreaterThan(-1)
    expect(returnAt, 'cached-first return not found').toBeGreaterThan(-1)
    expect(waitAt).toBeLessThan(returnAt)
  })

  it('is registered only in production builds', () => {
    const entry = readFileSync(resolve(root, 'index.tsx'), 'utf8')
    // Whitespace-tolerant so reformatting cannot break the assertion.
    const call = /navigator\.serviceWorker\s*\.register\(\s*["']\/sw\.js["']\s*\)/.exec(entry)
    expect(call, 'service worker registration call not found').not.toBeNull()
    const registerAt = call!.index
    // The guard must precede the call. Asserting both strings exist somewhere
    // in the file would still pass if registration moved outside the guard.
    expect(entry.slice(0, registerAt)).toContain('import.meta.env.PROD')
  })

  it('logs a failed registration instead of swallowing it', () => {
    // A rejected install would otherwise disable offline support with no signal.
    const entry = readFileSync(resolve(root, 'index.tsx'), 'utf8')
    expect(entry).toMatch(/\.catch\(\(error\) => \{\s*console\.warn/)
  })

  it('does not activate on install while an older worker controls the page', () => {
    // Mid-session activation would swap the shell under the user. The page
    // offers "Reload to update" instead, and posts 'skip-waiting' on click.
    const install = sw.slice(
      sw.indexOf("self.addEventListener('install'"),
      sw.indexOf("self.addEventListener('activate'"),
    )
    expect(install).not.toContain('skipWaiting()')
    expect(sw).toContain("data.type === 'skip-waiting'")
    expect(sw).toContain('self.skipWaiting()')
  })

  it('tells the page when a navigation was served from the cached shell', () => {
    // navigator.onLine stays true on captive-portal Wi-Fi, so the offline
    // banner relies on this handshake rather than the browser's guess.
    expect(sw).toContain('event.resultingClientId')
    expect(sw).toContain("'shell-source-ping'")
    const entry = readFileSync(resolve(root, 'index.tsx'), 'utf8')
    expect(entry).toContain('shell-source-ping')
  })

  it('ignores Vary when matching cached responses', () => {
    // vite preview (and some hosts) adds `Vary: Origin`; module-script and
    // manifest requests carry Origin while warm-assets entries were stored
    // without it, so a strict match would miss every asset offline.
    expect(sw).toContain('ignoreVary: true')
    // Every cache lookup must take the option — a bare match() here would
    // silently break offline assets again.
    expect(sw.match(/\.match\([^,]+\)\.then/g) ?? []).toEqual([])
  })

  it('surfaces a waiting worker and reloads only after it takes over', () => {
    const entry = readFileSync(resolve(root, 'index.tsx'), 'utf8')
    expect(entry).toContain('registration.waiting')
    expect(entry).toContain('updatefound')
    expect(entry).toContain('controllerchange')
  })
})

describe('header wordmark', () => {
  it('is a transparent PNG whose real size matches the intrinsic attributes', () => {
    const png = readPng(pub('logo-aiw.png'))
    expect(png.colourType).toBe(RGBA)
    // Schedule.tsx hard-codes width={431} height={256}. If the artwork is ever
    // swapped for one with a different aspect ratio, those attributes would
    // distort it silently, so pin both dimensions here rather than just height.
    expect(png.width).toBe(431)
    expect(png.height).toBe(256)
  })

  it('is rendered with an accessible name inside the h1', () => {
    const schedule = readFileSync(resolve(root, 'pages', 'Schedule.tsx'), 'utf8')
    expect(schedule).toContain('src="/logo-aiw.png"')
    expect(schedule).toContain('alt="Lisbon AI Week"')
    // intrinsic dimensions must be present so the image reserves layout space
    expect(schedule).toMatch(/width=\{431\}\s+height=\{256\}/)
  })
})
