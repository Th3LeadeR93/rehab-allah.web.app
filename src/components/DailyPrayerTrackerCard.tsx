import { usePrayerTrackerStore, TRACKED_PRAYERS, type PrayerKey } from "../store/usePrayerTrackerStore";
import { Check } from "lucide-react";
import { triggerHaptic } from "../utils/haptics";

export default function DailyPrayerTrackerCard() {
  const completed = usePrayerTrackerStore((s) => s.completed);
  const togglePrayer = usePrayerTrackerStore((s) => s.togglePrayer);
  const getCompletedCount = usePrayerTrackerStore((s) => s.getCompletedCount);
  const getProgressPercentage = usePrayerTrackerStore((s) => s.getProgressPercentage);
  const isAllCompleted = usePrayerTrackerStore((s) => s.isAllCompleted);

  const completedCount = getCompletedCount();
  const progressPercent = getProgressPercentage();
  const allDone = isAllCompleted();

  const handleToggle = (key: PrayerKey) => {
    triggerHaptic(40);
    togglePrayer(key);
  };

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * progressPercent) / 100;

  return (
    <div
      className="mt-4 md:mt-5 relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-[#0c1322]/90 via-[#0f172a]/95 to-[#131d31]/90 backdrop-blur-xl p-4 md:p-5 shadow-xl shadow-black/30 font-amiri"
      dir="rtl"
    >
      {/* Subtle background ambient glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-44 h-44 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-44 h-44 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Header and Progress Ring */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📿</span>
            <h3 className="text-base md:text-lg font-bold text-amber-400">
              متتبع الصلوات اليومية
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            سجّل أداء صلواتك الخمس وحافظ على فريضتك
          </p>
        </div>

        {/* Circular Progress Gauge */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 80 80">
            {/* Background ring */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="rgba(245, 158, 11, 0.12)"
              strokeWidth="5"
            />
            {/* Animated progress ring */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke={allDone ? "#10b981" : "#f59e0b"}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs md:text-sm font-bold font-mono text-amber-400 leading-none">
              {completedCount}/5
            </span>
            <span className="text-[9px] text-slate-400 mt-0.5 font-sans">
              {progressPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* 5 Prayers Toggle Grid */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
        {TRACKED_PRAYERS.map((prayer) => {
          const isDone = !!completed[prayer.key];

          return (
            <button
              key={prayer.key}
              type="button"
              onClick={() => handleToggle(prayer.key)}
              className={`relative flex flex-col items-center justify-center py-2.5 px-1 sm:px-2 rounded-xl transition-all duration-300 border select-none group ${
                isDone
                  ? "bg-gradient-to-b from-amber-500/20 to-amber-500/5 border-amber-400/80 shadow-md shadow-amber-500/15"
                  : "bg-slate-800/40 border-white/5 hover:border-amber-500/30 hover:bg-slate-800/70"
              }`}
              aria-label={`تحديد صلاة ${prayer.nameAr}`}
            >
              {/* Checkmark badge */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center mb-1.5 transition-all duration-300 ${
                  isDone
                    ? "bg-amber-400 text-slate-950 scale-105 shadow-sm"
                    : "border border-slate-600 group-hover:border-amber-400/50 bg-slate-900/60"
                }`}
              >
                {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>

              {/* Icon & Name */}
              <span className="text-xs sm:text-sm mb-0.5">{prayer.icon}</span>
              <span
                className={`text-[11px] sm:text-xs font-bold transition-colors ${
                  isDone ? "text-amber-300" : "text-slate-300 group-hover:text-amber-300/80"
                }`}
              >
                {prayer.nameAr}
              </span>
            </button>
          );
        })}
      </div>

      {/* Completion Celebration Banner */}
      {allDone && (
        <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center gap-2 animate-fadeIn text-center">
          <span className="text-emerald-400 text-sm">🤲</span>
          <p className="text-xs font-bold text-emerald-400">
            ما شاء الله! أتممت صلوات اليوم كلها، تقبل الله طاعتكم وثبتكم.
          </p>
        </div>
      )}
    </div>
  );
}
