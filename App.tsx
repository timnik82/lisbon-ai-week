import React, { useMemo, useRef, useState } from 'react'
import { BottomNav } from './components/BottomNav'
import type { Tab } from './components/BottomNav'
import type { DateOption } from './components/DateStrip'
import type { CategoryFilter } from './components/FilterBar'
import { EventDetailSheet } from './components/EventDetailSheet'
import { Schedule } from './pages/Schedule'
import { MyAgenda } from './pages/MyAgenda'
import { events as allEvents } from './data/events'
import { useFavorites } from './hooks/useFavorites'
import { analyzeConflicts } from './utils/conflicts'
import { formatShortDate, formatWeekday, normalizeText } from './utils/format'

const WEEK_DATES = ['2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25','2026-09-26','2026-09-27']

function includesDay(date: string | null, endDate: string | null, selectedDay: string) {
  return Boolean(date && date <= selectedDay && selectedDay <= (endDate ?? date))
}

export function App() {
  const [tab, setTab] = useState<Tab>('schedule')
  const [dateFilter, setDateFilter] = useState<string>('2026-09-24')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const appRootRef = useRef<HTMLDivElement>(null)
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const categories = useMemo(() => Array.from(new Set(allEvents.map((event) => event.category))).sort(), [])
  const savedEvents = useMemo(() => allEvents.filter((event) => favorites.includes(event.id)), [favorites])
  const agendaAnalysis = useMemo(() => analyzeConflicts(savedEvents), [savedEvents])
  const filteredBySearch = useMemo(() => allEvents.filter((event) => {
    if (category !== 'all' && event.category !== category) return false
    if (!query.trim()) return true
    const needle = normalizeText(query.trim())
    return [event.title, event.description ?? '', event.venue ?? ''].some((value) => normalizeText(value).includes(needle))
  }), [category, query])
  const dateOptions: DateOption[] = useMemo(() => [
    { value: 'all', label: 'All', sub: 'Listings', count: filteredBySearch.length },
    ...WEEK_DATES.map((date) => ({ value: date, label: formatShortDate(date), sub: formatWeekday(date), count: filteredBySearch.filter((event) => includesDay(event.date, event.endDate, date)).length })),
    { value: 'tbd', label: 'TBD', sub: 'To confirm', count: filteredBySearch.filter((event) => !event.date).length },
  ], [filteredBySearch])
  const visible = filteredBySearch.filter((event) => dateFilter === 'all' || (dateFilter === 'tbd' ? !event.date : includesDay(event.date, event.endDate, dateFilter)))
  const openEvent = allEvents.find((event) => event.id === openId) ?? null
  const openDetails = (id: string, opener: HTMLElement) => { openerRef.current = opener; setOpenId(id) }
  const resetFilters = () => { setQuery(''); setCategory('all'); setDateFilter('all') }

  return <div className="flex min-h-screen w-full flex-col bg-slate-50 font-heading text-slate-900"><div ref={appRootRef} className="mx-auto flex w-full max-w-2xl flex-1 flex-col bg-white shadow-sm"><main className="flex-1 pt-[env(safe-area-inset-top)]">{tab === 'schedule' ? <Schedule events={visible} dateOptions={dateOptions} dateFilter={dateFilter} onDateChange={setDateFilter} query={query} onQueryChange={setQuery} category={category} onCategoryChange={setCategory} categories={categories} isFavorite={isFavorite} onToggleFavorite={toggleFavorite} onOpen={openDetails} onResetFilters={resetFilters} /> : <MyAgenda events={savedEvents} analysis={agendaAnalysis} isFavorite={isFavorite} onToggleFavorite={toggleFavorite} onOpen={openDetails} onBrowse={() => setTab('schedule')} />}</main><BottomNav tab={tab} onChange={setTab} agendaCount={savedEvents.length} /></div><EventDetailSheet event={openEvent} allEvents={allEvents} analysis={agendaAnalysis} isFavorite={openEvent ? isFavorite(openEvent.id) : false} onToggleFavorite={toggleFavorite} onClose={() => setOpenId(null)} restoreFocusRef={openerRef} appRootRef={appRootRef} showAgendaConflicts={tab === 'agenda'} /></div>
}
