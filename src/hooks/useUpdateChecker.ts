import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * useUpdateChecker.ts
 * -----------------------------------------------------------------------------
 * Hourly background check for APK updates. Compares the server-hosted
 * version.json against the build-time __APP_VERSION__.
 *
 * ANDROID-ONLY: On web this hook returns `updateAvailable: false` and
 * never fetches, keeping the feature completely inert.
 * -----------------------------------------------------------------------------
 */

const IS_ANDROID = Capacitor.getPlatform() === "android";
const CHECK_INTERVAL = 3600 * 1000; // 1 hour

interface UpdateInfo {
  updateAvailable: boolean;
  newVersion: string | null;
  apkUrl: string | null;
  releaseNotes: string | null;
  dismissed: boolean;
  dismiss: () => void;
}

export function useUpdateChecker(): UpdateInfo {
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const dismiss = useCallback(() => setDismissed(true), []);

  useEffect(() => {
    if (!IS_ANDROID) return;

    let mounted = true;

    async function check() {
      try {
        const res = await fetch(`/version.json?_cb=${Date.now()}`);
        if (!res.ok) return;
        const data = await res.json();

        if (!data.version || !mounted) return;

        // Simple semver comparison: "1.0.6" > "1.0.5"
        const current = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";
        if (data.version > current) {
          setNewVersion(data.version);
          setApkUrl(data.apkUrl ?? null);
          setReleaseNotes(data.releaseNotes ?? null);
          setDismissed(false); // Re-show on new version detection
        }
      } catch {
        // Silent failure — network errors are expected offline
      }
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return {
    updateAvailable: IS_ANDROID && newVersion !== null,
    newVersion,
    apkUrl,
    releaseNotes,
    dismissed,
    dismiss,
  };
}
