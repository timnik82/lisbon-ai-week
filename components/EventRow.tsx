import React from 'react'
import { ChevronRight, MapPin, Star } from 'lucide-react'
import { EventBadges } from './EventBadges'
import { formatShortDate, formatTimeRange, formatWeekday } from '../utils/format'
import type { ScheduleEvent } from '../types/event'

interface EventRowProps {
  event: ScheduleEvent
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
  onOpen: (id: string, opener: HTMLElement) => void
  sameStart: boolean
  overlap: boolean
  showDate?: boolean
}

export function EventRow({ event, isFavorite, onToggleFavorite, onOpen, sameStart, overlap, showDate = false }: EventRowProps) {
  const time = formatTimeRange(event.start, event.end)
  const scheduled = Boolean(event.date && event.start)
  const hasTime = Boolean(event.start)
  // Surface the end day next to the secondary time whenever it differs from the start date.
  const endDayNote = event.endDate && event.endDate !== event.date ? ` · ends ${formatShortDate(event.endDate)}` : ''

  return (
    <li className="relative">
      <div className="flex items-stretch">
        <div className="w-[68px] shrink-0 pr-3 pt-5 text-right sm:w-[84px]">
          {scheduled ? (
            <>
              <time dateTime={`${event.date}T${event.start}`} className="block font-mono text-[17px] font-medium tabular-nums text-slate-900">{time.primary}</time>
              <span className="mt-0.5 block text-[11px] leading-tight text-slate-500">{time.secondary}{endDayNote}</span>
              {showDate || event.endDate ? <span className="mt-1 block text-[11px] font-medium leading-tight text-slate-400">{formatWeekday(event.date)} {formatShortDate(event.date)}</span> : null}
            </>
          ) : hasTime ? (
            <>
              <span className="block font-mono text-[17px] font-medium tabular-nums text-amber-700">{time.primary}</span>
              <span className="mt-0.5 block text-[11px] leading-tight text-amber-700">{time.secondary}{endDayNote}</span>
            </>
          ) : <span className="block pt-1 text-[13px] font-medium leading-tight text-amber-700">To confirm</span>}
        </div>
        <div className="relative flex-1 border-l border-slate-200 pl-5">
          <span aria-hidden="true" className={`absolute -left-[4.5px] top-[26px] h-2 w-2 rounded-full ${scheduled ? 'bg-blue-600' : 'bg-amber-400'}`} />
          <div className="flex items-start gap-1 py-5">
            <button type="button" onClick={(e) => onOpen(event.id, e.currentTarget)} className="group -m-2 flex min-h-[44px] flex-1 items-start gap-2 rounded-xl p-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
              <span className="sr-only">Open details for </span>
              <span className="min-w-0 flex-1 space-y-2">
                <span className="block break-words text-[19px] font-semibold leading-snug tracking-[-0.01em] text-slate-900">{event.title}</span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-slate-600"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />{event.venue ?? 'Venue not published'}</span></span>
                <EventBadges event={event} sameStart={sameStart} overlap={overlap} />
              </span>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 group-focus-visible:text-blue-600" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onToggleFavorite(event.id)} aria-pressed={isFavorite} aria-label={isFavorite ? `Remove ${event.title} from my agenda` : `Save ${event.title} to my agenda`} className="-mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
              <Star className={`h-5 w-5 ${isFavorite ? 'fill-blue-600 text-blue-600' : 'text-slate-300'}`} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}
