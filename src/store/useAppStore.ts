import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import Hls from "hls.js"; // ✅ HLS (.m3u8) playback for desktop browsers
import { SURAHS, padSurahId } from "../data/surahs";
import { ISLAMIC_RADIOS, type RadioStation } from "../data/radios";

// ══════════════════════════════════════════════════════════════════════════════
// ██  TYPE DEFINITIONS                                                      ██
// ══════════════════════════════════════════════════════════════════════════════
export interface Reciter {
  id: number;
  name: string;
  letter: string;
  moshaf: Moshaf[];
}

export interface Moshaf {
  id: number;
  name: string;
  server: string;
  surah_total: number;
  moshaf_type: number;
  surah_list: string;
}

export interface QueueTrack {
  reciterId: number;
  reciterName: string;
  surahId: number;
  surahName: string;
  url: string;
  fallbackUrls?: string[];
}

export type RepeatMode = "none" | "all" | "one";
export type ActiveTab = "quran" | "azkar" | "mushaf" | "prayer" | "ramadan" | "settings";

interface PersistedState {
  mushafSurahId: number;
  mushafAyahIndex: number;
  mushafPageIndex: number;
  volume: number;
}

interface TransientState {
  activeTab: ActiveTab;
  reciters: Reciter[];
  recitersLoading: boolean;
  searchQuery: string;
  displayCount: number;
  selectedReciter: Reciter | null;
  showReciterDialog: boolean;
  queue: QueueTrack[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  showQueue: boolean;
  sleepTimer: number | null;
  sleepTimerRemaining: number | null;
  sleepTimerEndTrack: boolean;
  isRadioMode: boolean;
  showMiniPlayer: boolean;
  // Live-stream (HLS) status — surfaced in the MiniPlayer UI.
  liveStreamLoading: boolean;
  liveStreamError: boolean;
}

type AppState = PersistedState &
  TransientState & {
    setActiveTab: (tab: ActiveTab) => void;
    setReciters: (r: Reciter[]) => void;
    setRecitersLoading: (v: boolean) => void;
    setSearchQuery: (q: string) => void;
    loadMore: () => void;
    selectReciter: (r: Reciter | null) => void;
    closeReciterDialog: () => void;
    setQueue: (tracks: QueueTrack[], index?: number) => void;
    setQueueIndex: (i: number) => void;
    nextTrack: () => void;
    prevTrack: () => void;
    setIsPlaying: (v: boolean) => void;
    setCurrentTime: (t: number) => void;
    setDuration: (d: number) => void;
    toggleShuffle: () => void;
    cycleRepeat: () => void;
    toggleQueue: () => void;
    setVolume: (v: number) => void;
    setSleepTimer: (mins: number | null) => void;
    setSleepTimerRemaining: (v: number | null) => void;
    setSleepTimerEndTrack: (v: boolean) => void;
    setMushafSurahId: (id: number) => void;
    setMushafAyahIndex: (i: number) => void;
    setMushafPageIndex: (index: number) => void;
    setIsRadioMode: (v: boolean) => void;
    setLiveStreamLoading: (v: boolean) => void;
    setLiveStreamError: (v: boolean) => void;
    playReciterAll: (reciter: Reciter) => void;
    playReciterShuffle: (reciter: Reciter) => void;
    startRadio: (reciters: Reciter[]) => void;
    startCairoRadio: () => void;
    startRadioStation: (station: RadioStation) => void;
    setShowMiniPlayer: (v: boolean) => void;
    totalStop: () => void;
    seek: (t: number) => void;
  };

// ══════════════════════════════════════════════════════════════════════════════
// ██  HELPER FUNCTIONS                                                      ██
// ══════════════════════════════════════════════════════════════════════════════
function buildReciterTracks(reciter: Reciter): QueueTrack[] {
  const moshaf = reciter.moshaf.find((m) => m.moshaf_type === 11) ?? reciter.moshaf[0];
  if (!moshaf) return [];
  const surahIds = moshaf.surah_list.split(",").map(Number);
  return surahIds.map((sid) => {
    const surah = SURAHS.find((s) => s.id === sid);
    return {
      reciterId: reciter.id,
      reciterName: reciter.name,
      surahId: sid,
      surahName: surah?.name ?? `سورة ${sid}`,
      url: `${moshaf.server}${padSurahId(sid)}.mp3`,
    };
  });
}

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ══════════════════════════════════════════════════════════════════════════════
// ██  BULLETPROOF AUDIO ENGINE — Single Source of Truth                      ██
// ══════════════════════════════════════════════════════════════════════════════
let audio: HTMLAudioElement | null = null;
let silentAnchor: HTMLAudioElement | null = null;
let silentBlobUrl: string | null = null;
let isTransitioning = false;
let sleepTimerInterval: ReturnType<typeof setInterval> | null = null;
let wakeLockSentinel: WakeLockSentinel | null = null;
let preloadAudio: HTMLAudioElement | null = null;
let preloadedUrl = "";
let retryCount = 0;
let lastUrl = "";
let lastIsPlaying = false;
let lastPositionUpdate = 0;
let unlocked = false;

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 1500;

// ── TRAP 3 FIX: High-Compatibility Silent WAV Blob Generator ──
// Uses standard 44100Hz sample rate to guarantee iOS Safari and Android Chrome
// recognize it as a valid, continuous media stream without resampling rejections.
function createSilentWavUrl(): string {
  try {
    const sampleRate = 44100; 
    const numChannels = 1;
    const bitsPerSample = 16;
    const numSamples = sampleRate; // 1 second
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = numSamples * blockAlign;
    const bufferSize = 44 + dataSize;
    
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    
    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);          
    view.setUint16(20, 1, true);           
    view.setUint16(22, numChannels, true); 
    view.setUint32(24, sampleRate, true);  
    view.setUint32(28, byteRate, true);    
    view.setUint16(32, blockAlign, true);  
    view.setUint16(34, bitsPerSample, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);
    
    return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
  } catch {
    return "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
  }
}

async function acquireWakeLock(): Promise<void> {
  if (!("wakeLock" in navigator) || wakeLockSentinel) return;
  try {
    wakeLockSentinel = await navigator.wakeLock.request("screen");
    wakeLockSentinel.addEventListener("release", () => { wakeLockSentinel = null; });
  } catch {}
}

function releaseWakeLock(): void {
  if (wakeLockSentinel) {
    wakeLockSentinel.release().catch(() => {});
    wakeLockSentinel = null;
  }
}

function startSilentAnchor(): void {
  if (!silentAnchor || !silentBlobUrl) return;
  if (!silentAnchor.paused) return; 
  silentAnchor.play().catch(() => {});
}

function stopSilentAnchor(): void {
  if (silentAnchor && !silentAnchor.paused) silentAnchor.pause();
}

function updateMediaSession(track: QueueTrack): void {
  if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
  const MMetadata = (window as any).MediaMetadata;
  if (!MMetadata) return;
  try {
    const host = window.location.origin || "";
    navigator.mediaSession.metadata = new MMetadata({
      title: track.surahName,
      artist: track.reciterName,
      album: "رحاب الله (Rehab Allah)",
      artwork: [
        { src: `${host}/icons/icon-192x192.png`, sizes: "192x192", type: "image/png" },
        { src: `${host}/icons/icon-512x512.png`, sizes: "512x512", type: "image/png" },
      ],
    });
    navigator.mediaSession.playbackState = "playing";
  } catch {}
}

function updateMediaSessionPosition(): void {
  if (!audio || !("mediaSession" in navigator) || !("setPositionState" in navigator.mediaSession)) return;
  try {
    if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate || 1.0,
        position: Math.min(audio.currentTime, audio.duration),
      });
    }
  } catch {}
}

function setupMediaSessionHandlers(): void {
  if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
  const handlers: Record<string, (details: any) => void> = {
    play: () => useAppStore.getState().setIsPlaying(true),
    pause: () => useAppStore.getState().setIsPlaying(false),
    previoustrack: () => useAppStore.getState().prevTrack(),
    nexttrack: () => useAppStore.getState().nextTrack(),
    stop: () => useAppStore.getState().totalStop(),
    seekbackward: (details: any) => { if (audio) audio.currentTime = Math.max(audio.currentTime - (details.seekOffset || 10), 0); },
    seekforward: (details: any) => { if (audio) audio.currentTime = Math.min(audio.currentTime + (details.seekOffset || 10), audio.duration || Infinity); },
    seekto: (details: any) => { if (audio && !details.fastSeek && typeof details.seekTime === "number") audio.currentTime = details.seekTime; },
  };
  Object.entries(handlers).forEach(([action, handler]) => {
    try { navigator.mediaSession.setActionHandler(action as any, handler); } catch {}
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ██  HLS ENGINE — .m3u8 live-stream playback                              ██
// ══════════════════════════════════════════════════════════════════════════════
// The <audio> element below is a module-level singleton driving ALL playback
// (including the media-session / background-audio machinery). Desktop Chrome &
// Firefox cannot play .m3u8 through a plain <audio> element, so we attach hls.js.
// iOS Safari (and some Android WebViews) support HLS natively — there we fall
// back to a direct src assignment. hls.js is only instantiated when needed.
let hls: Hls | null = null;
let hlsWatchdog: ReturnType<typeof setTimeout> | null = null;

function destroyHls(): void {
  if (hlsWatchdog) { clearTimeout(hlsWatchdog); hlsWatchdog = null; }
  if (hls) {
    try {
      hls.destroy();
    } catch {
      /* ignore */
    }
    hls = null;
  }
}

function isHlsUrl(url: string): boolean {
  return url.split("?")[0].toLowerCase().endsWith(".m3u8");
}

// Token-signed HLS (.m3u8) URLs must stay byte-for-byte intact, otherwise the
// CDN rejects them (400/403). Only apply the cache-buster to legacy streams.
function buildLiveUrl(url: string): string {
  return url.includes(".m3u8")
    ? url
    : url.split("?")[0] + "?_live=" + Date.now();
}

// Central source loader — decides between native <audio> and hls.js, and keeps
// the live-stream status flags in the store in sync for the UI.
function loadAudioSource(url: string): void {
  if (!audio) return;

  // Always tear down any previous hls.js session before switching sources.
  destroyHls();

  const store = useAppStore.getState();

  if (isHlsUrl(url)) {
    // iOS/Safari: native HLS — cleanest path, keeps background audio intact.
    if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      store.setLiveStreamError(false);
      audio.src = url;
      return;
    }

    // Desktop Chrome/Firefox (and HLS-less Android WebViews): use hls.js.
    if (Hls.isSupported()) {
      store.setLiveStreamLoading(true);
      store.setLiveStreamError(false);

      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 10,
        maxMaxBufferLength: 30,
        maxBufferSize: 500 * 1000,
        maxBufferHole: 0.5,
        backBufferLength: 5,
        startPosition: -1,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 10,
        fragLoadingTimeOut: 10000,
        manifestLoadingTimeOut: 8000,
      });
      hls.loadSource(url);
      hls.attachMedia(audio);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        useAppStore.getState().setLiveStreamLoading(false);
        // Clear watchdog on successful manifest parse.
        if (hlsWatchdog) { clearTimeout(hlsWatchdog); hlsWatchdog = null; }
        if (useAppStore.getState().isPlaying) {
          audio!.play().catch(() => {});
        }
      });

      // Watchdog: if HLS hasn't connected after 12s, tear down and retry
      // with a cache-busted URL to work around stale CDN edge caches.
      hlsWatchdog = window.setTimeout(() => {
        hlsWatchdog = null;
        const st = useAppStore.getState();
        if (st.liveStreamLoading && !st.liveStreamError) {
          console.warn('[HLS] Watchdog triggered \u2014 restarting stream');
          destroyHls();
          const track = st.queue[st.queueIndex];
          if (track && track.reciterId === -1) {
            loadAudioSource(buildLiveUrl(track.url));
          }
        }
      }, 12000);

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls?.startLoad(); // attempt to recover network errors
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls?.recoverMediaError();
            break;
          default:
            useAppStore.getState().setLiveStreamError(true);
            useAppStore.getState().setLiveStreamLoading(false);
            destroyHls();
        }
      });
      return;
    }

    // Last resort: let the browser try natively.
    audio.src = url;
    return;
  }

  // Standard progressive audio (mp3, etc.) — no HLS needed.
  audio.src = url;
}

function preloadNextTrack(): void {
  const state = useAppStore.getState();
  const { queue, queueIndex, repeat, shuffle } = state;
  if (queue.length === 0 || repeat === "one" || shuffle) return;
  let nextIndex = queueIndex + 1;
  if (nextIndex >= queue.length) {
    if (repeat === "all") nextIndex = 0;
    else return; 
  }
  const nextTrack = queue[nextIndex];
  if (!nextTrack || nextTrack.url === preloadedUrl || nextTrack.reciterId === -1) return;
  preloadedUrl = nextTrack.url;
  if (!preloadAudio) preloadAudio = new Audio();
  preloadAudio.preload = "auto";
  preloadAudio.src = nextTrack.url;
}

function handlePlaybackError(): void {
  if (!audio) return;
  const state = useAppStore.getState();
  const track = state.queue[state.queueIndex];
  if (!track || !state.isPlaying) return;

  // Try fallback URLs if available for this station
  if (track.fallbackUrls && retryCount < track.fallbackUrls.length) {
    const fallbackUrl = track.fallbackUrls[retryCount];
    retryCount++;
    console.warn(`[AudioEngine] Stream failed. Trying fallback (${retryCount}): ${fallbackUrl}`);
    loadAudioSource(fallbackUrl);
    audio.play().catch(() => handlePlaybackError());
    return;
  }

  if (retryCount >= MAX_RETRIES) {
    retryCount = 0;
    isTransitioning = false;
    useAppStore.getState().setIsPlaying(false);
    useAppStore.getState().setLiveStreamError(true);
    return;
  }
  retryCount++;
  const delay = RETRY_BASE_DELAY * Math.pow(2, retryCount - 1);
  setTimeout(() => {
    if (!audio) return;
    const s = useAppStore.getState();
    const tr = s.queue[s.queueIndex];
    if (!tr || !s.isPlaying) return;
    const url = tr.reciterId === -1 ? buildLiveUrl(tr.url) : tr.url;
    loadAudioSource(url);
    audio.play().catch(() => handlePlaybackError());
  }, delay);
}

// ══════════════════════════════════════════════════════════════════════════════
// ██  ZUSTAND STORE DEFINITION                                              ██
// ══════════════════════════════════════════════════════════════════════════════
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      mushafSurahId: 1,
      mushafAyahIndex: 0,
      mushafPageIndex: 0,
      volume: 1.0,
      activeTab: "quran",
      reciters: [],
      recitersLoading: false,
      searchQuery: "",
      displayCount: 20,
      selectedReciter: null,
      showReciterDialog: false,
      queue: [],
      queueIndex: 0,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      shuffle: false,
      repeat: "none",
      showQueue: false,
      sleepTimer: null,
      sleepTimerRemaining: null,
      sleepTimerEndTrack: false,
      isRadioMode: false,
      showMiniPlayer: false,
      liveStreamLoading: false,
      liveStreamError: false,

      setActiveTab: (tab) => set({ activeTab: tab }),
      setReciters: (r) => set({ reciters: r }),
      setRecitersLoading: (v) => set({ recitersLoading: v }),
      setSearchQuery: (q) => set({ searchQuery: q, displayCount: 20 }),
      loadMore: () => set((s) => ({ displayCount: s.displayCount + 20 })),
      selectReciter: (r) => set({ selectedReciter: r, showReciterDialog: r !== null }),
      closeReciterDialog: () => set({ showReciterDialog: false, selectedReciter: null }),
      setQueue: (tracks, index = 0) => set({ queue: tracks, queueIndex: index, isPlaying: true, showMiniPlayer: true, isRadioMode: false }),
      setQueueIndex: (i) => set({ queueIndex: i, isPlaying: true }),
      nextTrack: () => {
        const { queue, queueIndex, repeat, shuffle } = get();
        if (queue.length === 0) return;
        if (repeat === "one") {
          if (audio) { audio.currentTime = 0; audio.play().catch((err) => console.error("[Audio] Replay error:", err)); }
          return;
        }
        let next: number;
        if (shuffle) {
          next = Math.floor(Math.random() * queue.length);
        } else {
          next = queueIndex + 1;
          if (next >= queue.length) {
            if (repeat === "all") next = 0;
            else { set({ isPlaying: false }); return; }
          }
        }
        set({ queueIndex: next, isPlaying: true });
      },
      prevTrack: () => {
        const { queue, queueIndex } = get();
        if (queue.length === 0) return;
        const prev = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
        set({ queueIndex: prev, isPlaying: true });
      },
      setIsPlaying: (v) => set({ isPlaying: v }),
      setCurrentTime: (t) => set({ currentTime: t }),
      setDuration: (d) => set({ duration: d }),
      toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
      cycleRepeat: () => set((s) => ({ repeat: s.repeat === "none" ? "all" : s.repeat === "all" ? "one" : "none" })),
      toggleQueue: () => set((s) => ({ showQueue: !s.showQueue })),
      setVolume: (v) => set({ volume: v }),
      setSleepTimer: (mins) => {
        if (sleepTimerInterval) { clearInterval(sleepTimerInterval); sleepTimerInterval = null; }
        if (mins === null) { set({ sleepTimer: null, sleepTimerRemaining: null }); return; }
        const seconds = mins * 60;
        set({ sleepTimer: mins, sleepTimerRemaining: seconds, sleepTimerEndTrack: false });
        sleepTimerInterval = setInterval(() => {
          const state = get();
          const remaining = state.sleepTimerRemaining;
          if (remaining === null || remaining <= 1) {
            if (sleepTimerInterval) { clearInterval(sleepTimerInterval); sleepTimerInterval = null; }
            if (audio) {
              audio.pause();
              audio.volume = state.volume; // restore user volume setting
            }
            stopSilentAnchor();
            releaseWakeLock();
            if (typeof window !== "undefined" && "mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
            set({ isPlaying: false, sleepTimer: null, sleepTimerRemaining: null });
          } else {
            // Gentle 5-second acoustic fade-out
            if (remaining <= 5 && audio) {
              const fadeRatio = Math.max(0, (remaining - 1) / 5);
              audio.volume = state.volume * fadeRatio;
            }
            set({ sleepTimerRemaining: remaining - 1 });
          }
        }, 1000);
      },
      setSleepTimerRemaining: (v) => set({ sleepTimerRemaining: v }),
      setSleepTimerEndTrack: (v) => set({ sleepTimerEndTrack: v, sleepTimer: null, sleepTimerRemaining: null }),
      setMushafSurahId: (id) => set({ mushafSurahId: id }),
      setMushafAyahIndex: (i) => set({ mushafAyahIndex: i }),
      setMushafPageIndex: (index) => set({ mushafPageIndex: index }),
      setIsRadioMode: (v) => set({ isRadioMode: v }),
      setLiveStreamLoading: (v) => set({ liveStreamLoading: v }),
      setLiveStreamError: (v) => set({ liveStreamError: v }),
      setShowMiniPlayer: (v) => set({ showMiniPlayer: v }),
      seek: (t) => {
        if (audio) audio.currentTime = t;
        set({ currentTime: t });
        updateMediaSessionPosition();
      },
      totalStop: () => {
        if (sleepTimerInterval) { clearInterval(sleepTimerInterval); sleepTimerInterval = null; }
        if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); }
        stopSilentAnchor();
        releaseWakeLock();
        isTransitioning = false;
        lastUrl = "";
        lastIsPlaying = false;
        retryCount = 0;
        preloadedUrl = "";
        if (preloadAudio) { preloadAudio.removeAttribute("src"); preloadAudio.load(); }
        if (typeof window !== "undefined" && "mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "none";
          try { navigator.mediaSession.metadata = null; } catch {}
        }
        set({
          queue: [], queueIndex: 0, isPlaying: false, currentTime: 0, duration: 0,
          showMiniPlayer: false, isRadioMode: false, showQueue: false, sleepTimer: null, sleepTimerRemaining: null, sleepTimerEndTrack: false,
        });
      },
      playReciterAll: (reciter) => {
        const tracks = buildReciterTracks(reciter);
        set({ queue: tracks, queueIndex: 0, isPlaying: true, showMiniPlayer: true, isRadioMode: false, showReciterDialog: false, selectedReciter: null });
      },
      playReciterShuffle: (reciter) => {
        const tracks = fisherYatesShuffle(buildReciterTracks(reciter));
        set({ queue: tracks, queueIndex: 0, isPlaying: true, showMiniPlayer: true, shuffle: true, isRadioMode: false, showReciterDialog: false, selectedReciter: null });
      },
      startRadio: (reciters) => {
        const allTracks: QueueTrack[] = [];
        for (const reciter of reciters) allTracks.push(...buildReciterTracks(reciter));
        const shuffled = fisherYatesShuffle(allTracks);
        set({ queue: shuffled.slice(0, 2000), queueIndex: 0, isPlaying: true, showMiniPlayer: true, isRadioMode: true, shuffle: true, showReciterDialog: false, selectedReciter: null });
      },
      startCairoRadio: () => {
        const cairoStation = ISLAMIC_RADIOS[0];
        const cairoRadioTrack: QueueTrack = {
          reciterId: -1,
          reciterName: "بث مباشر",
          surahId: -1,
          surahName: cairoStation.name,
          url: cairoStation.primaryUrl,
          fallbackUrls: cairoStation.fallbackUrls,
        };
        set({ queue: [cairoRadioTrack], queueIndex: 0, isPlaying: true, showMiniPlayer: true, isRadioMode: true, shuffle: false, repeat: "none", showReciterDialog: false, selectedReciter: null });
      },
      startRadioStation: (station) => {
        const radioTrack: QueueTrack = {
          reciterId: -1,
          reciterName: "بث مباشر",
          surahId: -1,
          surahName: station.name,
          url: station.primaryUrl,
          fallbackUrls: station.fallbackUrls,
        };
        set({ queue: [radioTrack], queueIndex: 0, isPlaying: true, showMiniPlayer: true, isRadioMode: true, shuffle: false, repeat: "none", showReciterDialog: false, selectedReciter: null });
      },
    }),
    {
      name: "rehab-allah-storage",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mushafSurahId: state.mushafSurahId,
        mushafAyahIndex: state.mushafAyahIndex,
        mushafPageIndex: state.mushafPageIndex,
        volume: state.volume,
      }),
      migrate: (persisted: unknown) => {
        const state = persisted as Record<string, unknown> | null;
        if (state) {
          if (state.volume === undefined || state.volume === 0.8) state.volume = 1.0;
          if (state.mushafPageIndex === undefined || typeof state.mushafPageIndex !== "number") state.mushafPageIndex = 0;
        }
        return state as any as PersistedState;
      },
    }
  )
);

// ══════════════════════════════════════════════════════════════════════════════
// ██  AUDIO LIFECYCLE — Event Binding, State Subscription & Recovery        ██
// ══════════════════════════════════════════════════════════════════════════════
if (typeof window !== "undefined") {
  audio = new Audio();
  audio.preload = "auto";

  silentBlobUrl = createSilentWavUrl();
  silentAnchor = new Audio();
  silentAnchor.loop = true;
  
  // ── TRAP 1 FIX: VOLUME ZERO TRAP ──
  // Aggressive OS battery savers ignore HTMLAudioElements with volume strictly 0.
  // 0.01 is inaudible but forces the OS to recognize it as an active media process.
  silentAnchor.volume = 0.01; 
  silentAnchor.src = silentBlobUrl;

  audio.addEventListener("playing", () => {
    isTransitioning = false;
    retryCount = 0;
    useAppStore.getState().setIsPlaying(true);
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
    acquireWakeLock();
  });

  audio.addEventListener("pause", () => {
    if (isTransitioning) return;
    useAppStore.getState().setIsPlaying(false);
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
  });

  audio.addEventListener("ended", () => {
    // ── TRAP 2 FIX: MEDIASESSION BOUNDARY BRIDGE ──
    // IMMEDIATELY assert playing state to prevent OS teardown during the gap
    if ("mediaSession" in navigator) {
      try { navigator.mediaSession.playbackState = "playing"; } catch {}
    }

    const state = useAppStore.getState();
    if (state.sleepTimerEndTrack) {
      state.totalStop();
      return;
    }
    const track = state.queue[state.queueIndex];
    if (track?.reciterId === -1) {
      setTimeout(() => {
        if (audio) {
          const freshUrl = buildLiveUrl(track.url);
          isTransitioning = true;
          loadAudioSource(freshUrl);
          audio.play().catch(() => {});
        }
      }, 2000);
      return;
    }
    state.nextTrack();
  });

  audio.addEventListener("timeupdate", () => {
    if (!audio || isTransitioning) return;
    useAppStore.getState().setCurrentTime(audio.currentTime);
    const now = Date.now();
    if (now - lastPositionUpdate > 1000) {
      lastPositionUpdate = now;
      updateMediaSessionPosition();
    }
    if (audio.duration > 0 && audio.currentTime / audio.duration > 0.9) preloadNextTrack();
  });

  audio.addEventListener("durationchange", () => {
    if (audio && isFinite(audio.duration)) {
      useAppStore.getState().setDuration(audio.duration);
      updateMediaSessionPosition();
    }
  });

  audio.addEventListener("loadstart", () => { if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing"; });
  audio.addEventListener("waiting", () => { if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing"; });
  audio.addEventListener("stalled", () => {
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
    const state = useAppStore.getState();
    const track = state.queue[state.queueIndex];
    if (track?.reciterId === -1) {
      setTimeout(() => {
        if (audio && !audio.paused) {
          const freshUrl = buildLiveUrl(track.url);
          loadAudioSource(freshUrl);
          audio.play().catch(() => {});
        }
      }, 1500);
    }
  });

  audio.addEventListener("error", () => {
    if (isTransitioning || useAppStore.getState().isPlaying) handlePlaybackError();
  });

  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    const silentDataUri = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    if (audio) {
      audio.src = silentDataUri;
      audio.play().then(() => { audio!.pause(); audio!.removeAttribute("src"); audio!.load(); }).catch(() => {});
    }
    if (silentAnchor) silentAnchor.play().then(() => silentAnchor!.pause()).catch(() => {});
    window.removeEventListener("click", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("click", unlock);
  window.addEventListener("touchstart", unlock);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const state = useAppStore.getState();
      if (state.isPlaying) {
        const track = state.queue[state.queueIndex];
        if (track) updateMediaSession(track);
        if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
        if (audio && audio.paused && audio.currentSrc) audio.play().catch(() => {});
        acquireWakeLock();
        startSilentAnchor();
      }
    }
  });

  window.addEventListener("pageshow", (e: PageTransitionEvent) => {
    if (e.persisted) {
      const state = useAppStore.getState();
      if (state.isPlaying && audio && audio.paused && audio.currentSrc) audio.play().catch(() => {});
    }
  });

  useAppStore.subscribe((state) => {
    const currentTrack = state.queue[state.queueIndex];
    const url = currentTrack ? currentTrack.url : "";
    const isPlaying = state.isPlaying;
    const volume = state.volume;
    if (!audio) return;

    if (audio.volume !== volume) audio.volume = volume;

    if (url !== lastUrl) {
      lastUrl = url;
      lastIsPlaying = isPlaying;
      preloadedUrl = ""; 
      
      if (url) {
        isTransitioning = true;
        retryCount = 0;
        
        // ── TRAP 2 FIX: MEDIASESSION BOUNDARY BRIDGE ──
        // Force OS to retain the notification card BEFORE the primary element goes idle
        if ("mediaSession" in navigator) {
          try { navigator.mediaSession.playbackState = "playing"; } catch {}
        }
        
        startSilentAnchor();
        if (currentTrack) updateMediaSession(currentTrack);
        
        const resolvedUrl = currentTrack?.reciterId === -1 ? buildLiveUrl(url) : url;
        loadAudioSource(resolvedUrl);
        
        if (isPlaying) {
          audio.play().catch((err) => {
            console.error("[Audio] Playback error on source load:", err);
            if ((err as Error)?.name !== "AbortError") handlePlaybackError();
          });
        }
      } else {
        isTransitioning = false;
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        destroyHls();
        useAppStore.getState().setLiveStreamLoading(false);
        useAppStore.getState().setLiveStreamError(false);
        stopSilentAnchor();
        if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
      }
    } else if (isPlaying !== lastIsPlaying) {
      lastIsPlaying = isPlaying;
      if (isPlaying) {
        if (url) {
          startSilentAnchor();
          audio.play().catch((err) => {
            console.error("[Audio] Playback error on toggle:", err);
            useAppStore.getState().setIsPlaying(false);
          });
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
          acquireWakeLock();
        }
      } else {
        isTransitioning = false;
        audio.pause();
        if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
      }
    }
  });

  setupMediaSessionHandlers();
}