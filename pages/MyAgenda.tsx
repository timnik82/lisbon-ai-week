import React from 'react'
import { ConflictBanner } from '../components/ConflictBanner'
import { EventList } from '../components/EventList'
import { EmptyState } from '../components/EmptyState'
import { PrototypeNotice } from '../components/PrototypeNotice'
import { summarizeSet } from '../utils/conflicts'
import type { ConflictAnalysis } from '../utils/conflicts'
import type { ScheduleEvent } from '../types/event'

interface MyAgendaProps { events: ScheduleEvent[]; analysis: ConflictAnalysis; isFavorite: (id: string) => boolean; onToggleFavorite: (id: string) => void; onOpen: (id: string, opener: HTMLElement) => void; onBrowse: () => void }

export function MyAgenda({ events, analysis, isFavorite, onToggleFavorite, onOpen, onBrowse }: MyAgendaProps) {
  const sorted = events.slice().sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || (a.start ?? '').localeCompare(b.start ?? ''))
  return <div className="space-y-4 px-5 pb-8 pt-4"><header className="space-y-3"><div><h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-slate-900">My agenda</h1><p className="mt-1 text-[15px] text-slate-600">Saved on this device only — no account needed.</p></div><PrototypeNotice /></header>{sorted.length === 0 ? <EmptyState title="No saved events yet" description="Tap the star on any listing in the schedule to add it here. Your picks stay in this browser." action={<button type="button" onClick={onBrowse} className="flex h-11 items-center rounded-xl bg-blue-600 px-4 text-[15px] font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">Browse the schedule</button>} /> : <><ConflictBanner summary={summarizeSet(sorted)} /><EventList events={sorted} analysis={analysis} showConflicts isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} onOpen={onOpen} showDate /></>}</div>
}
