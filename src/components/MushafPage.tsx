import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAppStore } from "../store/useAppStore";
import { SURAHS, padSurahId, type SurahInfo } from "../data/surahs";

interface AyahData {
  number: number;
  numberInSurah: number;
  text: string;
}

export interface BookmarkItem {
  id: string;
  surahId: number;
  surahName: string;
  ayahNumber: number;
  pageIndex: number;
  timestamp: number;
}

type ReadingMode = "parchment" | "white" | "night";

const AYAHS_PER_PAGE = 6;
const MULTI_BOOKMARK_KEY = "rehab-allah-mushaf-multi-bookmarks";
const READING_MODE_KEY = "rehab-allah-mushaf-reading-mode";
const FONT_SIZE_KEY = "rehab-allah-mushaf-font-size";

function getStoredBookmarks(): BookmarkItem[] {
  try {
    const raw = localStorage.getItem(MULTI_BOOKMARK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistBookmarks(items: BookmarkItem[]): void {
  try {
    localStorage.setItem(MULTI_BOOKMARK_KEY, JSON.stringify(items));
  } catch {
    // silent
  }
}

function getStoredReadingMode(): ReadingMode {
  try {
    const raw = localStorage.getItem(READING_MODE_KEY);
    if (raw === "parchment" || raw === "white" || raw === "night") return raw;
  } catch {
    // fallback
  }
  return "parchment";
}

function getStoredFontSize(): number {
  try {
    const raw = localStorage.getItem(FONT_SIZE_KEY);
    if (raw) {
      const num = parseInt(raw, 10);
      if (num >= 16 && num <= 32) return num;
    }
  } catch {
    // fallback
  }
  return 20;
}

// Global in-memory caches across component mounts for zero-flicker instant transitions
const globalSurahCache = new Map<number, AyahData[]>();
const globalTafseerCache = new Map<number, Map<number, string>>();

export default function MushafPage() {
  const mushafSurahId = useAppStore((s) => s.mushafSurahId);
  const setMushafSurahId = useAppStore((s) => s.setMushafSurahId);
  const setMushafAyahIndex = useAppStore((s) => s.setMushafAyahIndex);
  const mushafPageIndex = useAppStore((s) => s.mushafPageIndex);
  const setMushafPageIndex = useAppStore((s) => s.setMushafPageIndex);
  const reciters = useAppStore((s) => s.reciters);
  const setQueue = useAppStore((s) => s.setQueue);

  const [ayahs, setAyahs] = useState<AyahData[]>(() => globalSurahCache.get(mushafSurahId) || []);
  const [loading, setLoading] = useState(false);

  // Active selected Ayah for action sheet
  const [actionAyah, setActionAyah] = useState<AyahData | null>(null);
  const [tafseer, setTafseer] = useState<string>("");
  const [tafseerLoading, setTafseerLoading] = useState(false);
  const [showTafseerDrawer, setShowTafseerDrawer] = useState(false);

  // Search & Navigation
  const [surahSearch, setSurahSearch] = useState("");
  const [showSurahDropdown, setShowSurahDropdown] = useState(false);

  // Appearance & Accessibility
  const [readingMode, setReadingMode] = useState<ReadingMode>(getStoredReadingMode);
  const [fontSize, setFontSize] = useState<number>(getStoredFontSize);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(getStoredBookmarks);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sub-view back handler for Mushaf (dismisses modals/drawers while keeping page position)
  useEffect(() => {
    (window as any).__rehab_mushaf_back_handler = (): boolean => {
      if (showBookmarksModal) {
        setShowBookmarksModal(false);
        return true;
      }
      if (showTafseerDrawer) {
        setShowTafseerDrawer(false);
        return true;
      }
      if (actionAyah) {
        setActionAyah(null);
        return true;
      }
      if (showSurahDropdown) {
        setShowSurahDropdown(false);
        return true;
      }
      return false;
    };

    return () => {
      delete (window as any).__rehab_mushaf_back_handler;
    };
  }, [showBookmarksModal, showTafseerDrawer, actionAyah, showSurahDropdown]);

  const bookRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const currentSurah = useMemo(
    () => SURAHS.find((s) => s.id === mushafSurahId) ?? SURAHS[0],
    [mushafSurahId]
  );

  const filteredSurahs = useMemo(() => {
    if (!surahSearch) return SURAHS;
    return SURAHS.filter((s) => s.name.includes(surahSearch));
  }, [surahSearch]);

  // Show quick toast notification
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Persist reading preferences
  const handleSetReadingMode = (mode: ReadingMode) => {
    setReadingMode(mode);
    try {
      localStorage.setItem(READING_MODE_KEY, mode);
    } catch {}
  };

  const handleSetFontSize = (delta: number) => {
    setFontSize((prev) => {
      const next = Math.max(16, Math.min(32, prev + delta));
      try {
        localStorage.setItem(FONT_SIZE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  // Pagination: split ayahs into pages of AYAHS_PER_PAGE
  const pages = useMemo(() => {
    const result: AyahData[][] = [];
    for (let i = 0; i < ayahs.length; i += AYAHS_PER_PAGE) {
      result.push(ayahs.slice(i, i + AYAHS_PER_PAGE));
    }
    return result;
  }, [ayahs]);

  const totalPages = pages.length;
  // Clamped page index ensuring zero out-of-bounds access
  const safePageIndex = Math.max(0, Math.min(mushafPageIndex, Math.max(0, totalPages - 1)));
  const currentPage = pages[safePageIndex] ?? [];

  // If mushafPageIndex in store exceeds totalPages once ayahs are loaded, clamp it
  useEffect(() => {
    if (totalPages > 0 && mushafPageIndex >= totalPages) {
      setMushafPageIndex(totalPages - 1);
    }
  }, [totalPages, mushafPageIndex, setMushafPageIndex]);

  // Check if current page is bookmarked
  const isCurrentPageBookmarked = useMemo(() => {
    return bookmarks.some(
      (b) => b.surahId === mushafSurahId && b.pageIndex === safePageIndex
    );
  }, [bookmarks, mushafSurahId, safePageIndex]);

  // Preload adjacent surahs in the background silently for instant zero-wait transitions
  const preloadSurah = useCallback(async (surahId: number) => {
    if (surahId < 1 || surahId > 114 || globalSurahCache.has(surahId)) return;
    try {
      const localRes = await fetch(`/quran/surah_${surahId}.json`);
      if (localRes.ok) {
        const localData = await localRes.json();
        if (localData.code === 200 && localData.data?.ayahs) {
          const mapped: AyahData[] = localData.data.ayahs.map(
            (a: { number: number; numberInSurah: number; text: string }) => ({
              number: a.number,
              numberInSurah: a.numberInSurah,
              text: a.text,
            })
          );
          globalSurahCache.set(surahId, mapped);
          return;
        }
      }
    } catch {}

    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahId}`);
      const data = await res.json();
      if (data.code === 200 && data.data?.ayahs) {
        const mapped: AyahData[] = data.data.ayahs.map(
          (a: { number: number; numberInSurah: number; text: string }) => ({
            number: a.number,
            numberInSurah: a.numberInSurah,
            text: a.text,
          })
        );
        globalSurahCache.set(surahId, mapped);
      }
    } catch {}
  }, []);

  // Fetch ayahs: in-memory cache -> local offline JSON -> fallback API (zero-flicker)
  const fetchAyahs = useCallback(async (surahId: number) => {
    // 1. Instant check in memory cache (Zero flicker!)
    if (globalSurahCache.has(surahId)) {
      setAyahs(globalSurahCache.get(surahId)!);
      setLoading(false);
      preloadSurah(surahId + 1);
      preloadSurah(surahId - 1);
      return;
    }

    setLoading(true);

    // 2. Try local bundled offline JSON first
    try {
      const localRes = await fetch(`/quran/surah_${surahId}.json`);
      if (localRes.ok) {
        const localData = await localRes.json();
        if (localData.code === 200 && localData.data?.ayahs) {
          const mapped: AyahData[] = localData.data.ayahs.map(
            (a: { number: number; numberInSurah: number; text: string }) => ({
              number: a.number,
              numberInSurah: a.numberInSurah,
              text: a.text,
            })
          );
          globalSurahCache.set(surahId, mapped);
          setAyahs(mapped);
          setLoading(false);
          preloadSurah(surahId + 1);
          preloadSurah(surahId - 1);
          return;
        }
      }
    } catch {
      // local fetch failed, fall through
    }

    // 3. Fallback to API (intercepted offline on Android WebView)
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahId}`);
      const data = await res.json();
      if (data.code === 200 && data.data?.ayahs) {
        const mapped: AyahData[] = data.data.ayahs.map(
          (a: { number: number; numberInSurah: number; text: string }) => ({
            number: a.number,
            numberInSurah: a.numberInSurah,
            text: a.text,
          })
        );
        globalSurahCache.set(surahId, mapped);
        setAyahs(mapped);
      } else {
        const surah = SURAHS.find((s) => s.id === surahId);
        if (surah) {
          const generated: AyahData[] = Array.from(
            { length: surah.ayahCount },
            (_, i) => ({
              number: i + 1,
              numberInSurah: i + 1,
              text: `﴿ آية ${i + 1} من سورة ${surah.name} ﴾`,
            })
          );
          globalSurahCache.set(surahId, generated);
          setAyahs(generated);
        }
      }
    } catch {
      const surah = SURAHS.find((s) => s.id === surahId);
      if (surah) {
        const generated: AyahData[] = Array.from(
          { length: surah.ayahCount },
          (_, i) => ({
            number: i + 1,
            numberInSurah: i + 1,
            text: `﴿ آية ${i + 1} من سورة ${surah.name} ﴾`,
          })
        );
        globalSurahCache.set(surahId, generated);
        setAyahs(generated);
      }
    } finally {
      setLoading(false);
      preloadSurah(surahId + 1);
      preloadSurah(surahId - 1);
    }
  }, [preloadSurah]);

  const fetchTafseer = useCallback(async (surahId: number, ayahNum: number) => {
    // 1. Check in-memory cache
    const surahTafseer = globalTafseerCache.get(surahId);
    if (surahTafseer && surahTafseer.has(ayahNum)) {
      setTafseer(surahTafseer.get(ayahNum)!);
      return;
    }

    setTafseerLoading(true);

    // 2. Try loading local offline tafseer JSON
    try {
      const localRes = await fetch(`/quran/tafseer_${surahId}.json`);
      if (localRes.ok) {
        const data = await localRes.json();
        if (data.tafseer && Array.isArray(data.tafseer)) {
          const map = new Map<number, string>();
          for (const item of data.tafseer) {
            map.set(item.ayahNumber, item.text);
          }
          globalTafseerCache.set(surahId, map);
          const found = map.get(ayahNum);
          if (found) {
            setTafseer(found);
            setTafseerLoading(false);
            return;
          }
        }
      }
    } catch {
      // local fetch failed, fall through
    }

    // 3. Fallback to API (intercepted offline on Android WebView)
    try {
      const res = await fetch(
        `https://api.alquran.cloud/v1/ayah/${surahId}:${ayahNum}/ar.muyassar`
      );
      const data = await res.json();
      if (data.code === 200 && data.data?.text) {
        setTafseer(data.data.text);
        if (!globalTafseerCache.has(surahId)) {
          globalTafseerCache.set(surahId, new Map());
        }
        globalTafseerCache.get(surahId)!.set(ayahNum, data.data.text);
      } else {
        setTafseer("التفسير غير متاح حالياً لهذه الآية");
      }
    } catch {
      setTafseer("تعذر تحميل التفسير، يرجى التحقق من الاتصال بالإنترنت");
    } finally {
      setTafseerLoading(false);
    }
  }, []);

  // Fetch ayahs on surah change
  useEffect(() => {
    fetchAyahs(mushafSurahId);
  }, [mushafSurahId, fetchAyahs]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSurahDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ayah click: open contextual action sheet WITHOUT interrupting audio
  const handleAyahClick = (ayah: AyahData) => {
    setActionAyah(ayah);
    setMushafAyahIndex(ayah.numberInSurah);
  };

  // Action 1: View Tafseer
  const handleOpenTafseer = () => {
    if (!actionAyah) return;
    fetchTafseer(mushafSurahId, actionAyah.numberInSurah);
    setShowTafseerDrawer(true);
  };

  // Action 2: Copy Ayah to clipboard
  const handleCopyAyah = async () => {
    if (!actionAyah) return;
    const formatted = `﴿${actionAyah.text}﴾ [سورة ${currentSurah.name}: ${actionAyah.numberInSurah}]`;
    try {
      await navigator.clipboard.writeText(formatted);
      showToast("تم نسخ الآية الكريمة بنجاح ✓");
      setActionAyah(null);
    } catch {
      showToast("تعذر نسخ النص");
    }
  };

  // Action 3: Play Recitation audio for the entire Surah
  const handlePlayRecitation = () => {
    let audioUrl = "";
    let reciterName = "مشاري راشد العفاسي";
    let reciterId = 128;

    if (reciters && reciters.length > 0) {
      const reciter = reciters.find((r) => r.id === 128) ?? reciters[0];
      const moshaf =
        reciter?.moshaf?.find((m) => m.moshaf_type === 11) ?? reciter?.moshaf?.[0];
      if (moshaf && moshaf.server) {
        reciterName = reciter.name || reciterName;
        reciterId = reciter.id || reciterId;
        const safeServer = moshaf.server.replace(/^http:\/\//i, "https://").replace(/\/?$/, "/");
        audioUrl = `${safeServer}${padSurahId(mushafSurahId)}.mp3`;
      }
    }

    // High-reliability HTTPS CDN Fallback if reciters list was unavailable
    if (!audioUrl) {
      audioUrl = `https://server8.mp3quran.net/afs/${padSurahId(mushafSurahId)}.mp3`;
    }

    const title = `سورة ${currentSurah.name}`;
    try {
      const bridge = (window as any).AndroidBridge || (window as any).AndroidAudioBridge;
      if (bridge && typeof bridge.playAudio === "function") {
        bridge.playAudio(audioUrl, title, reciterName);
      } else if (bridge && typeof bridge.playNativeTrack === "function") {
        bridge.playNativeTrack(title, reciterName, audioUrl, false);
      }
    } catch (_) {}

    setQueue(
      [
        {
          reciterId,
          reciterName,
          surahId: mushafSurahId,
          surahName: currentSurah.name,
          url: audioUrl,
        },
      ],
      0
    );
    showToast(`جاري تشغيل سورة ${currentSurah.name} بصوت الشيخ ${reciterName}`);
    setActionAyah(null);
  };

  // Action 3b: Play Recitation audio for the specific selected Ayah
  const handlePlayAyah = (ayah: AyahData) => {
    const surahStr = padSurahId(mushafSurahId);
    const ayahStr = String(ayah.numberInSurah).padStart(3, "0");
    const audioUrl = `https://everyayah.com/data/Alafasy_128kbps/${surahStr}${ayahStr}.mp3`;
    const title = `سورة ${currentSurah.name} - الآية ${ayah.numberInSurah}`;
    const reciterName = "مشاري راشد العفاسي";

    try {
      const bridge = (window as any).AndroidBridge || (window as any).AndroidAudioBridge;
      if (bridge && typeof bridge.playAudio === "function") {
        bridge.playAudio(audioUrl, title, reciterName);
      } else if (bridge && typeof bridge.playNativeTrack === "function") {
        bridge.playNativeTrack(title, reciterName, audioUrl, false);
      }
    } catch (_) {}

    setQueue(
      [
        {
          reciterId: 128,
          reciterName,
          surahId: mushafSurahId,
          surahName: title,
          url: audioUrl,
        },
      ],
      0
    );
    showToast(`جاري الاستماع للآية ${ayah.numberInSurah} من سورة ${currentSurah.name}`);
    setActionAyah(null);
  };

  // Action 4: Bookmark this specific Ayah or Page
  const handleToggleBookmark = (ayah?: AyahData) => {
    const targetAyah = ayah || currentPage[0];
    const ayahNum = targetAyah ? targetAyah.numberInSurah : 1;

    const existingIndex = bookmarks.findIndex(
      (b) => b.surahId === mushafSurahId && b.pageIndex === safePageIndex
    );

    let updated: BookmarkItem[];
    if (existingIndex >= 0) {
      updated = bookmarks.filter((_, idx) => idx !== existingIndex);
      showToast("تمت إزالة الفاصلة");
    } else {
      const newBookmark: BookmarkItem = {
        id: `${mushafSurahId}-${safePageIndex}-${Date.now()}`,
        surahId: mushafSurahId,
        surahName: currentSurah.name,
        ayahNumber: ayahNum,
        pageIndex: safePageIndex,
        timestamp: Date.now(),
      };
      updated = [newBookmark, ...bookmarks];
      showToast(`تم حفظ فاصلة عند سورة ${currentSurah.name} (آية ${ayahNum})`);
    }

    setBookmarks(updated);
    persistBookmarks(updated);
    if (actionAyah) setActionAyah(null);
  };

  const handleJumpToBookmark = (b: BookmarkItem) => {
    setShowBookmarksModal(false);
    setMushafSurahId(b.surahId);
    setMushafPageIndex(b.pageIndex);
    setActionAyah(null);
    setTafseer("");
    if (bookRef.current) {
      bookRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    showToast(`انتقلت إلى ${b.surahName} (الآية ${b.ayahNumber})`);
  };

  const handleDeleteBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = bookmarks.filter((b) => b.id !== id);
    setBookmarks(updated);
    persistBookmarks(updated);
    showToast("تم حذف الفاصلة");
  };

  const handleSurahSelect = (surah: SurahInfo) => {
    setMushafSurahId(surah.id);
    setMushafAyahIndex(0);
    setMushafPageIndex(0);
    setShowSurahDropdown(false);
    setSurahSearch("");
    setActionAyah(null);
    setTafseer("");
  };

  const goToNextPage = () => {
    if (safePageIndex < totalPages - 1) {
      setMushafPageIndex(safePageIndex + 1);
      setActionAyah(null);
      setTafseer("");
    } else if (mushafSurahId < 114) {
      setMushafSurahId(mushafSurahId + 1);
      setMushafPageIndex(0);
      setActionAyah(null);
      setTafseer("");
    }
  };

  const goToPrevPage = () => {
    if (safePageIndex > 0) {
      setMushafPageIndex(safePageIndex - 1);
      setActionAyah(null);
      setTafseer("");
    } else if (mushafSurahId > 1) {
      const prevSurahId = mushafSurahId - 1;
      const prevSurahInfo = SURAHS.find((s) => s.id === prevSurahId);
      const prevAyahCount = prevSurahInfo?.ayahCount || 1;
      const prevLastPageIndex = Math.max(0, Math.ceil(prevAyahCount / AYAHS_PER_PAGE) - 1);

      setMushafSurahId(prevSurahId);
      setMushafPageIndex(prevLastPageIndex);
      setActionAyah(null);
      setTafseer("");
    }
  };

  const goToNextSurah = () => {
    if (mushafSurahId < 114) {
      setMushafSurahId(mushafSurahId + 1);
      setMushafPageIndex(0);
      setActionAyah(null);
      setTafseer("");
    }
  };

  const goToPrevSurah = () => {
    if (mushafSurahId > 1) {
      setMushafSurahId(mushafSurahId - 1);
      setMushafPageIndex(0);
      setActionAyah(null);
      setTafseer("");
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null; // Strictly reset to null: taps never register as swipes!
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) {
      // It was a tap without movement: ignore swipe logic!
      touchStartX.current = null;
      touchEndX.current = null;
      return;
    }
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 60;
    touchStartX.current = null;
    touchEndX.current = null;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Dragged leftwards in RTL -> Next page
        goToNextPage();
      } else {
        // Dragged rightwards in RTL -> Previous page
        goToPrevPage();
      }
    }
  };

  // Reading Mode Theme Styling
  const themeStyles = useMemo(() => {
    switch (readingMode) {
      case "white":
        return {
          wrapperBg: "bg-white text-slate-900 border border-slate-200",
          pageBg: "bg-white",
          headerBorder: "border-slate-200",
          headerText: "text-slate-900",
          basmalaText: "text-slate-700",
          subText: "text-slate-500",
          ayahText: "text-slate-900 hover:text-amber-700",
          ayahSelected: "text-amber-800 bg-amber-100 rounded px-1",
          marker: "text-amber-600 font-amiri",
          crease: "via-black/5",
          footerBorder: "border-slate-200",
          footerBg: "bg-slate-50",
          buttonBg: "bg-slate-200 text-slate-800 hover:bg-slate-300",
        };
      case "night":
        return {
          wrapperBg: "bg-[#0a0f18] text-slate-100 border border-amber-500/20 shadow-2xl shadow-black",
          pageBg: "bg-[#0a0f18]",
          headerBorder: "border-slate-800",
          headerText: "text-amber-400 font-bold",
          basmalaText: "text-amber-300/90",
          subText: "text-slate-400",
          ayahText: "text-slate-100 hover:text-amber-300",
          ayahSelected: "text-amber-300 bg-amber-500/20 rounded px-1.5 py-0.5",
          marker: "text-amber-400 font-amiri font-bold",
          crease: "via-white/5",
          footerBorder: "border-slate-800",
          footerBg: "bg-[#060a12]",
          buttonBg: "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-white/5",
        };
      case "parchment":
      default:
        return {
          wrapperBg: "bg-[#fbf7eb] text-slate-900 border border-amber-900/10",
          pageBg: "bg-[#fbf7eb]",
          headerBorder: "border-amber-800/20",
          headerText: "text-amber-950",
          basmalaText: "text-amber-900/90",
          subText: "text-amber-800/70",
          ayahText: "text-[#2d1d0c] hover:text-amber-800",
          ayahSelected: "text-amber-900 bg-amber-200/60 rounded px-1",
          marker: "text-amber-800/80 font-amiri",
          crease: "via-black/5",
          footerBorder: "border-amber-800/20",
          footerBg: "bg-[#f7f2e1]",
          buttonBg: "bg-amber-800/10 text-amber-900 hover:bg-amber-800/20",
        };
    }
  }, [readingMode]);

  // Split page into two columns for desktop open-book effect
  const leftPageAyahs = currentPage.slice(0, Math.ceil(currentPage.length / 2));
  const rightPageAyahs = currentPage.slice(Math.ceil(currentPage.length / 2));

  // Khatmah completion percentage
  const khatmahPercent = useMemo(() => {
    const raw = ((mushafSurahId - 1) / 114) * 100;
    return Math.max(1, Math.min(100, Math.round(raw)));
  }, [mushafSurahId]);

  return (
    <div className="space-y-4 md:space-y-6" dir="rtl">
      {/* ── Toast Notification ──────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs md:text-sm font-bold font-amiri shadow-xl shadow-amber-500/20 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* ── Top Bar: Navigation, Bookmarks, and Reading Settings ────── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/5">
        {/* Surah Selector & Prev/Next */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
          <button
            onClick={goToPrevSurah}
            disabled={mushafSurahId <= 1}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-amber-500/10 border border-white/5 text-slate-300 hover:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs md:text-sm font-amiri"
          >
            السابقة
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowSurahDropdown(!showSurahDropdown)}
              className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-center text-xs md:text-sm font-bold font-amiri transition-all min-w-[130px]"
            >
              سورة {currentSurah.name} ▼
            </button>
            {showSurahDropdown && (
              <div className="absolute top-full mt-2 right-0 z-50 w-64 backdrop-blur-2xl bg-slate-900/95 border border-amber-500/20 rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-2 border-b border-white/5">
                  <input
                    type="text"
                    value={surahSearch}
                    onChange={(e) => setSurahSearch(e.target.value)}
                    placeholder="ابحث عن سورة..."
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800/90 border border-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-400 text-xs font-amiri"
                    autoFocus
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredSurahs.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSurahSelect(s)}
                      className={`w-full text-right px-4 py-2 text-xs hover:bg-amber-500/10 transition-colors flex items-center justify-between font-amiri ${
                        s.id === mushafSurahId
                          ? "text-amber-400 bg-amber-500/10 font-bold"
                          : "text-slate-300"
                      }`}
                    >
                      <span>{s.name}</span>
                      <span className="text-slate-500 text-[10px]">{s.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={goToNextSurah}
            disabled={mushafSurahId >= 114}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-amber-500/10 border border-white/5 text-slate-300 hover:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs md:text-sm font-amiri"
          >
            التالية
          </button>
        </div>

        {/* Reading Controls: Modes, Font Scale, Bookmarks */}
        <div className="flex items-center gap-2">
          {/* Reading Mode Selector */}
          <div className="flex p-0.5 rounded-xl bg-slate-800/80 border border-white/5 text-xs">
            <button
              onClick={() => handleSetReadingMode("parchment")}
              title="نمط الورق الكلاسيكي"
              className={`px-2 py-1 rounded-lg font-amiri transition-all ${
                readingMode === "parchment"
                  ? "bg-amber-200 text-amber-950 font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📜 ورقي
            </button>
            <button
              onClick={() => handleSetReadingMode("white")}
              title="النمط النهاري"
              className={`px-2 py-1 rounded-lg font-amiri transition-all ${
                readingMode === "white"
                  ? "bg-white text-slate-900 font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ☀️ نهاري
            </button>
            <button
              onClick={() => handleSetReadingMode("night")}
              title="النمط الليلي OLED"
              className={`px-2 py-1 rounded-lg font-amiri transition-all ${
                readingMode === "night"
                  ? "bg-slate-950 text-amber-300 font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🌙 ليلي
            </button>
          </div>

          {/* Font Size Adjust */}
          <div className="flex items-center bg-slate-800/80 rounded-xl border border-white/5 text-xs">
            <button
              onClick={() => handleSetFontSize(-2)}
              disabled={fontSize <= 16}
              title="تصغير الخط"
              className="px-2 py-1 text-slate-300 hover:text-amber-400 disabled:opacity-30"
            >
              أ-
            </button>
            <span className="px-1 font-mono text-[11px] text-slate-400">{fontSize}</span>
            <button
              onClick={() => handleSetFontSize(2)}
              disabled={fontSize >= 32}
              title="تكبير الخط"
              className="px-2 py-1 text-slate-300 hover:text-amber-400 disabled:opacity-30"
            >
              أ+
            </button>
          </div>

          {/* Bookmarks List Button */}
          <button
            onClick={() => setShowBookmarksModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all text-xs font-amiri"
            title="الفواصل المحفوظة"
          >
            <span>🔖</span>
            <span>الفواصل ({bookmarks.length})</span>
          </button>
        </div>
      </div>

      {/* ── Khatmah Progress Indicator ──────────────────────────────── */}
      <div className="px-4 py-2 rounded-xl bg-slate-900/40 border border-white/5 flex items-center justify-between gap-4 text-xs text-slate-400 font-amiri">
        <div className="flex items-center gap-2">
          <span>📖 الختمة المباركة:</span>
          <span className="text-amber-400 font-bold">
            سورة {currentSurah.name} ({currentSurah.id} من 114)
          </span>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-emerald-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${khatmahPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400">{khatmahPercent}%</span>
        </div>
      </div>

      {/* ── Mushaf Book Layout ──────────────────────────────────────── */}
      {loading && ayahs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl bg-slate-900/40 border border-white/5">
          <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm mt-4 font-amiri">جاري تحميل الآيات الكريمة...</p>
        </div>
      ) : (
        <div className="relative">
          {/* Subtle top progress bar when swapping surahs in background */}
          {loading && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500/20 overflow-hidden z-30 rounded-t-2xl">
              <div className="h-full bg-amber-400 animate-pulse w-full" />
            </div>
          )}
          <div
            ref={bookRef}
            className={`rounded-2xl overflow-hidden relative shadow-2xl transition-colors duration-300 ${themeStyles.wrapperBg}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Bookmark Ribbon on page */}
            <button
              onClick={() => handleToggleBookmark()}
              className="absolute top-0 right-4 md:right-8 z-20 group"
              title={isCurrentPageBookmarked ? "حذف الفاصلة" : "حفظ فاصلة في هذه الصفحة"}
            >
              <div className="relative">
                <svg viewBox="0 0 40 60" className="w-8 h-12 md:w-10 md:h-14 drop-shadow-md">
                  <path
                    d="M0 0 H40 V50 L20 40 L0 50 Z"
                    fill={isCurrentPageBookmarked ? "#10b981" : "#f59e0b"}
                    className="transition-all duration-300 group-hover:brightness-110"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center pt-1 text-slate-950">
                  {isCurrentPageBookmarked ? "✓" : "🔖"}
                </div>
              </div>
            </button>

            <div className={`relative transition-colors duration-300 ${themeStyles.pageBg}`}>
              {/* Surah header */}
              <div className={`text-center py-5 md:py-6 border-b ${themeStyles.headerBorder}`}>
                <h2 className={`text-xl md:text-3xl font-bold font-scheherazade ${themeStyles.headerText}`}>
                  سورة {currentSurah.name}
                </h2>
                <p className={`text-xs md:text-sm mt-1 font-amiri ${themeStyles.subText}`}>
                  {currentSurah.type === "meccan" ? "مكية" : "مدنية"} • {currentSurah.ayahCount} آية
                </p>
                {mushafSurahId !== 9 && safePageIndex === 0 && (
                  <p className={`text-xl md:text-2xl font-scheherazade mt-3 ${themeStyles.basmalaText}`}>
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </p>
                )}
              </div>

              {/* Natural flow Quranic page — verses wrap naturally without restrictive heights */}
              <div className="p-5 sm:p-8 md:p-12 transition-all duration-300">
                <div
                  className="text-justify leading-loose transition-all duration-200 select-none"
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: "2.8",
                    textAlignLast: "center",
                  }}
                >
                  {currentPage.map((ayah) => (
                    <span
                      key={ayah.numberInSurah}
                      onClick={() => handleAyahClick(ayah)}
                      className={`font-scheherazade cursor-pointer transition-all duration-200 inline px-0.5 rounded leading-loose ${
                        actionAyah?.numberInSurah === ayah.numberInSurah
                          ? themeStyles.ayahSelected
                          : themeStyles.ayahText
                      }`}
                    >
                      {ayah.text}{" "}
                      <span
                        className={`inline-block mx-1 font-amiri font-bold select-none text-base md:text-lg ${themeStyles.marker}`}
                        title={`الآية ${ayah.numberInSurah}`}
                      >
                        ۝{ayah.numberInSurah}
                      </span>{" "}
                    </span>
                  ))}
                </div>
              </div>

              {/* Page navigation footer */}
              <div
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                className={`flex items-center justify-between px-4 sm:px-6 py-3.5 border-t ${themeStyles.footerBorder} ${themeStyles.footerBg}`}
              >
                <button
                  onClick={goToPrevPage}
                  disabled={safePageIndex === 0 && mushafSurahId === 1}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs md:text-sm font-amiri font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${themeStyles.buttonBg}`}
                >
                  <span>→</span>
                  <span>الصفحة السابقة</span>
                </button>

                <div className="text-center font-amiri text-xs md:text-sm text-slate-500 font-medium">
                  <span>صفحة {safePageIndex + 1} من {totalPages || 1}</span>
                </div>

                <button
                  onClick={goToNextPage}
                  disabled={safePageIndex >= totalPages - 1 && mushafSurahId === 114}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs md:text-sm font-amiri font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${themeStyles.buttonBg}`}
                >
                  <span>الصفحة التالية</span>
                  <span>←</span>
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-2 font-amiri">
            💡 اضغط على أي آية لعرض التفسير الميسر، نسخ الآية، أو الاستماع للتلاوة
          </p>
        </div>
      )}

      {/* ── Ayah Action Bottom Sheet / Dialog ────────────────────────── */}
      {actionAyah && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-amber-500/30 p-5 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h4 className="text-sm font-bold text-amber-400 font-amiri">
                  سورة {currentSurah.name} • الآية {actionAyah.numberInSurah}
                </h4>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  رقم الآية العام في المصحف: {actionAyah.number}
                </p>
              </div>
              <button
                onClick={() => setActionAyah(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* Ayah Snippet */}
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-white/5 max-h-36 overflow-y-auto">
              <p className="text-slate-100 font-scheherazade text-base md:text-lg leading-relaxed text-right">
                ﴿{actionAyah.text}﴾
              </p>
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-2 gap-2 font-amiri">
              <button
                onClick={handleOpenTafseer}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-xs md:text-sm font-bold transition-all"
              >
                <span>📖</span>
                <span>التفسير الميسر</span>
              </button>

              <button
                onClick={handleCopyAyah}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-200 text-xs md:text-sm font-bold transition-all"
              >
                <span>📋</span>
                <span>نسخ الآية</span>
              </button>

              <button
                onClick={() => actionAyah && handlePlayAyah(actionAyah)}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs md:text-sm font-bold transition-all"
              >
                <span>▶️</span>
                <span>استماع للآية</span>
              </button>

              <button
                onClick={handlePlayRecitation}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-200 text-xs md:text-sm font-bold transition-all"
              >
                <span>🔊</span>
                <span>استماع للسورة</span>
              </button>

              <button
                onClick={() => handleToggleBookmark(actionAyah)}
                className="col-span-2 flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs md:text-sm font-bold transition-all"
              >
                <span>🔖</span>
                <span>حفظ في الفواصل</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tafseer Drawer / Modal ───────────────────────────────────── */}
      {showTafseerDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-amber-500/30 p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <h3 className="text-base font-bold text-amber-400 font-amiri flex items-center gap-2">
                <span>📖 التفسير الميسر</span>
                {actionAyah && (
                  <span className="text-xs text-slate-400 font-normal">
                    (سورة {currentSurah.name} : الآية {actionAyah.numberInSurah})
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowTafseerDrawer(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto pr-1 flex-1 space-y-4">
              {actionAyah && (
                <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                  <p className="text-amber-300 font-scheherazade text-base md:text-lg leading-relaxed">
                    ﴿{actionAyah.text}﴾
                  </p>
                </div>
              )}

              {tafseerLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-slate-400 font-amiri text-sm">
                  <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                  جاري تحميل التفسير المعتمد...
                </div>
              ) : (
                <p className="text-slate-200 text-sm md:text-base leading-loose font-amiri">
                  {tafseer}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 shrink-0 text-left">
              <button
                onClick={() => setShowTafseerDrawer(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs font-amiri hover:bg-amber-400 transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Saved Bookmarks Modal ────────────────────────────────────── */}
      {showBookmarksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-amber-500/30 p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <h3 className="text-base font-bold text-amber-400 font-amiri flex items-center gap-2">
                <span>🔖 الفواصل والعلامات المرجعية</span>
                <span className="text-xs text-slate-400 font-normal">({bookmarks.length})</span>
              </h3>
              <button
                onClick={() => setShowBookmarksModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5">
              {bookmarks.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-amiri space-y-2">
                  <p className="text-3xl">🔖</p>
                  <p className="text-sm">لا توجد فواصل محفوظة بعد.</p>
                  <p className="text-xs text-slate-500">
                    يمكنك إضافة فاصلة بالضغط على الشريط الذهبي بأعلى الصفحة أو من قائمة أي آية.
                  </p>
                </div>
              ) : (
                bookmarks.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => handleJumpToBookmark(b)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/70 border border-white/5 hover:border-amber-500/30 hover:bg-slate-800 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📖</span>
                      <div>
                        <p className="text-sm font-bold text-white font-amiri group-hover:text-amber-400 transition-colors">
                          سورة {b.surahName} (الآية {b.ayahNumber})
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          صفحة {b.pageIndex + 1} • {new Date(b.timestamp).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-400 font-amiri opacity-0 group-hover:opacity-100 transition-opacity">
                        انتقال ←
                      </span>
                      <button
                        onClick={(e) => handleDeleteBookmark(b.id, e)}
                        title="حذف الفاصلة"
                        className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center text-xs transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-white/10 shrink-0 text-left">
              <button
                onClick={() => setShowBookmarksModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-amiri text-xs transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}