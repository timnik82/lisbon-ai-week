import { useCallback, useSyncExternalStore } from 'react'

/*
 * App-shell connectivity state for the PWA banner.
 *
 * Two inputs come from outside React:
 *   - index.tsx calls noteOfflineShell() when the service worker reports that it
 *     served a navigation from the cached shell — the honest offline signal,
 *     since navigator.onLine stays true on captive-portal venue Wi-Fi.
 *   - index.tsx calls noteWaitingWorker() when an updated worker finished
 *     installing but is waiting for a user-triggered reload.
 * The rest is driven by the browser's online/offline events.
 */

let offlineShell = false
let waitingWorker: ServiceWorker | null = null
// Set when the user chooses "Reload to update": index.tsx only reloads on
// controllerchange while this is set, so the worker's first claim (initial
// install) cannot trigger a spurious reload.
let updateRequested = false

interface PwaSnapshot {
  offline: boolean
  updateReady: boolean
}

function read(): PwaSnapshot {
  return {
    offline: !navigator.onLine || offlineShell,
    updateReady: waitingWorker !== null,
  }
}

let snapshot = read()
const listeners = new Set<() => void>()

function emit() {
  const next = read()
  if (next.offline !== snapshot.offline || next.updateReady !== snapshot.updateReady) {
    snapshot = next
    listeners.forEach((listener) => listener())
  }
}

export function noteOfflineShell() {
  offlineShell = true
  emit()
}

export function noteWaitingWorker(worker: ServiceWorker) {
  waitingWorker = worker
  emit()
}

/** A newer worker superseded one we were holding; forget it. */
export function clearWaitingWorker(worker: ServiceWorker) {
  if (waitingWorker === worker) {
    waitingWorker = null
    emit()
  }
}

/** A request just succeeded (registration.update()), proving connectivity. */
export function noteConnectivity() {
  if (!offlineShell) return
  offlineShell = false
  emit()
}

export function isUpdateRequested() {
  return updateRequested
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const backOnline = () => {
    // Whatever the cache reported, a real 'online' event ends the offline state.
    offlineShell = false
    emit()
  }
  window.addEventListener('online', backOnline)
  window.addEventListener('offline', emit)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('online', backOnline)
    window.removeEventListener('offline', emit)
  }
}

function getSnapshot() {
  return snapshot
}

export function usePwaStatus() {
  const { offline, updateReady } = useSyncExternalStore(subscribe, getSnapshot)
  const reloadForUpdate = useCallback(() => {
    updateRequested = true
    // The waiting worker activates on receipt; the controllerchange listener in
    // index.tsx then reloads the page onto the new shell.
    waitingWorker?.postMessage({ type: 'skip-waiting' })
  }, [])
  return { offline, updateReady, reloadForUpdate }
}
