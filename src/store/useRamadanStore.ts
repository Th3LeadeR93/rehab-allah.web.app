import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * useRamadanStore.ts
 * -----------------------------------------------------------------------------
 * Comprehensive State Management & Calculation Engine for "Ramadan Hub" (واحة رمضان).
 *
 * Capabilities:
 *  1. Dynamic Mode Detection:
 *     - Calculates current Hijri month using Umm al-Qura Intl algorithm.
 *     - Month 9 (رمضان) => Active Worship Mode.
 *     - Other months => Anticipation Mode (Real-time countdown to 1 Ramadan).
 *  2. Moon Sighting & Offset Architecture (ثبوت الرؤية):
 *     - Remote config: Reads optional `hijriOffset` or `ramadanStartDate` from `/version.json`.
 *     - Manual override in Settings: Local day offset [-2, -1, 0, +1, +2].
 *     - Preview override ("auto" | "anticipation" | "active") for instant exploration.
 *  3. Quran Khatma Planner:
 *     - 1, 2, or 3 Juz/day goal.
 *     - 30 Ajza completion state persisted in localStorage.
 *  4. Taraweeh & Qiyam Counter:
 *     - Persistent tap counter with daily auto-reset.
 *  5. Preparation Checklist:
 *     - Checkable spiritual intentions before Ramadan.
 * -----------------------------------------------------------------------------
 */

export type ModeOverride = "auto" | "anticipation" | "active";

export interface HijriDateInfo {
  day: number;
  month: number;
  year: number;
  monthNameAr: string;
  formatted: string;
}

const HIJRI_MONTH_NAMES = [
  "",
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
];

/**
 * Returns accurate Hijri date adjusted by day offset
 */
export function calculateHijriDate(date: Date = new Date(), offsetDays: number = 0): HijriDateInfo {
  const adjusted = new Date(date.getTime() + offsetDays * 86400000);
  try {
    const formatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
    const parts = formatter.formatToParts(adjusted);
    const map: Record<string, string> = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }
    const day = parseInt(map.day, 10) || 1;
    const month = parseInt(map.month, 10) || 1;
    const year = parseInt(map.year, 10) || 1448;
    const monthNameAr = HIJRI_MONTH_NAMES[month] || "";
    return {
      day,
      month,
      year,
      monthNameAr,
      formatted: `${day} ${monthNameAr} ${year} هـ`,
    };
  } catch {
    // Fallback if umalqura locale tag is unavailable
    const fallbackFormatter = new Intl.DateTimeFormat("en-u-ca-islamic", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
    const parts = fallbackFormatter.formatToParts(adjusted);
    const map: Record<string, string> = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }
    const day = parseInt(map.day, 10) || 1;
    const month = parseInt(map.month, 10) || 1;
    const year = parseInt(map.year, 10) || 1448;
    const monthNameAr = HIJRI_MONTH_NAMES[month] || "";
    return {
      day,
      month,
      year,
      monthNameAr,
      formatted: `${day} ${monthNameAr} ${year} هـ`,
    };
  }
}

/**
 * Finds the upcoming 1 Ramadan Gregorian Date (midnight)
 */
export function getNextRamadanDate(offsetDays: number = 0, customStartDate?: string | null): Date {
  if (customStartDate) {
    const parsed = new Date(customStartDate);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const now = new Date();

  // Scan forward up to 365 days
  for (let i = 0; i <= 365; i++) {
    const candidate = new Date(now.getTime() + i * 86400000);
    const h = calculateHijriDate(candidate, offsetDays);
    if (h.month === 9 && h.day === 1) {
      // Set to 00:00:00 local time
      candidate.setHours(0, 0, 0, 0);
      return candidate;
    }
  }

  // Fallback rough estimate (~354 days per lunar year)
  return new Date(now.getTime() + 150 * 86400000);
}

export interface RamadanState {
  /* Moon Sighting & Calendar calibration */
  hijriOffset: number; // -2, -1, 0, +1, +2
  customRamadanStartDate: string | null;
  modeOverride: ModeOverride;

  /* Khatma Planner */
  khatmaGoal: 1 | 2 | 3; // 1, 2, or 3 Juz/day
  completedJuz: number[]; // e.g. [1, 2, 3]

  /* Taraweeh Counter */
  taraweehCount: number;
  taraweehDate: string; // "YYYY-MM-DD" for daily tracking

  /* Preparation Checklist */
  checklist: Record<string, boolean>;

  /* Actions */
  setHijriOffset: (offset: number) => void;
  setModeOverride: (mode: ModeOverride) => void;
  setKhatmaGoal: (goal: 1 | 2 | 3) => void;
  toggleJuz: (juzNumber: number) => void;
  resetKhatma: () => void;
  incrementTaraweeh: () => void;
  decrementTaraweeh: () => void;
  setTaraweehCount: (count: number) => void;
  resetTaraweeh: () => void;
  toggleChecklistItem: (id: string) => void;
  fetchRemoteConfig: () => Promise<void>;

  /* Computed Helpers */
  getIsRamadan: () => boolean;
  getCurrentHijri: () => HijriDateInfo;
  getNextRamadanTarget: () => Date;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

export const useRamadanStore = create<RamadanState>()(
  persist(
    (set, get) => ({
      hijriOffset: 0,
      customRamadanStartDate: null,
      modeOverride: "auto",
      khatmaGoal: 1,
      completedJuz: [],
      taraweehCount: 0,
      taraweehDate: todayKey(),
      checklist: {},

      setHijriOffset: (offset: number) => {
        const clamped = Math.max(-2, Math.min(2, Math.round(offset)));
        set({ hijriOffset: clamped });
      },

      setModeOverride: (mode: ModeOverride) => set({ modeOverride: mode }),

      setKhatmaGoal: (goal: 1 | 2 | 3) => set({ khatmaGoal: goal }),

      toggleJuz: (juzNumber: number) => {
        const current = get().completedJuz;
        if (current.includes(juzNumber)) {
          set({ completedJuz: current.filter((j) => j !== juzNumber) });
        } else {
          set({ completedJuz: [...current, juzNumber].sort((a, b) => a - b) });
        }
      },

      resetKhatma: () => set({ completedJuz: [] }),

      incrementTaraweeh: () => {
        const today = todayKey();
        const currentToday = get().taraweehDate;
        const base = currentToday === today ? get().taraweehCount : 0;
        set({
          taraweehCount: Math.min(36, base + 2),
          taraweehDate: today,
        });
      },

      decrementTaraweeh: () => {
        const today = todayKey();
        const currentToday = get().taraweehDate;
        const base = currentToday === today ? get().taraweehCount : 0;
        set({
          taraweehCount: Math.max(0, base - 2),
          taraweehDate: today,
        });
      },

      setTaraweehCount: (count: number) => {
        set({
          taraweehCount: Math.max(0, Math.min(36, count)),
          taraweehDate: todayKey(),
        });
      },

      resetTaraweeh: () => {
        set({ taraweehCount: 0, taraweehDate: todayKey() });
      },

      toggleChecklistItem: (id: string) => {
        const current = get().checklist;
        set({
          checklist: {
            ...current,
            [id]: !current[id],
          },
        });
      },

      fetchRemoteConfig: async () => {
        try {
          const res = await fetch("/version.json", { cache: "no-store" });
          if (!res.ok) return;
          const json = await res.json();
          if (typeof json.hijriOffset === "number" && !localStorage.getItem("rehab-user-offset-locked")) {
            set({ hijriOffset: Math.max(-2, Math.min(2, json.hijriOffset)) });
          }
          if (typeof json.ramadanStartDate === "string") {
            set({ customRamadanStartDate: json.ramadanStartDate });
          }
        } catch {
          // Offline or fetch failed — silently retain local state
        }
      },

      getIsRamadan: () => {
        const override = get().modeOverride;
        if (override === "active") return true;
        if (override === "anticipation") return false;
        const hijri = calculateHijriDate(new Date(), get().hijriOffset);
        return hijri.month === 9;
      },

      getCurrentHijri: () => {
        return calculateHijriDate(new Date(), get().hijriOffset);
      },

      getNextRamadanTarget: () => {
        return getNextRamadanDate(get().hijriOffset, get().customRamadanStartDate);
      },
    }),
    {
      name: "rehab-allah-ramadan-store",
      partialize: (state) => ({
        hijriOffset: state.hijriOffset,
        customRamadanStartDate: state.customRamadanStartDate,
        modeOverride: state.modeOverride,
        khatmaGoal: state.khatmaGoal,
        completedJuz: state.completedJuz,
        taraweehCount: state.taraweehCount,
        taraweehDate: state.taraweehDate,
        checklist: state.checklist,
      }),
    }
  )
);
