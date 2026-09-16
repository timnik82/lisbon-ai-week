import type { ScheduleEvent, VerificationStatus } from '../types/event'
import catalog from './catalog.json'

// data/catalog.json is the canonical Lisbon AI Week 2026 catalog's public `events`
// array, imported verbatim: all 71 records with their original IDs and every field
// value preserved (16 of them carry a null `description` in the source). The build
// catalog's per-event `sourceProvenance` is intentionally omitted — it holds local
// workspace extract paths used while assembling the snapshot, is never shown in the
// public UI, and is not part of the ScheduleEvent shape.
const VERIFICATION_STATUSES: readonly VerificationStatus[] = ['verified', 'verified_with_conflict', 'unverified']

/** Copy a canonical record field-for-field without rewriting any value. */
function toScheduleEvent(record: (typeof catalog)[number]): ScheduleEvent {
  if (!VERIFICATION_STATUSES.includes(record.verificationStatus as VerificationStatus)) {
    throw new Error(`catalog.json: unexpected verificationStatus "${record.verificationStatus}" for ${record.id}`)
  }
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    sourceUrl: record.sourceUrl,
    registrationUrl: record.registrationUrl,
    timezone: record.timezone,
    date: record.date,
    start: record.start,
    end: record.end,
    endDate: record.endDate,
    category: record.category,
    venue: record.venue,
    verificationStatus: record.verificationStatus as VerificationStatus,
    checkedAt: record.checkedAt,
    uncertainty: record.uncertainty,
    aliases: record.aliases,
  }
}

/** 71 listings imported from the canonical catalog; not a claim of 71 unique verified events. */
export const events: ScheduleEvent[] = catalog.map(toScheduleEvent)
