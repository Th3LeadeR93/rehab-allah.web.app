import { useState, useEffect, useMemo } from "react";
import { usePrayerStore } from "../store/usePrayerStore";
import DailyPrayerTrackerCard from "./DailyPrayerTrackerCard";

/* ─── Types ─────────────────────────────────────────────────────── */
interface PrayerTime {
  key: string;
  nameAr: string;
  time: string; // "HH:mm"
  icon: string;
}

/* ─── Helpers ──────────────────────────────────────────────────── */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const clean = timeStr.replace(/\s*\(.*\)/, "").trim();
  const [h, m] = clean.split(":").map(Number);
  return { hours: h || 0, minutes: m || 0 };
}

function timeToMinutes(h: number, m: number): number {
  return h * 60 + m;
}

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/* ─── Component ────────────────────────────────────────────────── */
export default function PrayerTimesWidget() {
  const prayerTimes = usePrayerStore((s) => s.prayerTimes);
  const sunrise = usePrayerStore((s) => s.sunrise);
  const locationName = usePrayerStore((s) => s.locationName);
  const hijriDateFormatted = usePrayerStore((s) => s.hijriDateFormatted);
  const loading = usePrayerStore((s) => s.isFetchingTimes);
  const error = usePrayerStore((s) => s.fetchError !== null && !s.prayerTimes);
  const fetchPrayerTimesWeb = usePrayerStore((s) => s.fetchPrayerTimesWeb);
  const refreshPrayerTimes = usePrayerStore((s) => s.refreshPrayerTimes);

  const [now, setNow] = useState(new Date());

  /* Real-time clock tick */
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* Fetch prayer times if missing */
  useEffect(() => {
    fetchPrayerTimesWeb();
  }, [fetchPrayerTimesWeb]);

  const prayers: PrayerTime[] = useMemo(() => {
    if (!prayerTimes) return [];
    return [
      { key: "Fajr", nameAr: "الفجر", time: prayerTimes.fajr, icon: "🌙" },
      { key: "Sunrise", nameAr: "الشروق", time: sunrise || "--:--", icon: "🌅" },
      { key: "Dhuhr", nameAr: "الظهر", time: prayerTimes.dhuhr, icon: "☀️" },
      { key: "Asr", nameAr: "العصر", time: prayerTimes.asr, icon: "🌤️" },
      { key: "Maghrib", nameAr: "المغرب", time: prayerTimes.maghrib, icon: "🌇" },
      { key: "Isha", nameAr: "العشاء", time: prayerTimes.isha, icon: "🌃" },
    ];
  }, [prayerTimes, sunrise]);

  /* Compute next prayer + countdown */
  const { nextPrayerKey, countdownSeconds } = useMemo(() => {
    if (prayers.length === 0) return { nextPrayerKey: null, countdownSeconds: 0 };

    const nowMin = timeToMinutes(now.getHours(), now.getMinutes());
    const nowSec = now.getSeconds();

    for (const prayer of prayers) {
      const { hours, minutes } = parseTime(prayer.time);
      const prayerMin = timeToMinutes(hours, minutes);

      if (prayerMin > nowMin || (prayerMin === nowMin && 0 > nowSec)) {
        const diffMin = prayerMin - nowMin;
        const diffSec = diffMin * 60 - nowSec;
        return { nextPrayerKey: prayer.key, countdownSeconds: diffSec };
      }
    }

    // All prayers passed today — next is Fajr tomorrow
    const fajr = prayers[0];
    if (fajr) {
      const { hours, minutes } = parseTime(fajr.time);
      const fajrMin = timeToMinutes(hours, minutes);
      const remainingToday = (24 * 60 - nowMin) * 60 - nowSec;
      const fajrSec = fajrMin * 60;
      return {
        nextPrayerKey: fajr.key,
        countdownSeconds: remainingToday + fajrSec,
      };
    }

    return { nextPrayerKey: null, countdownSeconds: 0 };
  }, [prayers, now]);

  /* ─── Loading Skeleton ──────────────────────────────────────── */
  if (loading && prayers.length === 0) {
    return (
      <section className="rounded-2xl backdrop-blur-xl bg-slate-900/60 border border-white/5 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 bg-slate-800 rounded-lg animate-pulse" />
          <div className="h-5 w-24 bg-slate-800 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 md:h-28 bg-slate-800/50 rounded-xl animate-pulse"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </section>
    );
  }

  /* ─── Error State ───────────────────────────────────────────── */
  if (error && prayers.length === 0) {
    return (
      <section className="rounded-2xl backdrop-blur-xl bg-slate-900/60 border border-red-500/20 p-4 md:p-6">
        <div className="flex flex-col items-center gap-3 py-4">
          <span className="text-2xl">🕌</span>
          <p className="text-slate-400 text-sm font-amiri">
            تعذّر تحميل مواقيت الصلاة
          </p>
          <button
            onClick={refreshPrayerTimes}
            className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs transition-all duration-300"
          >
            إعادة المحاولة
          </button>
        </div>
      </section>
    );
  }

  /* ─── Main Render ───────────────────────────────────────────── */
  return (
    <section className="relative rounded-2xl overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-emerald-500/5 pointer-events-none" />

      <div className="relative backdrop-blur-xl bg-slate-900/60 border border-white/5 rounded-2xl p-4 md:p-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 md:mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xl md:text-2xl animate-float">🕌</span>
            <h2 className="text-base md:text-lg font-bold text-amber-400 font-amiri">
              مواقيت الصلاة
            </h2>
            <span className="text-[10px] text-slate-400 mr-2">
              {locationName}
            </span>
          </div>

          {nextPrayerKey && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </div>
              <span className="text-[11px] md:text-xs text-emerald-400 font-medium font-amiri">
                الوقت المتبقي
              </span>
              <span
                className="text-xs md:text-sm text-emerald-300 font-mono tracking-wider"
                dir="ltr"
              >
                {formatCountdown(countdownSeconds)}
              </span>
            </div>
          )}
        </div>

        {/* Prayer Cards Grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          {prayers.map((prayer) => {
            const isNext = prayer.key === nextPrayerKey;

            // Determine if this prayer has passed
            const { hours, minutes } = parseTime(prayer.time);
            const prayerMin = timeToMinutes(hours, minutes);
            const nowMin = timeToMinutes(now.getHours(), now.getMinutes());
            const isPast = prayerMin < nowMin && !isNext;

            return (
              <div
                key={prayer.key}
                className={`relative rounded-xl p-3 md:p-4 text-center transition-all duration-500 ${
                  isNext
                    ? "bg-amber-500/10 border border-amber-500/40 shadow-lg shadow-amber-500/10 prayer-next-glow"
                    : isPast
                    ? "bg-slate-800/30 border border-white/5 opacity-50"
                    : "bg-slate-800/40 border border-white/5 hover:border-amber-500/20 hover:bg-slate-800/60"
                }`}
              >
                {/* Active indicator */}
                {isNext && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-lg shadow-amber-400/50" />
                  </div>
                )}

                {/* Icon */}
                <div
                  className={`text-lg md:text-xl mb-1 ${
                    isNext ? "animate-float" : ""
                  }`}
                >
                  {prayer.icon}
                </div>

                {/* Prayer Name */}
                <p
                  className={`text-xs md:text-sm font-bold font-amiri mb-1 ${
                    isNext ? "text-amber-400" : "text-slate-300"
                  }`}
                >
                  {prayer.nameAr}
                </p>

                {/* Time */}
                <p
                  className={`text-sm md:text-base font-mono tracking-wider ${
                    isNext
                      ? "text-amber-300 font-bold"
                      : "text-slate-400"
                  }`}
                  dir="ltr"
                >
                  {prayer.time}
                </p>

                {/* Next prayer label */}
                {isNext && (
                  <p className="text-[9px] md:text-[10px] text-emerald-400 mt-1 font-amiri">
                    الصلاة القادمة
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Daily Prayer Tracker Card */}
        <DailyPrayerTrackerCard />

        {/* Footer — Hijri date */}
        {hijriDateFormatted && (
          <div className="flex items-center justify-center gap-2 mt-3 md:mt-4 pt-3 border-t border-white/5">
            <span className="text-[10px] md:text-xs text-slate-400 font-amiri">
              {hijriDateFormatted}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
