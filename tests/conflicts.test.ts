import { describe, expect, it } from 'vitest'
import { analyzeConflicts, summarizeSet } from '../utils/conflicts'
import type { ScheduleEvent } from '../types/event'

// Overrides are spread over the defaults AFTER they are built, so an explicit
// `null` (e.g. `end: null`) is preserved rather than coerced back to a default.
function makeEvent(overrides: Partial<ScheduleEvent> & { id: string }): ScheduleEvent {
  const base: ScheduleEvent = {
    id: overrides.id,
    title: `Event ${overrides.id}`,
    description: null,
    sourceUrl: `https://example.test/${overrides.id}`,
    registrationUrl: null,
    timezone: 'Europe/Lisbon',
    date: '2026-09-24',
    start: '09:00',
    end: '10:00',
    endDate: null,
    category: 'Tech',
    venue: null,
    verificationStatus: 'verified',
    checkedAt: null,
    uncertainty: '',
    aliases: null,
  }
  return { ...base, ...overrides }
}

describe('analyzeConflicts — overlaps', () => {
  it('detects a single confirmed overlap and records it both ways', () => {
    const a = makeEvent({ id: 'a', date: '2026-09-24', start: '09:00', end: '17:00' })
    const b = makeEvent({ id: 'b', date: '2026-09-24', start: '10:00', end: '11:00' })
    const analysis = analyzeConflicts([a, b])
    expect(analysis.conflictPairs).toBe(1)
    expect(analysis.overlap).toEqual({ a: ['b'], b: ['a'] })
    expect(analysis.sameStart).toEqual({})
    expect(analysis.incomplete).toBe(false)
  })

  it('does not flag non-overlapping complete intervals', () => {
    const a = makeEvent({ id: 'a', date: '2026-09-24', start: '09:00', end: '10:00' })
    const b = makeEvent({ id: 'b', date: '2026-09-24', start: '11:00', end: '12:00' })
    const analysis = analyzeConflicts([a, b])
    expect(analysis.conflictPairs).toBe(0)
    expect(analysis.overlap).toEqual({})
    expect(analysis.incomplete).toBe(false)
  })

  it('does not treat touching boundaries as an overlap', () => {
    const a = makeEvent({ id: 'a', date: '2026-09-24', start: '09:00', end: '10:00' })
    const b = makeEvent({ id: 'b', date: '2026-09-24', start: '10:00', end: '11:00' })
    const analysis = analyzeConflicts([a, b])
    expect(analysis.conflictPairs).toBe(0)
    expect(analysis.sameStart).toEqual({})
  })

  it('never checks overlaps across different dates', () => {
    const a = makeEvent({ id: 'a', date: '2026-09-24', start: '09:00', end: '17:00' })
    const b = makeEvent({ id: 'b', date: '2026-09-25', start: '10:00', end: '11:00' })
    expect(analyzeConflicts([a, b]).conflictPairs).toBe(0)
  })
})

describe('analyzeConflicts — same start with incomplete intervals', () => {
  it('flags a same start time when one interval lacks an end', () => {
    const a = makeEvent({ id: 'a', date: '2026-09-24', start: '09:00', end: null })
    const b = makeEvent({ id: 'b', date: '2026-09-24', start: '09:00', end: '10:00' })
    const analysis = analyzeConflicts([a, b])
    expect(analysis.sameStart).toEqual({ a: ['b'], b: ['a'] })
    expect(analysis.conflictPairs).toBe(0)
    expect(analysis.incomplete).toBe(true)
  })

  it('marks the analysis incomplete for missing end times', () => {
    const a = makeEvent({ id: 'a', date: '2026-09-24', start: '09:00', end: null })
    expect(analyzeConflicts([a]).incomplete).toBe(true)
  })
})

describe('analyzeConflicts — incomplete and unscheduled records', () => {
  it('adds records without a date or start to unscheduled', () => {
    const tbd = makeEvent({ id: 'tbd', date: null, start: null, end: null })
    const noStart = makeEvent({ id: 'nostart', date: '2026-09-24', start: null, end: null })
    const analysis = analyzeConflicts([tbd, noStart])
    expect(analysis.unscheduled.slice().sort()).toEqual(['nostart', 'tbd'])
    expect(analysis.incomplete).toBe(true)
    expect(analysis.conflictPairs).toBe(0)
  })

  it('refuses to infer an overnight interval without an explicit end date', () => {
    const overnight = makeEvent({ id: 'night', date: '2026-09-24', start: '22:00', end: '02:00', endDate: null })
    const analysis = analyzeConflicts([overnight])
    expect(analysis.incomplete).toBe(true)
    // Has both a date and a start, so it is not "unscheduled" — it is just not comparable.
    expect(analysis.unscheduled).toEqual([])
    expect(analysis.conflictPairs).toBe(0)
  })

  it('resolves an overnight interval when the end date is explicit', () => {
    const a = makeEvent({ id: 'a', date: '2026-09-24', start: '22:00', end: '02:00', endDate: '2026-09-25' })
    const b = makeEvent({ id: 'b', date: '2026-09-25', start: '01:00', end: '03:00' })
    expect(analyzeConflicts([a, b]).conflictPairs).toBe(1)
  })
})

describe('summarizeSet', () => {
  const complete = (id: string, start: string, end: string) =>
    makeEvent({ id, start, end, date: '2026-09-24' })

  it('reports nothing to check below two events', () => {
    const summary = summarizeSet([complete('a', '09:00', '10:00')])
    expect(summary).toEqual({
      tone: 'neutral',
      headline: 'Nothing to check',
      detail: 'Save two or more events to check your agenda.',
    })
  })

  it('reports confirmed overlaps with correct pluralization', () => {
    const summary = summarizeSet([complete('a', '09:00', '17:00'), complete('b', '10:00', '11:00')])
    expect(summary.tone).toBe('warning')
    expect(summary.headline).toBe('1 confirmed overlap')

    const two = summarizeSet([
      complete('a', '09:00', '17:00'),
      complete('b', '10:00', '11:00'),
      complete('c', '12:00', '13:00'),
    ])
    expect(two.headline).toBe('2 confirmed overlaps')
  })

  it('reports a same start time when overlap could not be verified', () => {
    const summary = summarizeSet([
      makeEvent({ id: 'a', date: '2026-09-24', start: '09:00', end: null }),
      makeEvent({ id: 'b', date: '2026-09-24', start: '09:00', end: '10:00' }),
    ])
    expect(summary).toEqual({
      tone: 'warning',
      headline: 'Same start time',
      detail: 'Overlap not verified because one or more intervals are incomplete.',
    })
  })

  it('reports missing end times when nothing else is conclusive', () => {
    const summary = summarizeSet([
      makeEvent({ id: 'a', date: '2026-09-24', start: '09:00', end: null }),
      makeEvent({ id: 'b', date: '2026-09-25', start: '11:00', end: null }),
    ])
    expect(summary.tone).toBe('warning')
    expect(summary.headline).toBe('Can’t check all overlaps—end times missing')
  })

  it('flags source quality when intervals are complete but not verified', () => {
    const summary = summarizeSet([
      makeEvent({ id: 'a', date: '2026-09-24', start: '09:00', end: '10:00', verificationStatus: 'unverified' }),
      makeEvent({ id: 'b', date: '2026-09-24', start: '11:00', end: '12:00' }),
    ])
    expect(summary.tone).toBe('warning')
    expect(summary.headline).toBe('Source quality needs review')
  })

  it('reports all clear for verified, complete, non-overlapping sets', () => {
    const summary = summarizeSet([complete('a', '09:00', '10:00'), complete('b', '11:00', '12:00')])
    expect(summary.tone).toBe('neutral')
    expect(summary.headline).toBe('All clear')
  })
})
