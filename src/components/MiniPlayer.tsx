import { useState, useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import { useAudioEngine } from "../hooks/useAudio"; // ✅ Updated path

// NOTE: The actual hls.js engine lives in useAppStore.ts, where the singleton
// <audio> element and media-session logic reside. This component consumes the
// live-stream status flags (liveStreamLoading / liveStreamError) that the HLS
// engine publishes, and reflects them in the player UI.

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MiniPlayer() {
  const showMiniPlayer = useAppStore((s) => s.showMiniPlayer);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const currentTime = useAppStore((s) => s.currentTime);
  const duration = useAppStore((s) => s.duration);
  const volume = useAppStore((s) => s.volume);
  const shuffle = useAppStore((s) => s.shuffle);
  const repeat = useAppStore((s) => s.repeat);
  const isRadioMode = useAppStore((s) => s.isRadioMode);
  const liveStreamLoading = useAppStore((s) => s.liveStreamLoading);
  const liveStreamError = useAppStore((s) => s.liveStreamError);
  const sleepTimer = useAppStore((s) => s.sleepTimer);
  const sleepTimerRemaining = useAppStore((s) => s.sleepTimerRemaining);
  const sleepTimerEndTrack = useAppStore((s) => s.sleepTimerEndTrack);

  const nextTrack = useAppStore((s) => s.nextTrack);
  const prevTrack = useAppStore((s) => s.prevTrack);
  const toggleShuffle = useAppStore((s) => s.toggleShuffle);
  const cycleRepeat = useAppStore((s) => s.cycleRepeat);
  const toggleQueue = useAppStore((s) => s.toggleQueue);
  const setVolume = useAppStore((s) => s.setVolume);
  const setSleepTimer = useAppStore((s) => s.setSleepTimer);
  const setSleepTimerEndTrack = useAppStore((s) => s.setSleepTimerEndTrack);

  const { currentTrack, seekTo, togglePlay, totalStop } = useAudioEngine();
  const [showSleepMenu, setShowSleepMenu] = useState(false);

  const isLiveStream = currentTrack?.reciterId === -1;

  const progressPercent = useMemo(
    () => (duration > 0 ? (currentTime / duration) * 100 : 0),
    [currentTime, duration]
  );

  const progressBg = useMemo(
    () => `linear-gradient(to right, #f59e0b ${progressPercent}%, rgba(255,255,255,0.1) ${progressPercent}%)`,
    [progressPercent]
  );

  const volumePercent = volume * 100;
  const volumeBg = `linear-gradient(to right, #f59e0b ${volumePercent}%, rgba(255,255,255,0.1) ${volumePercent}%)`;

  const repeatLabel = repeat === "none" ? "🔁" : repeat === "all" ? "🔁" : "🔂";

  if (!showMiniPlayer || !currentTrack) return null;

  return (
    <>
      {/* ✅ FIX: removed `overflow-hidden` so the sleep-timer dropdown can render
          above the player without being clipped. Rounded corners are preserved
          because all inner content is padded and rounded to match. */}
      <div className="fixed bottom-3 left-3 right-3 md:max-w-4xl md:mx-auto z-40 backdrop-blur-xl bg-slate-900/80 border border-emerald-500/10 rounded-2xl shadow-2xl shadow-black/50">
        <div className="px-4 md:px-5 pt-3 md:pt-4">
          <div className="flex items-center justify-between mb-1">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-amber-400 font-medium truncate">
                {currentTrack.surahName}
              </p>
              <p className="text-[10px] md:text-xs text-slate-500 truncate">
                {currentTrack.reciterName}
                {isRadioMode && !isLiveStream && (
                  <span className="text-emerald-500 mr-2">● راديو</span>
                )}
              </p>
            </div>
            {isLiveStream ? (
              <div
                className={`flex items-center gap-1.5 shrink-0 mr-3 px-2.5 py-1 rounded-full border ${
                  liveStreamError
                    ? "bg-amber-500/10 border-amber-500/20"
                    : "bg-red-500/10 border-red-500/20"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  {!liveStreamError && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      liveStreamError ? "bg-amber-500" : "bg-red-500"
                    }`}
                  />
                </span>
                <span
                  className={`text-[10px] md:text-xs font-medium ${
                    liveStreamError ? "text-amber-400" : "text-red-400"
                  }`}
                >
                  {liveStreamError
                    ? "تعذّر الاتصال بالبث"
                    : liveStreamLoading
                    ? "جارٍ الاتصال..."
                    : "بث مباشر"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-slate-600 shrink-0 mr-3">
                <span>{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            )}
          </div>

          {!isLiveStream && (
            <div dir="ltr" className="w-full">
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={currentTime}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full cursor-pointer"
                style={{ background: progressBg }}
              />
            </div>
          )}
        </div>

        <div className="px-4 md:px-5 pb-3 md:pb-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={toggleShuffle}
                className={`p-1.5 md:p-2 rounded-lg transition-all text-xs md:text-sm ${
                  shuffle ? "text-amber-400 bg-amber-500/10" : "text-slate-500 hover:text-slate-300"
                }`}
                title="عشوائي"
              >
                🔀
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowSleepMenu(!showSleepMenu)}
                  className={`p-1.5 md:p-2 rounded-lg transition-all text-xs md:text-sm ${
                    sleepTimer || sleepTimerEndTrack ? "text-amber-400 bg-amber-500/10" : "text-slate-500 hover:text-slate-300"
                  }`}
                  title="مؤقت النوم"
                >
                  {sleepTimerEndTrack
                    ? "⏱️ نهاية التلاوة"
                    : sleepTimerRemaining
                    ? `⏱️ ${Math.ceil(sleepTimerRemaining / 60)}د`
                    : "⏱️"}
                </button>
                {showSleepMenu && (
                  <div className="absolute bottom-full mb-2 right-0 backdrop-blur-xl bg-slate-800/95 border border-white/10 rounded-xl shadow-xl p-2 min-w-[160px] z-50">
                    <p className="text-[10px] text-slate-500 px-2 py-1 mb-1">مؤقت النوم الذكي</p>
                    <button
                      onClick={() => {
                        setSleepTimerEndTrack(true);
                        setShowSleepMenu(false);
                      }}
                      className={`w-full text-right px-3 py-1.5 rounded-lg text-xs transition-colors mb-1 ${
                        sleepTimerEndTrack
                          ? "text-amber-400 bg-amber-500/10 font-bold"
                          : "text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      نهاية التلاوة الحالية
                    </button>
                    {[15, 30, 45, 60].map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setSleepTimer(m);
                          setShowSleepMenu(false);
                        }}
                        className={`w-full text-right px-3 py-1.5 rounded-lg text-xs transition-colors ${
                          sleepTimer === m && !sleepTimerEndTrack
                            ? "text-amber-400 bg-amber-500/10 font-bold"
                            : "text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        {m} دقيقة
                      </button>
                    ))}
                    {(sleepTimer || sleepTimerEndTrack) && (
                      <button
                        onClick={() => {
                          setSleepTimer(null);
                          setSleepTimerEndTrack(false);
                          setShowSleepMenu(false);
                        }}
                        className="w-full text-right px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors mt-1"
                      >
                        إلغاء المؤقت
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3" dir="ltr">
              <button
                onClick={prevTrack}
                disabled={isLiveStream}
                className={`p-2 transition-colors ${isLiveStream ? 'text-slate-700 cursor-not-allowed' : 'text-slate-300 hover:text-amber-400'}`}
                title="السابق"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              <button
                onClick={togglePlay}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 flex items-center justify-center transition-all duration-300 shadow-lg shadow-amber-500/30 border border-amber-300/40 active:scale-95"
              >
                {isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Total Stop Button ■ */}
              <button
                onClick={totalStop}
                className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-700/60 hover:bg-red-500/30 border border-slate-600/40 hover:border-red-500/40 text-slate-400 hover:text-red-400 flex items-center justify-center transition-all duration-300"
                title="إيقاف تام"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="1.5" />
                </svg>
              </button>

              <button
                onClick={nextTrack}
                disabled={isLiveStream}
                className={`p-2 transition-colors ${isLiveStream ? 'text-slate-700 cursor-not-allowed' : 'text-slate-300 hover:text-amber-400'}`}
                title="التالي"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={cycleRepeat}
                className={`p-1.5 md:p-2 rounded-lg transition-all text-xs md:text-sm ${
                  repeat !== "none" ? "text-amber-400 bg-amber-500/10" : "text-slate-500 hover:text-slate-300"
                }`}
                title={
                  repeat === "none"
                    ? "بدون تكرار"
                    : repeat === "all"
                    ? "تكرار الكل"
                    : "تكرار واحدة"
                }
              >
                {repeatLabel}
                {repeat === "one" && (
                  <span className="text-[8px] align-super">١</span>
                )}
              </button>
              <button
                onClick={toggleQueue}
                className="p-1.5 md:p-2 rounded-lg text-slate-500 hover:text-amber-400 transition-all text-xs md:text-sm"
                title="قائمة التشغيل"
              >
                📋
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 mt-2 justify-center" dir="ltr">
            <span className="text-[10px] text-slate-600">🔈</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 md:w-24 h-1 rounded-full cursor-pointer"
              style={{ background: volumeBg }}
            />
            <span className="text-[10px] text-slate-600">🔊</span>
          </div>
        </div>
      </div>
    </>
  );
}