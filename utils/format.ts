const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function parts(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return { y, m, d, weekday: WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] }
}

export function formatLongDate(isoDate: string | null): string {
  if (!isoDate) return 'To confirm'
  const { y, m, d, weekday } = parts(isoDate)
  return `${weekday}, ${MONTHS[m - 1]} ${d}, ${y}`
}

export function formatShortDate(isoDate: string | null): string {
  if (!isoDate) return 'To confirm'
  const { m, d } = parts(isoDate)
  return `${MONTHS[m - 1]} ${d}`
}

export function formatWeekday(isoDate: string | null): string {
  if (!isoDate) return 'TBD'
  return parts(isoDate).weekday
}

export function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate) return 'To confirm'
  if (!endDate || startDate === endDate) return formatLongDate(startDate)
  return `${formatShortDate(startDate)}–${formatLongDate(endDate)}`
}

export function formatTimeRange(start: string | null, end: string | null): { primary: string; secondary: string } {
  if (!start) return { primary: 'To confirm', secondary: 'Time not confirmed' }
  if (!end) return { primary: start, secondary: 'End time unknown' }
  return { primary: start, secondary: `until ${end}` }
}

export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}
