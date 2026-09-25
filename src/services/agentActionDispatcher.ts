import { useAppStore } from "../store/useAppStore";
import { useSettingsStore, type AppTheme } from "../store/useSettingsStore";
import { SURAHS, padSurahId } from "../data/surahs";

// ══════════════════════════════════════════════════════════════════════════════
// ██  AGENT ACTION DISPATCHER — In-App Spiritual Assistant Controls         ██
// ══════════════════════════════════════════════════════════════════════════════

export interface AgentAction {
  action: "PLAY_SURAH" | "NAVIGATE" | "SET_THEME" | "OPEN_SURAH";
  surahId?: number;
  page?: number;
  tab?: string;
  theme?: string;
}

/**
 * Extracts action JSON blocks from model response text, executes them,
 * and returns clean text free of technical JSON markup for display.
 */
export function parseAndExecuteAgentActions(rawText: string): {
  cleanText: string;
  actionExecuted: boolean;
  executedActionName?: string;
} {
  let cleanText = rawText;
  let actionExecuted = false;
  let executedActionName: string | undefined;

  // Pattern 1: Explicit tag <<<ACTION:{...}>>>
  const actionTagRegex = /<<<ACTION:\s*(\{[\s\S]*?\})\s*>>>/gi;
  // Pattern 2: Markdown code block ```json { "action": ... } ```
  const codeBlockRegex = /```(?:json)?\s*(\{\s*"action"[\s\S]*?\})\s*```/gi;
  // Pattern 3: Raw embedded JSON with recognized action keyword
  const rawJsonRegex = /\{\s*"action"\s*:\s*"(?:PLAY_SURAH|NAVIGATE|SET_THEME|OPEN_SURAH)"[\s\S]*?\}/gi;

  const matches: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = actionTagRegex.exec(rawText)) !== null) {
    matches.push(match[1]);
  }
  cleanText = cleanText.replace(actionTagRegex, "").trim();

  while ((match = codeBlockRegex.exec(rawText)) !== null) {
    matches.push(match[1]);
  }
  cleanText = cleanText.replace(codeBlockRegex, "").trim();

  if (matches.length === 0) {
    while ((match = rawJsonRegex.exec(rawText)) !== null) {
      matches.push(match[0]);
    }
    cleanText = cleanText.replace(rawJsonRegex, "").trim();
  }

  for (const jsonStr of matches) {
    try {
      const parsed: AgentAction = JSON.parse(jsonStr);
      if (parsed && parsed.action) {
        executeAgentAction(parsed);
        actionExecuted = true;
        executedActionName = parsed.action;
      }
    } catch (e) {
      console.warn("[AgentActionDispatcher] Failed to parse action JSON:", jsonStr, e);
    }
  }

  return { cleanText, actionExecuted, executedActionName };
}

/**
 * Strips action markup on the fly during streaming so users never see raw JSON.
 */
export function stripActionTags(text: string): string {
  return text
    .replace(/<<<ACTION:[\s\S]*?>>>/gi, "")
    .replace(/<<<ACTION:[\s\S]*/gi, "") // Incomplete tag at end of stream
    .replace(/```(?:json)?\s*\{\s*"action"[\s\S]*?```/gi, "")
    .trim();
}

/**
 * Dispatches an individual action to Zustand stores, window events, or native bridge.
 */
export function executeAgentAction(action: AgentAction): void {
  try {
    switch (action.action) {
      case "PLAY_SURAH": {
        const surahId = Number(action.surahId);
        if (!surahId || isNaN(surahId) || surahId < 1 || surahId > 114) return;
        const surahInfo = SURAHS.find((s) => s.id === surahId);
        const surahName = surahInfo ? surahInfo.name : `السورة رقم ${surahId}`;
        const reciterName = "مشاري راشد العفاسي";
        const audioUrl = `https://server8.mp3quran.net/afs/${padSurahId(surahId)}.mp3`;
        const title = `سورة ${surahName}`;

        // Native Android Bridge execution
        try {
          const bridge = (window as any).AndroidBridge || (window as any).AndroidAudioBridge;
          if (bridge && typeof bridge.playAudio === "function") {
            bridge.playAudio(audioUrl, title, reciterName);
          } else if (bridge && typeof bridge.playNativeTrack === "function") {
            bridge.playNativeTrack(title, reciterName, audioUrl, false);
          }
        } catch (_) {}

        // Web State store execution
        useAppStore.getState().setQueue(
          [
            {
              reciterId: 128,
              reciterName,
              surahId,
              surahName,
              url: audioUrl,
            },
          ],
          0
        );
        break;
      }

      case "NAVIGATE": {
        const rawTab = (action.tab || "").toLowerCase().trim();
        let targetTab: "quran" | "azkar" | "mushaf" | "prayer" | "ramadan" | "settings" = "quran";

        if (rawTab.includes("mushaf") || rawTab.includes("مصحف")) {
          targetTab = "mushaf";
        } else if (rawTab.includes("azkar") || rawTab.includes("اذكار") || rawTab.includes("أذكار")) {
          targetTab = "azkar";
        } else if (rawTab.includes("prayer") || rawTab.includes("صلاة") || rawTab.includes("مواقيت")) {
          targetTab = "prayer";
        } else if (rawTab.includes("ramadan") || rawTab.includes("رمضان")) {
          targetTab = "ramadan";
        } else if (rawTab.includes("setting") || rawTab.includes("اعدادات") || rawTab.includes("إعدادات")) {
          targetTab = "settings";
        } else if (rawTab.includes("quran") || rawTab.includes("قران") || rawTab.includes("قرآن") || rawTab.includes("قراء")) {
          targetTab = "quran";
        }

        useAppStore.getState().setActiveTab(targetTab);
        window.dispatchEvent(new CustomEvent("rehab-navigate", { detail: targetTab }));
        break;
      }

      case "OPEN_SURAH": {
        const surahId = Number(action.surahId);
        if (!surahId || isNaN(surahId) || surahId < 1 || surahId > 114) return;
        const pageIndex = typeof action.page === "number" ? Math.max(0, action.page) : 0;

        useAppStore.getState().setMushafSurahId(surahId);
        useAppStore.getState().setMushafPageIndex(pageIndex);
        useAppStore.getState().setActiveTab("mushaf");
        window.dispatchEvent(new CustomEvent("rehab-navigate", { detail: "mushaf" }));
        break;
      }

      case "SET_THEME": {
        const rawTheme = (action.theme || "").toLowerCase().trim();
        let targetTheme: AppTheme = "dark";

        if (
          rawTheme.includes("light") ||
          rawTheme.includes("paper") ||
          rawTheme.includes("parchment") ||
          rawTheme.includes("فاتح") ||
          rawTheme.includes("ابيض") ||
          rawTheme.includes("أبيض")
        ) {
          targetTheme = "light";
        } else if (
          rawTheme.includes("night") ||
          rawTheme.includes("اسود") ||
          rawTheme.includes("أسود") ||
          rawTheme.includes("ليلي")
        ) {
          targetTheme = "night";
        } else {
          targetTheme = "dark";
        }

        useSettingsStore.getState().setTheme(targetTheme);
        break;
      }
    }
  } catch (err) {
    console.error("[AgentActionDispatcher] Execution error:", err);
  }
}
