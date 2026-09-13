import React from 'react'
import { RefreshCw, WifiOff } from 'lucide-react'

interface PwaStatusBannerProps {
  offline: boolean
  updateReady: boolean
  onReload: () => void
}

export function PwaStatusBanner({ offline, updateReady, onReload }: PwaStatusBannerProps) {
  if (!offline && !updateReady) return null
  return (
    <div className="space-y-2 px-5 pt-3">
      {updateReady && (
        <div className="flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3">
          <RefreshCw className="h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
          {/* role="status" stays on the text: a live region must not contain interactive controls. */}
          <div role="status" className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-blue-900">A new version is ready</p>
            <p className="text-[13px] leading-snug text-blue-800">
              {offline
                ? 'Connect to reload into the latest listings.'
                : 'Reload for the latest listings and fixes.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onReload}
            disabled={offline}
            className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reload
          </button>
        </div>
      )}
      {offline && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"
        >
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-slate-900">You're offline</p>
            <p className="text-[13px] leading-snug text-slate-600">
              Showing the last saved schedule — it may be out of date.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
