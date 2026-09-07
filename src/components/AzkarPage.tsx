import { useState, useCallback } from "react";
import { AZKAR_CATEGORIES, type AzkarCategory, type Zikr } from "../data/azkar";
import DigitalTasbeeh from "./DigitalTasbeeh";

function getStorageKey(zikrId: number): string {
  return `azkar-count-${zikrId}`;
}

function getSavedCount(zikrId: number): number {
  try {
    const val = localStorage.getItem(getStorageKey(zikrId));
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

function saveCount(zikrId: number, count: number): void {
  try {
    localStorage.setItem(getStorageKey(zikrId), count.toString());
  } catch {
    // silent
  }
}

function TasbihCounter({
  zikr,
  onBack,
}: {
  zikr: Zikr;
  onBack: () => void;
}) {
  const [count, setCount] = useState(() => getSavedCount(zikr.id));
  const target = zikr.count;
  const progressPercent = Math.min((count / target) * 100, 100);
  const completed = count >= target;

  const handleIncrement = useCallback(() => {
    const next = count + 1;
    setCount(next);
    saveCount(zikr.id, next);
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, [count, zikr.id]);

  const handleReset = useCallback(() => {
    setCount(0);
    saveCount(zikr.id, 0);
  }, [zikr.id]);

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950 flex flex-col" dir="rtl">
      <div className="shrink-0 backdrop-blur-xl bg-slate-900/80 border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1 transition-colors font-amiri"
        >
          <span>→</span>
          <span>رجوع إلى قائمة الأذكار</span>
        </button>
        <button
          onClick={handleReset}
          className="text-slate-400 hover:text-red-400 text-xs transition-colors font-amiri px-2 py-1 rounded-lg border border-white/5"
        >
          إعادة تعيين
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-8">
          <p className="text-base md:text-lg text-slate-100 leading-relaxed font-scheherazade px-4">
            {zikr.text}
          </p>

          <div className="relative flex items-center justify-center">
            <button
              onClick={handleIncrement}
              disabled={completed}
              className={`w-40 h-40 md:w-48 md:h-48 rounded-full border-4 transition-all duration-500 flex items-center justify-center ${
                completed
                  ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                  : "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 active:scale-95 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
              }`}
            >
              <div>
                <p
                  className={`text-4xl md:text-5xl font-bold font-mono ${
                    completed ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {count}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-amiri">من {target}</p>
              </div>
            </button>

            <svg
              className="absolute inset-0 w-40 h-40 md:w-48 md:h-48 -rotate-90 pointer-events-none mx-auto"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="rgba(245,158,11,0.1)"
                strokeWidth="3"
              />
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke={completed ? "#10b981" : "#f59e0b"}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${progressPercent * 2.89} 289`}
                className="transition-all duration-300"
              />
            </svg>
          </div>

          {completed && (
            <div className="animate-float">
              <p className="text-emerald-400 font-bold text-lg font-amiri">
                أحسنت! أتممت الذكر بنجاح
              </p>
            </div>
          )}

          {zikr.fadl && (
            <p className="text-xs text-slate-400 leading-relaxed px-4 font-amiri">
              {zikr.fadl}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AzkarPage() {
  const [mainTab, setMainTab] = useState<"azkar" | "tasbeeh">("azkar");
  const [activeCategory, setActiveCategory] = useState<AzkarCategory | null>(null);
  const [activeZikr, setActiveZikr] = useState<Zikr | null>(null);

  if (activeZikr) {
    return (
      <TasbihCounter
        zikr={activeZikr}
        onBack={() => setActiveZikr(null)}
      />
    );
  }

  if (activeCategory) {
    return (
      <div className="space-y-4" dir="rtl">
        <button
          onClick={() => setActiveCategory(null)}
          className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1 transition-colors mb-2 font-amiri"
        >
          <span>→</span>
          <span>رجوع إلى قائمة الأذكار</span>
        </button>

        <h2 className="text-xl md:text-2xl font-bold text-amber-400 font-amiri">
          {activeCategory.title}
        </h2>

        <div className="space-y-3">
          {activeCategory.azkar.map((zikr) => {
            const saved = getSavedCount(zikr.id);
            const done = saved >= zikr.count;
            return (
              <button
                key={zikr.id}
                onClick={() => setActiveZikr(zikr)}
                className={`w-full text-right backdrop-blur-xl border rounded-2xl p-4 md:p-5 transition-all duration-300 ${
                  done
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-slate-900/60 border-white/5 hover:border-amber-500/20 hover:bg-amber-500/5"
                }`}
              >
                <p className="text-sm md:text-base text-slate-100 leading-relaxed font-scheherazade line-clamp-2">
                  {zikr.text}
                </p>
                <div className="flex items-center justify-between mt-2 font-amiri">
                  <span className="text-xs text-slate-400">
                    العدد المقرر: {zikr.count}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      done ? "text-emerald-400" : "text-amber-400/80"
                    }`}
                  >
                    {done ? "تم الإنجاز ✓" : `${saved} / ${zikr.count}`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Top Segmented Controls: Azkar vs Digital Tasbeeh ────── */}
      <div className="max-w-md mx-auto flex p-1 rounded-2xl bg-slate-800/60 backdrop-blur-md border border-white/5">
        <button
          onClick={() => setMainTab("azkar")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs md:text-sm font-bold font-amiri transition-all duration-300 ${
            mainTab === "azkar"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          الأذكار والأدعية
        </button>
        <button
          onClick={() => setMainTab("tasbeeh")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs md:text-sm font-bold font-amiri transition-all duration-300 ${
            mainTab === "tasbeeh"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          السبحة الإلكترونية 📿
        </button>
      </div>

      {/* ── Content depending on active tab ─────────────────────── */}
      {mainTab === "tasbeeh" ? (
        <DigitalTasbeeh />
      ) : (
        <div className="space-y-4 md:space-y-6">
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-bold text-amber-400 font-amiri">
              الأذكار المأثورة
            </h2>
            <p className="text-slate-400 text-xs md:text-sm mt-1 font-amiri">
              حصّن نفسك بأذكار الكتاب والسنة الصحيحة
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {AZKAR_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat)}
                className="backdrop-blur-xl bg-slate-900/60 border border-white/5 hover:border-amber-500/20 rounded-2xl p-5 md:p-6 transition-all duration-300 hover:bg-amber-500/5 text-center group"
              >
                <h3 className="text-base md:text-lg text-slate-100 group-hover:text-amber-400 font-bold font-amiri transition-colors">
                  {cat.title}
                </h3>
                <p className="text-xs text-slate-400 mt-2 font-amiri">
                  {cat.azkar.length} ذكر
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
