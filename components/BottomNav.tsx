import React from 'react'
import { CalendarDays, Star } from 'lucide-react'

export type Tab = 'schedule' | 'agenda'

interface BottomNavProps {
  tab: Tab
  onChange: (tab: Tab) => void
  agendaCount: number
}

export function BottomNav({ tab, onChange, agendaCount }: BottomNavProps) {
  const items: { id: Tab; label: string; icon: typeof CalendarDays; count?: number }[] = [
    { id: 'schedule', label: 'Schedule', icon: CalendarDays },
    { id: 'agenda', label: 'My agenda', icon: Star, count: agendaCount },
  ]

  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-2xl">
        {items.map((item) => {
          const active = item.id === tab
          const Icon = item.icon
          return (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[56px] w-full flex-col items-center justify-center gap-1 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${
                  active ? 'text-blue-700' : 'text-slate-500'
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    active && item.id === 'agenda' ? 'fill-blue-700' : ''
                  }`}
                  aria-hidden="true"
                />
                <span className="text-[12px] font-medium">
                  {item.label}
                  {item.count ? ` (${item.count})` : ''}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
