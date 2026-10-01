import { useState, useEffect } from "react";
import { useAppStore, type ActiveTab } from "../store/useAppStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { usePrayerStore } from "../store/usePrayerStore";

// Beautiful mosque / minaret glyph for the مواقيت الصلاة tab.
function MosqueIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      {/* Central dome + crescent */}
      <path d="M12 2c-.3 1-.9 1.5-.9 2.3 0 .6.4 1 .9 1.4.5-.4.9-.8.9-1.4 0-.8-.6-1.3-.9-2.3z" />
      <path d="M12 6.2c-2.2 0-4 1.8-4 4V12h8v-1.8c0-2.2-1.8-4-4-4z" />
      {/* Side minarets */}
      <path d="M4 9.5c-.55 0-1 .45-1 1V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-9.5c0-.55-.45-1-1-1H4zM19 9.5c-.55 0-1 .45-1 1V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-9.5c0-.55-.45-1-1-1h-1z" />
      {/* Prayer hall base with arched entrance */}
      <path d="M7.5 13a.5.5 0 0 0-.5.5V20a1 1 0 0 0 1 1h2v-3a2 2 0 1 1 4 0v3h2a1 1 0 0 0 1-1v-6.5a.5.5 0 0 0-.5-.5h-9z" />
    </svg>
  );
}

// Ramadan Crescent glyph for واحة رمضان tab.
function CrescentIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  );
}

function useRealTimeClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = new Intl.DateTimeFormat("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  const gregorianDate = new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    calendar: "gregory",
  }).format(now);

  const hijriDate = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);

  return { timeStr, gregorianDate, hijriDate };
}

const tabs: { key: ActiveTab; label: string; icon?: "mosque" | "settings" | "crescent" }[] = [
  { key: "quran", label: "القرآن الكريم" },
  { key: "azkar", label: "الأذكار" },
  { key: "mushaf", label: "المصحف الإلكتروني" },
  { key: "ramadan", label: "واحة رمضان", icon: "crescent" },
  { key: "prayer", label: "مواقيت الصلاة", icon: "mosque" },
  { key: "settings", label: "الإعدادات", icon: "settings" },
];

export default function Header() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const theme = useSettingsStore((s) => s.theme);
  const hijriDateFormatted = usePrayerStore((s) => s.hijriDateFormatted);
  const { timeStr, gregorianDate, hijriDate } = useRealTimeClock();

  // Dynamic text color for light theme
  const dateTextClass = theme === "light" ? "text-slate-600" : "text-slate-400";
  const hijriTextClass = theme === "light" ? "text-amber-700/80" : "text-amber-500/80";

  return (
    <header className="w-full pt-6 pb-4 md:pt-8 md:pb-6">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col items-center text-center space-y-4 md:space-y-5">
          {/* Logo with soft, luxurious subtle glow */}
          <div className="relative">
            <div className="absolute inset-0 blur-2xl opacity-15 bg-gradient-to-r from-amber-500/40 via-yellow-400/30 to-amber-600/40 rounded-full scale-110 pointer-events-none" />
            
            <div className="relative flex flex-col items-center">
              <div className="mb-1">
                <svg viewBox="0 0 200 60" className="w-48 md:w-64 h-auto">
                  <defs>
                    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="30%" stopColor="#fbbf24" />
                      <stop offset="50%" stopColor="#fcd34d" />
                      <stop offset="70%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <text
                    x="100"
                    y="45"
                    textAnchor="middle"
                    fill="url(#goldGradient)"
                    filter="url(#glow)"
                    className="font-amiri select-none"
                    style={{ fontSize: "42px", fontWeight: 700 }}
                  >
                    رحاب الله
                  </text>
                </svg>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 md:w-12 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                <span className="text-amber-500/40 text-lg">۞</span>
                <div className="w-8 md:w-12 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
              </div>
            </div>
          </div>

          {/* Quranic verse */}
          <div className="relative px-4 py-2 md:px-6 md:py-3">
            <div className="absolute inset-0 rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-900/5 via-amber-800/10 to-amber-900/5" />
            <div className="absolute inset-0 rounded-xl shadow-[inset_0_0_20px_rgba(245,158,11,0.1)]" />
            <p className="relative text-sm md:text-base lg:text-lg font-scheherazade text-amber-400/90 leading-relaxed tracking-wide">
              إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ
            </p>
          </div>

          {/* Clock & Date + Direct Android APK Download Button */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full">
            <div className="flex flex-col items-center space-y-1 py-2">
              <div className="text-2xl md:text-3xl font-mono text-amber-400 tracking-wider" dir="ltr">
                {timeStr}
              </div>
              <div className={`flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs md:text-sm ${dateTextClass}`}>
                <span>{gregorianDate}</span>
                <span className="text-amber-600/60 hidden sm:inline">|</span>
                <span className={hijriTextClass}>{hijriDateFormatted || hijriDate}</span>
              </div>
            </div>

            {/* Direct Android APK Download Button */}
            <a
              href="https://github.com/Th3LeadeR93/rehab-allah.web.app/releases/download/v1.5.7/rehab-allah-v1.5.7.apk"
              target="_blank"
              rel="noopener noreferrer"
              download="rehab-allah-v1.5.7.apk"
              className="group relative flex items-center gap-3 px-4 md:px-5 py-2.5 rounded-2xl bg-[#0d1420]/95 hover:bg-[#121c2e] border border-amber-500/30 hover:border-amber-400 shadow-lg shadow-black/40 hover:shadow-amber-500/10 transition-all duration-300 font-amiri text-right"
              aria-label="تحميل التطبيق المباشر (Android APK)"
            >
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.411 13.8564 8 12 8s-3.5902.411-5.1368.9497L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396"/>
                </svg>
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs md:text-sm font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
                  تحميل التطبيق المباشر (Android APK)
                </span>
                <span className="text-[10px] text-slate-400 font-sans mt-0.5">
                  الإصدار 1.5.7 • حجم 22.2 ميجابايت
                </span>
              </div>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-amber-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </a>
          </div>

          {/* Tabs */}
          <div className="w-full max-w-2xl">
            <div className="backdrop-blur-xl bg-slate-900/60 border border-white/10 rounded-2xl p-1.5 md:p-2 shadow-lg shadow-black/20">
              <div className="flex items-stretch gap-1 md:gap-1.5">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 px-1.5 md:px-3 py-2.5 md:py-3 rounded-xl text-[10px] md:text-sm font-medium transition-all duration-300 ${
                      activeTab === tab.key
                        ? "bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10"
                        : "text-slate-400 hover:text-amber-300 hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1">
                      {tab.icon === "crescent" && (
                        <CrescentIcon className="w-3.5 h-3.5 md:w-[17px] md:h-[17px]" />
                      )}
                      {tab.icon === "mosque" && (
                        <MosqueIcon className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]" />
                      )}
                      {tab.icon === "settings" && (
                        <svg className="w-3.5 h-3.5 md:w-[16px] md:h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                      {tab.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}