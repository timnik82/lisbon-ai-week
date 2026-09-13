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

  it('precaches only files that exist', () => {
    const block = sw.slice(sw.indexOf('const PRECACHE'), sw.indexOf(']', sw.indexOf('const PRECACHE')))
    const entries = [...block.matchAll(/'(\/[^']*)'/g)].map((m) => m[1])
    expect(entries).toContain('/')
    for (const entry of entries.filter((e) => e !== '/')) {
      expect(existsSync(pub(entry.replace(/^\//, ''))), `${entry} is precached but missing`).toBe(true)
    }
  })

  it('serves navigations network-first so a stale shell cannot strand the user', () => {
    const nav = sw.slice(sw.indexOf("request.mode === 'navigate'"))
    // the fetch must come before any caches.match in the navigation branch
    expect(nav.indexOf('fetch(request)')).toBeLessThan(nav.indexOf('caches.match'))
  })

  it('is registered only in production builds', () => {
    const entry = readFileSync(resolve(root, 'index.tsx'), 'utf8')
    expect(entry).toContain('import.meta.env.PROD')
    expect(entry).toContain("navigator.serviceWorker.register(\"/sw.js\")")
  })
})

describe('header wordmark', () => {
  it('is a transparent PNG', () => {
    const png = readPng(pub('logo-aiw.png'))
    expect(png.colourType).toBe(RGBA)
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
