"use client";

import { unlockAudio } from "@/lib/audio/context";
import { audioLevels } from "@/lib/audio/levels";
import { playSfx, setSoundsEnabled } from "@/lib/audio/sfx";
import type {
  AssistantMode,
  ChatStreamEvent,
  ProfileSettings,
  ToolActivity,
} from "@/lib/shared/types";
import {
  BrowserRecognizer,
  browserRecognitionSupported,
  recordingSupported,
  ServerRecognizer,
  type Recognizer,
} from "@/lib/speech/input";
import { browserSpeechSupported, SpeechOutput, type SpeechSettings } from "@/lib/speech/output";
import { api, ApiError, redirectToLogin, toApiError } from "./api";
import { timezone } from "./format";
import { readNdjson } from "./ndjson";
import { loadPreferences } from "./preferences";
import { useJarvis, type UiMessage } from "./store";

const LAST_CONVERSATION_KEY = "jarvis.lastConversation";
const MAX_MESSAGE_CHARS = 12_000;

const store = () => useJarvis.getState();

function upsertTool(tools: ToolActivity[] | undefined, activity: ToolActivity): ToolActivity[] {
  const list = tools ?? [];
  const index = list.findIndex((t) => t.id === activity.id);
  if (index === -1) return [...list, activity];
  const next = [...list];
  next[index] = { ...next[index], ...activity };
  return next;
}

function rememberConversation(id: string | null) {
  try {
    if (id) localStorage.setItem(LAST_CONVERSATION_KEY, id);
    else localStorage.removeItem(LAST_CONVERSATION_KEY);
  } catch {
    // ignorieren
  }
}

/**
 * Steuerzentrale im Browser: verbindet Chat-Stream, Spracheingabe,
 * Sprachausgabe und Oberfläche. Eine Instanz pro Seite.
 */
class AssistantController {
  private chatAbort: AbortController | null = null;
  private recognizer: Recognizer | null = null;
  private output: SpeechOutput | null = null;
  private pendingText = "";
  private pendingId: string | null = null;
  private flushFrame = 0;
  private speakCurrent = false;
  private requestSeq = 0;
  private lastSource: "voice" | "text" = "text";
  private errorTimer: ReturnType<typeof setTimeout> | null = null;
  private profileTimer: ReturnType<typeof setTimeout> | null = null;
  private profilePatch: Partial<ProfileSettings> = {};
  private profileSaving: Promise<void> = Promise.resolve();
  private initialized = false;

  // ─── Initialisierung ───────────────────────────────────────────────────

  init() {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;
    const prefs = loadPreferences();
    setSoundsEnabled(prefs.sounds);
    useJarvis.setState({
      prefs,
      hydrated: true,
      sttAvailable: browserRecognitionSupported() || recordingSupported(),
    });
    this.output = new SpeechOutput({
      getSettings: () => this.speechSettings(),
      onSpeakingChange: (speaking) => store().set({ speaking }),
      onFinished: () => this.onSpeechFinished(),
      onServerFailure: (message) => store().toast(message, "warning"),
    });
  }

  async bootstrap() {
    this.init();
    await Promise.all([this.refreshStatus(), this.loadProfile(), this.refreshConversations()]);
    let lastId: string | null = null;
    try {
      lastId = localStorage.getItem(LAST_CONVERSATION_KEY);
    } catch {
      lastId = null;
    }
    if (lastId && store().conversations.some((c) => c.id === lastId)) {
      await this.openConversation(lastId, { switchView: false });
    }
  }

  async refreshStatus() {
    try {
      const status = await api.status();
      store().set({ status, statusError: false });
      const sttServer = Boolean(status.speech.serverStt) && recordingSupported();
      store().set({ sttAvailable: browserRecognitionSupported() || sttServer });
    } catch {
      store().set({ statusError: true });
    }
  }

  async loadProfile() {
    try {
      const profile = await api.profile();
      // Noch nicht gespeicherte lokale Änderungen haben Vorrang.
      store().set({ profile: { ...profile, ...this.profilePatch } });
    } catch {
      // Standardprofil verwenden
    }
  }

  async refreshConversations() {
    try {
      store().set({ conversations: await api.conversations() });
    } catch {
      // Liste bleibt unverändert
    }
  }

  // ─── Einstellungen ─────────────────────────────────────────────────────

  updateProfile(patch: Partial<ProfileSettings>) {
    store().set((state) => ({ profile: { ...state.profile, ...patch } }));
    this.profilePatch = { ...this.profilePatch, ...patch };
    if (this.profileTimer) clearTimeout(this.profileTimer);
    this.profileTimer = setTimeout(() => void this.flushProfile(), 600);
  }

  /** Speichert ausstehende Profiländerungen – nacheinander, nie parallel. */
  private flushProfile(): Promise<void> {
    this.profileSaving = this.profileSaving.then(async () => {
      const pending = this.profilePatch;
      if (Object.keys(pending).length === 0) return;
      this.profilePatch = {};
      try {
        const saved = await api.updateProfile(pending);
        // Während des Speicherns neu Eingetipptes nicht überschreiben.
        store().set({ profile: { ...saved, ...this.profilePatch } });
      } catch (error) {
        this.profilePatch = { ...pending, ...this.profilePatch };
        store().toast(error instanceof ApiError ? error.message : "Profil konnte nicht gespeichert werden.", "error");
      }
    });
    return this.profileSaving;
  }

  setMode(mode: AssistantMode) {
    store().setPrefs({ mode });
    if (mode === "text") this.output?.stop();
  }

  setSounds(enabled: boolean) {
    setSoundsEnabled(enabled);
    store().setPrefs({ sounds: enabled });
  }

  private speechSettings(): SpeechSettings {
    const { prefs, profile, status } = store();
    const serverTts = Boolean(status?.speech.serverTts);
    const engine = prefs.ttsEngine === "browser" ? "browser" : serverTts ? "server" : "browser";
    return {
      engine,
      lang: profile.language,
      voiceURI: prefs.voiceURI,
      rate: prefs.rate,
      pitch: prefs.pitch,
      volume: prefs.volume,
    };
  }

  canSpeak(): boolean {
    return browserSpeechSupported() || Boolean(store().status?.speech.serverTts);
  }

  // ─── Navigation ────────────────────────────────────────────────────────

  openChat() {
    if (store().view === "chat") return;
    store().set({ view: "chat", panel: null });
    window.history.pushState({ jarvisView: "chat" }, "", "#chat");
  }

  goHome() {
    if (store().view === "home") return;
    if ((window.history.state as { jarvisView?: string } | null)?.jarvisView === "chat") {
      window.history.back();
    } else {
      store().set({ view: "home" });
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }

  /** Browser-Zurück (auch die Zurück-Taste auf Android) wechselt die Ansicht. */
  syncViewFromLocation() {
    store().set({ view: window.location.hash === "#chat" ? "chat" : "home" });
  }

  // ─── Spracheingabe ─────────────────────────────────────────────────────

  private pickRecognizer(): Recognizer | null {
    const { prefs, status } = store();
    const serverOk = Boolean(status?.speech.serverStt) && recordingSupported();
    const browserOk = browserRecognitionSupported();
    if (prefs.sttEngine === "server" && serverOk) return new ServerRecognizer();
    if (prefs.sttEngine === "browser" && browserOk) return new BrowserRecognizer();
    if (browserOk) return new BrowserRecognizer();
    if (serverOk) return new ServerRecognizer();
    return null;
  }

  async toggleListening() {
    if (store().listening) this.stopListening();
    else await this.startListening();
  }

  async startListening() {
    this.init();
    unlockAudio();
    if (store().listening) return;
    // Unterbrechen ("Barge-in"): laufende Antwort und Sprachausgabe stoppen.
    this.output?.stop();
    this.abortChat();

    const recognizer = this.pickRecognizer();
    if (!recognizer) {
      store().toast(
        "Spracheingabe wird von diesem Browser nicht unterstützt. Nutze Chrome, Edge oder Safari – oder aktiviere die Server-Erkennung (OPENAI_API_KEY).",
        "warning",
      );
      return;
    }
    this.recognizer = recognizer;
    store().set({ listening: true, interim: "" });
    playSfx("listen");

    let delivered = false;
    await recognizer.start(store().profile.language, {
      onStart: () => undefined,
      onInterim: (text) => store().set({ interim: text }),
      onFinal: (text) => {
        delivered = true;
        void this.send(text, { source: "voice" });
      },
      onEnd: () => {
        if (this.recognizer === recognizer) this.recognizer = null;
        audioLevels.input = 0;
        store().set({ listening: false });
        if (!delivered) {
          store().set({ interim: "" });
          playSfx("stop");
        }
      },
      onError: (_code, message) => {
        store().toast(message, "error");
        this.flashError();
      },
    });
  }

  stopListening() {
    this.recognizer?.stop();
  }

  cancelListening() {
    if (!this.recognizer) return;
    this.recognizer.abort();
    this.recognizer = null;
    audioLevels.input = 0;
    store().set({ listening: false, interim: "" });
  }

  private onSpeechFinished() {
    const { prefs, listening, thinking } = store();
    if (prefs.conversationMode && this.lastSource === "voice" && !listening && !thinking) {
      setTimeout(() => {
        const s = store();
        if (!s.listening && !s.thinking && !s.speaking) void this.startListening();
      }, 450);
    }
  }

  // ─── Sprachausgabe ─────────────────────────────────────────────────────

  speakText(text: string) {
    this.init();
    unlockAudio();
    if (!this.canSpeak()) {
      store().toast("Sprachausgabe wird von diesem Browser nicht unterstützt.", "warning");
      return;
    }
    this.output?.speak(text);
  }

  stopSpeaking() {
    this.output?.stop();
  }

  /** Alles anhalten: Antwort-Stream, Sprachausgabe und Zuhören. */
  stopAll() {
    this.abortChat();
    this.output?.stop();
    this.cancelListening();
  }

  get isBusy() {
    const s = store();
    return s.thinking || s.speaking || s.listening;
  }

  // ─── Chat ──────────────────────────────────────────────────────────────

  private abortChat() {
    if (this.chatAbort) {
      this.chatAbort.abort();
      this.chatAbort = null;
    }
  }

  private queueText(id: string, delta: string) {
    if (this.pendingId && this.pendingId !== id) this.flushText();
    this.pendingId = id;
    this.pendingText += delta;
    if (!this.flushFrame) this.flushFrame = requestAnimationFrame(() => this.flushText());
  }

  /** Text-Deltas gebündelt pro Animationsframe übernehmen (flüssig, wenig Re-Renders). */
  private flushText() {
    if (this.flushFrame) {
      cancelAnimationFrame(this.flushFrame);
      this.flushFrame = 0;
    }
    const id = this.pendingId;
    const delta = this.pendingText;
    if (!id || !delta) return;
    this.pendingText = "";
    store().set((state) => ({
      streaming: true,
      lastAssistantText: state.lastAssistantText + delta,
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + delta, pending: false } : m,
      ),
    }));
  }

  async send(raw: string, { source }: { source: "voice" | "text" }) {
    const text = raw.trim();
    if (!text) return;
    if (text.length > MAX_MESSAGE_CHARS) {
      store().toast("Die Nachricht ist zu lang (max. 12.000 Zeichen).", "warning");
      return;
    }
    this.init();
    unlockAudio();
    if (source === "text") this.cancelListening();
    this.output?.stop();
    this.abortChat();
    this.flushText();

    const state = store();
    // Antwortstil: Spracheingabe oder Hauptbildschirm mit Sprachausgabe → kurz & gesprochen.
    // Getippte Chat-Nachrichten → ausführlich mit Markdown (wird bei aktiver Sprachausgabe trotzdem vorgelesen).
    const speechOn = state.prefs.mode === "voice";
    const mode: AssistantMode = source === "voice" || (state.view === "home" && speechOn) ? "voice" : "text";
    this.lastSource = source;
    const speak = speechOn && this.canSpeak();
    this.speakCurrent = speak;

    const stamp = Date.now();
    const userTempId = `local-user-${stamp}`;
    const assistantTempId = `local-assistant-${stamp}`;
    const now = new Date(stamp).toISOString();
    const conversationId = state.conversationId;

    state.set((s) => ({
      messages: [
        ...s.messages,
        { id: userTempId, conversationId: conversationId ?? "", role: "user", content: text, status: "complete", createdAt: now },
        {
          id: assistantTempId,
          conversationId: conversationId ?? "",
          role: "assistant",
          content: "",
          status: "partial",
          createdAt: now,
          pending: true,
          tools: [],
        } satisfies UiMessage,
      ],
      thinking: true,
      streaming: false,
      lastUserText: text,
      lastAssistantText: "",
      interim: source === "voice" ? text : "",
    }));
    playSfx("send");
    if (speak) this.output?.begin();

    const controller = new AbortController();
    this.chatAbort = controller;
    const seq = ++this.requestSeq;
    let assistantId = assistantTempId;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ conversationId, message: text, mode, timezone: timezone() }),
        signal: controller.signal,
      });
      if (response.status === 401) {
        redirectToLogin();
        return;
      }
      if (!response.ok || !response.body) throw await toApiError(response);

      for await (const event of readNdjson<ChatStreamEvent>(response.body)) {
        if (controller.signal.aborted) break;
        switch (event.type) {
          case "meta": {
            assistantId = event.assistantMessageId;
            this.pendingId = this.pendingId === assistantTempId ? assistantId : this.pendingId;
            store().set((s) => ({
              conversationId: event.conversationId,
              messages: s.messages.map((m) =>
                m.id === userTempId
                  ? { ...m, id: event.userMessageId, conversationId: event.conversationId }
                  : m.id === assistantTempId
                    ? { ...m, id: event.assistantMessageId, conversationId: event.conversationId }
                    : m,
              ),
            }));
            rememberConversation(event.conversationId);
            break;
          }
          case "text":
            this.queueText(assistantId, event.delta);
            if (this.speakCurrent) this.output?.push(event.delta);
            break;
          case "tool":
            this.flushText();
            store().updateMessage(assistantId, (m) => ({ ...m, tools: upsertTool(m.tools, event.activity) }));
            break;
          case "notice":
            store().toast(event.message, "info");
            break;
          case "done":
            this.flushText();
            store().updateMessage(assistantId, (m) => ({ ...m, pending: false, status: "complete" }));
            store().set({ conversationTitle: event.title, lastLatencyMs: event.latencyMs });
            break;
          case "error":
            this.flushText();
            store().updateMessage(assistantId, (m) => ({
              ...m,
              pending: false,
              status: m.content ? "partial" : "error",
              errorText: event.message,
            }));
            store().toast(event.message, "error");
            this.flashError();
            break;
        }
      }
    } catch (error) {
      this.flushText();
      if (controller.signal.aborted) {
        // Abgebrochen: leere Antwort entfernen, Teilantwort behalten.
        store().set((s) => ({
          messages: s.messages
            .filter((m) => !(m.id === assistantId && !m.content && !(m.tools?.length)))
            .map((m) => (m.id === assistantId ? { ...m, pending: false, status: "partial" } : m)),
        }));
      } else {
        const message = error instanceof ApiError ? error.message : "Keine Verbindung zum JARVIS-Server.";
        store().updateMessage(assistantId, (m) => ({
          ...m,
          pending: false,
          status: m.content ? "partial" : "error",
          errorText: message,
        }));
        store().toast(message, "error");
        this.flashError();
      }
    } finally {
      this.flushText();
      const aborted = controller.signal.aborted;
      if (this.chatAbort === controller) this.chatAbort = null;
      // Nur die jüngste Anfrage darf den Status zurücksetzen (eine neue kann schon laufen).
      const latest = seq === this.requestSeq;
      if (latest) store().set({ thinking: false, streaming: false });
      if (latest && this.speakCurrent && !aborted) this.output?.end();
      void this.refreshConversations();
      if (!aborted) void this.refreshStatus();
    }
  }

  /** Letzte Nutzernachricht erneut senden (z. B. nach einem Fehler). */
  retry(messageId: string) {
    const { messages } = store();
    const index = messages.findIndex((m) => m.id === messageId);
    const user = messages.slice(0, index).reverse().find((m) => m.role === "user");
    if (!user) return;
    store().set({ messages: messages.filter((m) => m.id !== messageId) });
    void this.send(user.content, { source: "text" });
  }

  // ─── Unterhaltungen ────────────────────────────────────────────────────

  newConversation() {
    this.stopAll();
    rememberConversation(null);
    store().set({
      conversationId: null,
      conversationTitle: "",
      messages: [],
      lastAssistantText: "",
      lastUserText: "",
      interim: "",
      panel: null,
    });
  }

  async openConversation(id: string, { switchView = true } = {}) {
    if (store().conversationId === id && store().messages.length > 0) {
      store().set({ panel: null });
      if (switchView) this.openChat();
      return;
    }
    this.stopAll();
    store().set({ loadingConversation: true, panel: null });
    try {
      const data = await api.conversation(id);
      const lastAssistant = [...data.messages].reverse().find((m) => m.role === "assistant");
      store().set({
        conversationId: id,
        conversationTitle: data.conversation.title,
        messages: data.messages,
        lastAssistantText: lastAssistant?.content ?? "",
        lastUserText: "",
      });
      rememberConversation(id);
      if (switchView) this.openChat();
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        rememberConversation(null);
        void this.refreshConversations();
      }
      if (switchView) store().toast("Die Unterhaltung konnte nicht geladen werden.", "error");
    } finally {
      store().set({ loadingConversation: false });
    }
  }

  async renameConversation(id: string, title: string) {
    const clean = title.trim().slice(0, 120);
    if (!clean) return;
    try {
      await api.renameConversation(id, clean);
      if (store().conversationId === id) store().set({ conversationTitle: clean });
      await this.refreshConversations();
    } catch {
      store().toast("Umbenennen fehlgeschlagen.", "error");
    }
  }

  async deleteConversation(id: string) {
    try {
      await api.deleteConversation(id);
      if (store().conversationId === id) this.newConversation();
      await this.refreshConversations();
      void this.refreshStatus();
    } catch {
      store().toast("Löschen fehlgeschlagen.", "error");
    }
  }

  async deleteAllConversations() {
    try {
      await api.deleteAllConversations();
      this.newConversation();
      await this.refreshConversations();
      void this.refreshStatus();
      store().toast("Alle Unterhaltungen wurden gelöscht.", "success");
    } catch {
      store().toast("Löschen fehlgeschlagen.", "error");
    }
  }

  flashError() {
    store().set({ errorFlash: true });
    playSfx("error");
    if (this.errorTimer) clearTimeout(this.errorTimer);
    this.errorTimer = setTimeout(() => store().set({ errorFlash: false }), 1600);
  }
}

export const jarvis = new AssistantController();
