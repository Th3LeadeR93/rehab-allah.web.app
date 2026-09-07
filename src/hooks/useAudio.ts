import { useCallback } from "react";
import { useAppStore } from "../store/useAppStore";

// ══════════════════════════════════════════════════════════════════════════════
// ██  AUDIO ENGINE HOOK — Thin Facade (Zero Audio Logic)                    ██
// ██                                                                        ██
// ██  All audio lifecycle management has been consolidated into the Zustand  ██
// ██  store (useAppStore.ts). This hook is a convenience wrapper that        ██
// ██  exposes read-only track state and action methods for UI components.    ██
// ██                                                                        ██
// ██  What was removed (now lives in useAppStore):                          ██
// ██  • HTMLAudioElement creation & event binding                           ██
// ██  • AudioContext silent oscillator (replaced with HTMLAudioElement)      ██
// ██  • Wake Lock management                                               ██
// ██  • MediaSession metadata & action handlers                            ██
// ██  • Visibility change / pageshow recovery                              ██
// ██  • Sleep timer countdown logic                                        ██
// ██  • Live stream reconnection                                           ██
// ══════════════════════════════════════════════════════════════════════════════

export function useAudioEngine() {
  const queue = useAppStore((s) => s.queue);
  const queueIndex = useAppStore((s) => s.queueIndex);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const setIsPlaying = useAppStore((s) => s.setIsPlaying);

  const currentTrack = queue[queueIndex] ?? null;

  const seekTo = useCallback((time: number) => {
    useAppStore.getState().seek(time);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  const totalStop = useCallback(() => {
    useAppStore.getState().totalStop();
  }, []);

  return {
    currentTrack,
    seekTo,
    togglePlay,
    totalStop,
  };
}