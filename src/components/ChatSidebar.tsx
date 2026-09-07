import { useState, useRef, useEffect, useCallback } from "react";
import {
  Copy,
  Check,
  Sparkles,
  BookOpen,
  ShieldCheck,
  CircleDot,
  ListOrdered,
  type LucideIcon,
} from "lucide-react";
import { useChatStore } from "../store/useChatStore";

// ── SUGGESTED PROMPTS (quick chips shown on an empty conversation) ───────────
const SUGGESTED_PROMPTS = [
  "كيفية صلاة الاستخارة؟",
  "ما هو فضل صيام النوافل؟",
  "أذكار تحصين النفس والبيت",
];

// ══════════════════════════════════════════════════════════════════════════════
// ██  CHAT SIDEBAR — AI Islamic Assistant Drawer                            ██
// ══════════════════════════════════════════════════════════════════════════════

/** Skeleton loader for the AI "thinking" state */
function ThinkingSkeleton() {
  return (
    <div className="flex justify-start mb-4" dir="rtl">
      <div className="max-w-[85%] flex gap-2 items-end">
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
          <span className="text-xs">🌙</span>
        </div>
        {/* Skeleton bubble */}
        <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-br-sm px-4 py-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-amber-500/60 rounded-full chat-thinking-dot" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-amber-500/60 rounded-full chat-thinking-dot" style={{ animationDelay: "200ms" }} />
            <div className="w-2 h-2 bg-amber-500/60 rounded-full chat-thinking-dot" style={{ animationDelay: "400ms" }} />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-48 bg-slate-700/60 rounded-full chat-skeleton-shimmer" />
            <div className="h-3 w-36 bg-slate-700/60 rounded-full chat-skeleton-shimmer" style={{ animationDelay: "150ms" }} />
            <div className="h-3 w-24 bg-slate-700/60 rounded-full chat-skeleton-shimmer" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Inline markdown: **bold** segments rendered with an accent color. */
function formatInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-amber-300">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/**
 * Premium Arabic markdown renderer.
 * Parses bold titles, bulleted lists (-, *, •) and numbered lists (1. 2. …)
 * into nicely spaced, highly legible blocks. A live typing cursor is appended
 * to the very last rendered line while streaming.
 */
function MarkdownContent({
  text,
  isStreaming = false,
}: {
  text: string;
  isStreaming?: boolean;
}) {
  const lines = text.split("\n");

  // Pick a context-aware icon for an "###" subheading based on its text.
  const pickHeadingIcon = (raw: string): LucideIcon => {
    const t = raw.trim();
    // Sequence markers (أولاً / 1 …)
    if (/^(أولا|أولاً|اولا|اولاً|١|1)\b/.test(t) || /^1[.)\s:-]/.test(t)) {
      return CircleDot;
    }
    if (/^(ثانيا|ثانياً|ثانيا|ثانياً|٢|2)\b/.test(t) || /^2[.)\s:-]/.test(t)) {
      return ListOrdered;
    }
    // Religious / protective keywords
    if (/(تحصين|ذكر|أذكار|اذكار|دعاء|أدعية|ادعية|رقية|حماية|حصن)/.test(t)) {
      return ShieldCheck;
    }
    // General spiritual heading
    return BookOpen;
  };

  // Detect a line that opens a new sequential point (for extra spacing).
  const isSequenceStart = (t: string) =>
    /^(أولا|أولاً|اولا|اولاً|ثانيا|ثانياً|ثالثا|ثالثاً|رابعا|رابعاً|خامسا|خامساً)/.test(
      t.trim()
    );

  // Group consecutive list items so they render as a single tight list.
  type Block =
    | { type: "ul"; items: string[] }
    | { type: "ol"; items: string[] }
    | { type: "h3"; text: string; icon: LucideIcon }
    | { type: "p"; text: string }
    | { type: "blank" };

  const blocks: Block[] = [];
  for (const raw of lines) {
    const line = raw.trimEnd();
    // CLEANUP: hide the raw ### symbols and treat the rest as a subheading.
    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);

    if (heading) {
      const htext = heading[1].trim();
      blocks.push({ type: "h3", text: htext, icon: pickHeadingIcon(htext) });
    } else if (bullet) {
      const last = blocks[blocks.length - 1];
      if (last && last.type === "ul") last.items.push(bullet[1]);
      else blocks.push({ type: "ul", items: [bullet[1]] });
    } else if (numbered) {
      const last = blocks[blocks.length - 1];
      if (last && last.type === "ol") last.items.push(numbered[1]);
      else blocks.push({ type: "ol", items: [numbered[1]] });
    } else if (line.trim() === "") {
      blocks.push({ type: "blank" });
    } else {
      blocks.push({ type: "p", text: line });
    }
  }

  const lastIdx = blocks.length - 1;
  const cursor = (
    <span className="inline-block w-[3px] h-[1em] ml-0.5 align-text-bottom bg-amber-400/80 animate-pulse" />
  );

  return (
    <div className="space-y-3 leading-relaxed tracking-[0.01em]">
      {blocks.map((block, bi) => {
        const isLastBlock = bi === lastIdx;
        if (block.type === "blank") return null;

        // ── Context-aware subheading (### …) ──
        if (block.type === "h3") {
          const Icon = block.icon;
          return (
            <div
              key={bi}
              className="flex items-center gap-2.5 pt-4 pb-2 mt-1 border-b border-amber-500/20"
            >
              <Icon className="w-6 h-6 text-amber-500 shrink-0 drop-shadow-[0_0_6px_rgba(245,158,11,0.35)]" />
              <h3 className="chat-subheading flex-1 text-amber-300 font-bold text-xl">
                {formatInline(block.text)}
                {isStreaming && isLastBlock && cursor}
              </h3>
            </div>
          );
        }

        if (block.type === "ul") {
          return (
            <ul key={bi} className="space-y-2 pr-1">
              {block.items.map((item, ii) => (
                <li key={ii} className="flex gap-2.5 items-start">
                  <span className="mt-3 w-2 h-2 rounded-full bg-amber-400/70 shrink-0" />
                  <span className="flex-1">
                    {formatInline(item)}
                    {isStreaming &&
                      isLastBlock &&
                      ii === block.items.length - 1 &&
                      cursor}
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "ol") {
          return (
            <ol key={bi} className="space-y-2 pr-1">
              {block.items.map((item, ii) => (
                <li key={ii} className="flex gap-2.5 items-start">
                  <span className="mt-1 min-w-6 h-6 px-1.5 rounded-md bg-amber-500/15 border border-amber-500/25 text-amber-300 text-sm font-bold flex items-center justify-center shrink-0">
                    {ii + 1}
                  </span>
                  <span className="flex-1">
                    {formatInline(item)}
                    {isStreaming &&
                      isLastBlock &&
                      ii === block.items.length - 1 &&
                      cursor}
                  </span>
                </li>
              ))}
            </ol>
          );
        }

        // Paragraph — add extra top spacing if it opens a new sequential point.
        return (
          <p key={bi} className={isSequenceStart(block.text) ? "pt-3 mt-1" : ""}>
            {formatInline(block.text)}
            {isStreaming && isLastBlock && cursor}
          </p>
        );
      })}
    </div>
  );
}

/** Sleek copy-to-clipboard button shown on AI bubbles. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers / insecure contexts.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? "تم النسخ" : "نسخ"}
      className={`
        group/copy inline-flex items-center gap-1 rounded-lg px-2 py-1
        text-[10px] font-medium transition-all duration-200
        ${
          copied
            ? "bg-emerald-500/15 text-emerald-300"
            : "text-slate-500 hover:text-amber-300 hover:bg-amber-500/10"
        }
      `}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          <span>تم النسخ</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>نسخ</span>
        </>
      )}
    </button>
  );
}

/** Individual message bubble */
function MessageBubble({
  message,
  isStreaming = false,
}: {
  message: { role: "user" | "model"; text: string; timestamp: number };
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`} dir="rtl">
      <div className={`max-w-[85%] flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"} items-end`}>
        {/* Avatar */}
        {!isUser && (
          <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <span className="text-xs">🌙</span>
          </div>
        )}
        {isUser && (
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <span className="text-xs">👤</span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`
            rounded-2xl px-4 py-3 text-xl leading-relaxed
            ${
              isUser
                ? "bg-gradient-to-br from-emerald-600/30 to-emerald-700/20 border border-emerald-500/20 text-emerald-50 rounded-bl-sm"
                : "bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-br-sm"
            }
          `}
        >
          {/* Premium markdown-rendered content + live streaming cursor */}
          <MarkdownContent text={message.text} isStreaming={isStreaming} />
          {/* Footer: timestamp + copy action */}
          <div className="flex items-center justify-between gap-2 mt-2">
            <p
              className={`text-[10px] ${
                isUser ? "text-emerald-400/40" : "text-slate-600"
              }`}
            >
              {new Date(message.timestamp).toLocaleTimeString("ar-SA", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {/* Copy button only on AI responses with content (hidden while streaming) */}
            {!isUser && !isStreaming && message.text.trim() !== "" && (
              <CopyButton text={message.text} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN SIDEBAR COMPONENT ─────────────────────────────────────────────────
export default function ChatSidebar() {
  const isSidebarOpen = useChatStore((s) => s.isSidebarOpen);
  const closeSidebar = useChatStore((s) => s.closeSidebar);
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const error = useChatStore((s) => s.error);
  const sendUserMessage = useChatStore((s) => s.sendUserMessage);
  const clearChat = useChatStore((s) => s.clearChat);
  const dismissError = useChatStore((s) => s.dismissError);

  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isStreaming, scrollToBottom]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isSidebarOpen) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [isSidebarOpen]);

  // Shared sender used by the send button, Enter key, and suggestion chips.
  const submit = async (raw: string) => {
    const text = raw.trim();
    if (!text || isLoading) return;
    setInputText("");
    await sendUserMessage(text);
  };

  const handleSend = () => submit(inputText);

  // Chip click → populate the input visually, then send automatically.
  const handleChipClick = (prompt: string) => {
    setInputText(prompt);
    submit(prompt);
  };

  // Show suggestion chips only on a fresh conversation (greeting only).
  const showSuggestions =
    messages.length <= 1 && !isLoading && !isStreaming;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isSidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSidebar}
      />

      {/* Sidebar Drawer */}
      <div
        className={`
          chat-sidebar
          fixed top-0 right-0 bottom-0 z-[85]
          w-full sm:w-[420px] md:w-[460px]
          flex flex-col
          bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950
          border-l border-amber-500/10
          shadow-2xl shadow-black/60
          transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}
        `}
        dir="rtl"
      >
        {/* ── Header ── */}
        <div className="shrink-0 px-4 py-3.5 md:py-4 border-b border-amber-500/10 bg-slate-900/95 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Islamic icon */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center">
                <span className="text-lg">🕌</span>
              </div>
              <div>
                <h2 className="text-sm md:text-base font-bold text-amber-400 font-amiri">
                  المساعد الروحي
                </h2>
                <p className="text-[10px] md:text-xs text-slate-500">
                  مختص بالعلوم الشرعية الإسلامية
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Clear chat */}
              <button
                onClick={clearChat}
                className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                title="مسح المحادثة"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              {/* Close */}
              <button
                onClick={closeSidebar}
                className="p-2 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ── Messages Area ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 hide-scrollbar">
          {messages.map((msg, i) => (
            <MessageBubble
              key={`${msg.role}-${msg.timestamp}-${i}`}
              message={msg}
              isStreaming={
                isStreaming &&
                i === messages.length - 1 &&
                msg.role === "model"
              }
            />
          ))}

          {isLoading && <ThinkingSkeleton />}

          {/* Error display */}
          {error && (
            <div className="flex justify-center mb-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2 max-w-[90%]">
                <span className="text-red-400 text-xs">⚠️ {error}</span>
                <button
                  onClick={dismissError}
                  className="text-red-400/60 hover:text-red-400 text-xs shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Suggested prompt chips (empty conversation only) ── */}
        {showSuggestions && (
          <div className="shrink-0 px-4 pb-1 pt-2">
            <div className="flex items-center gap-1.5 mb-2 text-[10px] text-amber-500/60">
              <Sparkles className="w-3 h-3" />
              <span>أسئلة مقترحة</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleChipClick(prompt)}
                  className="
                    text-[11px] leading-tight text-amber-100/90
                    bg-gradient-to-br from-amber-500/10 to-amber-600/5
                    border border-amber-500/25 rounded-full
                    px-3 py-1.5
                    hover:from-amber-500/20 hover:to-amber-600/10
                    hover:border-amber-400/40 hover:text-amber-50
                    transition-all duration-200 active:scale-95
                  "
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input Area ── */}
        <div className="shrink-0 px-4 py-3 border-t border-amber-500/10 bg-slate-900/95 backdrop-blur-xl">
          <div className="flex items-end gap-2">
            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اسأل عن القرآن، الحديث، الفقه..."
                rows={1}
                disabled={isLoading}
                className="
                  w-full resize-none
                  bg-slate-800/60 border border-slate-700/50
                  rounded-xl px-4 py-3 pr-4
                  text-sm text-slate-200 placeholder-slate-600
                  focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  max-h-32
                "
                dir="rtl"
                style={{ minHeight: "44px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "44px";
                  target.style.height = Math.min(target.scrollHeight, 128) + "px";
                }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isLoading}
              className={`
                w-11 h-11 rounded-xl flex items-center justify-center shrink-0
                transition-all duration-300
                ${
                  inputText.trim() && !isLoading
                    ? "bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 active:scale-95"
                    : "bg-slate-800/60 text-slate-600 cursor-not-allowed"
                }
              `}
              title="إرسال"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 rotate-180"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
