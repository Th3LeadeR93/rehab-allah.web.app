import { useState, useEffect, useMemo, useCallback } from "react";
import { useRamadanStore } from "../store/useRamadanStore";
import { usePrayerStore } from "../store/usePrayerStore";
import { useAppStore } from "../store/useAppStore";
import {
  RAMADAN_JUZ_LIST,
  RAMADAN_PREPARATION_TIPS,
  RAMADAN_DUAS,
  PREPARATION_CHECKLIST,
} from "../data/ramadanData";

function parseHHMM(timeStr: string): { h: number; m: number } {
  if (!timeStr) return { h: 0, m: 0 };
  const clean = timeStr.replace(/\s*\(.*\)/, "").trim();
  const [h, m] = clean.split(":").map(Number);
  return { h: isNaN(h) ? 0 : h, m: isNaN(m) ? 0 : m };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export default function RamadanHub() {
  const [now, setNow] = useState(new Date());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Store hooks
  const hijriOffset = useRamadanStore((s) => s.hijriOffset);
  const setHijriOffset = useRamadanStore((s) => s.setHijriOffset);
  const modeOverride = useRamadanStore((s) => s.modeOverride);
  const setModeOverride = useRamadanStore((s) => s.setModeOverride);
  const khatmaGoal = useRamadanStore((s) => s.khatmaGoal);
  const setKhatmaGoal = useRamadanStore((s) => s.setKhatmaGoal);
  const completedJuz = useRamadanStore((s) => s.completedJuz);
  const toggleJuz = useRamadanStore((s) => s.toggleJuz);
  const resetKhatma = useRamadanStore((s) => s.resetKhatma);
  const taraweehCount = useRamadanStore((s) => s.taraweehCount);
  const incrementTaraweeh = useRamadanStore((s) => s.incrementTaraweeh);
  const decrementTaraweeh = useRamadanStore((s) => s.decrementTaraweeh);
  const setTaraweehCount = useRamadanStore((s) => s.setTaraweehCount);
  const resetTaraweeh = useRamadanStore((s) => s.resetTaraweeh);
  const checklist = useRamadanStore((s) => s.checklist);
  const toggleChecklistItem = useRamadanStore((s) => s.toggleChecklistItem);
  const fetchRemoteConfig = useRamadanStore((s) => s.fetchRemoteConfig);

  const getIsRamadan = useRamadanStore((s) => s.getIsRamadan);
  const getCurrentHijri = useRamadanStore((s) => s.getCurrentHijri);
  const getNextRamadanTarget = useRamadanStore((s) => s.getNextRamadanTarget);

  const prayerTimes = usePrayerStore((s) => s.prayerTimes);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setMushafSurahId = useAppStore((s) => s.setMushafSurahId);

  // Fetch remote config once on mount
  useEffect(() => {
    fetchRemoteConfig();
  }, [fetchRemoteConfig]);

  // Real-time second ticker
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const isRamadan = getIsRamadan();
  const hijri = getCurrentHijri();
  const nextRamadanTarget = useMemo(() => getNextRamadanTarget(), [getNextRamadanTarget, hijriOffset]);

  // Anticipation countdown calculations
  const countdown = useMemo(() => {
    const diffMs = nextRamadanTarget.getTime() - now.getTime();
    if (diffMs <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
    }
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds, totalSeconds };
  }, [nextRamadanTarget, now]);

  // Fasting calculations for Active Mode
  const fastingStatus = useMemo(() => {
    const fajrStr = prayerTimes?.fajr || "04:30";
    const maghribStr = prayerTimes?.maghrib || "18:15";

    const { h: fH, m: fM } = parseHHMM(fajrStr);
    const { h: mH, m: mM } = parseHHMM(maghribStr);

    const fajrToday = new Date(now);
    fajrToday.setHours(fH, fM, 0, 0);

    const maghribToday = new Date(now);
    maghribToday.setHours(mH, mM, 0, 0);

    const nowMs = now.getTime();
    const isFasting = nowMs >= fajrToday.getTime() && nowMs < maghribToday.getTime();

    if (isFasting) {
      const remainingMs = Math.max(0, maghribToday.getTime() - nowMs);
      const totalDayMs = maghribToday.getTime() - fajrToday.getTime();
      const elapsedDayMs = nowMs - fajrToday.getTime();
      const progress = Math.min(100, Math.max(0, Math.round((elapsedDayMs / totalDayMs) * 100)));

      const totalSec = Math.floor(remainingMs / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;

      return {
        isFasting: true,
        title: "أنت الآن صائم • تقبل الله طاعتكم",
        targetLabel: "المتبقي على أذان المغرب والإفطار",
        targetTime: maghribStr,
        timeFmt: `${pad2(h)}:${pad2(m)}:${pad2(s)}`,
        progress,
        startTime: fajrStr,
        endTime: maghribStr,
      };
    } else {
      let nextFajr = new Date(now);
      nextFajr.setHours(fH, fM, 0, 0);
      if (nowMs >= maghribToday.getTime()) {
        nextFajr = new Date(nextFajr.getTime() + 86400000);
      }

      const remainingMs = Math.max(0, nextFajr.getTime() - nowMs);
      const totalSec = Math.floor(remainingMs / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;

      return {
        isFasting: false,
        title: "وقت الإفطار والقيام والسحور المبارك",
        targetLabel: "المتبقي على الإمساك وأذان الفجر",
        targetTime: fajrStr,
        timeFmt: `${pad2(h)}:${pad2(m)}:${pad2(s)}`,
        progress: 100,
        startTime: maghribStr,
        endTime: fajrStr,
      };
    }
  }, [now, prayerTimes]);

  const khatmaProgressPercent = Math.round((completedJuz.length / 30) * 100);

  const nextRecommendedJuz = useMemo(() => {
    for (let i = 1; i <= 30; i++) {
      if (!completedJuz.includes(i)) return i;
    }
    return 1;
  }, [completedJuz]);

  const handleOpenJuzInMushaf = (juzNumber: number) => {
    const juz = RAMADAN_JUZ_LIST.find((j) => j.juzNumber === juzNumber) ?? RAMADAN_JUZ_LIST[0];
    setMushafSurahId(juz.startSurahId);
    setActiveTab("mushaf");
  };

  const copyToClipboard = (text: string, label: string = "تم النسخ بنجاح") => {
    navigator.clipboard?.writeText(text);
    showToast(label);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn pb-12 font-amiri">
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-amber-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-[#071d18] via-[#0B1120] to-[#0d1420] p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-right">
            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 via-emerald-500/10 to-amber-600/20 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0">
              <svg className="w-10 h-10 md:w-12 md:h-12 text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
              <span className="absolute -top-1 -right-1 text-xs">✨</span>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold text-amber-400">
                  {isRamadan ? "واحة شهر رمضان المبارك" : "واحة ترقب رمضان المبارك"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-sans font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {isRamadan ? "أيام النفحات والبركات" : "أيام الاستعداد والتهيئة"}
                </span>
              </div>
              <p className="text-slate-300 text-sm md:text-base font-scheherazade">
                {isRamadan
                  ? "«مَن صامَ رَمَضانَ إيمانًا واحْتِسابًا، غُفِرَ له ما تَقَدَّمَ مِن ذَنْبِهِ»"
                  : "«اللَّهُمَّ بَلِّغْنَا رَمَضَانَ لا فَاقِدِينَ وَلا مَفْقُودِينَ»"}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2 shrink-0">
            <div className="px-4 py-2 rounded-2xl bg-slate-900/80 border border-amber-500/20 text-center">
              <div className="text-xs text-slate-400 font-sans">التاريخ الهجري الحالي</div>
              <div className="text-amber-300 font-bold text-sm md:text-base">{hijri.formatted}</div>
            </div>

            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/10 text-[11px] font-sans">
              <button
                onClick={() => setModeOverride("auto")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  modeOverride === "auto"
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                تلقائي
              </button>
              <button
                onClick={() => setModeOverride("anticipation")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  modeOverride === "anticipation"
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                العد التنازلي
              </button>
              <button
                onClick={() => setModeOverride("active")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  modeOverride === "active"
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                وضع رمضان
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Anticipation Mode */}
      {!isRamadan && (
        <div className="space-y-6">
          <section className="rounded-3xl border border-amber-500/20 bg-slate-900/60 p-6 md:p-8 backdrop-blur-xl text-center shadow-xl">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-xl">🌙</span>
              <h2 className="text-lg md:text-xl font-bold text-amber-400">
                العد التنازلي لاستقبال غرة شهر رمضان المبارك
              </h2>
            </div>
            <p className="text-xs md:text-sm text-slate-400 mb-6 font-sans">
              وفق الحسابات الفلكية وتقويم أم القرى مع إمكانية تعديل ثبوت الرؤية الشرعية
            </p>

            <div className="grid grid-cols-4 gap-2.5 md:gap-4 max-w-xl mx-auto mb-6">
              {[
                { val: countdown.days, label: "يوم" },
                { val: countdown.hours, label: "ساعة" },
                { val: countdown.minutes, label: "دقيقة" },
                { val: countdown.seconds, label: "ثانية" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-center p-3 md:p-5 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-950 border border-amber-500/25 shadow-lg shadow-black/40"
                >
                  <span className="text-2xl md:text-4xl font-extrabold text-amber-400 font-mono tracking-wider">
                    {pad2(item.val)}
                  </span>
                  <span className="text-xs md:text-sm text-slate-400 font-medium mt-1">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm md:text-base">
              <span>🤲</span>
              <span>«اللَّهُمَّ بَلِّغْنَا رَمَضَانَ، وَأَعِنَّا فِيهِ عَلَى الصِّيَامِ وَالْقِيَامِ»</span>
            </div>
          </section>

          {/* Virtues & Tips */}
          <section className="rounded-3xl border border-amber-500/20 bg-slate-900/60 p-5 md:p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">📖</span>
                <h3 className="text-base md:text-lg font-bold text-amber-400">
                  نفحات ووصايا الاستعداد لرمضان
                </h3>
              </div>
              <div className="flex items-center gap-1.5 font-sans">
                <button
                  onClick={() =>
                    setCurrentTipIndex((prev) =>
                      prev === 0 ? RAMADAN_PREPARATION_TIPS.length - 1 : prev - 1
                    )
                  }
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                >
                  ‹
                </button>
                <span className="text-xs text-slate-400 px-2">
                  {currentTipIndex + 1} / {RAMADAN_PREPARATION_TIPS.length}
                </span>
                <button
                  onClick={() =>
                    setCurrentTipIndex((prev) =>
                      prev === RAMADAN_PREPARATION_TIPS.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                >
                  ›
                </button>
              </div>
            </div>

            {RAMADAN_PREPARATION_TIPS[currentTipIndex] && (
              <div className="p-4 md:p-5 rounded-2xl bg-[#08121d] border border-amber-500/15 relative">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h4 className="text-base font-bold text-amber-300">
                    {RAMADAN_PREPARATION_TIPS[currentTipIndex].title}
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    {RAMADAN_PREPARATION_TIPS[currentTipIndex].category}
                  </span>
                </div>
                <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-3">
                  {RAMADAN_PREPARATION_TIPS[currentTipIndex].text}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
                  <span>المصدر: {RAMADAN_PREPARATION_TIPS[currentTipIndex].source}</span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        RAMADAN_PREPARATION_TIPS[currentTipIndex].text,
                        "تم نسخ الوصية للمشاركة"
                      )
                    }
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                  >
                    <span>نسخ النص</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Checklist */}
          <section className="rounded-3xl border border-amber-500/20 bg-slate-900/60 p-5 md:p-6 backdrop-blur-xl">
            <h3 className="text-base md:text-lg font-bold text-amber-400 mb-2 flex items-center gap-2">
              <span>✅</span>
              <span>قائمة المهام الإيمانية قبل دخول رمضان</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              خطوات عملية تعينك على استقبال الشهر الفضيل بأتم جاهزية
            </p>

            <div className="space-y-2.5">
              {PREPARATION_CHECKLIST.map((item) => {
                const checked = !!checklist[item.id];
                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all duration-300 ${
                      checked
                        ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                        : "border-slate-800 bg-slate-800/40 text-slate-300 hover:border-amber-500/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleChecklistItem(item.id)}
                      className="mt-1 h-4 w-4 rounded accent-amber-500 shrink-0"
                    />
                    <div className="flex flex-col text-right">
                      <span className={`text-sm md:text-base font-bold ${checked ? "line-through opacity-80" : ""}`}>
                        {item.label}
                      </span>
                      <span className="text-xs text-slate-400 mt-0.5">
                        {item.description}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Moon Sighting Offset */}
          <section className="rounded-3xl border border-amber-500/20 bg-slate-900/60 p-5 md:p-6 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm md:text-base font-bold text-amber-400 flex items-center gap-2">
                  <span>🔭</span>
                  <span>معايرة ثبوت رؤية الهلال (Moon Sighting Offset)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1 font-sans">
                  إذا أعلنت المحكمة الشرعية في بلدك دخول الشهر بتقديم أو تأخير يوم، اضبط التعديل هنا:
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-2xl border border-white/10 font-sans">
                {[-2, -1, 0, 1, 2].map((offset) => (
                  <button
                    key={offset}
                    onClick={() => {
                      setHijriOffset(offset);
                      localStorage.setItem("rehab-user-offset-locked", "true");
                      showToast(`تم ضبط تعديل الهلال: ${offset > 0 ? `+${offset}` : offset} يوم`);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      hijriOffset === offset
                        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                        : "text-slate-300 hover:text-white hover:bg-slate-700"
                    }`}
                  >
                    {offset > 0 ? `+${offset}` : offset} يوم
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Active Worship Mode */}
      {isRamadan && (
        <div className="space-y-6 md:space-y-8">
          {/* Live Fasting Tracker */}
          <section className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-[#061d15] via-[#0B1120] to-[#0c1624] p-6 md:p-8 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs md:text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{fastingStatus.title}</span>
              </div>

              <div>
                <p className="text-slate-400 text-xs md:text-sm mb-1">{fastingStatus.targetLabel}</p>
                <div className="text-4xl md:text-6xl font-extrabold text-amber-400 font-mono tracking-widest drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]" dir="ltr">
                  {fastingStatus.timeFmt}
                </div>
                <p className="text-xs text-amber-500/80 mt-1 font-sans">
                  الموعد المستهدف: {fastingStatus.targetTime}
                </p>
              </div>

              {fastingStatus.isFasting && (
                <div className="w-full max-w-md mt-2 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400 font-sans">
                    <span>الفجر ({fastingStatus.startTime})</span>
                    <span className="text-amber-400 font-bold">{fastingStatus.progress}% منقضٍ</span>
                    <span>المغرب ({fastingStatus.endTime})</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500 rounded-full transition-all duration-1000"
                      style={{ width: `${fastingStatus.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Iftar Dua Card */}
          <section className="rounded-3xl border border-amber-500/25 bg-slate-900/70 p-5 md:p-6 backdrop-blur-xl shadow-lg">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🥛</span>
                <h3 className="text-base md:text-lg font-bold text-amber-400">
                  دعاء الإفطار وسنة الحبيب ﷺ
                </h3>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(
                    "ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ",
                    "تم نسخ دعاء الإفطار"
                  )
                }
                className="px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs flex items-center gap-1 transition-colors"
              >
                <span>نسخ الدعاء</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-amber-950/20 via-slate-950/60 to-amber-950/20 border border-amber-500/20 text-center">
              <p className="text-lg md:text-2xl font-scheherazade font-bold text-amber-300 leading-relaxed">
                «ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ»
              </p>
              <p className="text-xs text-slate-400 mt-2 font-sans">
                سنة نبوية مؤكدة تُقال عقب تناول أول تمرة أو رشفة ماء عند أذان المغرب
              </p>
            </div>
          </section>

          {/* Khatma Planner */}
          <section className="rounded-3xl border border-amber-500/25 bg-slate-900/70 p-5 md:p-6 backdrop-blur-xl shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                  <span>📖</span>
                  <span>جدول ختمة القرآن الكريم في رمضان</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-sans">
                  تابع تقدم قراءتك في الأجزاء الثلاثين وخصص هدفك اليومي
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-800/80 p-1.5 rounded-2xl border border-white/10 font-sans text-xs">
                {[
                  { goal: 1, label: "ختمة واحدة (1 جزء/يوم)" },
                  { goal: 2, label: "ختمتان (2 جزء/يوم)" },
                  { goal: 3, label: "3 ختمات (3 أجزاء/يوم)" },
                ].map((g) => (
                  <button
                    key={g.goal}
                    onClick={() => setKhatmaGoal(g.goal as 1 | 2 | 3)}
                    className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                      khatmaGoal === g.goal
                        ? "bg-amber-500 text-slate-950 font-bold"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#08121f] border border-amber-500/20 mb-5">
              <div className="w-full md:w-auto flex-1">
                <div className="flex justify-between items-center text-xs font-sans text-slate-300 mb-1.5">
                  <span>التقدم الإجمالي:</span>
                  <span className="text-amber-400 font-bold">
                    {completedJuz.length} من 30 جزءاً ({khatmaProgressPercent}%)
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${khatmaProgressPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={() => handleOpenJuzInMushaf(nextRecommendedJuz)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  <span>اقرأ ورد اليوم (الجزء {nextRecommendedJuz})</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>

                {completedJuz.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm("هل تريد إعادة تعيين الختمة وبدء ختمة جديدة؟")) {
                        resetKhatma();
                        showToast("تمت إعادة تعيين الختمة بنجاح");
                      }
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                    title="إعادة تعيين الختمة"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
              {RAMADAN_JUZ_LIST.map((juz) => {
                const isDone = completedJuz.includes(juz.juzNumber);
                return (
                  <div
                    key={juz.juzNumber}
                    className={`relative p-3 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                      isDone
                        ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-300"
                        : "border-slate-800 bg-slate-800/40 text-slate-300 hover:border-amber-500/30 hover:bg-slate-800/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <span className="text-xs font-bold font-sans px-1.5 py-0.5 rounded-lg bg-white/5">
                        {juz.juzNumber}
                      </span>
                      <button
                        onClick={() => toggleJuz(juz.juzNumber)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                          isDone
                            ? "bg-emerald-500 border-emerald-400 text-slate-950"
                            : "border-slate-600 hover:border-amber-400 text-transparent"
                        }`}
                        title={isDone ? "إلغاء التحديد" : "تحديد كمكتمل"}
                      >
                        ✓
                      </button>
                    </div>

                    <div className="text-right mb-2">
                      <div className="text-xs font-bold truncate">{juz.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        يبدأ من سورة {juz.startSurahName}
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenJuzInMushaf(juz.juzNumber)}
                      className="w-full py-1 text-[11px] rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-colors flex items-center justify-center gap-1 font-sans"
                    >
                      <span>تلاوة</span>
                      <span className="text-xs">📖</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Taraweeh Counter */}
          <section className="rounded-3xl border border-amber-500/25 bg-slate-900/70 p-5 md:p-6 backdrop-blur-xl shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                  <span>🕌</span>
                  <span>عداد صلاة التراويح وقيام الليل</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-sans">
                  مسبحة إلكترونية ذكية لحساب عدد ركعات التراويح والشفع والوتر
                </p>
              </div>

              <div className="flex items-center gap-1.5 font-sans text-xs">
                {[8, 10, 20].map((count) => (
                  <button
                    key={count}
                    onClick={() => {
                      setTaraweehCount(count);
                      showToast(`تم تعيين عداد التراويح إلى ${count} ركعات`);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 transition-colors"
                  >
                    {count} ركعات
                  </button>
                ))}
                <button
                  onClick={() => resetTaraweeh()}
                  className="px-2.5 py-1 rounded-xl bg-red-900/20 hover:bg-red-900/30 text-red-300 border border-red-500/20 transition-colors"
                >
                  إعادة ضبط
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-6">
              <button
                onClick={() => incrementTaraweeh()}
                className="group relative w-36 h-36 md:w-44 md:h-44 rounded-full bg-gradient-to-br from-amber-500/20 via-slate-900 to-amber-600/20 border-2 border-amber-500/40 hover:border-amber-400 shadow-2xl shadow-amber-500/10 flex flex-col items-center justify-center transition-transform active:scale-95"
              >
                <span className="text-xs text-amber-300/80 font-sans mb-1">اضغط للتسجيل (+2)</span>
                <span className="text-4xl md:text-5xl font-extrabold text-amber-400 font-mono">
                  {taraweehCount}
                </span>
                <span className="text-xs text-slate-400 font-sans mt-1">ركعة مسجلة</span>
              </button>

              <div className="flex items-center gap-4 mt-6">
                <button
                  onClick={() => decrementTaraweeh()}
                  disabled={taraweehCount === 0}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 text-xs font-sans disabled:opacity-40 transition-colors"
                >
                  -2 ركعة
                </button>
                <button
                  onClick={() => incrementTaraweeh()}
                  className="px-5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-sans font-bold transition-colors"
                >
                  +2 ركعة
                </button>
              </div>
            </div>
          </section>

          {/* Duas */}
          <section className="rounded-3xl border border-amber-500/25 bg-slate-900/70 p-5 md:p-6 backdrop-blur-xl shadow-lg">
            <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
              <span>🤲</span>
              <span>أدعية جامعة من هدي النبي ﷺ في رمضان</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {RAMADAN_DUAS.map((dua) => (
                <div
                  key={dua.id}
                  className="p-4 rounded-2xl bg-[#09131e] border border-amber-500/15 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className="text-sm font-bold text-amber-300">{dua.title}</h4>
                      {dua.reward && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          {dua.reward}
                        </span>
                      )}
                    </div>
                    <p className="text-base md:text-lg font-scheherazade text-slate-200 leading-relaxed mb-3">
                      «{dua.arabic}»
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
                    <span className="text-[11px]">{dua.reference}</span>
                    <button
                      onClick={() => copyToClipboard(dua.arabic, "تم نسخ الدعاء")}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                    >
                      <span>نسخ</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
