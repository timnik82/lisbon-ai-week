export type VerificationStatus = 'verified' | 'verified_with_conflict' | 'unverified'

export type EventCategory = string

export interface EventAlias {
  groupId: string
  relation: string
  targetSourceUrl: string
  confidence: string
  rationale: string
}

export interface ScheduleEvent {
  id: string
  title: string
  description: string | null
  sourceUrl: string
  registrationUrl: string | null
  timezone: string
  date: string | null
  start: string | null
  end: string | null
  endDate: string | null
  category: EventCategory
  venue: string | null
  verificationStatus: VerificationStatus
  checkedAt: string | null
  uncertainty: string
  aliases: EventAlias | null
}
