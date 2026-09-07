import { useAppStore } from "../store/useAppStore";

export default function QueueDrawer() {
  const showQueue = useAppStore((s) => s.showQueue);
  const queue = useAppStore((s) => s.queue);
  const queueIndex = useAppStore((s) => s.queueIndex);
  const toggleQueue = useAppStore((s) => s.toggleQueue);
  const setQueueIndex = useAppStore((s) => s.setQueueIndex);

  if (!showQueue) return null;

  return (
    <div className="fixed inset-0 z-[90]" onClick={toggleQueue}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="absolute top-0 left-0 bottom-0 w-80 md:w-96 backdrop-blur-xl bg-slate-900/95 border-r border-white/5 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="p-4 md:p-5 border-b border-white/5 flex items-center justify-between shrink-0">
          <h3 className="text-base md:text-lg font-bold text-amber-400 font-amiri">
            قائمة التشغيل
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600">{queue.length} مقطع</span>
            <button
              onClick={toggleQueue}
              className="text-slate-500 hover:text-red-400 transition-colors text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {queue.map((track, i) => (
            <button
              key={`${track.reciterId}-${track.surahId}-${i}`}
              onClick={() => setQueueIndex(i)}
              className={`w-full text-right px-4 md:px-5 py-3 border-b border-white/[0.02] transition-all duration-200 ${
                i === queueIndex
                  ? "bg-amber-500/10 border-r-2 border-r-amber-500"
                  : "hover:bg-white/5"
              }`}
            >
              <p
                className={`text-sm truncate ${
                  i === queueIndex ? "text-amber-400" : "text-slate-300"
                }`}
              >
                {track.surahName}
              </p>
              <p className="text-[10px] text-slate-600 truncate">
                {track.reciterName}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
