import { useState, useEffect, useMemo, useCallback } from "react";
import {
  usePrayerStore,
  MUADHIN_OPTIONS,
  CALCULATION_METHODS,
  isAndroid,
  type PrayerName,
} from "../store/usePrayerStore";
import QiblaCompass from "./QiblaCompass";

/**
 * PrayerSettings.tsx
 * -----------------------------------------------------------------------------
 * Premium Prayer Dashboard — visible on ALL platforms.
 *
 * Sections:
 *   1. Prayer Times Grid  – Today's 5 prayers + Sunrise, with next-prayer glow
 *   2. Countdown Timer    – Real-time HH:MM:SS to the next athan
 *   3. Qibla Compass      – Interactive sensor/GPS compass
 *   4. Calculation Method – Islamic jurisdiction & calculation adjustments
 *   5. Athan Controls     – (Android only) notification toggle, per-prayer
 *                           toggles, and muadhin selection with preview
 * -----------------------------------------------------------------------------
 */

/* ─── Arabic text constants ────────────────────────────────────────────── */
const PAGE_TITLE = "مواقيت الصلاة والقبلة";
const TAB_TIMES = "مواقيت الصلاة";
const TAB_QIBLA = "بوصلة القبلة";
const TAB_METHOD = "طريقة الحساب";
const COUNTDOWN_LABEL = "الوقت المتبقي";
const NEXT_PRAYER_LABEL = "الصلاة القادمة";
const REFRESH_BTN = "تحديث المواقيت";
const REFRESHING_TEXT = "جاري التحديث...";
const LOADING_TEXT = "جاري تحميل المواقيت...";
const ERROR_TEXT = "تعذّر تحميل مواقيت الصلاة";
const RETRY_BTN = "إعادة المحاولة";
const ATHAN_SETTINGS_TITLE = "إعدادات الأذان والتنبيهات";
const ENABLE_NOTIFICATIONS = "تفعيل الأذان التلقائي";
const PRAYER_TOGGLES_TITLE = "تخصيص الصلوات";
const MUADHIN_TITLE = "اختر صوت المؤذن";
const PREVIEW_BTN = "استماع";
const STOP_BTN = "إيقاف";
const METHOD_TITLE = "طريقة الحساب المعتمدة";
const METHOD_DESC = "تختلف زوايا حساب الفجر والعشاء بحسب الهيئات الإسلامية الرسمية في كل دولة.";

/* ─── Prayer definition with icons ─────────────────────────────────────── */
interface PrayerDisplay {
  key: string;
  nameAr: string;
  icon: string;
  prayerName?: PrayerName;
}

const PRAYER_DISPLAY: PrayerDisplay[] = [
  { key: "Fajr", nameAr: "الفجر", icon: "🌙", prayerName: "fajr" },
  { key: "Sunrise", nameAr: "الشروق", icon: "🌅" },
  { key: "Dhuhr", nameAr: "الظهر", icon: "☀️", prayerName: "dhuhr" },
  { key: "Asr", nameAr: "العصر", icon: "🌤️", prayerName: "asr" },
  { key: "Maghrib", nameAr: "المغرب", icon: "🌇", prayerName: "maghrib" },
  { key: "Isha", nameAr: "العشاء", icon: "🌌", prayerName: "isha" },
];

const PRAYER_LABELS: Record<PrayerName, string> = {
  fajr: "صلاة الفجر",
  dhuhr: "صلاة الظهر",
  asr: "صلاة العصر",
  maghrib: "صلاة المغرب",
  isha: "صلاة العشاء",
};

/* ─── Helpers ──────────────────────────────────────────────────────────── */
function parseHHMM(t: string): { h: number; m: number } {
  if (!t) return { h: 0, m: 0 };
  const clean = t.replace(/\s*\(.*\)/, "").trim();
  const [h, m] = clean.split(":").map(Number);
  return { h: isNaN(h) ? 0 : h, m: isNaN(m) ? 0 : m };
}

function toMin(h: number, m: number) {
  return h * 60 + m;
}

function fmtCountdown(totalSec: number): string {
  if (totalSec <= 0) return "00:00:00";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* █  COMPONENT                                                            █ */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function PrayerSettings() {
  const [activeTab, setActiveTab] = useState<"times" | "qibla" | "method">("times");
  const [now, setNow] = useState(new Date());

  /* ── Prayer store selectors ───────────────────────────────────────── */
  const prayerTimes = usePrayerStore((s) => s.prayerTimes);
  const sunrise = usePrayerStore((s) => s.sunrise);
  const hijriDateFormatted = usePrayerStore((s) => s.hijriDateFormatted);
  const locationName = usePrayerStore((s) => s.locationName);
  const isFetchingTimes = usePrayerStore((s) => s.isFetchingTimes);
  const fetchError = usePrayerStore((s) => s.fetchError);
  const calculationMethod = usePrayerStore((s) => s.calculationMethod);
  const setCalculationMethod = usePrayerStore((s) => s.setCalculationMethod);
  const refreshPrayerTimes = usePrayerStore((s) => s.refreshPrayerTimes);
  const fetchPrayerTimes = usePrayerStore((s) => s.fetchPrayerTimes);

  /* ── Athan controls (Android only) ────────────────────────────────── */
  const selectedMuadhinId = usePrayerStore((s) => s.selectedMuadhinId);
  const previewingId = usePrayerStore((s) => s.previewingId);
  const isPreviewing = usePrayerStore((s) => s.isPreviewing);
  const notificationsEnabled = usePrayerStore((s) => s.notificationsEnabled);
  const enabledPrayers = usePrayerStore((s) => s.enabledPrayers);
  const setSelectedMuadhin = usePrayerStore((s) => s.setSelectedMuadhin);
  const previewMuadhin = usePrayerStore((s) => s.previewMuadhin);
  const stopPreview = usePrayerStore((s) => s.stopPreview);
  const setNotificationsEnabled = usePrayerStore((s) => s.setNotificationsEnabled);
  const togglePrayer = usePrayerStore((s) => s.togglePrayer);

  /* ── Real-time clock tick ────────────────────────────────────────── */
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* ── Initial load if needed ──────────────────────────────────────── */
  useEffect(() => {
    if (!prayerTimes) {
      fetchPrayerTimes();
    }
  }, [prayerTimes, fetchPrayerTimes]);

  /* ── Compute next prayer + countdown ─────────────────────────────── */
  const prayerCards = useMemo(() => {
    if (!prayerTimes) return [];
    return PRAYER_DISPLAY.map((pd) => {
      let time = "--:--";
      if (pd.key === "Sunrise") {
        time = sunrise ?? "--:--";
      } else if (pd.prayerName && prayerTimes[pd.prayerName]) {
        time = prayerTimes[pd.prayerName];
      }
      return { ...pd, time };
    });
  }, [prayerTimes, sunrise]);

  const { nextPrayerKey, countdownSec } = useMemo(() => {
    if (prayerCards.length === 0)
      return { nextPrayerKey: null, countdownSec: 0 };

    const nowMin = toMin(now.getHours(), now.getMinutes());
    const nowSec = now.getSeconds();

    for (const pc of prayerCards) {
      const { h, m } = parseHHMM(pc.time);
      const pMin = toMin(h, m);
      if (pMin > nowMin || (pMin === nowMin && 0 > nowSec)) {
        return {
          nextPrayerKey: pc.key,
          countdownSec: (pMin - nowMin) * 60 - nowSec,
        };
      }
    }

    // All passed today -> Fajr tomorrow
    const fajr = prayerCards[0];
    if (fajr) {
      const { h, m } = parseHHMM(fajr.time);
      const remainToday = (24 * 60 - nowMin) * 60 - nowSec;
      return {
        nextPrayerKey: fajr.key,
        countdownSec: remainToday + toMin(h, m) * 60,
      };
    }
    return { nextPrayerKey: null, countdownSec: 0 };
  }, [prayerCards, now]);

  /* ── Loading state ───────────────────────────────────────────────── */
  if (isFetchingTimes && !prayerTimes) {
    return (
      <section className="max-w-2xl mx-auto rounded-2xl backdrop-blur-xl bg-slate-900/60 border border-white/5 p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm mt-4 font-amiri">
            {LOADING_TEXT}
          </p>
        </div>
      </section>
    );
  }

  /* ── Error state ─────────────────────────────────────────────────── */
  if (fetchError && !prayerTimes) {
    return (
      <section className="max-w-2xl mx-auto rounded-2xl backdrop-blur-xl bg-slate-900/60 border border-red-500/20 p-6">
        <div className="flex flex-col items-center gap-3 py-8">
          <span className="text-4xl">🕌</span>
          <p className="text-slate-300 text-sm font-amiri">{ERROR_TEXT}</p>
          <p className="text-xs text-red-400/80 font-mono">{fetchError}</p>
          <button
            onClick={() => refreshPrayerTimes()}
            className="mt-2 px-5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-sm transition-all duration-300"
          >
            {RETRY_BTN}
          </button>
        </div>
      </section>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════ */
  /* █  MAIN RENDER                                                       █ */
  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      {/* ── Header Row ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-float">🕌</span>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-amber-400 font-amiri">
              {PAGE_TITLE}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-slate-400">
                {locationName || "جاري تحديد الموقع..."}
              </span>
              {hijriDateFormatted && (
                <>
                  <span className="text-slate-600 text-[10px]">|</span>
                  <span className="text-[11px] text-amber-500/80 font-amiri">
                    {hijriDateFormatted}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Countdown badge */}
        {nextPrayerKey && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </div>
            <span className="text-[11px] md:text-xs text-emerald-400 font-medium font-amiri">
              {COUNTDOWN_LABEL}
            </span>
            <span
              className="text-xs md:text-sm text-emerald-300 font-mono tracking-wider"
              dir="ltr"
            >
              {fmtCountdown(countdownSec)}
            </span>
          </div>
        )}
      </div>

      {/* ── Navigation Subtabs ──────────────────────────────────────── */}
      <div className="flex p-1 rounded-2xl bg-slate-800/60 backdrop-blur-md border border-white/5">
        <button
          onClick={() => setActiveTab("times")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs md:text-sm font-bold font-amiri transition-all duration-300 ${
            activeTab === "times"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {TAB_TIMES}
        </button>
        <button
          onClick={() => setActiveTab("qibla")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs md:text-sm font-bold font-amiri transition-all duration-300 ${
            activeTab === "qibla"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {TAB_QIBLA}
        </button>
        <button
          onClick={() => setActiveTab("method")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs md:text-sm font-bold font-amiri transition-all duration-300 ${
            activeTab === "method"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {TAB_METHOD}
        </button>
      </div>

      {/* ── Tab 1: Prayer Times ─────────────────────────────────────── */}
      {activeTab === "times" && (
        <>
          <section className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-emerald-500/5 pointer-events-none" />
            <div className="relative backdrop-blur-xl bg-slate-900/60 border border-white/5 rounded-2xl p-4 md:p-6">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
                {prayerCards.map((pc) => {
                  const isNext = pc.key === nextPrayerKey;
                  const { h, m } = parseHHMM(pc.time);
                  const pMin = toMin(h, m);
                  const nowMin = toMin(now.getHours(), now.getMinutes());
                  const isPast = pMin < nowMin && !isNext;

                  return (
                    <div
                      key={pc.key}
                      className={`relative rounded-xl p-3 md:p-4 text-center transition-all duration-500 ${
                        isNext
                          ? "bg-amber-500/10 border border-amber-500/40 shadow-lg shadow-amber-500/10 prayer-next-glow"
                          : isPast
                            ? "bg-slate-800/30 border border-white/5 opacity-50"
                            : "bg-slate-800/40 border border-white/5 hover:border-amber-500/20 hover:bg-slate-800/60"
                      }`}
                    >
                      {isNext && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-lg shadow-amber-400/50" />
                        </div>
                      )}

                      <div
                        className={`text-lg md:text-xl mb-1 ${isNext ? "animate-float" : ""}`}
                      >
                        {pc.icon}
                      </div>
                      <p
                        className={`text-xs md:text-sm font-bold font-amiri mb-1 ${isNext ? "text-amber-400" : "text-slate-300"}`}
                      >
                        {pc.nameAr}
                      </p>
                      <p
                        className={`text-sm md:text-base font-mono tracking-wider ${isNext ? "text-amber-300 font-bold" : "text-slate-300"}`}
                        dir="ltr"
                      >
                        {pc.time}
                      </p>
                      {isNext && (
                        <p className="text-[9px] md:text-[10px] text-emerald-400 mt-1 font-amiri">
                          {NEXT_PRAYER_LABEL}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Refresh button */}
              <div className="flex justify-center mt-4 pt-3 border-t border-white/5">
                <button
                  onClick={() => refreshPrayerTimes()}
                  disabled={isFetchingTimes}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs transition-all duration-300 disabled:opacity-50"
                >
                  <svg
                    className={`w-3.5 h-3.5 ${isFetchingTimes ? "animate-spin" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {isFetchingTimes ? REFRESHING_TEXT : REFRESH_BTN}
                </button>
              </div>
            </div>
          </section>

          {/* ── Athan Controls — Android Only ───────────────────────── */}
          {isAndroid && (
            <>
              <section className="rounded-2xl border border-amber-500/20 bg-slate-900/60 p-5 md:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base md:text-lg font-bold text-amber-400 font-amiri">
                    {ATHAN_SETTINGS_TITLE}
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationsEnabled}
                      onChange={(e) => setNotificationsEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                    <span className="mr-3 text-sm text-slate-300">
                      {ENABLE_NOTIFICATIONS}
                    </span>
                  </label>
                </div>

                {/* Per-prayer toggles */}
                {notificationsEnabled && (
                  <div className="mt-4 space-y-3">
                    <p className="text-xs text-slate-400 mb-2 font-amiri">
                      {PRAYER_TOGGLES_TITLE}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(
                        Object.keys(enabledPrayers) as PrayerName[]
                      ).map((prayer) => (
                        <label
                          key={prayer}
                          className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                            enabledPrayers[prayer]
                              ? "border-amber-500/40 bg-amber-500/10"
                              : "border-slate-700 bg-slate-800/40 opacity-60"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={enabledPrayers[prayer]}
                            onChange={(e) =>
                              togglePrayer(prayer, e.target.checked)
                            }
                            className="h-4 w-4 accent-amber-500 rounded"
                          />
                          <span className="text-sm text-white">
                            {PRAYER_LABELS[prayer]}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Muadhin Selector */}
              <section className="rounded-2xl border border-amber-500/20 bg-slate-900/60 p-5 md:p-6">
                <h3 className="text-base md:text-lg font-bold text-amber-400 mb-4 font-amiri">
                  {MUADHIN_TITLE}
                </h3>
                <ul className="space-y-3">
                  {MUADHIN_OPTIONS.map((m) => {
                    const selected = m.id === selectedMuadhinId;
                    const playing = isPreviewing && previewingId === m.id;
                    return (
                      <li
                        key={m.id}
                        className={`flex items-center justify-between rounded-xl border p-3 md:p-4 transition-all duration-300 ${
                          selected
                            ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/5"
                            : "border-slate-700 bg-slate-800/40 hover:border-amber-500/30"
                        }`}
                      >
                        <button
                          onClick={() => setSelectedMuadhin(m.id)}
                          className="flex items-center gap-3 text-right flex-1"
                        >
                          <span
                            className={`h-4 w-4 rounded-full border-2 transition-colors ${
                              selected
                                ? "border-amber-400 bg-amber-400"
                                : "border-slate-500"
                            }`}
                          />
                          <span
                            className={`font-medium transition-colors ${selected ? "text-amber-300" : "text-white"}`}
                          >
                            {m.name}
                          </span>
                        </button>

                        <button
                          onClick={() =>
                            playing ? stopPreview() : previewMuadhin(m.id)
                          }
                          className={`ml-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-300 ${
                            playing
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : "bg-slate-700 hover:bg-slate-600 text-white border border-transparent"
                          }`}
                        >
                          {playing ? STOP_BTN : PREVIEW_BTN}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </>
          )}
        </>
      )}

      {/* ── Tab 2: Qibla Compass ────────────────────────────────────── */}
      {activeTab === "qibla" && <QiblaCompass />}

      {/* ── Tab 3: Calculation Method ───────────────────────────────── */}
      {activeTab === "method" && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-amber-500/20 bg-slate-900/60 p-5 md:p-6 backdrop-blur-xl">
            <h3 className="text-base md:text-lg font-bold text-amber-400 font-amiri mb-2">
              {METHOD_TITLE}
            </h3>
            <p className="text-xs text-slate-400 font-amiri mb-5">
              {METHOD_DESC}
            </p>

            <div className="space-y-2.5">
              {CALCULATION_METHODS.map((m) => {
                const isSelected = m.id === calculationMethod;
                return (
                  <button
                    key={m.id}
                    onClick={() => setCalculationMethod(m.id)}
                    className={`w-full text-right p-3.5 rounded-xl border transition-all duration-300 flex items-center justify-between ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/5 text-amber-300"
                        : "border-slate-700/80 bg-slate-800/40 text-slate-300 hover:border-amber-500/30 hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-4 w-4 rounded-full border-2 transition-colors shrink-0 ${
                          isSelected
                            ? "border-amber-400 bg-amber-400"
                            : "border-slate-500"
                        }`}
                      />
                      <span className="font-amiri text-sm md:text-base font-semibold">
                        {m.name}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-amiri">
                        المعتمد حالياً
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>📍 الموقع المسجل:</span>
                <span className="text-white font-medium">{locationName || "غير محدد"}</span>
              </div>
              <button
                onClick={() => refreshPrayerTimes()}
                disabled={isFetchingTimes}
                className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 transition-all duration-300 disabled:opacity-50"
              >
                {isFetchingTimes ? REFRESHING_TEXT : REFRESH_BTN}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
