import { useState, useEffect, useRef, useMemo } from "react";
import { useAppStore, type Reciter } from "../store/useAppStore";
import { FAMOUS_RECITERS_ORDERED } from "../data/famousReciters";
import { ISLAMIC_RADIOS, type RadioStation } from "../data/radios";
import PrayerTimesWidget from "./PrayerTimesWidget";

/* ── Safe Arabic string constants (zero-literal approach) ── */
const PWA_INSTALLED_TEXT =
  "✨ تطبيق رحاب الله مثبت ومتاح على جهازكم الآن. نفعنا الله وإياكم به.";

const DESKTOP_PWA_TEXT =
  "💡 تطبيق رحاب الله متاح كتطبيق ويب تقدمي (PWA) فائق السرعة والخفة يعمل بتوافق كامل على الحواسيب والهواتف الذكية مع إمكانية العمل دون انقطاع.";

const PWA_INSTALL_TITLE =
  "تثبيت تطبيق رحاب الله الرسمي (PWA)";

const PWA_INSTALL_SUBTITLE =
  "اضغط هنا لتثبيت التطبيق مباشرة على جهازك والوصول السريع دون متصفح";

const PWA_BOTTOM_TITLE =
  "تثبيت التطبيق على الشاشة الرئيسية";

const PWA_BOTTOM_SUBTITLE =
  "أضف التطبيق إلى شاشتك الرئيسية للوصول السريع في أي وقت";

const CAIRO_RADIO_TITLE =
  "\u0625\u0630\u0627\u0639\u0629 \u0627\u0644\u0642\u0631\u0622\u0646 \u0627\u0644\u0643\u0631\u064A\u0645 \u0645\u0646 \u0627\u0644\u0642\u0627\u0647\u0631\u0629";

const CAIRO_LIVE_LABEL =
  "\u0628\u062B \u0645\u0628\u0627\u0634\u0631 \u0645\u0646 \u0627\u0644\u0642\u0627\u0647\u0631\u0629";

const CAIRO_LIVE_ACTIVE =
  "\u0627\u0644\u0628\u062B \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u062C\u0627\u0631\u064A...";

const REHAB_RADIO_TITLE =
  "\u0631\u0627\u062F\u064A\u0648 \u0631\u062D\u0627\u0628 \u0627\u0644\u0644\u0647";

const REHAB_RADIO_SUBTITLE =
  "\u0628\u062B \u0639\u0634\u0648\u0627\u0626\u064A \u0645\u062A\u0648\u0627\u0635\u0644 \u0644\u062C\u0645\u064A\u0639 \u0627\u0644\u0642\u0631\u0627\u0621 \u0648\u0627\u0644\u0633\u0648\u0631";

const REHAB_RADIO_ACTIVE =
  "\u0627\u0644\u0628\u062B \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u062C\u0627\u0631\u064A \u0627\u0644\u0622\u0646...";

const FAMOUS_SECTION_TITLE =
  "\u0623\u0634\u0647\u0631 \u0627\u0644\u0642\u0631\u0627\u0621 \u0641\u064A \u0627\u0644\u0648\u0637\u0646 \u0627\u0644\u0639\u0631\u0628\u064A";

const ALL_RECITERS_TITLE =
  "\u062C\u0645\u064A\u0639 \u0627\u0644\u0642\u0631\u0627\u0621";

const RECITERS_UNIT =
  "\u0642\u0627\u0631\u0626";

const SEARCH_PLACEHOLDER =
  "\u0627\u0628\u062D\u062B \u0639\u0646 \u0642\u0627\u0631\u0626...";

const LOADING_TEXT =
  "\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0642\u0631\u0627\u0621...";

const LOAD_MORE_TEXT =
  "\u0639\u0631\u0636 \u0627\u0644\u0645\u0632\u064A\u062F \u0645\u0646 \u0627\u0644\u0642\u0631\u0627\u0621";

const SURAH_UNIT =
  "\u0633\u0648\u0631\u0629";

const SCROLL_RIGHT_LABEL =
  "\u062A\u0645\u0631\u064A\u0631 \u0644\u0644\u064A\u0645\u064A\u0646";

const SCROLL_LEFT_LABEL =
  "\u062A\u0645\u0631\u064A\u0631 \u0644\u0644\u064A\u0633\u0627\u0631";

/* ── Radio Icon Component ── */
function RadioIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="3" fill="currentColor" className="animate-pulse" />
      <path
        d="M12 5C8.13 5 5 8.13 5 12s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        className="opacity-60"
      />
      <path
        d="M12 1C5.93 1 1 5.93 1 12s4.93 11 11 11 11-4.93 11-11S18.07 1 12 1z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        className="opacity-30"
      />
      <path
        d="M8.5 8.5L6 6M15.5 8.5L18 6M8.5 15.5L6 18M15.5 15.5L18 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="animate-pulse"
      />
    </svg>
  );
}

export default function HomePage() {
  const reciters = useAppStore((s) => s.reciters);
  const loading = useAppStore((s) => s.recitersLoading);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const displayCount = useAppStore((s) => s.displayCount);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const loadMore = useAppStore((s) => s.loadMore);
  const selectReciter = useAppStore((s) => s.selectReciter);
  const startRadio = useAppStore((s) => s.startRadio);
  const startCairoRadio = useAppStore((s) => s.startCairoRadio);
  const startRadioStation = useAppStore((s) => s.startRadioStation);
  const isRadioMode = useAppStore((s) => s.isRadioMode);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const queue = useAppStore((s) => s.queue);

  // ── PWA State & Actions ──
  const deferredPrompt = useAppStore((s) => s.deferredPrompt);
  const isPwaInstallable = useAppStore((s) => s.isPwaInstallable);
  const setPwaPrompt = useAppStore((s) => s.setPwaPrompt);
  const triggerPwaInstall = useAppStore((s) => s.triggerPwaInstall);

  const [isBannerDismissed, setIsBannerDismissed] = useState(() => {
    try {
      return localStorage.getItem("rehab_pwa_banner_dismissed") === "true";
    } catch {
      return false;
    }
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  /* ── PWA beforeinstallprompt lifecycle (attached securely on mount) ── */
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPwaPrompt(e as any, true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [setPwaPrompt]);

  /* ── Derived state ── */
  const canInstallPwa = isPwaInstallable && deferredPrompt !== null;

  const famousReciters = useMemo(() => {
    if (reciters.length === 0) return [];
    const matched: { reciter: Reciter; order: number }[] = [];
    for (const entry of FAMOUS_RECITERS_ORDERED) {
      for (const reciter of reciters) {
        const alreadyMatched = matched.some((m) => m.reciter.id === reciter.id);
        if (alreadyMatched) continue;

        const nameMatches = entry.searchTerms.some((term) =>
          reciter.name.includes(term)
        );

        if (nameMatches) {
          matched.push({ reciter, order: entry.order });
          break;
        }
      }
    }

    matched.sort((a, b) => a.order - b.order);
    return matched.map((m) => m.reciter);
  }, [reciters]);

  const filteredReciters = useMemo(() => {
    if (!searchQuery) return reciters;
    return reciters.filter((r) => r.name.includes(searchQuery));
  }, [reciters, searchQuery]);

  const visibleReciters = useMemo(
    () => filteredReciters.slice(0, displayCount),
    [filteredReciters, displayCount]
  );

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft -= e.deltaY;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const isRadioActive = isRadioMode && isPlaying;
  const isCairoRadioActive = isRadioMode && isPlaying && queue[0]?.reciterId === -1;
  const isRehabRadioActive = isRadioActive && !isCairoRadioActive;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* ══════════════════════════════════════════════════════════
          TOP WIDE PWA BUTTON — Strict Conditional Swap
          IF canInstallPwa: show install button with blinking dot
          ELSE: show glassmorphic "installed" confirmation box
      ══════════════════════════════════════════════════════════ */}
      {canInstallPwa ? (
        <button
          onClick={() => triggerPwaInstall()}
          className="w-full relative overflow-hidden rounded-2xl transition-all duration-500 group"
        >
          <div className="absolute inset-0 bg-gradient-to-l from-emerald-600/20 via-green-600/15 to-emerald-600/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          <div className="relative backdrop-blur-sm border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-center gap-3 md:gap-4">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-emerald-500/40 blur-xl rounded-full animate-ping" />
                <div className="relative w-3 h-3 md:w-4 md:h-4 rounded-full bg-emerald-400 border-2 border-emerald-200/50 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
              </div>
              <div className="text-center">
                <p className="text-lg md:text-xl font-bold font-amiri text-emerald-300">
                  {PWA_INSTALL_TITLE}
                </p>
                <p className="text-xs text-emerald-200/60 mt-0.5">
                  {PWA_INSTALL_SUBTITLE}
                </p>
              </div>
            </div>
          </div>
        </button>
      ) : !isBannerDismissed ? (
        <div className="w-full relative overflow-hidden rounded-2xl backdrop-blur-xl bg-slate-900/60 border border-emerald-500/20 p-5 md:p-7 flex flex-col items-center justify-center text-center shadow-lg shadow-emerald-900/10">
          <button
            onClick={() => {
              setIsBannerDismissed(true);
              try {
                localStorage.setItem("rehab_pwa_banner_dismissed", "true");
              } catch {}
            }}
            className="absolute top-3 left-3 w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors"
            title="إغلاق التنبيه"
          >
            ✕
          </button>
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
          <div className="relative flex flex-col items-center gap-2.5 max-w-xl">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <svg
                className="w-5 h-5 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            {/* Mobile message */}
            <p className="block md:hidden text-sm md:text-base font-medium text-emerald-100/90 font-amiri leading-relaxed">
              {PWA_INSTALLED_TEXT}
            </p>
            {/* Desktop message */}
            <p className="hidden md:block text-sm md:text-base font-medium text-emerald-100/90 font-amiri leading-relaxed">
              {DESKTOP_PWA_TEXT}
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Prayer Times Widget ─────────────────────────────────── */}
      <PrayerTimesWidget />

      {/* ── Cairo Quran Radio ───────────────────────────────────── */}
      <button
        onClick={() => startCairoRadio()}
        className={`w-full relative overflow-hidden rounded-2xl transition-all duration-500 group ${
          isCairoRadioActive ? "animate-pulse-glow" : ""
        }`}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-l from-emerald-600/20 via-teal-600/15 to-emerald-600/20 ${
            isCairoRadioActive ? "animate-pulse" : ""
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

        <div className="relative backdrop-blur-sm border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-center gap-3 md:gap-4">
            <div className="relative">
              <div
                className={`absolute inset-0 bg-emerald-500/30 blur-xl rounded-full ${
                  isCairoRadioActive ? "animate-ping" : ""
                }`}
              />
              <div
                className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center ${
                  isCairoRadioActive
                    ? "bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border-2 border-emerald-400/50"
                    : "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30"
                }`}
              >
                <RadioIcon
                  className={`w-7 h-7 md:w-8 md:h-8 ${
                    isCairoRadioActive ? "text-emerald-300" : "text-emerald-400"
                  }`}
                />
              </div>
            </div>

            <div className="text-center">
              <p
                className={`text-lg md:text-xl font-bold font-amiri ${
                  isCairoRadioActive ? "text-emerald-300" : "text-emerald-400"
                }`}
              >
                {CAIRO_RADIO_TITLE}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-1.5">
                {isCairoRadioActive ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                    </span>
                    {CAIRO_LIVE_ACTIVE}
                  </>
                ) : (
                  CAIRO_LIVE_LABEL
                )}
              </p>
            </div>

            {isCairoRadioActive && (
              <div className="flex gap-0.5 items-end h-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-1 bg-emerald-400 rounded-full audio-bar-animate"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* ── Rehab Radio ──────────────────────────────────────────── */}
      <button
        onClick={() => startRadio(reciters)}
        disabled={reciters.length === 0}
        className={`w-full relative overflow-hidden rounded-2xl transition-all duration-500 group ${
          isRehabRadioActive ? "animate-pulse-glow" : ""
        }`}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-l from-amber-600/20 via-emerald-600/20 to-amber-600/20 ${
            isRehabRadioActive ? "animate-pulse" : ""
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

        <div className="relative backdrop-blur-sm border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-center gap-3 md:gap-4">
            <div className="relative">
              <div
                className={`absolute inset-0 bg-amber-500/30 blur-xl rounded-full ${
                  isRehabRadioActive ? "animate-ping" : ""
                }`}
              />
              <div
                className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center ${
                  isRehabRadioActive
                    ? "bg-gradient-to-br from-emerald-500/30 to-amber-500/30 border-2 border-emerald-400/50"
                    : "bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-500/30"
                }`}
              >
                <RadioIcon
                  className={`w-7 h-7 md:w-8 md:h-8 ${
                    isRehabRadioActive ? "text-emerald-400" : "text-amber-400"
                  }`}
                />
              </div>
            </div>

            <div className="text-center">
              <p
                className={`text-lg md:text-xl font-bold font-amiri ${
                  isRehabRadioActive ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {REHAB_RADIO_TITLE}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRehabRadioActive ? REHAB_RADIO_ACTIVE : REHAB_RADIO_SUBTITLE}
              </p>
            </div>

            {isRehabRadioActive && (
              <div className="flex gap-0.5 items-end h-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-1 bg-emerald-400 rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 16 + 8}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* ── Islamic Live Radio Stations Catalog (24/7) ──────────── */}
      <section className="space-y-3 pt-2" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl animate-float">📻</span>
            <h2 className="text-base md:text-lg font-bold text-amber-400 font-amiri">
              باقات إذاعات القرآن الكريم المباشرة (24/7)
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-amiri">
            {ISLAMIC_RADIOS.length} محطات حية
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-3">
          {ISLAMIC_RADIOS.map((station) => {
            const isStationActive =
              isRadioMode && isPlaying && queue[0]?.url === station.primaryUrl;

            return (
              <button
                key={station.id}
                onClick={() => startRadioStation(station)}
                className={`text-right p-3.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group ${
                  isStationActive
                    ? "bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                    : "bg-slate-900/60 border-white/5 hover:border-amber-500/30 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-2xl">{station.icon || "📻"}</span>
                  {isStationActive ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-amiri">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      يعمل الآن
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-amiri opacity-0 group-hover:opacity-100 transition-opacity">
                      تشغيل ▶
                    </span>
                  )}
                </div>
                <div>
                  <p
                    className={`text-xs md:text-sm font-bold font-amiri line-clamp-1 ${
                      isStationActive
                        ? "text-emerald-300"
                        : "text-white group-hover:text-amber-400"
                    }`}
                  >
                    {station.name}
                  </p>
                  <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {station.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Bottom PWA Install Button (disappears when installed) ── */}
      {canInstallPwa && (
        <button
          onClick={() => triggerPwaInstall()}
          className="w-full relative overflow-hidden rounded-2xl transition-all duration-500 group"
        >
          <div className="absolute inset-0 bg-gradient-to-l from-sky-600/20 via-blue-600/15 to-sky-600/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          <div className="relative backdrop-blur-sm border border-sky-500/20 hover:border-sky-500/40 rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-center gap-3 md:gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-sky-500/30 blur-xl rounded-full animate-ping" />
                <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-sky-500/30 to-blue-500/30 border-2 border-sky-400/50">
                  <svg
                    className="w-7 h-7 text-sky-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg md:text-xl font-bold font-amiri text-sky-300">
                  {PWA_BOTTOM_TITLE}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {PWA_BOTTOM_SUBTITLE}
                </p>
              </div>
            </div>
          </div>
        </button>
      )}

      {/* ── Famous Reciters Horizontal Scroll ───────────────────── */}
      {famousReciters.length > 0 && (
        <section>
          <h2 className="text-base md:text-lg font-bold text-amber-400 font-amiri mb-3 md:mb-4 px-1">
            {FAMOUS_SECTION_TITLE}
          </h2>
          <div className="relative group/scroll">
            <button
              onClick={scrollLeft}
              className="absolute right-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-l from-transparent to-slate-950/90 text-amber-500 opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300 flex items-center justify-center"
              aria-label={SCROLL_RIGHT_LABEL}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <div
              ref={scrollRef}
              className="flex gap-3 md:gap-4 overflow-x-auto hide-scrollbar pb-2"
              dir="rtl"
            >
              {famousReciters.map((r, idx) => (
                <button
                  key={r.id}
                  onClick={() => selectReciter(r)}
                  className="shrink-0 w-36 md:w-44 backdrop-blur-xl bg-slate-900/60 border border-white/5 hover:border-amber-500/30 rounded-2xl p-4 md:p-5 transition-all duration-300 hover:bg-amber-500/5 group relative"
                >
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <span className="text-[10px] text-amber-400 font-bold">
                      {idx + 1}
                    </span>
                  </div>
                  <p className="text-sm md:text-base text-slate-200 group-hover:text-amber-400 font-medium transition-colors truncate text-center">
                    {r.name}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-1 text-center">
                    {r.moshaf[0]?.surah_total ?? 0} {SURAH_UNIT}
                  </p>
                </button>
              ))}
            </div>
            <button
              onClick={scrollRight}
              className="absolute left-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-r from-transparent to-slate-950/90 text-amber-500 opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300 flex items-center justify-center"
              aria-label={SCROLL_LEFT_LABEL}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </section>
      )}

      {/* ── All Reciters Section ────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3 md:mb-4 px-1">
          <h2 className="text-base md:text-lg font-bold text-amber-400 font-amiri">
            {ALL_RECITERS_TITLE}
          </h2>
          <span className="text-xs text-slate-600">
            {filteredReciters.length} {RECITERS_UNIT}
          </span>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={SEARCH_PLACEHOLDER}
            className="w-full px-4 md:px-5 py-3 rounded-2xl backdrop-blur-xl bg-slate-900/60 border border-white/5 focus:border-amber-500/30 text-white placeholder:text-slate-600 focus:outline-none transition-all duration-300 text-sm md:text-base"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-slate-500 text-sm mt-4">{LOADING_TEXT}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
              {visibleReciters.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectReciter(r)}
                  className="backdrop-blur-xl bg-slate-900/60 border border-white/5 hover:border-amber-500/20 rounded-2xl px-4 md:px-5 py-3 md:py-4 transition-all duration-300 hover:bg-amber-500/5 text-right group"
                >
                  <p className="text-sm md:text-base text-slate-200 group-hover:text-amber-400 font-medium transition-colors">
                    {r.name}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {(r.moshaf.find((m) => m.moshaf_type === 11) ?? r.moshaf[0])
                      ?.surah_total ?? 0}{" "}
                    {SURAH_UNIT}
                  </p>
                </button>
              ))}
            </div>

            {displayCount < filteredReciters.length && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={loadMore}
                  className="px-8 py-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/30 text-amber-400 text-sm font-medium transition-all duration-300"
                >
                  {LOAD_MORE_TEXT}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}