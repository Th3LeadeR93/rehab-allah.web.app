import { useUpdateChecker } from "../hooks/useUpdateChecker";

/**
 * UpdateBanner.tsx
 * -----------------------------------------------------------------------------
 * Non-intrusive slide-down banner shown when a newer APK version is available.
 * Android-only — the hook returns `updateAvailable: false` on web.
 * -----------------------------------------------------------------------------
 */

// Arabic text constants (zero-literal approach)
const UPDATE_AVAILABLE = "\u062A\u062D\u062F\u064A\u062B \u062C\u062F\u064A\u062F \u0645\u062A\u0627\u062D";
const UPDATE_NOW = "\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0622\u0646";
const VERSION_PREFIX = "\u0627\u0644\u0625\u0635\u062F\u0627\u0631 ";

export default function UpdateBanner() {
  const { updateAvailable, newVersion, apkUrl, releaseNotes, dismissed, dismiss } =
    useUpdateChecker();

  if (!updateAvailable || dismissed) return null;

  const handleUpdate = () => {
    if (apkUrl) {
      window.open(apkUrl, "_blank");
    }
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 animate-slide-down"
      dir="rtl"
    >
      <div className="mx-3 mt-3 md:max-w-2xl md:mx-auto rounded-2xl backdrop-blur-xl bg-gradient-to-l from-emerald-900/90 via-slate-900/95 to-emerald-900/90 border border-emerald-500/30 shadow-2xl shadow-emerald-900/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Pulse dot */}
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>

            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-300 truncate">
                {UPDATE_AVAILABLE}
                {newVersion && (
                  <span className="text-emerald-400/70 font-normal mr-2">
                    ({VERSION_PREFIX}{newVersion})
                  </span>
                )}
              </p>
              {releaseNotes && (
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {releaseNotes}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleUpdate}
              className="px-4 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition-all duration-300"
            >
              {UPDATE_NOW}
            </button>
            <button
              onClick={dismiss}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
