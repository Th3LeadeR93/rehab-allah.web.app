import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// ─────────────────────────────────────────────────────────────────────────────
// Register the Service Worker for offline asset caching and background resilience.
// Guarded: inside Android WebView, native shouldInterceptRequest handles 100% offline
// bundling directly from assets. We purge any stale ServiceWorkers on Android.
// ─────────────────────────────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  const isAndroidApp =
    typeof window !== "undefined" &&
    Boolean((window as any).AndroidBridge || (window as any).AndroidAudioBridge);

  if (!isAndroidApp) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("[PWA] New content available; please refresh.");
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn("SW registration failed:", err);
        });
    });
  } else {
    // In native Android WebView, ensure no stale service worker intercepts requests
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
}
