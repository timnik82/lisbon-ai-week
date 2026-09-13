import React from 'react'
import { Search, X } from 'lucide-react'
import type { EventCategory } from '../types/event'

export type CategoryFilter = 'all' | EventCategory

interface FilterBarProps {
  query: string
  onQueryChange: (value: string) => void
  category: CategoryFilter
  onCategoryChange: (value: CategoryFilter) => void
  categories: EventCategory[]
}

export function FilterBar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  categories,
}: FilterBarProps) {
  const options: CategoryFilter[] = ['all', ...categories]

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search titles, descriptions, venues"
          aria-label="Search titles, descriptions and venues"
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-[16px] text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Clear search"
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div
        role="group"
        aria-label="Filter by category"
        className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {options.map((option) => {
          const selected = option === category
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onCategoryChange(option)}
              className={`flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-[14px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                selected
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {option === 'all' ? 'All categories' : option}
            </button>
          )
        })}
      </div>
    </div>
  )
}
