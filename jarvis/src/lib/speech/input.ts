import { getAudioContext } from "@/lib/audio/context";
import { audioLevels, meterStream, readLevel } from "@/lib/audio/levels";

/**
 * Spracheingabe mit zwei Motoren:
 *  - "browser": Web Speech API (Chrome, Edge, Safari) – schnell, mit Live-Text.
 *  - "server":  Aufnahme per MediaRecorder + Transkription über /api/speech/stt
 *               (funktioniert auch in Firefox, braucht OPENAI_API_KEY).
 */

export type RecognitionErrorCode =
  | "not-allowed"
  | "audio-capture"
  | "network"
  | "unsupported"
  | "language"
  | "server"
  | "unknown";

export interface RecognitionHandlers {
  onStart: () => void;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd: () => void;
  onError: (code: RecognitionErrorCode, message: string) => void;
}

export interface Recognizer {
  readonly kind: "browser" | "server";
  start(lang: string, handlers: RecognitionHandlers): Promise<void>;
  /** Aufnahme beenden und Ergebnis liefern. */
  stop(): void;
  /** Abbrechen ohne Ergebnis. */
  abort(): void;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function browserRecognitionSupported(): boolean {
  return recognitionCtor() !== null;
}

export function recordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

/** Desktop = feiner Zeiger, kein Mobilgerät. Dort darf parallel ein Pegelmesser laufen. */
function isDesktop(): boolean {
  return (
    window.matchMedia?.("(pointer: fine)").matches === true &&
    !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

const ERROR_MESSAGES: Record<RecognitionErrorCode, string> = {
  "not-allowed": "Mikrofonzugriff wurde verweigert. Bitte erlaube das Mikrofon in den Browser-Einstellungen.",
  "audio-capture": "Kein Mikrofon gefunden.",
  network: "Die Spracherkennung des Browsers ist nicht erreichbar (Netzwerk).",
  unsupported: "Spracheingabe wird von diesem Browser nicht unterstützt.",
  language: "Die gewählte Sprache wird von der Spracherkennung nicht unterstützt.",
  server: "Die Sprache konnte nicht transkribiert werden.",
  unknown: "Die Spracherkennung ist fehlgeschlagen.",
};

function mapBrowserError(error: string): RecognitionErrorCode | null {
  switch (error) {
    case "no-speech":
    case "aborted":
      return null; // kein echter Fehler
    case "not-allowed":
    case "service-not-allowed":
      return "not-allowed";
    case "audio-capture":
      return "audio-capture";
    case "network":
      return "network";
    case "language-not-supported":
      return "language";
    default:
      return "unknown";
  }
}

export class BrowserRecognizer implements Recognizer {
  readonly kind = "browser" as const;
  private recognition: SpeechRecognitionLike | null = null;
  private stopMeter: (() => void) | null = null;
  private meterStream: MediaStream | null = null;

  async start(lang: string, handlers: RecognitionHandlers): Promise<void> {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      handlers.onError("unsupported", ERROR_MESSAGES.unsupported);
      handlers.onEnd();
      return;
    }
    const recognition = new Ctor();
    this.recognition = recognition;
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalText = "";
    recognition.onstart = () => handlers.onStart();
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      handlers.onInterim(`${finalText} ${interim}`.trim());
    };
    recognition.onerror = (event) => {
      const code = mapBrowserError(event.error);
      if (code) handlers.onError(code, ERROR_MESSAGES[code]);
    };
    recognition.onend = () => {
      this.cleanupMeter();
      this.recognition = null;
      const text = finalText.trim();
      if (text) handlers.onFinal(text);
      handlers.onEnd();
    };

    try {
      recognition.start();
    } catch {
      handlers.onError("unknown", ERROR_MESSAGES.unknown);
      handlers.onEnd();
      return;
    }

    // Echter Mikrofonpegel für die Visualisierung (nur Desktop – auf Mobilgeräten
    // kollidiert ein zweiter Mikrofonzugriff häufig mit der Spracherkennung).
    if (isDesktop() && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!this.recognition) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const ctx = getAudioContext();
        this.meterStream = stream;
        if (ctx) this.stopMeter = meterStream(ctx, stream, (level) => (audioLevels.input = level));
      } catch {
        // Ohne Pegel weitermachen – die Erkennung läuft trotzdem.
      }
    }
  }

  stop() {
    this.recognition?.stop();
  }

  abort() {
    this.recognition?.abort();
    this.cleanupMeter();
  }

  private cleanupMeter() {
    this.stopMeter?.();
    this.stopMeter = null;
    this.meterStream?.getTracks().forEach((t) => t.stop());
    this.meterStream = null;
    audioLevels.input = 0;
  }
}

function pickMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((type) => MediaRecorder.isTypeSupported?.(type));
}

export class ServerRecognizer implements Recognizer {
  readonly kind = "server" as const;
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private frame = 0;
  private aborted = false;
  private source: MediaStreamAudioSourceNode | null = null;

  async start(lang: string, handlers: RecognitionHandlers): Promise<void> {
    this.aborted = false;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
    } catch (error) {
      const name = (error as DOMException | null)?.name;
      const code: RecognitionErrorCode = name === "NotFoundError" ? "audio-capture" : "not-allowed";
      handlers.onError(code, ERROR_MESSAGES[code]);
      handlers.onEnd();
      return;
    }
    this.stream = stream;

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 64_000 } : undefined);
    this.recorder = recorder;
    const chunks: Blob[] = [];
    let heardSpeech = false;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = async () => {
      this.cleanup();
      if (this.aborted || !heardSpeech || chunks.length === 0) {
        handlers.onEnd();
        return;
      }
      handlers.onInterim("Verarbeite Sprache …");
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
        const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
        const form = new FormData();
        form.append("audio", blob, `speech.${ext}`);
        form.append("language", lang);
        const response = await fetch("/api/speech/stt", { method: "POST", body: form });
        const data = (await response.json().catch(() => ({}))) as { text?: string; error?: { message?: string } };
        if (!response.ok) throw new Error(data.error?.message ?? ERROR_MESSAGES.server);
        if (data.text?.trim()) handlers.onFinal(data.text.trim());
      } catch (error) {
        handlers.onError("server", error instanceof Error ? error.message : ERROR_MESSAGES.server);
      }
      handlers.onEnd();
    };

    // Sprachaktivitätserkennung: endet nach ~1,3 s Stille, bricht ohne Sprache nach 7 s ab.
    const ctx = getAudioContext();
    if (ctx) {
      const source = ctx.createMediaStreamSource(stream);
      this.source = source;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const buffer = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      const startedAt = performance.now();
      let noise = 0;
      let samples = 0;
      let lastVoice = startedAt;
      const tick = () => {
        if (!this.recorder) return;
        const now = performance.now();
        const level = readLevel(analyser, buffer);
        audioLevels.input = level;
        if (now - startedAt < 300) {
          noise = (noise * samples + level) / (samples + 1);
          samples++;
        } else {
          const threshold = Math.max(0.08, noise * 2.4);
          if (level > threshold) {
            heardSpeech = true;
            lastVoice = now;
          }
          if (heardSpeech && now - lastVoice > 1_300) return this.stop();
          if (!heardSpeech && now - startedAt > 7_000) return this.abort();
          if (now - startedAt > 30_000) return this.stop();
        }
        this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
    } else {
      heardSpeech = true; // Ohne Analyse: manuell stoppen
    }

    recorder.start(250);
    handlers.onStart();
  }

  stop() {
    if (this.recorder?.state === "recording") this.recorder.stop();
  }

  abort() {
    this.aborted = true;
    if (this.recorder?.state === "recording") this.recorder.stop();
    else this.cleanup();
  }

  private cleanup() {
    cancelAnimationFrame(this.frame);
    this.source?.disconnect();
    this.source = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.recorder = null;
    audioLevels.input = 0;
  }
}
