"use client";

import { create } from "zustand";
import {
  DEFAULT_PROFILE,
  type ChatMessageDTO,
  type ConversationDTO,
  type ProfileSettings,
  type SystemStatus,
  type ToolActivity,
} from "@/lib/shared/types";
import { DEFAULT_PREFERENCES, savePreferences, type Preferences } from "./preferences";

export type Phase = "idle" | "listening" | "thinking" | "responding" | "speaking" | "error";
export type View = "home" | "chat";
export type Panel = null | "history" | "settings" | "system";

export interface UiMessage extends ChatMessageDTO {
  tools?: ToolActivity[];
  pending?: boolean;
  errorText?: string;
}

export interface Toast {
  id: number;
  kind: "info" | "warning" | "error" | "success";
  message: string;
}

export interface JarvisState {
  view: View;
  panel: Panel;
  booted: boolean;
  hydrated: boolean;
  status: SystemStatus | null;
  statusError: boolean;
  profile: ProfileSettings;
  prefs: Preferences;

  conversationId: string | null;
  conversationTitle: string;
  messages: UiMessage[];
  conversations: ConversationDTO[];
  loadingConversation: boolean;

  listening: boolean;
  thinking: boolean;
  streaming: boolean;
  speaking: boolean;
  errorFlash: boolean;
  interim: string;
  lastUserText: string;
  lastAssistantText: string;
  lastLatencyMs: number | null;
  sttAvailable: boolean;
  toasts: Toast[];
}

export interface JarvisActions {
  set: (partial: Partial<JarvisState> | ((state: JarvisState) => Partial<JarvisState>)) => void;
  setPrefs: (patch: Partial<Preferences>) => void;
  updateMessage: (id: string, updater: (message: UiMessage) => UiMessage) => void;
  toast: (message: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useJarvis = create<JarvisState & JarvisActions>()((set, get) => ({
  view: "home",
  panel: null,
  booted: false,
  hydrated: false,
  status: null,
  statusError: false,
  profile: DEFAULT_PROFILE,
  prefs: DEFAULT_PREFERENCES,

  conversationId: null,
  conversationTitle: "",
  messages: [],
  conversations: [],
  loadingConversation: false,

  listening: false,
  thinking: false,
  streaming: false,
  speaking: false,
  errorFlash: false,
  interim: "",
  lastUserText: "",
  lastAssistantText: "",
  lastLatencyMs: null,
  sttAvailable: true,
  toasts: [],

  set: (partial) => set(partial),
  setPrefs: (patch) => {
    const prefs = { ...get().prefs, ...patch };
    savePreferences(prefs);
    set({ prefs });
  },
  updateMessage: (id, updater) =>
    set((state) => ({ messages: state.messages.map((m) => (m.id === id ? updater(m) : m)) })),
  toast: (message, kind = "info") => {
    const id = ++toastId;
    set((state) => ({ toasts: [...state.toasts.slice(-3), { id, kind, message }] }));
    setTimeout(() => get().dismissToast(id), kind === "error" ? 6500 : 4200);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function selectPhase(state: JarvisState): Phase {
  if (state.errorFlash) return "error";
  if (state.listening) return "listening";
  if (state.speaking) return "speaking";
  if (state.streaming) return "responding";
  if (state.thinking) return "thinking";
  return "idle";
}

export const PHASE_LABELS: Record<Phase, { label: string; hint: string }> = {
  idle: { label: "Bereit", hint: "Tippe auf das Mikrofon oder schreibe eine Nachricht" },
  listening: { label: "Höre zu", hint: "Sprich jetzt – ich höre dir zu" },
  thinking: { label: "Denke nach", hint: "Analysiere deine Anfrage" },
  responding: { label: "Antworte", hint: "Antwort wird übertragen" },
  speaking: { label: "Spreche", hint: "Tippe auf Stopp, um mich zu unterbrechen" },
  error: { label: "Störung", hint: "Etwas ist schiefgelaufen" },
};
