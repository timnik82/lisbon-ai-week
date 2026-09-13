/** Festival days, in order. Kept in sync with the date strip in App. */
export const WEEK_DATES = ['2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25','2026-09-26','2026-09-27']

/** Today's calendar date in the festival's timezone, as YYYY-MM-DD. */
export function todayInTimezone(now: Date = new Date(), timeZone = 'Europe/Lisbon'): string {
  // en-CA formats as YYYY-MM-DD, which is the same shape the catalog uses.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/**
 * Which day the schedule should open on: the current day while the festival is
 * running, otherwise its first day. Never guesses a day outside the festival.
 */
export function pickInitialDateFilter(today: string, weekDates: string[] = WEEK_DATES): string {
  if (!weekDates.length) return 'all'
  return weekDates.includes(today) ? today : weekDates[0]
}
