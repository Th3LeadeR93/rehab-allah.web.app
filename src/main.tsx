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
// Register the Service Worker — REQUIRED for the browser to fire the
// 'beforeinstallprompt' event and make the app installable as a PWA.
// ─────────────────────────────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Check for updates whenever user returns
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
}
