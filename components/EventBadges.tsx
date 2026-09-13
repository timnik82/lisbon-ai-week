import React from 'react'
import { Badge } from './Badge'
import type { ScheduleEvent } from '../types/event'

interface EventBadgesProps { event: ScheduleEvent; sameStart: boolean; overlap: boolean; showCategory?: boolean }

export function EventBadges({ event, sameStart, overlap, showCategory = true }: EventBadgesProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {showCategory ? <Badge tone="slate">{event.category}</Badge> : null}
      {event.verificationStatus === 'verified_with_conflict' ? <Badge tone="rose">Source conflict</Badge> : null}
      {event.verificationStatus === 'unverified' ? <Badge tone="amber">Not rechecked</Badge> : null}
      {!event.date || !event.start ? <Badge tone="amber">To confirm</Badge> : null}
      {overlap ? <Badge tone="rose">Overlapping</Badge> : null}
      {sameStart ? <Badge tone="blue">Same start time</Badge> : null}
    </div>
  )
}
