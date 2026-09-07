import { useEffect, useRef } from "react";
import { useSettingsStore, type AppTheme } from "../store/useSettingsStore";

/**
 * AppSettings.tsx
 * -----------------------------------------------------------------------------
 * Advanced app settings page: Theme toggle, Font scaling, Wake Lock.
 * Visible on all platforms (web + Android).
 * -----------------------------------------------------------------------------
 */

// Arabic text constants (zero-literal approach)
const SETTINGS_TITLE = "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0637\u0628\u064A\u0642";
const THEME_TITLE = "\u0627\u0644\u0645\u0638\u0647\u0631";
const THEME_LIGHT = "\u0641\u0627\u062A\u062D";
const THEME_DARK = "\u062F\u0627\u0643\u0646";
const THEME_NIGHT = "\u0644\u064A\u0644\u064A";
const FONT_TITLE = "\u062D\u062C\u0645 \u0627\u0644\u062E\u0637";
const FONT_PREVIEW = "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0647\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0646\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0650\u064A\u0645\u0650";
const WAKE_LOCK_TITLE = "\u0625\u0628\u0642\u0627\u0621 \u0627\u0644\u0634\u0627\u0634\u0629 \u0645\u0636\u064A\u0626\u0629";
const WAKE_LOCK_DESC = "\u0645\u0646\u0639 \u0627\u0644\u0634\u0627\u0634\u0629 \u0645\u0646 \u0627\u0644\u0625\u0637\u0641\u0627\u0621 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0642\u0631\u0627\u0621\u0629";

const THEMES: { id: AppTheme; label: string; icon: string; desc: string }[] = [
  {
    id: "light",
    label: THEME_LIGHT,
    icon: "\u2600\uFE0F",
    desc: "\u0623\u0644\u0648\u0627\u0646 \u0641\u0627\u062A\u062D\u0629 \u0645\u0631\u064A\u062D\u0629",
  },
  {
    id: "dark",
    label: THEME_DARK,
    icon: "\uD83C\uDF19",
    desc: "\u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A",
  },
  {
    id: "night",
    label: THEME_NIGHT,
    icon: "\uD83C\uDF11",
    desc: "\u0623\u0633\u0648\u062F \u0644\u0634\u0627\u0634\u0627\u062A OLED",
  },
];

export default function AppSettings() {
  const theme = useSettingsStore((s) => s.theme);
  const fontScale = useSettingsStore((s) => s.fontScale);
  const wakeLockEnabled = useSettingsStore((s) => s.wakeLockEnabled);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setFontScale = useSettingsStore((s) => s.setFontScale);
  const setWakeLockEnabled = useSettingsStore((s) => s.setWakeLockEnabled);

  // Wake Lock API management
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!('wakeLock' in navigator)) return;

    async function acquireWakeLock() {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      } catch {
        // Wake lock request failed (e.g. low battery, tab not visible)
      }
    }

    if (wakeLockEnabled) {
      acquireWakeLock();
      // Re-acquire on visibility change (wake lock is released when tab is hidden)
      const handleVisibility = () => {
        if (document.visibilityState === 'visible' && wakeLockEnabled) {
          acquireWakeLock();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibility);
        wakeLockRef.current?.release();
        wakeLockRef.current = null;
      };
    } else {
      wakeLockRef.current?.release();
      wakeLockRef.current = null;
    }
  }, [wakeLockEnabled]);

  const scalePercent = Math.round(fontScale * 100);

  return (
    <section className="max-w-2xl mx-auto space-y-6" dir="rtl">
      {/* Page Title */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">\u2699\uFE0F</span>
        <h2 className="text-lg md:text-xl font-bold text-amber-400 font-amiri">
          {SETTINGS_TITLE}
        </h2>
      </div>

      {/* ── Theme Selector ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-amber-500/20 bg-slate-900/60 p-5 md:p-6">
        <h3 className="text-base font-bold text-amber-400 mb-4 font-amiri">
          {THEME_TITLE}
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`relative rounded-xl p-4 text-center transition-all duration-300 border ${
                theme === t.id
                  ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                  : "border-slate-700 bg-slate-800/40 hover:border-amber-500/30 hover:bg-slate-800/60"
              }`}
            >
              {theme === t.id && (
                <div className="absolute top-2 left-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                </div>
              )}
              <div className="text-2xl mb-2">{t.icon}</div>
              <p className={`text-sm font-bold ${
                theme === t.id ? "text-amber-400" : "text-slate-300"
              }`}>
                {t.label}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Font Size Slider ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-amber-500/20 bg-slate-900/60 p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-amber-400 font-amiri">
            {FONT_TITLE}
          </h3>
          <span className="text-xs text-slate-400 font-mono" dir="ltr">
            {scalePercent}%
          </span>
        </div>

        <input
          type="range"
          min={0.8}
          max={1.6}
          step={0.05}
          value={fontScale}
          onChange={(e) => setFontScale(parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full cursor-pointer mb-4"
        />

        {/* Live Preview */}
        <div className="rounded-xl bg-slate-800/50 border border-white/5 p-4 text-center">
          <p
            className="text-amber-400/80 font-amiri leading-relaxed"
            style={{ fontSize: `${fontScale * 1.5}rem` }}
          >
            {FONT_PREVIEW}
          </p>
        </div>
      </div>

      {/* ── Wake Lock Toggle ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-amber-500/20 bg-slate-900/60 p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-amber-400 font-amiri">
              {WAKE_LOCK_TITLE}
            </h3>
            <p className="text-xs text-slate-500 mt-1">{WAKE_LOCK_DESC}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={wakeLockEnabled}
              onChange={(e) => setWakeLockEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>
      </div>
    </section>
  );
}
