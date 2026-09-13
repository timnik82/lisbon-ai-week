import type { ScheduleEvent } from '../types/event'

export interface ConflictAnalysis {
  sameStart: Record<string, string[]>
  overlap: Record<string, string[]>
  incomplete: boolean
  unscheduled: string[]
  conflictPairs: number
}

export interface AgendaConflictSummary {
  tone: 'neutral' | 'warning'
  headline: string
  detail: string
}

interface Interval {
  id: string
  start: number
  end: number
}

function localDateTimeToEpoch(date: string, time: string, timezone: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match || !timeMatch) return null
  const [year, month, day] = match.slice(1).map(Number)
  const [hour, minute] = timeMatch.slice(1).map(Number)
  const expected = `${date} ${time}`
  const asUTC = Date.UTC(year, month - 1, day, hour, minute)
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    })
    for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
      const candidate = asUTC - offset * 60_000
      const parts = formatter.formatToParts(new Date(candidate)).reduce<Record<string, string>>((acc, part) => {
        acc[part.type] = part.value
        return acc
      }, {})
      if (`${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}` === expected) return candidate
    }
  } catch {
    return null
  }
  return null
}

function intervalFor(event: ScheduleEvent): Interval | null {
  if (!event.date || !event.start || !event.end) return null
  // An overnight interval needs an explicit end-date source field; never infer it.
  if (event.end < event.start && !event.endDate) return null
  const actualEndDate = event.endDate ?? event.date
  const start = localDateTimeToEpoch(event.date, event.start, event.timezone)
  const end = localDateTimeToEpoch(actualEndDate, event.end, event.timezone)
  if (start === null || end === null || end <= start) return null
  return { id: event.id, start, end }
}

function push(map: Record<string, string[]>, key: string, value: string) {
  if (!map[key]) map[key] = []
  if (!map[key].includes(value)) map[key].push(value)
}

/** Conservative: only complete, timezone-resolved source intervals confirm an overlap. */
export function analyzeConflicts(events: ScheduleEvent[]): ConflictAnalysis {
  const sameStart: Record<string, string[]> = {}
  const overlap: Record<string, string[]> = {}
  const intervals = new Map<string, Interval>()
  const unscheduled: string[] = []
  let incomplete = false
  let conflictPairs = 0

  events.forEach((event) => {
    const interval = intervalFor(event)
    if (interval) intervals.set(event.id, interval)
    else {
      incomplete = true
      if (!event.date || !event.start) unscheduled.push(event.id)
    }
  })

  for (let i = 0; i < events.length; i += 1) {
    for (let j = i + 1; j < events.length; j += 1) {
      const a = events[i]
      const b = events[j]
      if (a.date && b.date && a.start && b.start && a.date === b.date && a.start === b.start && (!intervals.has(a.id) || !intervals.has(b.id))) {
        push(sameStart, a.id, b.id)
        push(sameStart, b.id, a.id)
      }
      const aInterval = intervals.get(a.id)
      const bInterval = intervals.get(b.id)
      if (aInterval && bInterval && aInterval.start < bInterval.end && bInterval.start < aInterval.end) {
        push(overlap, a.id, b.id)
        push(overlap, b.id, a.id)
        conflictPairs += 1
      }
    }
  }
  return { sameStart, overlap, incomplete, unscheduled, conflictPairs }
}

export function summarizeSet(selected: ScheduleEvent[]): AgendaConflictSummary {
  if (selected.length < 2) {
    return { tone: 'neutral', headline: 'Nothing to check', detail: 'Save two or more events to check your agenda.' }
  }
  const analysis = analyzeConflicts(selected)
  if (analysis.conflictPairs > 0) {
    return {
      tone: 'warning',
      headline: analysis.conflictPairs === 1 ? '1 confirmed overlap' : `${analysis.conflictPairs} confirmed overlaps`,
      detail: 'Only complete, comparable source intervals are marked as overlaps.',
    }
  }
  if (Object.keys(analysis.sameStart).length > 0) {
    return { tone: 'warning', headline: 'Same start time', detail: 'Overlap not verified because one or more intervals are incomplete.' }
  }
  if (analysis.incomplete) {
    return { tone: 'warning', headline: 'Can’t check all overlaps—end times missing', detail: 'Some saved listings lack complete date or time information.' }
  }
  if (selected.some((event) => event.verificationStatus !== 'verified')) {
    return { tone: 'warning', headline: 'Source quality needs review', detail: 'All times are complete, but one or more saved listings are not rechecked.' }
  }
  return { tone: 'neutral', headline: 'All clear', detail: 'All saved listings have complete comparable intervals, verified source details, and no overlaps.' }
}
