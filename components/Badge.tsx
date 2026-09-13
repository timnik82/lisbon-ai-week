import React from 'react'

type Tone = 'slate' | 'blue' | 'amber' | 'rose'

const TONES: Record<Tone, string> = {
  slate: 'border-slate-200 bg-slate-50 text-slate-600',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
}

interface BadgeProps {
  children: React.ReactNode
  tone?: Tone
}

export function Badge({ children, tone = 'slate' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium leading-none ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
