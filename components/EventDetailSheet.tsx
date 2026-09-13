import React, { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowUpRight, Clock, MapPin, Star, X } from 'lucide-react'
import { Badge } from './Badge'
import { formatDateRange } from '../utils/format'
import type { ConflictAnalysis } from '../utils/conflicts'
import type { ScheduleEvent } from '../types/event'

interface EventDetailSheetProps {
  event: ScheduleEvent | null
  allEvents: ScheduleEvent[]
  analysis: ConflictAnalysis
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
  onClose: () => void
  restoreFocusRef: React.MutableRefObject<HTMLElement | null>
  appRootRef: React.RefObject<HTMLDivElement>
  showAgendaConflicts: boolean
}

function Row({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return <div className="flex items-start gap-3 py-3"><span className="mt-0.5 text-slate-400" aria-hidden="true">{icon}</span><div className="min-w-0"><p className="text-[12px] font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="text-[16px] font-medium text-slate-900">{value}</p>{hint ? <p className="mt-0.5 text-[13px] text-slate-500">{hint}</p> : null}</div></div>
}

function focusable(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((node) => !node.hasAttribute('hidden'))
}

export function EventDetailSheet({ event, allEvents, analysis, isFavorite, onToggleFavorite, onClose, restoreFocusRef, appRootRef, showAgendaConflicts }: EventDetailSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!event) return
    const appRoot = appRootRef.current
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    if (appRoot) { appRoot.setAttribute('inert', ''); appRoot.setAttribute('aria-hidden', 'true') }
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`
    requestAnimationFrame(() => closeRef.current?.focus())
    const onKey = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') { keyEvent.preventDefault(); onClose(); return }
      if (keyEvent.key !== 'Tab' || !dialogRef.current) return
      const nodes = focusable(dialogRef.current)
      if (!nodes.length) { keyEvent.preventDefault(); return }
      const first = nodes[0]; const last = nodes[nodes.length - 1]
      if (keyEvent.shiftKey && document.activeElement === first) { keyEvent.preventDefault(); last.focus() }
      else if (!keyEvent.shiftKey && document.activeElement === last) { keyEvent.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
      if (appRoot) { appRoot.removeAttribute('inert'); appRoot.removeAttribute('aria-hidden') }
      restoreFocusRef.current?.focus()
    }
  }, [event, onClose, restoreFocusRef, appRootRef])

  const titleFor = (id: string) => allEvents.find((item) => item.id === id)?.title ?? id
  const sameStartIds = event && showAgendaConflicts ? analysis.sameStart[event.id] ?? [] : []
  const overlapIds = event && showAgendaConflicts ? analysis.overlap[event.id] ?? [] : []
  const actualAction = event?.registrationUrl ?? event?.sourceUrl
  const actionLabel = event?.registrationUrl ? 'Open registration page' : 'Open official event page'
  const actionDescription = event?.registrationUrl
    ? 'Opens the registration page in a new tab.'
    : 'Opens the official event page in a new tab.'

  return <AnimatePresence>{event ? <motion.div className="fixed inset-0 z-40 flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="absolute inset-0 bg-slate-900/30" onClick={onClose} aria-hidden="true" /><motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="event-detail-title" initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:mb-6 sm:max-h-[88vh] sm:rounded-2xl"><div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4"><div className="min-w-0 flex-1"><p className="text-[12px] font-medium uppercase tracking-wide text-slate-500">Event details</p><h2 id="event-detail-title" className="mt-1 text-[22px] font-semibold leading-snug tracking-[-0.01em] text-slate-900">{event.title}</h2></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Close event details" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"><X className="h-5 w-5" aria-hidden="true" /></button></div><div className="flex-1 overflow-y-auto px-5 pb-6"><div className="flex flex-wrap gap-1.5 pt-4"><Badge tone="slate">{event.category}</Badge>{event.verificationStatus === 'verified_with_conflict' ? <Badge tone="rose">Source conflict</Badge> : null}{event.verificationStatus === 'unverified' ? <Badge tone="amber">Not rechecked</Badge> : null}{!event.date || !event.start ? <Badge tone="amber">To confirm</Badge> : null}{overlapIds.length ? <Badge tone="rose">Overlapping</Badge> : null}{sameStartIds.length ? <Badge tone="blue">Same start time</Badge> : null}</div><div className="mt-2 divide-y divide-slate-100"><Row icon={<Clock className="h-4 w-4" />} label="Date & time" value={event.date && event.start ? `${formatDateRange(event.date, event.endDate)} · ${event.start}` : 'To confirm'} hint={event.date && event.start ? event.end ? `Ends ${event.end}${event.endDate ? ` · ${event.endDate}` : ''} · ${event.timezone}` : `End time unknown · ${event.timezone}` : `No confirmed date or start time · ${event.timezone}`} /><Row icon={<MapPin className="h-4 w-4" />} label="Venue" value={event.venue ?? 'Venue not published'} /></div>{overlapIds.length || sameStartIds.length ? <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5"><p className="flex items-center gap-2 text-[14px] font-semibold text-slate-900"><AlertTriangle className="h-4 w-4 text-slate-500" aria-hidden="true" />{overlapIds.length ? 'Confirmed overlap' : 'Same start time'}</p>{overlapIds.map((id) => <p key={id} className="mt-1 text-[14px] text-slate-700">Overlaps confirmed times with “{titleFor(id)}”.</p>)}{sameStartIds.map((id) => <p key={id} className="mt-1 text-[14px] text-slate-700">Same start time as “{titleFor(id)}”; overlap not verified.</p>)}</div> : null}<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5"><p className="text-[12px] font-semibold uppercase tracking-wide text-amber-800">Source provenance</p><p className="mt-1 text-[14px] leading-relaxed text-amber-900">{event.uncertainty}</p><p className="mt-2 text-[12px] text-amber-800">{event.checkedAt ? `Checked ${new Date(event.checkedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}` : 'Not rechecked'} · {event.verificationStatus.replaceAll('_', ' ')}</p>{event.aliases ? <p className="mt-2 text-[12px] leading-relaxed text-amber-800">Possible related listing ({event.aliases.relation.replaceAll('_', ' ')}): {event.aliases.rationale}</p> : null}</div><div className="mt-5"><h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Description</h3><p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed text-slate-700">{event.description ?? 'Description not available—see official page.'}</p></div><p className="mt-5 break-all text-[12px] text-slate-400">{event.sourceUrl}</p></div><div className="border-t border-slate-100 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><div className="flex gap-2"><button type="button" onClick={() => onToggleFavorite(event.id)} aria-pressed={isFavorite} aria-label={isFavorite ? `Remove ${event.title} from my agenda` : `Save ${event.title} to my agenda`} className="flex h-12 min-w-[52px] items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-[15px] font-medium text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"><Star className={`h-5 w-5 ${isFavorite ? 'fill-blue-600 text-blue-600' : 'text-slate-400'}`} aria-hidden="true" /><span className="hidden sm:inline">{isFavorite ? 'Saved' : 'Save'}</span></button><a href={actualAction} target="_blank" rel="noopener noreferrer" className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[15px] font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">{actionLabel}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a></div><p className="mt-2 text-center text-[12px] text-slate-500">{actionDescription}</p></div></motion.div></motion.div> : null}</AnimatePresence>
}
