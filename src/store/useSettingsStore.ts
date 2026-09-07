import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * useSettingsStore.ts
 * -----------------------------------------------------------------------------
 * Persisted user-preference store for app-wide settings: theme, font scaling,
 * and screen wake-lock. All platforms (web + Android).
 * -----------------------------------------------------------------------------
 */

export type AppTheme = "dark" | "light" | "night";

interface SettingsState {
  theme: AppTheme;
  fontScale: number; // 0.8 – 1.6
  wakeLockEnabled: boolean;

  setTheme: (theme: AppTheme) => void;
  setFontScale: (scale: number) => void;
  setWakeLockEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      fontScale: 1.0,
      wakeLockEnabled: false,

      setTheme: (theme) => set({ theme }),
      setFontScale: (scale) => set({ fontScale: Math.min(1.6, Math.max(0.8, scale)) }),
      setWakeLockEnabled: (enabled) => set({ wakeLockEnabled: enabled }),
    }),
    {
      name: "rehaballah-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
