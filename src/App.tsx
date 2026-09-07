import { useEffect, lazy, Suspense } from "react";
import { Capacitor } from "@capacitor/core";
import { useAppStore } from "./store/useAppStore";
import { usePrayerStore } from "./store/usePrayerStore";
import { useSettingsStore } from "./store/useSettingsStore";
import { useAudioEngine } from "./hooks/useAudio";
import Header from "./components/Header";
import HomePage from "./components/HomePage";
import MiniPlayer from "./components/MiniPlayer";
import QueueDrawer from "./components/QueueDrawer";
import ReciterDialog from "./components/ReciterDialog";
import ChatButton from "./components/ChatButton";
import UpdateBanner from "./components/UpdateBanner";

// Lazy-loaded secondary views for code splitting
const AzkarPage = lazy(() => import("./components/AzkarPage"));
const MushafPage = lazy(() => import("./components/MushafPage"));
const PrayerSettings = lazy(() => import("./components/PrayerSettings"));
const AppSettings = lazy(() => import("./components/AppSettings"));
const ChatSidebar = lazy(() => import("./components/ChatSidebar"));

function TabLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      <p className="text-slate-400 text-xs mt-3 font-amiri">جاري التحميل...</p>
    </div>
  );
}

// ✅ Single source of truth for the Android-exclusivity check.
const IS_ANDROID = Capacitor.getPlatform() === "android";

function AudioEngineInit() {
  useAudioEngine();
  return null;
}

/**
 * Theme class map — applied to the root container to cascade CSS variables
 * defined in index.css.
 */
const THEME_CLASSES: Record<string, string> = {
  dark: "theme-dark",
  light: "theme-light",
  night: "theme-night",
};

export default function App() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setReciters = useAppStore((s) => s.setReciters);
  const setRecitersLoading = useAppStore((s) => s.setRecitersLoading);
  const showMiniPlayer = useAppStore((s) => s.showMiniPlayer);
  const queue = useAppStore((s) => s.queue);

  const initPrayerFeatures = usePrayerStore((s) => s.initPrayerFeatures);
  const refreshPrayerTimes = usePrayerStore((s) => s.refreshPrayerTimes);

  const theme = useSettingsStore((s) => s.theme);
  const fontScale = useSettingsStore((s) => s.fontScale);

  useEffect(() => {
    async function fetchReciters() {
      setRecitersLoading(true);
      try {
        const res = await fetch(
          "https://www.mp3quran.net/api/v3/reciters?language=ar"
        );
        const data = await res.json();
        if (data.reciters) {
          setReciters(data.reciters);
        }
      } catch (err) {
        console.error("Failed to fetch reciters:", err);
      } finally {
        setRecitersLoading(false);
      }
    }
    fetchReciters();
  }, [setReciters, setRecitersLoading]);

  // ✅ EXCLUSIVITY: only initialize the native prayer features on Android.
  // On web this effect body is skipped, so nothing native is ever touched.
  useEffect(() => {
    if (!IS_ANDROID) return;
    initPrayerFeatures();
  }, [initPrayerFeatures]);

  // ✅ APP RESUME AUTO-REFRESH (Android only):
  // Whenever the app becomes active (opened/resumed), silently recalculate the
  // day's prayer times and re-queue the native Athan alarms. This keeps alarms
  // accurate across day boundaries without any user action.
  useEffect(() => {
    if (!IS_ANDROID) return;

    let remove: (() => void) | undefined;

    // Dynamic import of @capacitor/app to avoid top-level import that could
    // throw on web if the plugin isn't registered.
    import("@capacitor/app")
      .then(({ App: CapacitorApp }) => {
        CapacitorApp.addListener("appStateChange", ({ isActive }) => {
          if (isActive) {
            refreshPrayerTimes();
          }
        }).then((handle) => {
          remove = () => handle.remove();
        });
      })
      .catch(() => {
        // Plugin not available — silently degrade
      });

    // Clean up the native listener on unmount.
    return () => {
      remove?.();
    };
  }, [refreshPrayerTimes]);

  // ✅ Apply font-scale CSS custom property on the root element.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--font-scale",
      String(fontScale)
    );
  }, [fontScale]);

  const hasMiniPlayer = showMiniPlayer && queue.length > 0;

  // Determine background class based on theme
  const themeClass = THEME_CLASSES[theme] || "theme-dark";
  const bgClass =
    theme === "light"
      ? "bg-[#faf7f0] text-slate-900"
      : theme === "night"
        ? "bg-black text-slate-200"
        : "bg-slate-950 text-white";

  return (
    <div className={`min-h-screen ${bgClass} ${themeClass}`} dir="rtl">
      <AudioEngineInit />

      {/* ✅ APK Update Banner (Android only — hook is inert on web) */}
      <UpdateBanner />

      <div className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        <Header />

        <main
          className={`max-w-7xl mx-auto px-3 md:px-6 pt-4 md:pt-6 ${
            hasMiniPlayer ? "pb-44 md:pb-48" : "pb-8"
          }`}
        >
          <Suspense fallback={<TabLoadingFallback />}>
            {activeTab === "quran" && <HomePage />}
            {activeTab === "azkar" && <AzkarPage />}
            {activeTab === "mushaf" && <MushafPage />}

            {/* ✅ Prayer dashboard — visible on ALL platforms.
                Athan notification controls inside are guarded by isAndroid. */}
            {activeTab === "prayer" && <PrayerSettings />}

            {/* ✅ App Settings — visible on ALL platforms. */}
            {activeTab === "settings" && <AppSettings />}
          </Suspense>
        </main>
      </div>

      <MiniPlayer />
      <QueueDrawer />
      <ReciterDialog />

      {/* AI Islamic Assistant */}
      <ChatButton />
      <Suspense fallback={null}>
        <ChatSidebar />
      </Suspense>
    </div>
  );
}
