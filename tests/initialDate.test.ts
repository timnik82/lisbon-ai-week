import { describe, expect, it } from 'vitest'
import { WEEK_DATES, pickInitialDateFilter, todayInTimezone } from '../utils/initialDate'

describe('todayInTimezone', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(todayInTimezone(new Date('2026-09-13T10:00:00Z'))).toBe('2026-09-13')
  })

  it('uses the festival timezone, not UTC', () => {
    // 23:30 UTC on Sep 20 is already Sep 21 in Lisbon (UTC+1 in September).
    expect(todayInTimezone(new Date('2026-09-20T23:30:00Z'))).toBe('2026-09-21')
  })
})

describe('pickInitialDateFilter', () => {
  it('opens on today while the festival runs', () => {
    expect(pickInitialDateFilter('2026-09-24')).toBe('2026-09-24')
  })

  it('opens on the first day before the festival', () => {
    expect(pickInitialDateFilter('2026-09-13')).toBe('2026-09-21')
  })

  it('opens on the first day after the festival', () => {
    expect(pickInitialDateFilter('2026-10-02')).toBe('2026-09-21')
  })

  it('covers every festival day', () => {
    WEEK_DATES.forEach((day) => expect(pickInitialDateFilter(day)).toBe(day))
  })

  it('never returns a day outside the festival week', () => {
    expect(WEEK_DATES).toContain(pickInitialDateFilter('2026-01-01'))
  })

  it('falls back to all when no days are configured', () => {
    expect(pickInitialDateFilter('2026-09-24', [])).toBe('all')
  })
})
