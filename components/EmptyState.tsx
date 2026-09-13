import React from 'react'

interface EmptyStateProps {
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
      <p className="text-[17px] font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[15px] leading-relaxed text-slate-600">
        {description}
      </p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
