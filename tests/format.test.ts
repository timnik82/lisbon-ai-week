import { describe, expect, it } from 'vitest'
import {
  formatDateRange,
  formatLongDate,
  formatShortDate,
  formatTimeRange,
  formatWeekday,
  normalizeText,
} from '../utils/format'

describe('formatLongDate', () => {
  it('formats an ISO date with weekday, month and year', () => {
    expect(formatLongDate('2026-09-24')).toBe('Thu, Sep 24, 2026')
  })

  it('falls back to "To confirm" when the date is null', () => {
    expect(formatLongDate(null)).toBe('To confirm')
  })

  it('uses UTC so the weekday never shifts', () => {
    expect(formatLongDate('2026-09-21')).toBe('Mon, Sep 21, 2026')
    expect(formatLongDate('2026-09-27')).toBe('Sun, Sep 27, 2026')
  })
})

describe('formatShortDate', () => {
  it('formats month and day only', () => {
    expect(formatShortDate('2026-09-24')).toBe('Sep 24')
    expect(formatShortDate('2026-01-01')).toBe('Jan 1')
  })

  it('falls back to "To confirm" when null', () => {
    expect(formatShortDate(null)).toBe('To confirm')
  })
})

describe('formatWeekday', () => {
  it('returns the short weekday', () => {
    expect(formatWeekday('2026-09-24')).toBe('Thu')
  })

  it('returns TBD when null', () => {
    expect(formatWeekday(null)).toBe('TBD')
  })
})

describe('formatDateRange', () => {
  it('returns "To confirm" without a start date', () => {
    expect(formatDateRange(null, null)).toBe('To confirm')
    expect(formatDateRange(null, '2026-09-25')).toBe('To confirm')
  })

  it('collapses a single day or missing end date to the long date', () => {
    expect(formatDateRange('2026-09-24', null)).toBe('Thu, Sep 24, 2026')
    expect(formatDateRange('2026-09-24', '2026-09-24')).toBe('Thu, Sep 24, 2026')
  })

  it('renders a multi-day span', () => {
    expect(formatDateRange('2026-09-24', '2026-09-26')).toBe('Sep 24–Sat, Sep 26, 2026')
  })
})

describe('formatTimeRange', () => {
  it('returns the To confirm pair when no start', () => {
    expect(formatTimeRange(null, null)).toEqual({ primary: 'To confirm', secondary: 'Time not confirmed' })
  })

  it('reports an unknown end time when only a start exists', () => {
    expect(formatTimeRange('09:30', null)).toEqual({ primary: '09:30', secondary: 'End time unknown' })
  })

  it('renders a complete range', () => {
    expect(formatTimeRange('09:30', '17:00')).toEqual({ primary: '09:30', secondary: 'until 17:00' })
  })
})

describe('normalizeText', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalizeText('Conferência Lisboa')).toBe('conferencia lisboa')
  })

  it('is idempotent', () => {
    const once = normalizeText('Ĩnnovação')
    expect(normalizeText(once)).toBe(once)
  })

  it('leaves already-normalized text unchanged', () => {
    expect(normalizeText('ai week 2026')).toBe('ai week 2026')
  })
})
