import { create } from "zustand";

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export interface PrayerTrackerItem {
  key: PrayerKey;
  nameAr: string;
  icon: string;
}

export const TRACKED_PRAYERS: PrayerTrackerItem[] = [
  { key: "fajr", nameAr: "الفجر", icon: "🌙" },
  { key: "dhuhr", nameAr: "الظهر", icon: "☀️" },
  { key: "asr", nameAr: "العصر", icon: "🌤️" },
  { key: "maghrib", nameAr: "المغرب", icon: "🌇" },
  { key: "isha", nameAr: "العشاء", icon: "🌃" },
];

const STORAGE_KEY = "rehab_prayer_tracker_data";

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const defaultCompleted: Record<PrayerKey, boolean> = {
  fajr: false,
  dhuhr: false,
  asr: false,
  maghrib: false,
  isha: false,
};

function loadInitialData(): { date: string; completed: Record<PrayerKey, boolean> } {
  const today = getTodayDateString();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today && parsed.completed) {
        return {
          date: today,
          completed: { ...defaultCompleted, ...parsed.completed },
        };
      }
    }
  } catch (e) {
    console.warn("Failed to read prayer tracker from localStorage:", e);
  }
  return { date: today, completed: { ...defaultCompleted } };
}

function persistData(date: string, completed: Record<PrayerKey, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date, completed }));
  } catch (e) {
    console.warn("Failed to write prayer tracker to localStorage:", e);
  }
}

interface AndroidInterface {
  updatePrayerCompleted?: (prayerKey: string, completed: boolean) => void;
}

declare global {
  interface Window {
    Android?: AndroidInterface;
  }
}

export interface PrayerTrackerStore {
  date: string;
  completed: Record<PrayerKey, boolean>;
  togglePrayer: (key: PrayerKey) => void;
  setPrayerCompleted: (key: PrayerKey, isCompleted: boolean) => void;
  resetToday: () => void;
  getCompletedCount: () => number;
  getProgressPercentage: () => number;
  isAllCompleted: () => boolean;
}

export const usePrayerTrackerStore = create<PrayerTrackerStore>((set, get) => {
  const initial = loadInitialData();

  return {
    date: initial.date,
    completed: initial.completed,

    togglePrayer: (key: PrayerKey) => {
      const today = getTodayDateString();
      const current = get();
      const activeCompleted = current.date === today ? current.completed : { ...defaultCompleted };
      const nextVal = !activeCompleted[key];
      const updated = { ...activeCompleted, [key]: nextVal };

      persistData(today, updated);
      set({ date: today, completed: updated });

      // Synchronize with Android Native Bridge if available
      try {
        if (window.Android?.updatePrayerCompleted) {
          window.Android.updatePrayerCompleted(key, nextVal);
        }
      } catch (err) {
        console.warn("Android prayer sync error:", err);
      }
    },

    setPrayerCompleted: (key: PrayerKey, isCompleted: boolean) => {
      const today = getTodayDateString();
      const current = get();
      const activeCompleted = current.date === today ? current.completed : { ...defaultCompleted };
      if (activeCompleted[key] === isCompleted) return;

      const updated = { ...activeCompleted, [key]: isCompleted };
      persistData(today, updated);
      set({ date: today, completed: updated });

      try {
        if (window.Android?.updatePrayerCompleted) {
          window.Android.updatePrayerCompleted(key, isCompleted);
        }
      } catch (err) {
        console.warn("Android prayer sync error:", err);
      }
    },

    resetToday: () => {
      const today = getTodayDateString();
      const updated = { ...defaultCompleted };
      persistData(today, updated);
      set({ date: today, completed: updated });
    },

    getCompletedCount: () => {
      const { completed } = get();
      return Object.values(completed).filter(Boolean).length;
    },

    getProgressPercentage: () => {
      const count = get().getCompletedCount();
      return Math.round((count / 5) * 100);
    },

    isAllCompleted: () => {
      return get().getCompletedCount() === 5;
    },
  };
});

// Real-time listener for prayer completions triggered from Native Android Notification Actions
if (typeof window !== "undefined") {
  window.addEventListener("rehab-prayer-completed", ((event: CustomEvent<string>) => {
    const rawKey = event.detail?.toLowerCase();
    if (rawKey && (rawKey === "fajr" || rawKey === "dhuhr" || rawKey === "asr" || rawKey === "maghrib" || rawKey === "isha")) {
      usePrayerTrackerStore.getState().setPrayerCompleted(rawKey, true);
    }
  }) as EventListener);
}
