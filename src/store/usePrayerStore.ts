import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Capacitor } from "@capacitor/core";

/**
 * usePrayerStore.ts
 * -----------------------------------------------------------------------------
 * Premium Athan (Azan) & Muadhin selection store for the "Rehab Allah" project.
 *
 * EXCLUSIVITY RULE:
 *   Every mutating / native action in this store is guarded by `isAndroid`.
 *   On the Web build (Capacitor.getPlatform() !== 'android') the store stays
 *   inert: preview does nothing, scheduling is a no-op, and the UI that reads
 *   `isAndroid` will not render. This keeps the feature completely hidden on web.
 *
 * AUTOMATED LIFECYCLE (Android only):
 *   initPrayerFeatures()
 *     -> request notification permission + create "athan" channel
 *     -> get device coordinates via Geolocation
 *     -> fetchPrayerTimes(lat, lng)  [Aladhan API, method=5]
 *     -> scheduleAthanNotifications(times)  [native daily alarms]
 *
 * The @capacitor/local-notifications plugin is imported lazily (dynamic import)
 * so the web bundle never has to resolve the native plugin.
 * -----------------------------------------------------------------------------
 */

/* ----------------------------- Platform flag ------------------------------ */

export const isAndroid = Capacitor.getPlatform() === "android";

/* ------------------------------- Data model ------------------------------- */

export interface Muadhin {
  id: string;
  /** Display name (Arabic) */
  name: string;
  /** Preview clip URL (short sample of the athan) */
  previewUrl: string;
  /**
   * Native sound file name (must be bundled in the Android project under
   * android/app/src/main/res/raw/<sound>.wav — without extension in the
   * LocalNotifications `sound` field on Android).
   */
  nativeSound: string;
}

export type PrayerName = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export interface PrayerTimes {
  fajr: string; // "HH:mm" 24h
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CalculationMethod {
  id: number;
  name: string;
}

export const CALCULATION_METHODS: CalculationMethod[] = [
  { id: 5, name: "الهيئة المصرية العامة للمساحة" },
  { id: 4, name: "جامعة أم القرى - مكة المكرمة" },
  { id: 3, name: "رابطة العالم الإسلامي" },
  { id: 2, name: "الجمعية الإسلامية لأمريكا الشمالية (ISNA)" },
  { id: 1, name: "جامعة العلوم الإسلامية بكراتشي" },
  { id: 8, name: "منطقة الخليج العربي" },
];

/**
 * Calculates the exact Qibla bearing (clockwise degrees from true North)
 * and spherical distance to the Kaaba in Makkah (21.4225° N, 39.8262° E).
 */
export function calculateQibla(latitude: number, longitude: number): { angle: number; distanceKm: number } {
  const latK = (21.4225 * Math.PI) / 180;
  const lngK = (39.8262 * Math.PI) / 180;
  const phi = (latitude * Math.PI) / 180;
  const lambda = (longitude * Math.PI) / 180;
  const deltaLambda = lngK - lambda;

  const y = Math.sin(deltaLambda);
  const x = Math.cos(phi) * Math.tan(latK) - Math.sin(phi) * Math.cos(deltaLambda);
  const qiblaRad = Math.atan2(y, x);
  const angle = Math.round(((qiblaRad * 180) / Math.PI + 360) % 360);

  // Haversine formula for distance
  const R = 6371; // Earth's mean radius in km
  const dLat = latK - phi;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi) * Math.cos(latK) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.round(R * c);

  return { angle, distanceKm };
}

/** Aladhan calculation method — 5 = Egyptian General Authority of Survey. */
export const DEFAULT_CALCULATION_METHOD = 5;

/** Base id offset per prayer so notification ids never collide. */
const NOTIFICATION_IDS: Record<PrayerName, number> = {
  fajr: 1001,
  dhuhr: 1002,
  asr: 1003,
  maghrib: 1004,
  isha: 1005,
};

/* ---------------------------- Muadhin catalog ----------------------------- */

export const MUADHIN_OPTIONS: Muadhin[] = [
  {
    id: "abdul-basit",
    name: "\u0627\u0644\u0634\u064A\u062E \u0639\u0628\u062F \u0627\u0644\u0628\u0627\u0633\u0637 \u0639\u0628\u062F \u0627\u0644\u0635\u0645\u062F",
    previewUrl: "/audio/athan_abdul_basit.mp3",
    nativeSound: "athan_abdul_basit",
  },
  {
    id: "mustafa-ismail",
    name: "\u0627\u0644\u0634\u064A\u062E \u0645\u0635\u0637\u0641\u0649 \u0625\u0633\u0645\u0627\u0639\u064A\u0644",
    previewUrl: "/audio/athan_mustafa_ismail.mp3",
    nativeSound: "athan_mustafa_ismail",
  },
  {
    id: "masjid-nabawi",
    name: "\u0623\u0630\u0627\u0646 \u0627\u0644\u0645\u0633\u062C\u062F \u0627\u0644\u0646\u0628\u0648\u064A",
    previewUrl: "/audio/athan_madinah.mp3",
    nativeSound: "athan_madinah",
  },
  {
    id: "masjid-aqsa",
    name: "\u0623\u0630\u0627\u0646 \u0627\u0644\u0645\u0633\u062C\u062F \u0627\u0644\u0623\u0642\u0635\u0649",
    previewUrl: "/audio/athan_aqsa.mp3",
    nativeSound: "athan_aqsa",
  },
];

/* ------------------------------ Store shape ------------------------------- */

interface PrayerState {
  /** Mirrors the platform flag for easy consumption in components. */
  isAndroid: boolean;
  /** Whether the native layer has been initialized (permissions, channel). */
  initialized: boolean;
  /** True while a preview clip is playing. */
  isPreviewing: boolean;
  /** Currently previewing muadhin id, or null. */
  previewingId: string | null;
  /** Selected muadhin id. */
  selectedMuadhinId: string;
  /** Whether athan notifications are enabled. */
  notificationsEnabled: boolean;
  /** Per-prayer enable toggles. */
  enabledPrayers: Record<PrayerName, boolean>;

  /** Last known device coordinates. */
  coordinates: Coordinates | null;
  /** Latest fetched prayer times ("HH:mm"), or null before first fetch. */
  prayerTimes: PrayerTimes | null;
  /** ISO date ("YYYY-MM-DD") the current prayerTimes belong to. */
  prayerTimesDate: string | null;
  /** True while a fetch is in-flight. */
  isFetchingTimes: boolean;
  /** Last fetch error message, if any. */
  fetchError: string | null;

  /** Selected calculation method ID. */
  calculationMethod: number;
  /** Sunrise time today ("HH:mm"). */
  sunrise: string | null;
  /** Formatted Arabic Hijri date string. */
  hijriDateFormatted: string | null;
  /** Human-readable location description. */
  locationName: string;
  /** Computed Qibla bearing from North in degrees (0-360). */
  qiblaAngle: number | null;
  /** Distance to the Kaaba in kilometers. */
  qiblaDistanceKm: number | null;

  /* Actions */
  initPrayerFeatures: () => Promise<void>;
  fetchPrayerTimes: (
    latitude?: number,
    longitude?: number,
    method?: number
  ) => Promise<PrayerTimes | null>;
  refreshPrayerTimes: () => Promise<void>;
  fetchPrayerTimesWeb: () => Promise<void>;
  setCalculationMethod: (method: number) => Promise<void>;
  setSelectedMuadhin: (id: string) => Promise<void>;
  previewMuadhin: (id: string) => Promise<void>;
  stopPreview: () => void;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  togglePrayer: (prayer: PrayerName, enabled: boolean) => Promise<void>;
  scheduleAthanNotifications: (times: PrayerTimes) => Promise<void>;
  cancelAllAthanNotifications: () => Promise<void>;

  /* Selectors */
  getSelectedMuadhin: () => Muadhin;
}

/* --------------------------- Internal helpers ----------------------------- */

/** Lazily loads the native plugin only on Android. */
async function getLocalNotifications() {
  if (!isAndroid) return null;
  const mod = await import("@capacitor/local-notifications");
  return mod.LocalNotifications;
}

/** Lazily loads the native Geolocation plugin only on Android. */
async function getGeolocation() {
  if (!isAndroid) return null;
  const mod = await import("@capacitor/geolocation");
  return mod.Geolocation;
}

/** Single reusable <audio> element for previews (native/web WebView). */
let previewAudio: HTMLAudioElement | null = null;

/** Returns the next Date for a given "HH:mm" today, rolling to tomorrow if past. */
function nextOccurrence(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

/** Local "YYYY-MM-DD" for cache/date-stamping. */
function todayKey(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Native geolocation lookup via @capacitor/geolocation. Resolves with coords
 * or null on failure. Kept null-safe so the caller can degrade gracefully
 * (e.g. denied permission). Android-only — returns null on web.
 */
async function getCurrentCoordinates(): Promise<Coordinates | null> {
  const Geolocation = await getGeolocation();
  if (!Geolocation) return null;

  try {
    // Request runtime location permission before reading position.
    const perm = await Geolocation.requestPermissions();
    if (
      perm.location !== "granted" &&
      perm.coarseLocation !== "granted"
    ) {
      console.error("[usePrayerStore] location permission not granted:", perm);
      return null;
    }

    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60 * 60 * 1000,
    });

    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  } catch (err) {
    console.error("[usePrayerStore] geolocation failed:", err);
    return null;
  }
}

/** Aladhan returns times like "04:12 (EET)" — strip any trailing timezone tag. */
function cleanTime(raw: string): string {
  return raw.trim().split(" ")[0];
}

/* -------------------------------- Store ----------------------------------- */

export const usePrayerStore = create<PrayerState>()(
  persist(
    (set, get) => ({
      isAndroid,
      initialized: false,
      isPreviewing: false,
      previewingId: null,
      selectedMuadhinId: MUADHIN_OPTIONS[0].id,
      notificationsEnabled: false,
      enabledPrayers: {
        fajr: true,
        dhuhr: true,
        asr: true,
        maghrib: true,
        isha: true,
      },

      coordinates: null,
      prayerTimes: null,
      sunrise: null,
      hijriDateFormatted: null,
      locationName: "القاهرة، مصر",
      calculationMethod: DEFAULT_CALCULATION_METHOD,
      qiblaAngle: null,
      qiblaDistanceKm: null,
      prayerTimesDate: null,
      isFetchingTimes: false,
      fetchError: null,

      /* --------------------------------------------------------------------
       * initPrayerFeatures  (Android only)
       * Full automated lifecycle:
       *   permissions -> channel -> geolocation -> fetch -> schedule.
       * ------------------------------------------------------------------ */
      initPrayerFeatures: async () => {
        if (!isAndroid || get().initialized) return;

        const LocalNotifications = await getLocalNotifications();
        if (!LocalNotifications) return;

        try {
          const perm = await LocalNotifications.requestPermissions();
          const granted = perm.display === "granted";

          await LocalNotifications.createChannel({
            id: "athan",
            name: "الأذان",
            description: "تنبيهات مواقيت الصلاة بصوت المؤذن",
            importance: 5, // IMPORTANCE_HIGH
            visibility: 1,
            sound: get().getSelectedMuadhin().nativeSound,
            vibration: true,
          });

          set({ initialized: true, notificationsEnabled: granted });

          const coords = await getCurrentCoordinates();
          if (!coords) {
            set({
              fetchError: "تعذّر تحديد الموقع الجغرافي لجلب مواقيت الصلاة تلقائيًا.",
            });
            return;
          }
          set({ coordinates: coords });

          const times = await get().fetchPrayerTimes(
            coords.latitude,
            coords.longitude
          );

          if (times && granted) {
            await get().scheduleAthanNotifications(times);
          }
        } catch (err) {
          console.error("[usePrayerStore] init failed:", err);
        }
      },

      /* --------------------------------------------------------------------
       * fetchPrayerTimes
       * Unified fetcher for all platforms (web + Android). Computes prayer
       * times, sunrise, Hijri date, and exact Qibla bearing + distance.
       * ------------------------------------------------------------------ */
      fetchPrayerTimes: async (latitude, longitude, method) => {
        set({ isFetchingTimes: true, fetchError: null });

        let lat = latitude;
        let lng = longitude;
        let locName = get().locationName || "القاهرة، مصر";

        if (lat === undefined || lng === undefined) {
          const cached = get().coordinates;
          if (cached) {
            lat = cached.latitude;
            lng = cached.longitude;
          } else {
            try {
              const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                if (!navigator.geolocation) {
                  reject(new Error("No geolocation"));
                  return;
                }
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  timeout: 6000,
                  maximumAge: 600000,
                });
              });
              lat = pos.coords.latitude;
              lng = pos.coords.longitude;
              locName = "موقعك الحالي";
            } catch {
              lat = 30.0444;
              lng = 31.2357;
              locName = "القاهرة، مصر";
            }
          }
        } else {
          locName = "موقعك الحالي";
        }

        const calcMethod = method ?? get().calculationMethod ?? DEFAULT_CALCULATION_METHOD;

        try {
          const params = new URLSearchParams({
            latitude: String(lat),
            longitude: String(lng),
            method: String(calcMethod),
          });

          const res = await fetch(`https://api.aladhan.com/v1/timings?${params.toString()}`);
          if (!res.ok) {
            throw new Error(`Aladhan API responded ${res.status}`);
          }

          const json = await res.json();
          const t = json?.data?.timings;
          if (!t) {
            throw new Error("Malformed Aladhan response (no timings).");
          }

          const times: PrayerTimes = {
            fajr: cleanTime(t.Fajr),
            dhuhr: cleanTime(t.Dhuhr),
            asr: cleanTime(t.Asr),
            maghrib: cleanTime(t.Maghrib),
            isha: cleanTime(t.Isha),
          };

          const sunriseTime = cleanTime(t.Sunrise || "");
          const hijriRaw = json?.data?.date?.hijri;
          const hijriFormatted = hijriRaw
            ? `${hijriRaw.day} ${hijriRaw.month?.ar ?? ""} ${hijriRaw.year} هـ`
            : null;

          const { angle: qAngle, distanceKm: qDistance } = calculateQibla(lat, lng);

          set({
            prayerTimes: times,
            sunrise: sunriseTime,
            hijriDateFormatted: hijriFormatted,
            locationName: locName,
            coordinates: { latitude: lat, longitude: lng },
            calculationMethod: calcMethod,
            qiblaAngle: qAngle,
            qiblaDistanceKm: qDistance,
            prayerTimesDate: todayKey(),
            isFetchingTimes: false,
            fetchError: null,
          });

          return times;
        } catch (err) {
          console.error("[usePrayerStore] fetchPrayerTimes failed:", err);
          set({
            isFetchingTimes: false,
            fetchError:
              err instanceof Error ? err.message : "فشل جلب مواقيت الصلاة.",
          });
          return null;
        }
      },

      setCalculationMethod: async (method) => {
        set({ calculationMethod: method });
        const coords = get().coordinates;
        if (coords) {
          const times = await get().fetchPrayerTimes(coords.latitude, coords.longitude, method);
          if (times && isAndroid && get().notificationsEnabled) {
            await get().scheduleAthanNotifications(times);
          }
        }
      },

      /* --------------------------------------------------------------------
       * refreshPrayerTimes
       * ------------------------------------------------------------------ */
      refreshPrayerTimes: async () => {
        const coords = get().coordinates ?? (isAndroid ? await getCurrentCoordinates() : null);
        const times = await get().fetchPrayerTimes(coords?.latitude, coords?.longitude);
        if (times && isAndroid && get().notificationsEnabled) {
          await get().scheduleAthanNotifications(times);
        }
      },

      fetchPrayerTimesWeb: async () => {
        if (get().prayerTimes && get().prayerTimesDate === todayKey()) return;
        await get().fetchPrayerTimes();
      },

      /* --------------------------------------------------------------------
       * setSelectedMuadhin
       * Persists the selection, re-creates the channel so future
       * notifications use the new sound, and re-schedules with cached times.
       * ------------------------------------------------------------------ */
      setSelectedMuadhin: async (id) => {
        if (!MUADHIN_OPTIONS.some((m) => m.id === id)) return;
        set({ selectedMuadhinId: id });

        if (!isAndroid) return;
        const LocalNotifications = await getLocalNotifications();
        if (!LocalNotifications) return;

        const muadhin = get().getSelectedMuadhin();
        try {
          // Android channels are immutable once created, so we delete & recreate
          // to bind the new custom sound.
          await LocalNotifications.deleteChannel({ id: "athan" });
          await LocalNotifications.createChannel({
            id: "athan",
            name: "الأذان",
            description: "تنبيهات مواقيت الصلاة بصوت المؤذن",
            importance: 5,
            visibility: 1,
            sound: muadhin.nativeSound,
            vibration: true,
          });

          // Re-schedule so already-queued alarms adopt the new voice.
          const times = get().prayerTimes;
          if (times && get().notificationsEnabled) {
            await get().scheduleAthanNotifications(times);
          }
        } catch (err) {
          console.error("[usePrayerStore] channel update failed:", err);
        }
      },

      /* --------------------------------------------------------------------
       * previewMuadhin / stopPreview
       * Plays a short in-app sample of the athan voice.
       * ------------------------------------------------------------------ */
      previewMuadhin: async (id) => {
        // Preview works on all platforms — uses web-accessible /audio/ paths.

        const muadhin = MUADHIN_OPTIONS.find((m) => m.id === id);
        if (!muadhin) return;

        get().stopPreview();

        try {
          previewAudio = new Audio(muadhin.previewUrl);
          previewAudio.onended = () =>
            set({ isPreviewing: false, previewingId: null });
          await previewAudio.play();
          set({ isPreviewing: true, previewingId: id });
        } catch (err) {
          console.error("[usePrayerStore] preview failed:", err);
          set({ isPreviewing: false, previewingId: null });
        }
      },

      stopPreview: () => {
        if (previewAudio) {
          previewAudio.pause();
          previewAudio.currentTime = 0;
          previewAudio = null;
        }
        set({ isPreviewing: false, previewingId: null });
      },

      /* --------------------------------------------------------------------
       * setNotificationsEnabled
       * ------------------------------------------------------------------ */
      setNotificationsEnabled: async (enabled) => {
        set({ notificationsEnabled: enabled });
        if (!isAndroid) return;

        if (!enabled) {
          await get().cancelAllAthanNotifications();
          return;
        }

        // Turning back on: re-schedule from cached times, or refresh if stale.
        const times = get().prayerTimes;
        if (times && get().prayerTimesDate === todayKey()) {
          await get().scheduleAthanNotifications(times);
        } else {
          await get().refreshPrayerTimes();
        }
      },

      togglePrayer: async (prayer, enabled) => {
        set((s) => ({
          enabledPrayers: { ...s.enabledPrayers, [prayer]: enabled },
        }));

        // Reflect the toggle immediately in the queued native alarms.
        if (!isAndroid) return;
        const times = get().prayerTimes;
        if (times && get().notificationsEnabled) {
          await get().scheduleAthanNotifications(times);
        }
      },

      /* --------------------------------------------------------------------
       * scheduleAthanNotifications
       * Schedules a daily repeating native notification per enabled prayer.
       * Each fires with the selected muadhin sound via the "athan" channel,
       * even when the app is closed.
       * ------------------------------------------------------------------ */
      scheduleAthanNotifications: async (times) => {
        if (!isAndroid || !get().notificationsEnabled) return;

        const LocalNotifications = await getLocalNotifications();
        if (!LocalNotifications) return;

        const muadhin = get().getSelectedMuadhin();
        const { enabledPrayers } = get();

        // Clear stale schedules first to avoid duplicates.
        await get().cancelAllAthanNotifications();

        const labels: Record<PrayerName, string> = {
          fajr: "صلاة الفجر",
          dhuhr: "صلاة الظهر",
          asr: "صلاة العصر",
          maghrib: "صلاة المغرب",
          isha: "صلاة العشاء",
        };

        const notifications = (Object.keys(times) as PrayerName[])
          .filter((prayer) => enabledPrayers[prayer])
          .map((prayer) => {
            const at = nextOccurrence(times[prayer]);
            return {
              id: NOTIFICATION_IDS[prayer],
              title: "حان الآن موعد " + labels[prayer],
              body: "الله أكبر الله أكبر",
              channelId: "athan",
              sound: muadhin.nativeSound,
              smallIcon: "ic_stat_athan",
              schedule: {
                at,
                repeats: true,
                every: "day" as const,
                allowWhileIdle: true, // fire in Doze mode / app closed
              },
              extra: { prayer, muadhinId: muadhin.id },
            };
          });

        if (notifications.length === 0) return;

        try {
          await LocalNotifications.schedule({ notifications });
        } catch (err) {
          console.error("[usePrayerStore] schedule failed:", err);
        }
      },

      cancelAllAthanNotifications: async () => {
        if (!isAndroid) return;
        const LocalNotifications = await getLocalNotifications();
        if (!LocalNotifications) return;

        const notifications = Object.values(NOTIFICATION_IDS).map((id) => ({
          id,
        }));
        try {
          await LocalNotifications.cancel({ notifications });
        } catch (err) {
          console.error("[usePrayerStore] cancel failed:", err);
        }
      },

      /* ------------------------------- Selectors ------------------------- */
      getSelectedMuadhin: () =>
        MUADHIN_OPTIONS.find((m) => m.id === get().selectedMuadhinId) ??
        MUADHIN_OPTIONS[0],
    }),
    {
      name: "rehaballah-prayer-store",
      // Only persist user preferences + last coords — never transient flags.
      partialize: (s) => ({
        selectedMuadhinId: s.selectedMuadhinId,
        notificationsEnabled: s.notificationsEnabled,
        enabledPrayers: s.enabledPrayers,
        coordinates: s.coordinates,
        calculationMethod: s.calculationMethod,
        locationName: s.locationName,
        prayerTimes: s.prayerTimes,
        sunrise: s.sunrise,
        hijriDateFormatted: s.hijriDateFormatted,
        qiblaAngle: s.qiblaAngle,
        qiblaDistanceKm: s.qiblaDistanceKm,
        prayerTimesDate: s.prayerTimesDate,
      }),
    }
  )
);
