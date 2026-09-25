/**
 * Haptic Vibration Utility
 * ---------------------------------------------------------------------------
 * Bridges native Android haptic feedback through AndroidBridge.vibrate()
 * with graceful fallback to the Web Vibration API (navigator.vibrate).
 * ---------------------------------------------------------------------------
 */

export function triggerHaptic(pattern: number | number[] = 30): void {
  try {
    const bridge = (window as any).AndroidBridge;
    if (bridge?.vibrate) {
      const ms = Array.isArray(pattern) ? (pattern[0] || 40) : pattern;
      bridge.vibrate(ms);
      return;
    }
  } catch (_) {}

  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern as any);
    }
  } catch (_) {}
}
