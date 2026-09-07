import { useState, useEffect, useCallback, useRef } from "react";

/**
 * DigitalTasbeeh.tsx
 * -----------------------------------------------------------------------------
 * Premium interactive Electronic Tasbeeh (السبحة الإلكترونية)
 * Features:
 *   - Circular SVG progress ring with smooth animation
 *   - Popular Dhikr presets + Custom target (33, 100, 1000, or Free)
 *   - Synthesized gentle audio feedback via Web Audio API
 *   - Haptic vibration feedback
 *   - Daily & all-time counter stats saved to localStorage
 *   - Round completion notification
 * -----------------------------------------------------------------------------
 */

export interface DhikrPreset {
  id: string;
  arabic: string;
  translation?: string;
  defaultTarget: number;
}

export const DHIKR_PRESETS: DhikrPreset[] = [
  { id: "subhanallah", arabic: "سُبْحَانَ اللَّهِ", defaultTarget: 33 },
  { id: "alhamdulillah", arabic: "الْحَمْدُ لِلَّهِ", defaultTarget: 33 },
  { id: "allahuakbar", arabic: "اللَّهُ أَكْبَرُ", defaultTarget: 33 },
  { id: "tahlil", arabic: "لَا إِلَهَ إِلَّا اللَّهُ", defaultTarget: 100 },
  { id: "istighfar", arabic: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ", defaultTarget: 100 },
  { id: "salawat", arabic: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ", defaultTarget: 100 },
  { id: "subhan_wa_bihamdihi", arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ", defaultTarget: 100 },
  { id: "hawqalah", arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", defaultTarget: 100 },
];

const TARGET_PRESETS = [33, 100, 1000, 0]; // 0 = unlimited / free

const STORAGE_KEY = "rehab_digital_tasbeeh_data";

interface SavedTasbeehData {
  todayCount: number;
  allTimeCount: number;
  lastDate: string; // YYYY-MM-DD
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadSavedData(): SavedTasbeehData {
  const today = getTodayString();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.lastDate !== today) {
        return {
          todayCount: 0,
          allTimeCount: parsed.allTimeCount || 0,
          lastDate: today,
        };
      }
      return parsed;
    }
  } catch {
    // fallback
  }
  return { todayCount: 0, allTimeCount: 0, lastDate: today };
}

function persistData(data: SavedTasbeehData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export default function DigitalTasbeeh() {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [target, setTarget] = useState<number>(33);
  const [count, setCount] = useState<number>(0);
  const [roundsCompleted, setRoundsCompleted] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hapticEnabled, setHapticEnabled] = useState<boolean>(true);
  const [isPressing, setIsPressing] = useState<boolean>(false);
  const [stats, setStats] = useState<SavedTasbeehData>(loadSavedData);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  // Audio synthesis ref
  const audioCtxRef = useRef<AudioContext | null>(null);

  const activePreset = DHIKR_PRESETS[selectedPresetIndex];

  // Play synthesized wooden click sound
  const playClickSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioCtxRef.current = new AudioCtx();
        }
      }
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === "suspended") {
        ctx.resume();
      }
      if (ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.04);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      }
    } catch {
      // Audio not permitted or supported
    }
  }, [soundEnabled]);

  // Main tap handler
  const handleTap = useCallback(() => {
    setIsPressing(true);
    setTimeout(() => setIsPressing(false), 120);

    // Audio & Haptics
    playClickSound();
    if (hapticEnabled && navigator.vibrate) {
      navigator.vibrate(25);
    }

    const nextCount = count + 1;

    // Update stats
    setStats((prev) => {
      const nextStats = {
        ...prev,
        todayCount: prev.todayCount + 1,
        allTimeCount: prev.allTimeCount + 1,
      };
      persistData(nextStats);
      return nextStats;
    });

    // Check target reached
    if (target > 0 && nextCount >= target) {
      setCount(0);
      setRoundsCompleted((r) => r + 1);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);

      // Distinct target celebration haptic
      if (hapticEnabled && navigator.vibrate) {
        navigator.vibrate([40, 60, 80]);
      }
    } else {
      setCount(nextCount);
    }
  }, [count, target, hapticEnabled, playClickSound]);

  // Handle keyboard spacebar / enter for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleTap]);

  // Reset current session
  const handleResetCurrent = () => {
    setCount(0);
    setRoundsCompleted(0);
  };

  // Progress computation
  const isUnlimited = target === 0;
  const progressPercent = isUnlimited ? 100 : Math.min((count / target) * 100, 100);
  const strokeDashoffset = isUnlimited
    ? 0
    : 289 - (289 * progressPercent) / 100;

  return (
    <div className="max-w-xl mx-auto space-y-6" dir="rtl">
      {/* ── Stats Bar ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 p-3 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/5 text-center">
        <div className="p-2">
          <p className="text-[10px] md:text-xs text-slate-400 font-amiri">تسبيح اليوم</p>
          <p className="text-base md:text-lg font-bold font-mono text-amber-400 mt-0.5">
            {stats.todayCount}
          </p>
        </div>
        <div className="p-2 border-r border-l border-white/5">
          <p className="text-[10px] md:text-xs text-slate-400 font-amiri">الدورات المكتملة</p>
          <p className="text-base md:text-lg font-bold font-mono text-emerald-400 mt-0.5">
            {roundsCompleted}
          </p>
        </div>
        <div className="p-2">
          <p className="text-[10px] md:text-xs text-slate-400 font-amiri">الإجمالي الكلي</p>
          <p className="text-base md:text-lg font-bold font-mono text-amber-300 mt-0.5">
            {stats.allTimeCount}
          </p>
        </div>
      </div>

      {/* ── Active Dhikr Selector & Card ─────────────────────────────── */}
      <div className="rounded-2xl border border-amber-500/20 bg-slate-900/60 p-5 backdrop-blur-xl text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />

        {/* Preset Selector Dropdown */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <label className="text-xs text-slate-400 font-amiri shrink-0">اختر الذكر:</label>
          <select
            value={selectedPresetIndex}
            onChange={(e) => {
              const idx = Number(e.target.value);
              setSelectedPresetIndex(idx);
              setTarget(DHIKR_PRESETS[idx].defaultTarget);
              setCount(0);
            }}
            className="w-full max-w-xs bg-slate-800/80 border border-amber-500/20 text-white rounded-xl px-3 py-1.5 text-xs md:text-sm font-amiri focus:outline-none focus:border-amber-400"
          >
            {DHIKR_PRESETS.map((p, i) => (
              <option key={p.id} value={i} className="bg-slate-900 text-white font-amiri">
                {p.arabic}
              </option>
            ))}
          </select>
        </div>

        {/* Active Dhikr Display */}
        <h3 className="text-xl md:text-2xl font-bold text-amber-400 font-scheherazade py-2 px-4 leading-relaxed min-h-[4rem] flex items-center justify-center">
          {activePreset.arabic}
        </h3>

        {/* Target Buttons */}
        <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-white/5">
          <span className="text-[11px] text-slate-400 font-amiri ml-1">الهدف:</span>
          {TARGET_PRESETS.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTarget(t);
                setCount(0);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                target === t
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                  : "bg-slate-800/60 text-slate-400 hover:text-white border border-white/5"
              }`}
            >
              {t === 0 ? "حر" : t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Interactive Counter Circle ─────────────────────────── */}
      <div className="flex flex-col items-center justify-center py-4 relative">
        {/* Celebration Banner */}
        {showCelebration && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-emerald-500 text-slate-950 font-bold font-amiri text-xs shadow-lg shadow-emerald-500/30 animate-bounce z-10">
            ما شاء الله! أتممت الدورة بنجاح 🎉
          </div>
        )}

        <div className="relative">
          {/* Outer SVG Progress Ring */}
          <svg className="w-56 h-56 md:w-64 md:h-64 -rotate-90 pointer-events-none" viewBox="0 0 100 100">
            {/* Background Circle */}
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="rgba(245, 158, 11, 0.1)"
              strokeWidth="4"
            />
            {/* Progress Circle */}
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke={progressPercent >= 100 && !isUnlimited ? "#10b981" : "#f59e0b"}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="289"
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-200"
            />
          </svg>

          {/* Large Tap Button */}
          <button
            onClick={handleTap}
            aria-label="تسبيح"
            className={`absolute inset-3 rounded-full flex flex-col items-center justify-center transition-all duration-150 select-none shadow-2xl ${
              isPressing
                ? "scale-95 bg-amber-500/20 shadow-amber-500/30"
                : "bg-gradient-to-br from-slate-800/90 to-slate-900/90 hover:from-slate-800 hover:to-slate-800/80 shadow-black/50"
            } border-2 border-amber-500/30`}
          >
            <span className="text-4xl md:text-5xl font-bold font-mono text-amber-400 tracking-wider">
              {count}
            </span>
            <span className="text-xs text-slate-400 font-amiri mt-1">
              {isUnlimited ? "تسبيح مستمر" : `من ${target}`}
            </span>
            <span className="text-[10px] text-amber-500/60 mt-3 font-amiri">
              اضغط للتسبيح
            </span>
          </button>
        </div>

        {/* Keyboard hint */}
        <p className="text-[10px] text-slate-400 mt-4">
          يمكنك أيضاً الضغط على زر المسافة (Space) للتسبيح السريع
        </p>
      </div>

      {/* ── Bottom Controls: Sound, Haptics, Reset ──────────────────── */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/5">
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? "كتم الصوت" : "تشغيل الصوت"}
            className={`px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all ${
              soundEnabled
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            <span>{soundEnabled ? "🔊" : "🔇"}</span>
            <span className="font-amiri">{soundEnabled ? "صوت النقر" : "صامت"}</span>
          </button>

          {/* Haptic Toggle */}
          <button
            onClick={() => setHapticEnabled((v) => !v)}
            title={hapticEnabled ? "إيقاف الاهتزاز" : "تفعيل الاهتزاز"}
            className={`px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all ${
              hapticEnabled
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            <span>{hapticEnabled ? "📳" : "📴"}</span>
            <span className="font-amiri">{hapticEnabled ? "اهتزاز" : "بدون اهتزاز"}</span>
          </button>
        </div>

        {/* Reset Session Button */}
        <button
          onClick={handleResetCurrent}
          className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all font-amiri flex items-center gap-1"
        >
          <span>↺</span>
          <span>تصفير العداد</span>
        </button>
      </div>
    </div>
  );
}
