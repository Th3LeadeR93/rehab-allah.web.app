/**
 * Unified Arabic Speech-to-Text (Voice Dictation) Service
 * Supports:
 * 1. Native Android SpeechRecognizer via AndroidBridge
 * 2. W3C Web Speech API (webkitSpeechRecognition / SpeechRecognition) for Browsers
 */

export interface SpeechCallbacks {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (errorMessage: string) => void;
  onStateChange: (isListening: boolean) => void;
}

// Global hook declarations
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
    __rehab_on_speech_result?: (text: string, isFinal: boolean) => void;
    __rehab_on_speech_state?: (isListening: boolean) => void;
    __rehab_on_speech_error?: (error: string) => void;
    __rehab_on_audio_permission_granted?: () => void;
  }
}

class SpeechService {
  private webRecognition: any = null;
  private currentCallbacks: SpeechCallbacks | null = null;
  private isListeningState = false;

  constructor() {
    this.initGlobalHooks();
  }

  private initGlobalHooks() {
    if (typeof window === "undefined") return;

    window.__rehab_on_speech_result = (text: string, isFinal: boolean) => {
      this.currentCallbacks?.onResult(text, isFinal);
    };

    window.__rehab_on_speech_state = (isListening: boolean) => {
      this.isListeningState = isListening;
      this.currentCallbacks?.onStateChange(isListening);
    };

    window.__rehab_on_speech_error = (error: string) => {
      this.isListeningState = false;
      this.currentCallbacks?.onError(error);
      this.currentCallbacks?.onStateChange(false);
    };

    window.__rehab_on_audio_permission_granted = () => {
      if (this.currentCallbacks) {
        this.start(this.currentCallbacks);
      }
    };
  }

  /**
   * Check if speech recognition is supported on the current runtime.
   */
  public isSupported(): boolean {
    if (typeof window === "undefined") return false;

    // Check Android native bridge first
    const bridge = (window as any).AndroidBridge || (window as any).AndroidAudioBridge;
    if (bridge && typeof bridge.startSpeechRecognition === "function") {
      if (typeof bridge.isSpeechRecognitionAvailable === "function") {
        return bridge.isSpeechRecognitionAvailable();
      }
      return true;
    }

    // Check Web Speech API
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Start Arabic speech recognition.
   */
  public start(callbacks: SpeechCallbacks): boolean {
    if (typeof window === "undefined") return false;
    this.currentCallbacks = callbacks;

    // 1. Android Native Bridge
    const bridge = (window as any).AndroidBridge || (window as any).AndroidAudioBridge;
    if (bridge && typeof bridge.startSpeechRecognition === "function") {
      try {
        bridge.startSpeechRecognition();
        return true;
      } catch (err) {
        console.error("Error starting Android speech recognition:", err);
      }
    }

    // 2. Browser Web Speech API
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      callbacks.onError("التعرف الصوتي غير مدعوم على هذا المتصفح");
      callbacks.onStateChange(false);
      return false;
    }

    try {
      if (this.webRecognition) {
        try {
          this.webRecognition.abort();
        } catch (_) {}
      }

      const recognition = new SpeechRecognitionClass();
      recognition.lang = "ar-SA";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        this.isListeningState = true;
        callbacks.onStateChange(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          callbacks.onResult(finalTranscript, true);
        } else if (interimTranscript) {
          callbacks.onResult(interimTranscript, false);
        }
      };

      recognition.onerror = (event: any) => {
        let arabicMessage = "حدث خطأ أثناء التعرف على الصوت";
        switch (event.error) {
          case "not-allowed":
            arabicMessage = "يرجى السماح بالوصول إلى الميكروفون لاستخدام الإدخال الصوتي";
            break;
          case "no-speech":
            arabicMessage = "لم يتم سماع أي صوت، يرجى المحاولة مجددًا";
            break;
          case "network":
            arabicMessage = "خطأ في الاتصال بالإنترنت أثناء معالجة الصوت";
            break;
          case "aborted":
            arabicMessage = "";
            break;
          default:
            arabicMessage = `خطأ في التعرف الصوتي: ${event.error}`;
        }

        this.isListeningState = false;
        if (arabicMessage) {
          callbacks.onError(arabicMessage);
        }
        callbacks.onStateChange(false);
      };

      recognition.onend = () => {
        this.isListeningState = false;
        callbacks.onStateChange(false);
      };

      this.webRecognition = recognition;
      recognition.start();
      return true;
    } catch (err: any) {
      console.error("Web speech recognition failed to start:", err);
      callbacks.onError("تعذر تشغيل الميكروفون، يرجى التحقق من الأذونات");
      callbacks.onStateChange(false);
      return false;
    }
  }

  /**
   * Stop speech recognition.
   */
  public stop() {
    this.isListeningState = false;

    // 1. Stop Native Android
    const bridge = (window as any).AndroidBridge || (window as any).AndroidAudioBridge;
    if (bridge && typeof bridge.stopSpeechRecognition === "function") {
      try {
        bridge.stopSpeechRecognition();
      } catch (_) {}
    }

    // 2. Stop Web Recognition
    if (this.webRecognition) {
      try {
        this.webRecognition.stop();
      } catch (_) {}
    }

    this.currentCallbacks?.onStateChange(false);
  }

  public isListening(): boolean {
    return this.isListeningState;
  }
}

export const speechService = new SpeechService();
