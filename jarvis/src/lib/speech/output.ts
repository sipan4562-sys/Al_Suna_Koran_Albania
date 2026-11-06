import { getAudioContext, getSharedAudioElement } from "@/lib/audio/context";
import { audioLevels, readLevel } from "@/lib/audio/levels";
import { SentenceChunker } from "./sentences";
import { toSpeakable } from "./speakable";
import { loadVoices, pickVoice } from "./voices";

export interface SpeechSettings {
  engine: "browser" | "server";
  lang: string;
  voiceURI: string | null;
  rate: number;
  pitch: number;
  volume: number;
}

export interface SpeechOutputCallbacks {
  getSettings: () => SpeechSettings;
  onSpeakingChange: (speaking: boolean) => void;
  /** Eine Antwort wurde vollständig gesprochen (oder es gab nichts zu sprechen). */
  onFinished: () => void;
  onServerFailure?: (message: string) => void;
}

interface QueueItem {
  text: string;
  engine: "browser" | "server";
  audio?: Promise<string | null>;
}

const PREFETCH = 3;
const CODE_NOTICE = "Den Code habe ich dir im Chat angezeigt.";

export function browserSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

/**
 * Warteschlange für die Sprachausgabe. Gestreamter Text wird in Sätze
 * zerlegt; bei Server-TTS werden die nächsten Sätze bereits geladen,
 * während der aktuelle noch spielt – das sorgt für flüssiges Sprechen.
 */
export class SpeechOutput {
  private queue: QueueItem[] = [];
  private chunker = new SentenceChunker({ codeNotice: CODE_NOTICE });
  private generation = 0;
  private looping = false;
  private ended = true;
  private speaking = false;
  private voices: SpeechSynthesisVoice[] = [];
  private cancelCurrent: (() => void) | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserBuffer: Uint8Array<ArrayBuffer> | null = null;
  private meterFrame = 0;
  private serverFailures = 0;

  constructor(private readonly callbacks: SpeechOutputCallbacks) {
    if (browserSpeechSupported()) {
      void loadVoices().then((voices) => (this.voices = voices));
      window.speechSynthesis.addEventListener?.("voiceschanged", () => {
        this.voices = window.speechSynthesis.getVoices();
      });
    }
  }

  get isSpeaking() {
    return this.speaking;
  }

  /** Beginn einer neuen Antwort (bricht eine laufende Ausgabe ab). */
  begin() {
    this.stop();
    this.chunker.reset();
    this.ended = false;
  }

  push(delta: string) {
    if (this.ended) return;
    for (const sentence of this.chunker.push(delta)) this.enqueue(sentence);
  }

  end() {
    if (this.ended) return;
    for (const sentence of this.chunker.flush()) this.enqueue(sentence);
    this.ended = true;
    if (!this.looping && this.queue.length === 0) this.finish(this.generation);
  }

  /** Kompletten Text vorlesen (z. B. Button "Vorlesen"). */
  speak(text: string) {
    this.begin();
    this.push(text);
    this.end();
  }

  stop() {
    this.generation++;
    this.ended = true;
    for (const item of this.queue) void item.audio?.then((url) => url && URL.revokeObjectURL(url));
    this.queue = [];
    this.cancelCurrent?.();
    this.cancelCurrent = null;
    if (browserSpeechSupported()) window.speechSynthesis.cancel();
    this.setSpeaking(false);
  }

  private setSpeaking(value: boolean) {
    if (this.speaking === value) return;
    this.speaking = value;
    if (!value) {
      audioLevels.output = 0;
      audioLevels.outputIsReal = false;
    }
    this.callbacks.onSpeakingChange(value);
  }

  private finish(generation: number) {
    if (generation !== this.generation) return;
    this.setSpeaking(false);
    this.callbacks.onFinished();
  }

  private enqueue(sentence: string) {
    const text = toSpeakable(sentence);
    if (!text) return;
    const settings = this.callbacks.getSettings();
    const engine = settings.engine === "server" && this.serverFailures < 2 ? "server" : "browser";
    if (engine === "browser" && !browserSpeechSupported()) return;
    this.queue.push({ text, engine });
    this.prefetch();
    if (!this.looping) void this.loop();
  }

  private prefetch() {
    const generation = this.generation;
    for (const item of this.queue.slice(0, PREFETCH)) {
      if (item.engine === "server" && !item.audio) item.audio = this.fetchAudio(item.text, generation);
    }
  }

  private async fetchAudio(text: string, generation: number): Promise<string | null> {
    try {
      const response = await fetch("/api/speech/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error(`TTS ${response.status}`);
      const blob = await response.blob();
      if (generation !== this.generation) return null;
      this.serverFailures = 0;
      return URL.createObjectURL(blob);
    } catch (error) {
      this.serverFailures++;
      if (this.serverFailures === 2) {
        this.callbacks.onServerFailure?.("Neuronale Stimme nicht erreichbar – nutze die Browser-Stimme.");
      }
      console.warn("[jarvis] Server-Sprachausgabe fehlgeschlagen:", error);
      return null;
    }
  }

  private async loop() {
    this.looping = true;
    const generation = this.generation;
    try {
      while (this.queue.length > 0 && generation === this.generation) {
        const item = this.queue.shift()!;
        this.prefetch();
        if (item.engine === "server") {
          const url = await (item.audio ?? this.fetchAudio(item.text, generation));
          if (generation !== this.generation) {
            if (url) URL.revokeObjectURL(url);
            break;
          }
          if (url) {
            this.setSpeaking(true);
            await this.playUrl(url);
            URL.revokeObjectURL(url);
            continue;
          }
          if (!browserSpeechSupported()) continue;
        }
        this.setSpeaking(true);
        await this.speakBrowser(item.text);
      }
    } finally {
      this.looping = false;
    }
    if (generation === this.generation && this.ended && this.queue.length === 0) this.finish(generation);
  }

  private ensureAnalyser(element: HTMLAudioElement) {
    if (this.analyser) return;
    const ctx = getAudioContext();
    // Nur über den AudioContext leiten, wenn er läuft – sonst bliebe die Ausgabe stumm.
    // (createMediaElementSource ist endgültig für dieses Element.)
    if (!ctx || ctx.state !== "running") return;
    try {
      const source = ctx.createMediaElementSource(element);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      this.analyser = analyser;
      this.analyserBuffer = new Uint8Array(new ArrayBuffer(analyser.fftSize));
    } catch {
      // Bereits verbunden oder nicht unterstützt – dann ohne echte Pegel.
    }
  }

  private playUrl(url: string): Promise<void> {
    const element = getSharedAudioElement();
    if (!element) return Promise.resolve();
    this.ensureAnalyser(element);
    const settings = this.callbacks.getSettings();
    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        cancelAnimationFrame(this.meterFrame);
        audioLevels.output = 0;
        element.onended = null;
        element.onerror = null;
        this.cancelCurrent = null;
        resolve();
      };
      this.cancelCurrent = () => {
        element.pause();
        done();
      };
      element.onended = done;
      element.onerror = done;
      element.volume = settings.volume;
      element.playbackRate = Math.min(1.25, Math.max(0.8, settings.rate));
      element.src = url;
      const meter = () => {
        if (this.analyser && this.analyserBuffer) {
          audioLevels.output = readLevel(this.analyser, this.analyserBuffer);
          audioLevels.outputIsReal = true;
        }
        this.meterFrame = requestAnimationFrame(meter);
      };
      element
        .play()
        .then(() => meter())
        .catch(() => done());
    });
  }

  private speakBrowser(text: string): Promise<void> {
    const synth = window.speechSynthesis;
    const settings = this.callbacks.getSettings();
    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = settings.lang;
      const voice = pickVoice(this.voices.length ? this.voices : synth.getVoices(), settings.lang, settings.voiceURI);
      if (voice) utterance.voice = voice;
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;

      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        this.cancelCurrent = null;
        resolve();
      };
      // Manche Browser melden das Ende nie – Sicherheitsnetz anhand der Textlänge.
      const watchdog = setTimeout(done, 4_000 + (text.length * 95) / Math.max(0.5, settings.rate));
      utterance.onend = done;
      utterance.onerror = done;
      utterance.onboundary = () => {
        audioLevels.lastBoundary = performance.now();
      };
      this.cancelCurrent = () => {
        synth.cancel();
        done();
      };
      audioLevels.outputIsReal = false;
      if (synth.paused) synth.resume();
      synth.speak(utterance);
    });
  }
}
