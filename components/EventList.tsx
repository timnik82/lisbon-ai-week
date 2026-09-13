import React from 'react'
import { EventRow } from './EventRow'
import type { ConflictAnalysis } from '../utils/conflicts'
import type { ScheduleEvent } from '../types/event'

interface EventListProps {
  events: ScheduleEvent[]
  analysis?: ConflictAnalysis
  showConflicts?: boolean
  isFavorite: (id: string) => boolean
  onToggleFavorite: (id: string) => void
  onOpen: (id: string, opener: HTMLElement) => void
  showDate?: boolean
}

export function EventList({
  events,
  analysis,
  showConflicts = false,
  isFavorite,
  onToggleFavorite,
  onOpen,
  showDate = false,
}: EventListProps) {
  return (
    <ul className="divide-y divide-slate-100">
      {events.map((event) => (
        <EventRow
          key={event.id}
          event={event}
          isFavorite={isFavorite(event.id)}
          onToggleFavorite={onToggleFavorite}
          onOpen={onOpen}
          sameStart={showConflicts && Boolean(analysis && (analysis.sameStart[event.id] ?? []).length)}
          overlap={showConflicts && Boolean(analysis && (analysis.overlap[event.id] ?? []).length)}
          showDate={showDate}
        />
      ))}
    </ul>
  )
}
