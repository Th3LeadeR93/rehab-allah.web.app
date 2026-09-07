import { useState, useEffect, useCallback, useRef } from "react";
import { usePrayerStore } from "../store/usePrayerStore";

export default function QiblaCompass() {
  const coordinates = usePrayerStore((s) => s.coordinates);
  const qiblaAngle = usePrayerStore((s) => s.qiblaAngle);
  const qiblaDistanceKm = usePrayerStore((s) => s.qiblaDistanceKm);
  const locationName = usePrayerStore((s) => s.locationName);
  const fetchPrayerTimes = usePrayerStore((s) => s.fetchPrayerTimes);

  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [hasOrientationSupport, setHasOrientationSupport] = useState<boolean>(false);
  const [permissionRequested, setPermissionRequested] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);

  const lastVibrateRef = useRef<number>(0);

  // Initialize prayer times / coords if not yet present
  useEffect(() => {
    if (!coordinates) {
      fetchPrayerTimes();
    }
  }, [coordinates, fetchPrayerTimes]);

  const handleOrientation = useCallback(
    (e: DeviceOrientationEvent) => {
      let heading: number | null = null;

      // iOS Safari provides webkitCompassHeading directly (0 = North)
      if ((e as any).webkitCompassHeading !== undefined) {
        heading = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null) {
        // Standard Android: alpha is compass bearing (with compass absolute)
        heading = (360 - e.alpha) % 360;
      }

      if (heading !== null) {
        setDeviceHeading(Math.round(heading));
        setHasOrientationSupport(true);

        // Check if aligned with Qibla (within ±4 degrees)
        if (qiblaAngle !== null) {
          const diff = Math.abs(((heading - qiblaAngle + 540) % 360) - 180);
          if (diff <= 4) {
            const now = Date.now();
            if (now - lastVibrateRef.current > 1500) {
              lastVibrateRef.current = now;
              if (navigator.vibrate) {
                navigator.vibrate(40);
              }
            }
          }
        }
      }
    },
    [qiblaAngle]
  );

  const requestOrientationPermission = async () => {
    setPermissionRequested(true);
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      try {
        const res = await (DeviceOrientationEvent as any).requestPermission();
        if (res === "granted") {
          setPermissionGranted(true);
          window.addEventListener("deviceorientation", handleOrientation, true);
        }
      } catch (err) {
        console.error("Orientation permission error:", err);
      }
    } else {
      setPermissionGranted(true);
      window.addEventListener("deviceorientation", handleOrientation, true);
    }
  };

  useEffect(() => {
    // Check if permissions API is required (iOS 13+)
    const needsPermission =
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function";

    if (!needsPermission) {
      setPermissionGranted(true);
      window.addEventListener("deviceorientation", handleOrientation, true);
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [handleOrientation]);

  // Compute needle angle
  // When deviceHeading is available: needleAngle = qiblaAngle - deviceHeading
  // When on desktop: needle points to absolute qiblaAngle from North (dial fixed)
  const targetQibla = qiblaAngle ?? 136;
  const needleAngle =
    deviceHeading !== null
      ? (targetQibla - deviceHeading + 360) % 360
      : targetQibla;

  const isFacingQibla =
    deviceHeading !== null &&
    Math.abs(((deviceHeading - targetQibla + 540) % 360) - 180) <= 5;

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-slate-900/60 p-5 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg md:text-xl font-bold text-amber-400 font-amiri flex items-center gap-2">
            <span>🧭</span>
            <span>بوصلة القبلة المشرفة</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            اتجاه الكعبة المشرفة من {locationName}
          </p>
        </div>

        {qiblaDistanceKm && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
            <span>🕋</span>
            <span>المسافة إلى مكة: {qiblaDistanceKm.toLocaleString("ar-EG")} كم</span>
          </div>
        )}
      </div>

      {/* Compass Dial Display */}
      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative w-64 h-64 md:w-72 md:h-72 rounded-full flex items-center justify-center">
          {/* Outer Ring with Glow */}
          <div
            className={`absolute inset-0 rounded-full border-4 transition-all duration-700 ${
              isFacingQibla
                ? "border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.35)] bg-emerald-500/5"
                : "border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)] bg-slate-900/80"
            }`}
          />

          {/* Compass Dial Degree Ticks & Cardinals */}
          <div className="absolute inset-2 rounded-full border border-white/10 flex items-center justify-center pointer-events-none">
            {/* Cardinal Directions */}
            <span className="absolute top-2 font-bold text-xs text-amber-400 font-amiri">شمال (N)</span>
            <span className="absolute bottom-2 font-bold text-xs text-slate-400 font-amiri">جنوب (S)</span>
            <span className="absolute right-2 font-bold text-xs text-slate-400 font-amiri">شرق (E)</span>
            <span className="absolute left-2 font-bold text-xs text-slate-400 font-amiri">غرب (W)</span>

            {/* Circular Degree Marks (subtle dots) */}
            <svg className="w-full h-full text-slate-700/60" viewBox="0 0 200 200">
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30 * Math.PI) / 180;
                const x1 = 100 + 88 * Math.sin(angle);
                const y1 = 100 - 88 * Math.cos(angle);
                const x2 = 100 + 94 * Math.sin(angle);
                const y2 = 100 - 94 * Math.cos(angle);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeWidth={i % 3 === 0 ? "2" : "1"}
                  />
                );
              })}
            </svg>
          </div>

          {/* Rotating Qibla Indicator Needle */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${needleAngle}deg)` }}
          >
            {/* Kaaba Direction Arrow */}
            <div className="relative flex flex-col items-center h-full justify-between py-4">
              {/* Pointer Tip towards Kaaba */}
              <div className="flex flex-col items-center">
                <div className="text-xl -mb-1 animate-bounce">🕋</div>
                <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[20px] border-b-amber-500 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              </div>

              {/* Counter-weight bottom pointer */}
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[14px] border-t-slate-600" />
            </div>
          </div>

          {/* Central Pivot with live degree indicator */}
          <div className="relative z-10 w-20 h-20 rounded-full bg-slate-950 border-2 border-amber-500/50 flex flex-col items-center justify-center shadow-lg">
            <span className="text-amber-400 font-bold text-sm tracking-wider" dir="ltr">
              {targetQibla}°
            </span>
            <span className="text-[9px] text-slate-400">زاوية القبلة</span>
          </div>
        </div>

        {/* Alignment Feedback Banner */}
        <div className="mt-6 text-center">
          {isFacingQibla ? (
            <div className="px-5 py-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-sm font-bold animate-float flex items-center justify-center gap-2">
              <span>✓</span>
              <span>أنت تواجه القبلة المشرفة الآن 🕋</span>
            </div>
          ) : deviceHeading !== null ? (
            <p className="text-xs text-slate-300">
              درجة توجيه هاتفك الحالية: <span className="text-amber-400 font-bold" dir="ltr">{deviceHeading}°</span>
              {" — "}
              قم بتدوير الهاتف حتى تتطابق مع زاوية القبلة ({targetQibla}°)
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">
                زاوية القبلة بالنسبة للشمال الحقيقي: <span className="text-amber-400 font-bold" dir="ltr">{targetQibla}°</span>
              </p>
              {!permissionGranted && (
                <button
                  onClick={requestOrientationPermission}
                  className="px-4 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs transition-all"
                >
                  تفعيل مستشعر البوصلة في الهاتف
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-500 mt-3 text-center max-w-sm">
          💡 للحصول على أعلى دقة، ضع الهاتف على سطح مستوٍ وأبعده عن الأجسام المغناطيسية أو المعدنية.
        </p>
      </div>
    </div>
  );
}
