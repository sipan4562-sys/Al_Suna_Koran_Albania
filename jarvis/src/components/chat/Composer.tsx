"use client";

import { SendHorizontal, Square } from "lucide-react";
import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { MicButton } from "@/components/ui/MicButton";
import { cn } from "@/lib/client/cn";
import { jarvis } from "@/lib/client/controller";
import { useClientValue } from "@/lib/client/hooks";
import { useJarvis } from "@/lib/client/store";

const MAX = 12_000;

function isTouchDevice(): boolean {
  return window.matchMedia?.("(pointer: coarse)").matches ?? false;
}

/** Eingabebereich des Chats mit automatisch wachsendem Textfeld. */
export function Composer() {
  const [text, setText] = useState("");
  const busy = useJarvis((s) => s.thinking || s.speaking);
  const listening = useJarvis((s) => s.listening);
  const interim = useJarvis((s) => s.interim);
  const ref = useRef<HTMLTextAreaElement>(null);
  const touch = useClientValue(isTouchDevice, false);

  const value = listening ? interim : text;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || listening) return;
    setText("");
    void jarvis.send(trimmed, { source: "text" });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sendet auf Geräten mit Tastatur; auf Touch-Geräten fügt Enter eine Zeile ein.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !touch) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="relative z-10 border-t border-line/60 bg-abyss/75 px-3 pt-3 pb-[max(0.75rem,var(--safe-bottom))] backdrop-blur-xl sm:px-6">
      <form onSubmit={submit} className="glass mx-auto flex max-w-3xl items-end gap-2 rounded-2xl p-2 focus-within:border-line-strong">
        <MicButton size="sm" className="mb-0.5" />
        <label htmlFor="chat-input" className="sr-only">
          Nachricht an JARVIS
        </label>
        <textarea
          id="chat-input"
          ref={ref}
          rows={1}
          value={value}
          readOnly={listening}
          onChange={(event) => setText(event.target.value.slice(0, MAX))}
          onKeyDown={onKeyDown}
          placeholder={listening ? "Ich höre zu …" : "Nachricht an JARVIS …"}
          enterKeyHint={touch ? "enter" : "send"}
          className={cn(
            "max-h-[220px] min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-base leading-6 text-ink placeholder:text-ink-faint focus:outline-none focus-visible:outline-none",
            listening && "italic text-ink-muted",
          )}
        />
        {busy ? (
          <button
            type="button"
            onClick={() => jarvis.stopAll()}
            aria-label="Antwort stoppen"
            title="Antwort stoppen (Esc)"
            className="mb-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-alert/50 bg-alert/10 text-alert transition-colors hover:bg-alert/20"
          >
            <Square className="size-4 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!text.trim() || listening}
            aria-label="Senden"
            className="mb-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-arc text-void shadow-[0_0_18px_rgba(95,243,255,0.45)] transition-all hover:bg-arc-soft disabled:bg-arc/15 disabled:text-arc/50 disabled:shadow-none"
          >
            <SendHorizontal className="size-5" />
          </button>
        )}
      </form>
      <p className="mx-auto mt-2 hidden max-w-3xl text-center text-[11px] text-ink-faint md:block">
        Enter senden · Shift + Enter neue Zeile · Leertaste sprechen · Esc stoppen
        {text.length > MAX * 0.8 && (
          <span className="ml-2 text-amber">
            {text.length.toLocaleString("de-DE")} / {MAX.toLocaleString("de-DE")}
          </span>
        )}
      </p>
    </div>
  );
}
