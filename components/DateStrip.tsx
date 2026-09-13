import React from 'react'

export type DateFilter = string // 'all' | 'tbd' | ISO date

export interface DateOption {
  value: DateFilter
  label: string
  sub: string
  count: number
}

interface DateStripProps {
  options: DateOption[]
  value: DateFilter
  onChange: (value: DateFilter) => void
}

export function DateStrip({ options, value, onChange }: DateStripProps) {
  return (
    <div
      role="group"
      aria-label="Filter schedule by date"
      className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`flex min-h-[56px] min-w-[64px] shrink-0 flex-col items-center justify-center rounded-xl border px-3 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
              selected
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">
              {option.sub}
            </span>
            <span className="text-[15px] font-semibold leading-tight">{option.label}</span>
            <span className={`text-[11px] ${selected ? 'text-blue-100' : 'text-slate-500'}`}>
              {option.count} {option.count === 1 ? 'listing' : 'listings'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
