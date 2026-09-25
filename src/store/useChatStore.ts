import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  sendMessage,
  resetChatSession,
  type ChatMessage,
} from "../services/geminiService";
import { parseAndExecuteAgentActions, stripActionTags } from "../services/agentActionDispatcher";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// ══════════════════════════════════════════════════════════════════════════════
// ██  CHAT STORE — AI Islamic Assistant State Management                    ██
// ══════════════════════════════════════════════════════════════════════════════

interface ChatState {
  // ── UI State ──
  isSidebarOpen: boolean;

  // ── Messages ──
  messages: ChatMessage[];

  // ── Loading / Error ──
  isLoading: boolean;   // true after send, until the FIRST stream chunk arrives
  isStreaming: boolean; // true while chunks are actively streaming into the UI
  error: string | null;

  // ── Actions ──
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  sendUserMessage: (text: string) => Promise<void>;
  clearChat: () => void;
  dismissError: () => void;
}

// ── GREETING MESSAGE ───────────────────────────────────────────────────────
const GREETING_MESSAGE: ChatMessage = {
  role: "model",
  text: "بسم الله الرحمن الرحيم\n\nالسلام عليكم ورحمة الله وبركاته 🌙\n\nأنا المساعد الروحي لمنصة **رحاب الله**، مختص حصريًا بالعلوم الشرعية الإسلامية.\n\nيمكنني مساعدتك في:\n- 📖 تفسير القرآن الكريم وعلومه\n- 📚 الحديث النبوي الشريف\n- ⚖️ الفقه الإسلامي وأحكام العبادات\n- 🕌 السيرة النبوية والتاريخ الإسلامي\n- 🤲 الأذكار والأدعية\n\nتفضل بسؤالك، وأسأل الله أن ينفعنا وإياك بالعلم النافع.",
  timestamp: Date.now(),
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      isSidebarOpen: false,
      messages: [GREETING_MESSAGE],
      isLoading: false,
      isStreaming: false,
      error: null,

      toggleSidebar: () =>
        set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),

      openSidebar: () => set({ isSidebarOpen: true }),

      closeSidebar: () => set({ isSidebarOpen: false }),

      dismissError: () => set({ error: null }),

      clearChat: () => {
        resetChatSession();
        set({
          messages: [
            { ...GREETING_MESSAGE, timestamp: Date.now() },
          ],
          error: null,
          isLoading: false,
          isStreaming: false,
        });
      },

      sendUserMessage: async (text: string) => {
        const state = get();

        if (!text.trim() || state.isLoading) return;

        const userMsg: ChatMessage = {
          role: "user",
          text: text.trim(),
          timestamp: Date.now(),
        };

        // Optimistically add user message, set loading
        set((s) => ({
          messages: [...s.messages, userMsg],
          isLoading: true,
          error: null,
        }));

        try {
          // Pass only user+model messages (exclude the greeting for history mapping)
          const historyForApi = get()
            .messages.filter((_, i) => i > 0) // skip greeting
            .slice(0, -1); // exclude the just-added user msg (it goes via sendMessage)

          // Tracks whether the assistant placeholder bubble has been created yet.
          // We only add it once the FIRST chunk arrives so the "thinking" skeleton
          // stays visible until there's actual text to show.
          let started = false;
          let accumulatedRawText = "";

          // Stream the response. `onChunk` fires for every incremental delta.
          const responseText = await sendMessage(
            text.trim(),
            historyForApi,
            (delta) => {
              accumulatedRawText += delta;
              const displayDelta = stripActionTags(accumulatedRawText);

              set((s) => {
                if (!started) {
                  // First chunk → create the assistant bubble, hide the skeleton,
                  // and flip into streaming mode.
                  started = true;
                  const assistantMsg: ChatMessage = {
                    role: "model",
                    text: displayDelta,
                    timestamp: Date.now(),
                  };
                  return {
                    messages: [...s.messages, assistantMsg],
                    isLoading: false,
                    isStreaming: true,
                  };
                }

                // Subsequent chunks → append the delta to the LAST message,
                // producing a fresh array reference so React re-renders live.
                const msgs = s.messages.slice();
                const last = msgs[msgs.length - 1];
                msgs[msgs.length - 1] = {
                  ...last,
                  text: displayDelta,
                };
                return { messages: msgs };
              });
            }
          );

          // ── IN-APP AGENTIC ACTION EXECUTION ────────────────────────────────
          // Parse model response for action commands, execute them, and strip tags
          const { cleanText } = parseAndExecuteAgentActions(responseText);

          // ── ANONYMOUS SERVER-SIDE LOGGING ──────────────────────────────────
          try {
            await addDoc(collection(db, "anonymous_logs"), {
              question: text.trim(),
              answer: cleanText,
              timestamp: serverTimestamp(),
            });
          } catch {
            /* silent: logging failures must not affect the user */
          }

          // Finalize state: ensure the cleaned response text is set
          set((s) => {
            const msgs = s.messages.slice();
            if (!started) {
              const assistantMsg: ChatMessage = {
                role: "model",
                text: cleanText,
                timestamp: Date.now(),
              };
              return {
                messages: [...s.messages, assistantMsg],
                isLoading: false,
                isStreaming: false,
              };
            }
            const last = msgs[msgs.length - 1];
            msgs[msgs.length - 1] = {
              ...last,
              text: cleanText,
            };
            return {
              messages: msgs,
              isLoading: false,
              isStreaming: false,
            };
          });
        } catch (err) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "حدث خطأ غير متوقع. يرجى المحاولة لاحقًا.";

          set({
            isLoading: false,
            isStreaming: false,
            error: errorMessage,
          });
        }
      },
    }),
    {
      name: "rehab-allah-chat",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        messages: state.messages,
      }),
      // On rehydrate, reset the chat session to stay in sync
      onRehydrateStorage: () => () => {
        resetChatSession();
      },
    }
  )
);

// ── GLOBAL BRIDGES & EVENT LISTENERS FOR ANDROID / EXTERNAL CONTROLS ────────
if (typeof window !== "undefined") {
  (window as any).__rehab_chat_store = useChatStore;
  (window as any).toggleSpiritualAssistant = () => useChatStore.getState().toggleSidebar();
  (window as any).openSpiritualAssistant = () => useChatStore.getState().openSidebar();
  (window as any).closeSpiritualAssistant = () => useChatStore.getState().closeSidebar();

  window.addEventListener("open-spiritual-assistant", () => {
    useChatStore.getState().openSidebar();
  });

  window.addEventListener("close-spiritual-assistant", () => {
    useChatStore.getState().closeSidebar();
  });

  window.addEventListener("rehab-toggle-assistant", () => {
    useChatStore.getState().toggleSidebar();
  });

  // Sync state changes with Android native container
  useChatStore.subscribe((state) => {
    try {
      const bridge = (window as any).AndroidBridge || (window as any).AndroidAudioBridge;
      if (bridge && typeof bridge.onSpiritualAssistantStateChanged === "function") {
        bridge.onSpiritualAssistantStateChanged(state.isSidebarOpen);
      }
    } catch (_) {}
  });
}

