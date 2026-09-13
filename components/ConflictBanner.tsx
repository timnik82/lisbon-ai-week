import React from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { AgendaConflictSummary } from '../utils/conflicts'

export function ConflictBanner({ summary }: { summary: AgendaConflictSummary }) {
  const warning = summary.tone === 'warning'
  return (
    <div
      role={warning ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 ${
        warning ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'
      }`}
    >
      {warning ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      )}
      <div className="min-w-0">
        <p
          className={`text-[14px] font-semibold ${
            warning ? 'text-amber-900' : 'text-slate-900'
          }`}
        >
          {summary.headline}
        </p>
        <p className={`text-[13px] leading-snug ${warning ? 'text-amber-800' : 'text-slate-600'}`}>
          {summary.detail}
        </p>
      </div>
    </div>
  )
}
