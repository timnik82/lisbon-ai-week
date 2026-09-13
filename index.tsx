import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />);
}

// Register the service worker in production only, so `vite dev` is never served
// from a cache. Registration failure is non-fatal: the app works without it,
// but it is logged, because a rejected install (a renamed precache entry, say)
// would otherwise disable offline support with no signal at all.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
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
      })
      .catch((error) => {
        console.warn("Service worker registration failed; running without offline support", error);
      });
  });
}
