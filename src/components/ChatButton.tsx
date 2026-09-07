import { useChatStore } from "../store/useChatStore";
import { useAppStore } from "../store/useAppStore";

// ══════════════════════════════════════════════════════════════════════════════
// ██  FLOATING CHAT BUTTON — Islamic AI Assistant Trigger                   ██
// ══════════════════════════════════════════════════════════════════════════════

export default function ChatButton() {
  const toggleSidebar = useChatStore((s) => s.toggleSidebar);
  const isSidebarOpen = useChatStore((s) => s.isSidebarOpen);
  const showMiniPlayer = useAppStore((s) => s.showMiniPlayer);
  const queue = useAppStore((s) => s.queue);

  const hasMiniPlayer = showMiniPlayer && queue.length > 0;

  return (
    <button
      onClick={toggleSidebar}
      aria-label="المساعد الروحي الإسلامي"
      className={`
        fixed z-50
        w-14 h-14 md:w-16 md:h-16
        rounded-full
        flex items-center justify-center
        shadow-2xl shadow-amber-500/30
        transition-all duration-500 ease-out
        hover:scale-110 active:scale-95
        group
        ${
          isSidebarOpen
            ? "bg-slate-800 border border-slate-600/50 rotate-0"
            : "bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 border border-amber-400/30 chat-fab-pulse"
        }
        ${hasMiniPlayer ? "bottom-44 md:bottom-48" : "bottom-6"}
        left-4 md:left-6
      `}
    >
      {/* Glow ring */}
      {!isSidebarOpen && (
        <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping opacity-30" />
      )}

      {isSidebarOpen ? (
        /* Close icon */
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6 md:w-7 md:h-7 text-slate-300 transition-transform duration-300 group-hover:rotate-90"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      ) : (
        /* Spiritual Islamic AI Star & Sparkles Icon */
        <div className="relative flex items-center justify-center text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-7 h-7 md:w-8 md:h-8 drop-shadow-md transition-transform duration-300 group-hover:scale-110"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            {/* Authentic 8-Pointed Islamic Star (Rub el Hizb inspired) */}
            <path
              d="M12,2 L14.5,7.5 L20,5 L17.5,10.5 L23,12 L17.5,13.5 L20,19 L14.5,16.5 L12,22 L9.5,16.5 L4,19 L6.5,13.5 L1,12 L6.5,10.5 L4,5 L9.5,7.5 Z"
              opacity="0.9"
            />
            {/* Center glowing core */}
            <circle cx="12" cy="12" r="3.2" className="text-amber-200 fill-current" />
            {/* Radiant Sparkle top-right */}
            <path
              d="M19,2 L19.7,3.8 L21.5,4.5 L19.7,5.2 L19,7 L18.3,5.2 L16.5,4.5 L18.3,3.8 Z"
              className="text-amber-100 fill-current"
            />
            {/* Radiant Sparkle bottom-left */}
            <path
              d="M5,17 L5.5,18.2 L6.8,18.8 L5.5,19.2 L5,20.5 L4.5,19.2 L3.2,18.8 L4.5,18.2 Z"
              className="text-amber-200 fill-current"
            />
          </svg>
          {/* Subtle live pulse indicator */}
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-slate-900" />
          </span>
        </div>
      )}
    </button>
  );
}
