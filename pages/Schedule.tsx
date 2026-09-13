import React from 'react'
import { DateStrip } from '../components/DateStrip'
import type { DateOption } from '../components/DateStrip'
import { FilterBar } from '../components/FilterBar'
import type { CategoryFilter } from '../components/FilterBar'
import { PrototypeNotice } from '../components/PrototypeNotice'
import { EventList } from '../components/EventList'
import { EmptyState } from '../components/EmptyState'
import { formatLongDate } from '../utils/format'
import type { EventCategory, ScheduleEvent } from '../types/event'

interface ScheduleProps {
  events: ScheduleEvent[]
  dateOptions: DateOption[]
  dateFilter: string
  onDateChange: (value: string) => void
  query: string
  onQueryChange: (value: string) => void
  category: CategoryFilter
  onCategoryChange: (value: CategoryFilter) => void
  categories: EventCategory[]
  isFavorite: (id: string) => boolean
  onToggleFavorite: (id: string) => void
  onOpen: (id: string, opener: HTMLElement) => void
  onResetFilters: () => void
}

function groupByDate(events: ScheduleEvent[]) {
  const map = new Map<string, ScheduleEvent[]>()
  events.forEach((event) => {
    const key = event.date ?? 'tbd'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(event)
  })
  return Array.from(map.entries()).sort(([a], [b]) => {
    if (a === 'tbd') return 1
    if (b === 'tbd') return -1
    return a.localeCompare(b)
  }).map(([key, list]) => ({ key, list: list.slice().sort((a, b) => (a.start ?? '').localeCompare(b.start ?? '')) }))
}

export function Schedule({ events, dateOptions, dateFilter, onDateChange, query, onQueryChange, category, onCategoryChange, categories, isFavorite, onToggleFavorite, onOpen, onResetFilters }: ScheduleProps) {
  const groups = groupByDate(events)
  return <div className="space-y-4 px-5 pb-8 pt-4"><header className="space-y-3"><div><h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-slate-900">Lisbon AI Week</h1><p className="mt-1 text-[15px] text-slate-600">Timetable · Sep 21–27, 2026 · Europe/Lisbon</p></div><PrototypeNotice /></header><FilterBar query={query} onQueryChange={onQueryChange} category={category} onCategoryChange={onCategoryChange} categories={categories} /><DateStrip options={dateOptions} value={dateFilter} onChange={onDateChange} /><p className="text-[13px] text-slate-500" role="status">{events.length} {events.length === 1 ? 'listing' : 'listings'} shown{query ? ` for “${query}”` : ''}</p>{groups.length === 0 ? <EmptyState title="No listings match" description="Try a different date, category, or search term." action={<button type="button" onClick={onResetFilters} className="flex h-11 items-center rounded-xl border border-slate-200 px-4 text-[15px] font-medium text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">Reset filters</button>} /> : <div className="space-y-6">{groups.map((group) => <section key={group.key} aria-labelledby={`day-${group.key}`} className="space-y-3"><div className="flex items-baseline justify-between gap-3"><h2 id={`day-${group.key}`} className="text-[15px] font-semibold uppercase tracking-wide text-slate-900">{group.key === 'tbd' ? 'To confirm' : formatLongDate(group.key)}</h2><span className="text-[13px] text-slate-500">{group.list.length}</span></div><EventList events={group.list} isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} onOpen={onOpen} /></section>)}</div>}</div>
}
