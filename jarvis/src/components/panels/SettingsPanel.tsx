"use client";

import { Brain, LogOut, Plus, Trash2, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Field, inputClass, Section, Slider, Switch } from "@/components/ui/Controls";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { jarvis } from "@/lib/client/controller";
import { relativeTime } from "@/lib/client/format";
import { useJarvis } from "@/lib/client/store";
import { browserRecognitionSupported } from "@/lib/speech/input";
import { browserSpeechSupported } from "@/lib/speech/output";
import { loadVoices, voiceScore } from "@/lib/speech/voices";
import { LANGUAGES, type AssistantLanguage, type MemoryDTO, type Personality } from "@/lib/shared/types";
import { Drawer } from "./Drawer";

const LANGUAGE_LABELS: Record<AssistantLanguage, string> = {
  "de-DE": "Deutsch",
  "en-US": "English (US)",
  "en-GB": "English (UK)",
  "fr-FR": "Français",
  "es-ES": "Español",
  "it-IT": "Italiano",
  "tr-TR": "Türkçe",
};

const PERSONALITY_OPTIONS: Array<{ id: Personality; title: string; text: string }> = [
  { id: "classic", title: "Klassisch", text: "Kultiviert, souverän, trockener britischer Humor" },
  { id: "friendly", title: "Freundlich", text: "Warm, locker und ermutigend" },
  { id: "concise", title: "Präzise", text: "Sachlich, knapp, ohne Smalltalk" },
  { id: "witty", title: "Humorvoll", text: "Schlagfertig mit cleveren Pointen" },
];

const TEST_SENTENCE: Record<string, string> = {
  de: "Guten Tag. Alle Systeme sind online. Wie kann ich Ihnen helfen?",
  en: "Good day. All systems are online. How may I assist you?",
  fr: "Bonjour. Tous les systèmes sont opérationnels.",
  es: "Buenos días. Todos los sistemas están en línea.",
  it: "Buongiorno. Tutti i sistemi sono operativi.",
  tr: "İyi günler. Tüm sistemler çevrimiçi.",
};

function MemorySection() {
  const [memories, setMemories] = useState<MemoryDTO[] | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmAll, setConfirmAll] = useState(false);
  const toast = useJarvis((s) => s.toast);

  const load = useCallback(
    () =>
      api.memories().then(
        (list) => setMemories(list),
        () => setMemories([]),
      ),
    [],
  );

  // Wird bei jedem Öffnen des Panels neu gemountet → frische Liste.
  useEffect(() => {
    let active = true;
    api.memories().then(
      (list) => active && setMemories(list),
      () => active && setMemories([]),
    );
    return () => {
      active = false;
    };
  }, []);

  const add = async () => {
    const content = draft.trim();
    if (content.length < 2) return;
    try {
      await api.addMemory(content);
      setDraft("");
      await load();
      void jarvis.refreshStatus();
    } catch {
      toast("Konnte nicht gespeichert werden.", "error");
    }
  };

  return (
    <Section
      title="Gedächtnis"
      description="Fakten, die sich JARVIS über dich gemerkt hat. Sag z. B. „Merke dir, dass …“ oder füge sie hier hinzu."
    >
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void add()}
          maxLength={500}
          placeholder="Neuer Fakt, z. B. „Ich wohne in Hamburg“"
          aria-label="Neuen Fakt hinzufügen"
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={draft.trim().length < 2}
          aria-label="Fakt hinzufügen"
          className="glass inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-arc disabled:opacity-40"
        >
          <Plus className="size-5" />
        </button>
      </div>
      {memories === null ? (
        <div className="h-16 animate-pulse rounded-xl bg-arc/[0.04]" />
      ) : memories.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-ink-faint">
          <Brain className="size-4" /> Noch keine Erinnerungen gespeichert.
        </p>
      ) : (
        <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {memories.map((memory) => (
            <li key={memory.id} className="group flex items-start gap-2 rounded-lg border border-line/60 bg-void/30 px-3 py-2">
              <span className="min-w-0 flex-1 text-sm text-ink">
                {memory.content}
                <span className="mt-0.5 block text-[11px] text-ink-faint">{relativeTime(memory.createdAt)}</span>
              </span>
              <button
                type="button"
                aria-label="Erinnerung löschen"
                onClick={async () => {
                  await api.deleteMemory(memory.id).catch(() => undefined);
                  await load();
                  void jarvis.refreshStatus();
                }}
                className="rounded-md p-1 text-ink-faint hover:bg-alert/10 hover:text-alert"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {memories && memories.length > 0 && (
        <div>
          {confirmAll ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-ink-muted">Alles vergessen?</span>
              <button
                type="button"
                onClick={async () => {
                  await api.deleteAllMemories().catch(() => undefined);
                  setConfirmAll(false);
                  await load();
                  void jarvis.refreshStatus();
                }}
                className="rounded-lg bg-alert/15 px-3 py-1 text-alert hover:bg-alert/25"
              >
                Ja, löschen
              </button>
              <button type="button" onClick={() => setConfirmAll(false)} className="px-2 py-1 text-ink-faint">
                Abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmAll(true)}
              className="inline-flex items-center gap-2 text-sm text-ink-faint hover:text-alert"
            >
              <Trash2 className="size-4" /> Gesamtes Gedächtnis löschen
            </button>
          )}
        </div>
      )}
    </Section>
  );
}

export function SettingsPanel() {
  const open = useJarvis((s) => s.panel === "settings");
  const set = useJarvis((s) => s.set);
  return (
    <Drawer open={open} side="right" title="Einstellungen" onClose={() => set({ panel: null })} className="sm:max-w-md">
      <SettingsContent />
    </Drawer>
  );
}

/** Inhalt wird nur bei geöffnetem Panel gemountet – lokaler Zustand startet jedes Mal frisch. */
function SettingsContent() {
  const profile = useJarvis((s) => s.profile);
  const prefs = useJarvis((s) => s.prefs);
  const setPrefs = useJarvis((s) => s.setPrefs);
  const status = useJarvis((s) => s.status);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [confirmHistory, setConfirmHistory] = useState(false);

  useEffect(() => {
    let active = true;
    void loadVoices().then((list) => active && setVoices(list));
    return () => {
      active = false;
    };
  }, []);

  const languageVoices = useMemo(
    () =>
      voices
        .filter((voice) => voiceScore(voice, profile.language) >= 0)
        .sort((a, b) => voiceScore(b, profile.language) - voiceScore(a, profile.language)),
    [voices, profile.language],
  );

  const serverTts = status?.speech.serverTts ?? null;
  const serverStt = status?.speech.serverStt ?? null;
  const browserTts = typeof window !== "undefined" && browserSpeechSupported();
  const browserStt = typeof window !== "undefined" && browserRecognitionSupported();
  const usingServerVoice = prefs.ttsEngine !== "browser" && Boolean(serverTts);

  return (
    <>
      <Section title="Profil" description="Wird auf dem Server gespeichert und hilft JARVIS, dich persönlich anzusprechen.">
        <Field label="Dein Name" htmlFor="profile-name">
          <input
            id="profile-name"
            data-autofocus
            value={profile.userName}
            maxLength={60}
            onChange={(event) => jarvis.updateProfile({ userName: event.target.value })}
            placeholder="z. B. Tony"
            className={inputClass}
          />
        </Field>
        <Field label="Anrede" htmlFor="profile-address" hint="Wie soll JARVIS dich gelegentlich ansprechen?">
          <input
            id="profile-address"
            value={profile.formOfAddress}
            maxLength={40}
            onChange={(event) => jarvis.updateProfile({ formOfAddress: event.target.value })}
            placeholder="z. B. Sir, Chef oder dein Vorname"
            className={inputClass}
          />
        </Field>
        <Field label="Heimatort" htmlFor="profile-city" hint="Standardort für Wetterfragen.">
          <input
            id="profile-city"
            value={profile.homeCity}
            maxLength={80}
            onChange={(event) => jarvis.updateProfile({ homeCity: event.target.value })}
            placeholder="z. B. Berlin"
            className={inputClass}
          />
        </Field>
        <Field label="Sprache" htmlFor="profile-language" hint="Sprache für Antworten, Spracherkennung und Stimme.">
          <select
            id="profile-language"
            value={profile.language}
            onChange={(event) => {
              jarvis.updateProfile({ language: event.target.value as AssistantLanguage });
              setPrefs({ voiceURI: null });
            }}
            className={inputClass}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGE_LABELS[lang]}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Persönlichkeit">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Persönlichkeit">
          {PERSONALITY_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={profile.personality === option.id}
              onClick={() => jarvis.updateProfile({ personality: option.id })}
              className={cn(
                "rounded-xl border p-3 text-left transition-all",
                profile.personality === option.id
                  ? "border-arc/70 bg-arc/10 shadow-[0_0_18px_rgba(95,243,255,0.18)]"
                  : "border-line bg-void/30 hover:border-line-strong",
              )}
            >
              <span className="hud-label block text-[11px] text-arc-soft">{option.title}</span>
              <span className="mt-1 block text-xs leading-snug text-ink-muted">{option.text}</span>
            </button>
          ))}
        </div>
        <Field label="Eigene Anweisungen" htmlFor="profile-instructions" hint="Z. B. „Antworte immer mit Beispielen“ oder „Ich bin Student der Informatik“.">
          <textarea
            id="profile-instructions"
            rows={3}
            maxLength={1500}
            value={profile.customInstructions}
            onChange={(event) => jarvis.updateProfile({ customInstructions: event.target.value })}
            className={cn(inputClass, "resize-y")}
          />
        </Field>
      </Section>

      <Section title="Sprachausgabe">
        <Switch
          label="Antworten vorlesen"
          description="Bei Spracheingabe und auf dem Hauptbildschirm antwortet JARVIS kurz und gesprochen, im Chat ausführlich mit Formatierung."
          checked={prefs.mode === "voice"}
          onChange={(value) => jarvis.setMode(value ? "voice" : "text")}
        />
        <Field label="Stimme" htmlFor="tts-engine">
          <select
            id="tts-engine"
            value={prefs.ttsEngine}
            onChange={(event) => setPrefs({ ttsEngine: event.target.value as typeof prefs.ttsEngine })}
            className={inputClass}
          >
            <option value="auto">Automatisch (beste verfügbare)</option>
            <option value="server" disabled={!serverTts}>
              Neuronale Server-Stimme {serverTts ? `(${serverTts === "openai" ? "OpenAI" : "ElevenLabs"})` : "– nicht konfiguriert"}
            </option>
            <option value="browser" disabled={!browserTts}>
              Browser-Stimme
            </option>
          </select>
        </Field>
        {!usingServerVoice && (
          <Field label="Browser-Stimme" htmlFor="tts-voice" hint={languageVoices.length === 0 ? "Keine passende Stimme gefunden." : undefined}>
            <select
              id="tts-voice"
              value={prefs.voiceURI ?? ""}
              onChange={(event) => setPrefs({ voiceURI: event.target.value || null })}
              className={inputClass}
            >
              <option value="">Automatisch (natürlichste Stimme)</option>
              {languageVoices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} {voice.localService ? "" : "· Online"}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Sprechtempo" htmlFor="tts-rate">
          <Slider id="tts-rate" value={prefs.rate} min={0.7} max={1.4} step={0.05} onChange={(rate) => setPrefs({ rate })} format={(v) => `${v.toFixed(2)}×`} />
        </Field>
        {!usingServerVoice && (
          <Field label="Tonhöhe" htmlFor="tts-pitch">
            <Slider id="tts-pitch" value={prefs.pitch} min={0.6} max={1.4} step={0.05} onChange={(pitch) => setPrefs({ pitch })} format={(v) => v.toFixed(2)} />
          </Field>
        )}
        <button
          type="button"
          onClick={() => jarvis.speakText(TEST_SENTENCE[profile.language.slice(0, 2)] ?? TEST_SENTENCE.de)}
          className="glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-arc-soft hover:border-line-strong"
        >
          <Volume2 className="size-4" /> Stimme testen
        </button>
      </Section>

      <Section title="Spracheingabe">
        <Field
          label="Erkennung"
          htmlFor="stt-engine"
          hint={!browserStt && !serverStt ? "Dieser Browser unterstützt keine Spracherkennung. Nutze Chrome, Edge oder Safari – oder konfiguriere OPENAI_API_KEY." : undefined}
        >
          <select
            id="stt-engine"
            value={prefs.sttEngine}
            onChange={(event) => setPrefs({ sttEngine: event.target.value as typeof prefs.sttEngine })}
            className={inputClass}
          >
            <option value="auto">Automatisch</option>
            <option value="browser" disabled={!browserStt}>
              Browser (schnell, mit Live-Text)
            </option>
            <option value="server" disabled={!serverStt}>
              Server (OpenAI) {serverStt ? "" : "– nicht konfiguriert"}
            </option>
          </select>
        </Field>
        <Switch
          label="Konversationsmodus"
          description="Nach jeder gesprochenen Antwort hört JARVIS automatisch wieder zu – für ein freihändiges Gespräch."
          checked={prefs.conversationMode}
          onChange={(conversationMode) => setPrefs({ conversationMode })}
        />
      </Section>

      <Section title="Oberfläche">
        <Switch label="Soundeffekte" checked={prefs.sounds} onChange={(value) => jarvis.setSounds(value)} />
        <Switch
          label="Startanimation"
          description="Kurze Boot-Sequenz beim Öffnen (einmal pro Sitzung)."
          checked={prefs.bootAnimation}
          onChange={(bootAnimation) => setPrefs({ bootAnimation })}
        />
      </Section>

      <MemorySection />

      <Section title="Daten & Sicherheit">
        {confirmHistory ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ink-muted">Gesamten Chatverlauf löschen?</span>
            <button
              type="button"
              onClick={() => {
                void jarvis.deleteAllConversations();
                setConfirmHistory(false);
              }}
              className="rounded-lg bg-alert/15 px-3 py-1 text-alert hover:bg-alert/25"
            >
              Ja, löschen
            </button>
            <button type="button" onClick={() => setConfirmHistory(false)} className="px-2 py-1 text-ink-faint">
              Abbrechen
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmHistory(true)}
            className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-alert"
          >
            <Trash2 className="size-4" /> Chatverlauf löschen
          </button>
        )}
        {status?.auth.enabled && (
          <button
            type="button"
            onClick={async () => {
              await api.logout().catch(() => undefined);
              window.location.assign(new URL("/login", window.location.origin));
            }}
            className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-arc-soft"
          >
            <LogOut className="size-4" /> Abmelden
          </button>
        )}
      </Section>

      <Section title="System">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-ink-faint">KI-Anbieter</dt>
          <dd className="truncate text-right text-ink">{status?.ai.providerLabel ?? "–"}</dd>
          <dt className="text-ink-faint">Modell</dt>
          <dd className="truncate text-right font-mono text-xs text-ink">{status?.ai.model ?? "–"}</dd>
          <dt className="text-ink-faint">Fallback</dt>
          <dd className="truncate text-right text-ink">{status?.ai.fallback ?? "keiner"}</dd>
          <dt className="text-ink-faint">Speicher</dt>
          <dd className="truncate text-right text-ink">
            {status ? (status.storage.persistent ? "Dauerhaft" : "Flüchtig") : "–"}
          </dd>
          <dt className="text-ink-faint">Version</dt>
          <dd className="text-right font-mono text-xs text-ink">{status?.version ?? "–"}</dd>
        </dl>
        {status?.ai.demo && (
          <p className="rounded-xl border border-amber/40 bg-amber/[0.07] p-3 text-xs leading-relaxed text-ink">
            <strong className="text-amber">Demo-Modus:</strong> Es ist kein KI-Schlüssel hinterlegt. Trage{" "}
            <code className="font-mono">ANTHROPIC_API_KEY</code> in <code className="font-mono">.env.local</code> ein und
            starte den Server neu.
          </p>
        )}
      </Section>
    </>
  );
}
