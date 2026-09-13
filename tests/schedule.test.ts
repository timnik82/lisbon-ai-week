import { describe, expect, it } from 'vitest'
import { groupByDate } from '../pages/Schedule'
import type { ScheduleEvent } from '../types/event'

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

describe('groupByDate — all', () => {
  it('groups by start date and keeps TBD last', () => {
    const groups = groupByDate(
      [
        makeEvent({ id: 'a', date: '2026-09-25' }),
        makeEvent({ id: 'tbd', date: null, start: null, end: null }),
        makeEvent({ id: 'b', date: '2026-09-24' }),
      ],
      'all',
    )
    expect(groups.map((group) => group.key)).toEqual(['2026-09-24', '2026-09-25', 'tbd'])
  })

  it('sorts records without a start after known times within a group', () => {
    const groups = groupByDate(
      [
        makeEvent({ id: 'none', start: null, end: null }),
        makeEvent({ id: 'late', start: '17:00' }),
        makeEvent({ id: 'early', start: '09:00' }),
      ],
      'all',
    )
    expect(groups[0].list.map((event) => event.id)).toEqual(['early', 'late', 'none'])
  })
})

describe('groupByDate — specific day', () => {
  it('groups multi-day events under the selected day, not their start date', () => {
    const multiDay = makeEvent({ id: 'multi', date: '2026-09-24', endDate: '2026-09-26' })
    const groups = groupByDate([multiDay], '2026-09-25')
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('2026-09-25')
    expect(groups[0].list.map((event) => event.id)).toEqual(['multi'])
  })

  it('groups tbd records under the tbd key when a non-all filter is set to tbd', () => {
    const groups = groupByDate([makeEvent({ id: 'tbd', date: null, start: null, end: null })], 'tbd')
    expect(groups.map((group) => group.key)).toEqual(['tbd'])
  })
})
