import { useEffect, useRef, useState } from "react";
import { Settings, Bell, Volume2, Moon, Play, Clock } from "lucide-react";
import { useSettingsStore, type AppTheme } from "../store/useSettingsStore";

/**
 * AppSettings.tsx
 * -----------------------------------------------------------------------------
 * Advanced app settings page: Theme toggle, Font scaling, Wake Lock,
 * and Native Periodic Azkar & Speech Notifications.
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

interface AzkarBridgeSettings {
  enabled: boolean;
  intervalHours: number;
  audioEnabled: boolean;
  nightSilence: boolean;
  quietHoursStartHour?: number;
  quietHoursStartMinute?: number;
  quietHoursEndHour?: number;
  quietHoursEndMinute?: number;
  smartSleepDnd?: boolean;
  sleepTimeoutMinutes?: number;
}

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

const SLEEP_TIMEOUT_OPTIONS = [
  { value: 30, label: "30 دقيقة" },
  { value: 60, label: "ساعة" },
  { value: 120, label: "ساعتان" },
  { value: 180, label: "3 ساعات" },
  { value: 240, label: "4 ساعات" },
  { value: 0, label: "معطل" },
];

const DEFAULT_AZKAR_SETTINGS: AzkarBridgeSettings = {
  enabled: true,
  intervalHours: 1,
  audioEnabled: true,
  nightSilence: true,
  quietHoursStartHour: 23,
  quietHoursStartMinute: 0,
  quietHoursEndHour: 6,
  quietHoursEndMinute: 0,
  smartSleepDnd: true,
  sleepTimeoutMinutes: 120,
};

function normalizeAzkarSettings(raw: any): AzkarBridgeSettings {
  if (!raw) return DEFAULT_AZKAR_SETTINGS;
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;

    let startH = obj.quietHoursStartHour;
    let startM = obj.quietHoursStartMinute;
    if (typeof startH !== "number" && typeof obj.quietHoursStart === "string" && obj.quietHoursStart.includes(":")) {
      const parts = obj.quietHoursStart.split(":");
      startH = parseInt(parts[0], 10) || 23;
      startM = parseInt(parts[1], 10) || 0;
    }

    let endH = obj.quietHoursEndHour;
    let endM = obj.quietHoursEndMinute;
    if (typeof endH !== "number" && typeof obj.quietHoursEnd === "string" && obj.quietHoursEnd.includes(":")) {
      const parts = obj.quietHoursEnd.split(":");
      endH = parseInt(parts[0], 10) || 6;
      endM = parseInt(parts[1], 10) || 0;
    }

    return {
      enabled: typeof obj.enabled === "boolean" ? obj.enabled : true,
      intervalHours: typeof obj.intervalHours === "number" ? obj.intervalHours : 1,
      audioEnabled: typeof obj.audioEnabled === "boolean" ? obj.audioEnabled : true,
      nightSilence: typeof obj.nightSilence === "boolean" ? obj.nightSilence : true,
      quietHoursStartHour: typeof startH === "number" ? startH : 23,
      quietHoursStartMinute: typeof startM === "number" ? startM : 0,
      quietHoursEndHour: typeof endH === "number" ? endH : 6,
      quietHoursEndMinute: typeof endM === "number" ? endM : 0,
      smartSleepDnd: typeof obj.smartSleepDnd === "boolean" ? obj.smartSleepDnd : true,
      sleepTimeoutMinutes: typeof obj.sleepTimeoutMinutes === "number" ? obj.sleepTimeoutMinutes : 120,
    };
  } catch {
    return DEFAULT_AZKAR_SETTINGS;
  }
}

function formatTimeHHMM(hour?: number, minute?: number): string {
  const h = typeof hour === "number" ? hour : 0;
  const m = typeof minute === "number" ? minute : 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseHHMM(timeStr: string): { hour: number; minute: number } {
  const [h, m] = timeStr.split(":").map((v) => parseInt(v, 10) || 0);
  return { hour: h, minute: m };
}

export default function AppSettings() {
  const theme = useSettingsStore((s) => s.theme);
  const fontScale = useSettingsStore((s) => s.fontScale);
  const wakeLockEnabled = useSettingsStore((s) => s.wakeLockEnabled);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setFontScale = useSettingsStore((s) => s.setFontScale);
  const setWakeLockEnabled = useSettingsStore((s) => s.setWakeLockEnabled);

  // Native Azkar Settings Bridge with fallback to localStorage
  const [azkarSettings, setAzkarSettings] = useState<AzkarBridgeSettings>(() => {
    try {
      const raw = (window as any).AndroidBridge?.getAzkarSettings?.();
      if (raw) return normalizeAzkarSettings(raw);
    } catch (_) {}
    try {
      const local = localStorage.getItem("rehab_azkar_settings");
      if (local) return normalizeAzkarSettings(local);
    } catch (_) {}
    return DEFAULT_AZKAR_SETTINGS;
  });
  const [testAlertTriggered, setTestAlertTriggered] = useState(false);

  useEffect(() => {
    // Initial fetch from native bridge
    try {
      const raw = (window as any).AndroidBridge?.getAzkarSettings?.();
      if (raw) {
        setAzkarSettings(normalizeAzkarSettings(raw));
      }
    } catch (_) {}

    // Listen for reactive sync events dispatched from native Compose sheet
    const handleSettingsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail) {
        setAzkarSettings(normalizeAzkarSettings(customEvent.detail));
      }
    };
    window.addEventListener("rehab-azkar-settings-changed", handleSettingsChanged);
    return () => window.removeEventListener("rehab-azkar-settings-changed", handleSettingsChanged);
  }, []);

  // Countdown Notification Bridge state
  const [countdownNotificationEnabled, setCountdownNotificationEnabled] = useState(true);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && (window as any).AndroidBridge?.isCountdownNotificationEnabled) {
        const val = (window as any).AndroidBridge.isCountdownNotificationEnabled();
        setCountdownNotificationEnabled(Boolean(val));
      }
    } catch (_) {}

    const handleCountdownChange = (e: any) => {
      if (e?.detail && typeof e.detail.enabled === "boolean") {
        setCountdownNotificationEnabled(e.detail.enabled);
      }
    };

    window.addEventListener("rehab-countdown-setting-changed", handleCountdownChange);
    return () => {
      window.removeEventListener("rehab-countdown-setting-changed", handleCountdownChange);
    };
  }, []);

  const handleToggleCountdown = (checked: boolean) => {
    setCountdownNotificationEnabled(checked);
    try {
      if (typeof window !== "undefined" && (window as any).AndroidBridge?.setCountdownNotificationEnabled) {
        (window as any).AndroidBridge.setCountdownNotificationEnabled(checked);
      }
    } catch (_) {}
  };

  const updateAzkarSetting = (
    updater: (prev: AzkarBridgeSettings) => AzkarBridgeSettings
  ) => {
    setAzkarSettings((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem("rehab_azkar_settings", JSON.stringify(next));
      } catch (_) {}
      try {
        const bridge = (window as any).AndroidBridge;
        if (bridge?.updateFullAzkarSettings) {
          bridge.updateFullAzkarSettings(JSON.stringify(next));
        } else if (bridge?.updateAzkarSettings) {
          bridge.updateAzkarSettings(
            next.enabled,
            next.intervalHours,
            next.audioEnabled,
            next.nightSilence
          );
        }
      } catch (_) {}
      return next;
    });
  };

  const handleTestAzkar = () => {
    try {
      if ((window as any).AndroidBridge?.triggerTestAzkar) {
        (window as any).AndroidBridge.triggerTestAzkar();
        setTestAlertTriggered(true);
        setTimeout(() => setTestAlertTriggered(false), 3500);
      }
    } catch (_) {}
  };

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
        <Settings className="w-6 h-6 text-amber-500 inline-block ml-2" />
        <h2 className="text-lg md:text-xl font-bold text-amber-400 font-amiri">
          {SETTINGS_TITLE}
        </h2>
      </div>

      {/* ── Persistent Prayer Countdown Notification Card (Android & Native Bridge) ───── */}
      <div className="rounded-2xl border border-amber-500/20 bg-slate-900/60 p-5 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-400 font-amiri">
                إشعار مواقيت الصلاة المستمر (شريط الحالة)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                عد تنازلي حي للصلاة القادمة ثابت في شريط الحالة مع أزرار الإنجاز السريع والمصحف
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={countdownNotificationEnabled}
              onChange={(e) => handleToggleCountdown(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>
      </div>

      {/* ── Periodic Azkar Settings Card (Android & Native Bridge) ───── */}
      <div className="rounded-2xl border border-amber-500/20 bg-slate-900/60 p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-400 font-amiri">
                التذكير الدوري بالأذكار (تنبيهات صوتية)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تنبيهات بأذكار مأثورة بالصوت البشري الطبيعي في أوقات منتظمة
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={azkarSettings.enabled}
              onChange={(e) =>
                updateAzkarSetting((prev) => ({ ...prev, enabled: e.target.checked }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>

        {azkarSettings.enabled && (
          <div className="space-y-4 pt-2 border-t border-white/5">
            {/* Interval selection */}
            <div>
              <p className="text-xs font-semibold text-slate-300 mb-2 font-amiri">
                تكرار التنبيه:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 3, 6].map((hours) => (
                  <button
                    key={hours}
                    onClick={() =>
                      updateAzkarSetting((prev) => ({ ...prev, intervalHours: hours }))
                    }
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      azkarSettings.intervalHours === hours
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm shadow-amber-500/20"
                        : "bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                    }`}
                  >
                    كل {hours} {hours === 1 ? "ساعة" : "ساعات"}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio speech toggle */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-400/80" />
                <div>
                  <span className="text-xs md:text-sm font-medium text-slate-200">
                    الصوت البشري الطبيعي للذكر
                  </span>
                  <p className="text-[10px] text-slate-400">
                    نطق الذكر بصوت واضح وهادئ عند إرسال الإشعار
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={azkarSettings.audioEnabled}
                  onChange={(e) =>
                    updateAzkarSetting((prev) => ({ ...prev, audioEnabled: e.target.checked }))
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
              </label>
            </div>

            {/* Night silence toggle */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-400/80" />
                <div>
                  <span className="text-xs md:text-sm font-medium text-slate-200">
                    وضع الهدوء الليلي
                  </span>
                  <p className="text-[10px] text-slate-400">
                    كتم الصوت تلقائياً أثناء ساعات النوم المحددة
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={azkarSettings.nightSilence}
                  onChange={(e) =>
                    updateAzkarSetting((prev) => ({ ...prev, nightSilence: e.target.checked }))
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
              </label>
            </div>

            {/* Night silence custom hours & smart sleep */}
            {azkarSettings.nightSilence && (
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">ساعات الهدوء:</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-slate-400">من:</span>
                      <input
                        type="time"
                        value={formatTimeHHMM(azkarSettings.quietHoursStartHour, azkarSettings.quietHoursStartMinute)}
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const { hour, minute } = parseHHMM(e.target.value);
                          updateAzkarSetting((prev) => ({
                            ...prev,
                            quietHoursStartHour: hour,
                            quietHoursStartMinute: minute,
                          }));
                        }}
                        className="bg-slate-900 border border-amber-500/30 rounded-lg px-2 py-1 text-amber-300 text-xs font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <span className="text-slate-500">←</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-slate-400">إلى:</span>
                      <input
                        type="time"
                        value={formatTimeHHMM(azkarSettings.quietHoursEndHour, azkarSettings.quietHoursEndMinute)}
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const { hour, minute } = parseHHMM(e.target.value);
                          updateAzkarSetting((prev) => ({
                            ...prev,
                            quietHoursEndHour: hour,
                            quietHoursEndMinute: minute,
                          }));
                        }}
                        className="bg-slate-900 border border-amber-500/30 rounded-lg px-2 py-1 text-amber-300 text-xs font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Smart Sleep Toggle */}
                <div className="border-t border-slate-700/50 pt-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">🌙</span>
                        <span className="text-xs font-medium text-slate-200">كشف النوم الذكي التلقائي</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        كتم الأذكار تلقائياً عند النوم بمجرد بقاء الشاشة مغلقة
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={azkarSettings.smartSleepDnd ?? true}
                        onChange={(e) =>
                          updateAzkarSetting((prev) => ({
                            ...prev,
                            smartSleepDnd: e.target.checked,
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500" />
                    </label>
                  </div>

                  {/* Sleep Timeout Chips */}
                  {(azkarSettings.smartSleepDnd ?? true) && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                      <span className="text-[11px] text-amber-400/90 font-medium">
                        مدة إغلاق الشاشة لتفعيل وضع النوم:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                        {SLEEP_TIMEOUT_OPTIONS.map((opt) => {
                          const isSelected = (azkarSettings.sleepTimeoutMinutes ?? 120) === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                updateAzkarSetting((prev) => ({
                                  ...prev,
                                  sleepTimeoutMinutes: opt.value,
                                }))
                              }
                              className={`py-1 px-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                                isSelected
                                  ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm"
                                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Test Azkar Trigger Button (if on Android or bridge available) */}
            {typeof window !== "undefined" && (window as any).AndroidBridge && (
              <div className="pt-2">
                <button
                  onClick={handleTestAzkar}
                  disabled={testAlertTriggered}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold font-amiri flex items-center justify-center gap-2 transition-all ${
                    testAlertTriggered
                      ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                      : "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300"
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>
                    {testAlertTriggered
                      ? "تم إرسال التنبيه التجريبي بنجاح (سيظهر خلال 3 ثوانٍ)"
                      : "تجربة تنبيه الأذكار الآن"}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
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
