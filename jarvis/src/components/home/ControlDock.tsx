"use client";

import { MessageSquareText, SendHorizontal, Square, Volume2, VolumeX } from "lucide-react";
import { useState, type FormEvent } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { MicButton } from "@/components/ui/MicButton";
import { cn } from "@/lib/client/cn";
import { jarvis } from "@/lib/client/controller";
import { useJarvis } from "@/lib/client/store";

/** Bedienleiste unter dem Kern: Eingabefeld, Chat, Mikrofon, Sprach-/Textmodus. */
export function ControlDock({ className }: { className?: string }) {
  const [text, setText] = useState("");
  const mode = useJarvis((s) => s.prefs.mode);
  const listening = useJarvis((s) => s.listening);
  const busy = useJarvis((s) => s.thinking || s.speaking);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    void jarvis.send(value, { source: "text" });
  };

  return (
    <div className={cn("relative w-full max-w-xl", className)}>

      <form
        onSubmit={submit}
        className="glass flex items-center gap-2 rounded-full py-1.5 pr-1.5 pl-5 transition-colors focus-within:border-line-strong"
      >
        <input
          id="home-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Nachricht an JARVIS …"
          aria-label="Nachricht an JARVIS"
          autoComplete="off"
          enterKeyHint="send"
          maxLength={12_000}
          className="min-w-0 flex-1 bg-transparent py-1.5 text-base text-ink placeholder:text-ink-faint focus:outline-none focus-visible:outline-none"
        />
        {busy && !text.trim() ? (
          <button
            type="button"
            onClick={() => jarvis.stopAll()}
            aria-label="Antwort stoppen"
            title="Antwort stoppen (Esc)"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-alert/50 bg-alert/10 text-alert transition-colors hover:bg-alert/20"
          >
            <Square className="size-4 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Senden"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-arc/15 text-arc transition-all hover:bg-arc/25 disabled:opacity-30"
          >
            <SendHorizontal className="size-5" />
          </button>
        )}
      </form>

      <div className="mt-4 flex items-end justify-center gap-8 sm:gap-12 short:mt-2.5 short:gap-6">
        <IconButton label="Chat" showLabel labelClassName="short:hidden" onClick={() => jarvis.openChat()}>
          <MessageSquareText />
        </IconButton>
        <div className="flex flex-col items-center gap-1.5">
          <MicButton size="lg" className="short:size-14!" />
          <span className="hud-label text-[10px] text-ink-faint short:hidden">{listening ? "Fertig" : "Sprechen"}</span>
        </div>
        <IconButton
          label={mode === "voice" ? "Sprache an" : "Sprache aus"}
          showLabel
          labelClassName="short:hidden"
          active={mode === "voice"}
          aria-pressed={mode === "voice"}
          onClick={() => jarvis.setMode(mode === "voice" ? "text" : "voice")}
        >
          {mode === "voice" ? <Volume2 /> : <VolumeX />}
        </IconButton>
      </div>
    </div>
  );
}
