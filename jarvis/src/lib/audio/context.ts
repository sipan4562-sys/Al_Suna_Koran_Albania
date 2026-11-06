/**
 * Ein gemeinsamer AudioContext für Pegelmessung, Soundeffekte und die
 * Wiedergabe der Server-Sprachausgabe. Mobile Browser (vor allem iOS)
 * erlauben Audio erst nach einer Nutzerinteraktion – `unlockAudio()` wird
 * deshalb bei jedem Tippen auf Mikrofon/Senden aufgerufen.
 */

let context: AudioContext | null = null;
let unlocked = false;

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
    if (!Ctor) return null;
    try {
      context = new Ctor({ latencyHint: "interactive" });
    } catch {
      return null;
    }
  }
  return context;
}

/** Kurze, stille WAV-Datei (für das Entsperren von <audio> auf iOS). */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

let sharedAudioElement: HTMLAudioElement | null = null;

export function getSharedAudioElement(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioElement) {
    sharedAudioElement = new Audio();
    sharedAudioElement.preload = "auto";
    sharedAudioElement.setAttribute("playsinline", "true");
  }
  return sharedAudioElement;
}

/** Muss synchron innerhalb eines Klick-/Tipp-Handlers aufgerufen werden. */
export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  if (unlocked) return;
  unlocked = true;

  const element = getSharedAudioElement();
  if (element) {
    element.src = SILENT_WAV;
    void element.play().catch(() => undefined);
  }
  // iOS: Die erste Sprachausgabe muss in einer Nutzergeste starten.
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      const utterance = new SpeechSynthesisUtterance(" ");
      utterance.volume = 0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignorieren
    }
  }
}
