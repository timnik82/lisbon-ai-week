import { describe, expect, it } from 'vitest'
import catalog from '../data/catalog.json'
import { events } from '../data/events'
import type { VerificationStatus } from '../types/event'

// The catalog is the Lisbon AI Week 2026 snapshot, kept current by the daily
// source-verification checks. The record set and the IDs are immutable: 71 records
// that must never be renumbered or reordered, because visitors' saved favourites are
// keyed to those IDs. The coverage counts below are NOT immutable — they move when the
// official site publishes a date, time or venue that was previously missing, and they
// exist to make such a move fail loudly so it arrives through a reviewed PR that quotes
// the source. Update them only together with the catalog change that caused the move;
// never adjust them to paper over an unexplained diff.
//
// Last moved: 14 Sep 2026 — the official pages published schedules for
// "Gone in 60 Seconds" and "Reset Protocol" (dated 34 -> 36, descriptions filled
// 17 -> 15 null) and four records reached verified status.
const EXPECTED_RECORDS = 71
const EXPECTED_UNIQUE_IDS = 71
const EXPECTED_DATED = 36
const EXPECTED_TBD = 35
const EXPECTED_NULL_DESCRIPTIONS = 15
const EXPECTED_STATUS_COUNTS: Record<VerificationStatus, number> = {
  verified: 15,
  verified_with_conflict: 2,
  unverified: 54,
}

// Stable sample IDs drawn from the source catalog. Kept as explicit constants so a
// regression that rewrites/regenerates IDs fails loudly instead of silently passing.
const STABLE_VERIFIED_IDS = [
  'ea6439ca3f88',
  'f9bf1a80043a',
  '9ff57efb7640',
  '327e7fb5d9ff',
  'fdd84a498a38',
  'cd09157c333a',
  '251f94811db6',
  '4d1a8946f92d',
  'd127a1c18466',
  '84b87f220370',
  'd02a8ab95fe8',
  '4c1a43925828',
  '6bd68fc2c99e',
  'abdd9e021b61',
  'eb6bb6a6b5d4',
] as const
const STABLE_CONFLICT_IDS = ['8c2c87cefe31', 'ad7204602d0a'] as const
const STABLE_ALIAS_ID = 'fdd84a498a38'
const STABLE_FIRST_IDS = ['ea6439ca3f88', 'f9bf1a80043a', '8c2c87cefe31'] as const

describe('catalog.json shape', () => {
  it('is a non-empty array of records', () => {
    expect(Array.isArray(catalog)).toBe(true)
    expect(catalog.length).toBe(EXPECTED_RECORDS)
  })

  it('has exactly 71 unique IDs', () => {
    const ids = catalog.map((record) => record.id)
    expect(ids.length).toBe(EXPECTED_UNIQUE_IDS)
    expect(new Set(ids).size).toBe(EXPECTED_UNIQUE_IDS)
  })

  it('has no blank or duplicate IDs', () => {
    const ids = catalog.map((record) => record.id)
    expect(ids.every((id) => typeof id === 'string' && id.trim().length > 0)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('carries all ScheduleEvent fields on every record', () => {
    const expectedKeys = [
      'id',
      'title',
      'description',
      'sourceUrl',
      'registrationUrl',
      'timezone',
      'date',
      'start',
      'end',
      'endDate',
      'category',
      'venue',
      'verificationStatus',
      'checkedAt',
      'uncertainty',
      'aliases',
    ]
    for (const record of catalog) {
      expect(Object.keys(record)).toEqual(expectedKeys)
    }
  })

  it('requires a non-empty uncertainty string on every record', () => {
    expect(catalog.every((record) => typeof record.uncertainty === 'string' && record.uncertainty.trim().length > 0)).toBe(true)
  })
})

describe('catalog.json date coverage', () => {
  it('has 36 dated records', () => {
    expect(catalog.filter((record) => record.date).length).toBe(EXPECTED_DATED)
  })

  it('has 35 TBD records (no date)', () => {
    expect(catalog.filter((record) => !record.date).length).toBe(EXPECTED_TBD)
  })

  it('dated records use ISO YYYY-MM-DD and dated+TBD sums to the full catalog', () => {
    const dated = catalog.filter((record) => record.date)
    expect(dated.every((record) => /^\d{4}-\d{2}-\d{2}$/.test(record.date as string))).toBe(true)
    expect(dated.length + catalog.filter((record) => !record.date).length).toBe(EXPECTED_RECORDS)
  })
})

describe('catalog.json descriptions', () => {
  it('has 15 null descriptions and never uses empty strings', () => {
    expect(catalog.filter((record) => record.description === null).length).toBe(EXPECTED_NULL_DESCRIPTIONS)
    expect(catalog.some((record) => record.description === '')).toBe(false)
  })
})

describe('catalog.json verification status', () => {
  it('matches expected status counts', () => {
    const counts = catalog.reduce<Record<string, number>>((acc, record) => {
      acc[record.verificationStatus] = (acc[record.verificationStatus] ?? 0) + 1
      return acc
    }, {})
    expect(counts).toEqual(EXPECTED_STATUS_COUNTS)
  })

  it('only uses the three allowed statuses and sums to the actual catalog total', () => {
    const allowed = ['verified', 'verified_with_conflict', 'unverified']
    expect(catalog.every((record) => allowed.includes(record.verificationStatus))).toBe(true)
    // Derive the total from the catalog records themselves, not from the expected
    // constants — so this test checks internal consistency rather than restating
    // EXPECTED_STATUS_COUNTS.
    expect(catalog.length).toBe(EXPECTED_RECORDS)
    const countedRecords = Object.values(EXPECTED_STATUS_COUNTS).reduce((sum, value) => sum + value, 0)
    expect(countedRecords).toBe(catalog.length)
  })
})

describe('catalog.json stable sample IDs', () => {
  it('keeps every known verified ID, all still verified', () => {
    const byId = new Map(catalog.map((record) => [record.id, record]))
    for (const id of STABLE_VERIFIED_IDS) {
      expect(byId.has(id)).toBe(true)
      expect(byId.get(id)?.verificationStatus).toBe('verified')
    }
  })

  it('keeps every known conflict ID and the known alias ID', () => {
    for (const id of STABLE_CONFLICT_IDS) {
      const conflict = catalog.find((record) => record.id === id)
      expect(conflict?.verificationStatus).toBe('verified_with_conflict')
    }
    const alias = catalog.find((record) => record.id === STABLE_ALIAS_ID)
    expect(alias?.aliases).not.toBeNull()
    expect(alias?.aliases?.relation).toBe('possible_alias_of')
  })

  it('preserves the leading record IDs in source order', () => {
    expect(catalog.slice(0, STABLE_FIRST_IDS.length).map((record) => record.id)).toEqual([...STABLE_FIRST_IDS])
  })
})

describe('data/events.ts projection', () => {
  it('maps every catalog record one-to-one, order preserved', () => {
    expect(events.length).toBe(EXPECTED_RECORDS)
    expect(events.map((event) => event.id)).toEqual(catalog.map((record) => record.id))
  })

  it('copies field values verbatim (no rewriting)', () => {
    for (let index = 0; index < catalog.length; index += 1) {
      const record = catalog[index]
      const event = events[index]
      expect(event.title).toBe(record.title)
      expect(event.description).toBe(record.description)
      expect(event.sourceUrl).toBe(record.sourceUrl)
      expect(event.registrationUrl).toBe(record.registrationUrl)
      expect(event.timezone).toBe(record.timezone)
      expect(event.date).toBe(record.date)
      expect(event.start).toBe(record.start)
      expect(event.end).toBe(record.end)
      expect(event.endDate).toBe(record.endDate)
      expect(event.category).toBe(record.category)
      expect(event.venue).toBe(record.venue)
      expect(event.verificationStatus).toBe(record.verificationStatus)
      expect(event.checkedAt).toBe(record.checkedAt)
      expect(event.uncertainty).toBe(record.uncertainty)
      expect(event.aliases).toEqual(record.aliases)
    }
  })
})
