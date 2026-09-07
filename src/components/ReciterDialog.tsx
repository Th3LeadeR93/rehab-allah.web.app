import { useAppStore } from "../store/useAppStore";
import { SURAHS, padSurahId } from "../data/surahs";
import { useState } from "react";

export default function ReciterDialog() {
  const show = useAppStore((s) => s.showReciterDialog);
  const reciter = useAppStore((s) => s.selectedReciter);
  const closeDialog = useAppStore((s) => s.closeReciterDialog);
  const playAll = useAppStore((s) => s.playReciterAll);
  const playShuffle = useAppStore((s) => s.playReciterShuffle);
  const setQueue = useAppStore((s) => s.setQueue);

  const [showSurahs, setShowSurahs] = useState(false);
  const [surahSearch, setSurahSearch] = useState("");

  if (!show || !reciter) return null;

  const moshaf = reciter.moshaf.find((m) => m.moshaf_type === 11) ?? reciter.moshaf[0];
  const surahIds = moshaf ? moshaf.surah_list.split(",").map(Number) : [];
  const availableSurahs = SURAHS.filter((s) => surahIds.includes(s.id));
  const filteredSurahs = surahSearch
    ? availableSurahs.filter((s) => s.name.includes(surahSearch))
    : availableSurahs;

  const handlePlaySurah = (surahId: number) => {
    if (!moshaf) return;
    const startIdx = surahIds.indexOf(surahId);
    const tracks = surahIds.slice(startIdx).map((sid) => {
      const s = SURAHS.find((x) => x.id === sid);
      return {
        reciterId: reciter.id,
        reciterName: reciter.name,
        surahId: sid,
        surahName: s?.name ?? `سورة ${sid}`,
        url: `${moshaf.server}${padSurahId(sid)}.mp3`,
      };
    });
    setQueue(tracks, 0);
    setShowSurahs(false);
    setSurahSearch("");
    closeDialog();
  };

  const handleClose = () => {
    setShowSurahs(false);
    setSurahSearch("");
    closeDialog();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg backdrop-blur-xl bg-slate-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 md:p-6 border-b border-white/5">
          <h2 className="text-xl md:text-2xl font-bold text-amber-400 font-amiri text-center">
            {reciter.name}
          </h2>
          {moshaf && (
            <p className="text-center text-slate-500 text-xs mt-1">
              {moshaf.surah_total} سورة متاحة
            </p>
          )}
        </div>

        {!showSurahs ? (
          <div className="p-5 md:p-6 space-y-3">
            <button
              onClick={() => setShowSurahs(true)}
              className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/20 text-slate-200 hover:text-amber-400 transition-all duration-300 text-sm md:text-base"
            >
              تصفح السور
            </button>
            <button
              onClick={() => playAll(reciter)}
              className="w-full py-3 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/30 text-amber-400 transition-all duration-300 text-sm md:text-base"
            >
              تشغيل الكل بالترتيب
            </button>
            <button
              onClick={() => playShuffle(reciter)}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 text-emerald-400 transition-all duration-300 text-sm md:text-base"
            >
              تشغيل عشوائي
            </button>
          </div>
        ) : (
          <div className="p-4 md:p-5">
            <div className="mb-3">
              <input
                type="text"
                value={surahSearch}
                onChange={(e) => setSurahSearch(e.target.value)}
                placeholder="ابحث عن سورة..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/40 text-sm"
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {filteredSurahs.map((surah) => (
                <button
                  key={surah.id}
                  onClick={() => handlePlaySurah(surah.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-amber-500/10 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-amber-500/60 text-xs w-6 text-center">
                      {surah.id}
                    </span>
                    <span className="text-slate-200 group-hover:text-amber-400 text-sm transition-colors">
                      {surah.name}
                    </span>
                  </div>
                  <span className="text-slate-600 text-xs">{surah.type}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowSurahs(false);
                setSurahSearch("");
              }}
              className="w-full mt-3 py-2 text-slate-500 hover:text-amber-400 text-sm transition-colors"
            >
              رجوع
            </button>
          </div>
        )}

        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleClose}
            className="w-full py-2 text-slate-500 hover:text-red-400 text-sm transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
