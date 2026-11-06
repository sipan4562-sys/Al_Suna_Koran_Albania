import type { AssistantMode } from "@/lib/shared/types";

/**
 * Geräte-spezifische Einstellungen (im Browser gespeichert). Stimmen und
 * Mikrofone unterscheiden sich je Gerät – deshalb liegen sie nicht im
 * serverseitigen Profil.
 */
export interface Preferences {
  mode: AssistantMode;
  ttsEngine: "auto" | "browser" | "server";
  voiceURI: string | null;
  rate: number;
  pitch: number;
  volume: number;
  sttEngine: "auto" | "browser" | "server";
  /** Nach jeder gesprochenen Antwort automatisch wieder zuhören. */
  conversationMode: boolean;
  sounds: boolean;
  bootAnimation: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  mode: "voice",
  ttsEngine: "auto",
  voiceURI: null,
  rate: 1.02,
  pitch: 0.95,
  volume: 1,
  sttEngine: "auto",
  conversationMode: false,
  sounds: true,
  bootAnimation: true,
};

const KEY = "jarvis.preferences.v1";

const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

export function loadPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Partial<Preferences>;
    const d = DEFAULT_PREFERENCES;
    return {
      mode: raw.mode === "text" || raw.mode === "voice" ? raw.mode : d.mode,
      ttsEngine: ["auto", "browser", "server"].includes(raw.ttsEngine ?? "") ? raw.ttsEngine! : d.ttsEngine,
      voiceURI: typeof raw.voiceURI === "string" ? raw.voiceURI : null,
      rate: clamp(raw.rate, 0.6, 1.6, d.rate),
      pitch: clamp(raw.pitch, 0.5, 1.5, d.pitch),
      volume: clamp(raw.volume, 0, 1, d.volume),
      sttEngine: ["auto", "browser", "server"].includes(raw.sttEngine ?? "") ? raw.sttEngine! : d.sttEngine,
      conversationMode: typeof raw.conversationMode === "boolean" ? raw.conversationMode : d.conversationMode,
      sounds: typeof raw.sounds === "boolean" ? raw.sounds : d.sounds,
      bootAnimation: typeof raw.bootAnimation === "boolean" ? raw.bootAnimation : d.bootAnimation,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: Preferences): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Privater Modus / Speicher voll – Einstellungen gelten dann nur für diese Sitzung.
  }
}
