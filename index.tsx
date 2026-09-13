import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import {
  clearWaitingWorker,
  isUpdateRequested,
  noteConnectivity,
  noteOfflineShell,
  noteWaitingWorker,
} from "./hooks/usePwaStatus";

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />);
}

// Register the service worker in production only, so `vite dev` is never served
// from a cache. Registration failure is non-fatal: the app works without it,
// but it is logged, because a rejected install (a renamed precache entry, say)
// would otherwise disable offline support with no signal at all.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  // Reload only after the user chose "Reload to update" — without the
  // isUpdateRequested() gate, the worker's first clients.claim() (initial
  // install) also fires controllerchange and would reload every first visit.
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading || !isUpdateRequested()) return;
    reloading = true;
    window.location.reload();
  });

  // The worker reports when it answered a navigation from the cached shell.
  // navigator.onLine stays true on captive-portal venue Wi-Fi, so this is the
  // more honest offline signal; the banner clears on the next 'online' event.
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "served-offline-shell") {
      noteOfflineShell();
    }
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // A worker that finished installing while an older one still controls
        // this page is the next release. Surface it as "Reload to update"
        // instead of swapping the shell under the user mid-session.
        if (registration.waiting && navigator.serviceWorker.controller) {
          noteWaitingWorker(registration.waiting);
        }
        registration.addEventListener("updatefound", () => {
          const incoming = registration.installing;
          if (!incoming) return;
          incoming.addEventListener("statechange", () => {
            if (incoming.state === "installed" && navigator.serviceWorker.controller) {
              noteWaitingWorker(incoming);
            }
            if (incoming.state === "redundant") {
              clearWaitingWorker(incoming);
            }
          });
        });
        return navigator.serviceWorker.ready;
      })
      .then((registration) => {
        // The worker was not controlling this page when the browser fetched the
        // hashed entry bundles, so it never saw those requests and could not
        // cache them. Without this, the first offline launch would load the
        // shell and then fail on every /assets/ request. Hand it the list of
        // assets this page actually loaded.
        const urls = performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((name) => name.startsWith(`${window.location.origin}/assets/`));
        if (urls.length > 0) {
          registration.active?.postMessage({ type: "warm-assets", urls });
        }

        // An installed client can stay open for days; check for a new worker
        // whenever the app returns to the foreground. A resolved update() also
        // proves connectivity, which clears a stale served-offline-shell flag
        // when no 'online' event ever fired (captive portal healing).
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            registration
              .update()
              .then(() => noteConnectivity())
              .catch(() => undefined);
          }
        });
      })
      .catch((error) => {
        console.warn("Service worker registration failed; running without offline support", error);
      });
  });
}
