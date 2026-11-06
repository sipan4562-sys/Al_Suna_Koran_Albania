"use client";

import { ArrowRight } from "lucide-react";
import { jarvis } from "@/lib/client/controller";
import { greeting } from "@/lib/client/format";
import { useClientValue } from "@/lib/client/hooks";
import { useJarvis } from "@/lib/client/store";
import { toSpeakable } from "@/lib/speech/speakable";
import { cn } from "@/lib/client/cn";

const MAX_CHARS = 300;

/** Zeigt das Ende eines langen Textes – wie Untertitel beim Sprechen. */
function tail(text: string, max = MAX_CHARS): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  const slice = text.slice(-max);
  const space = slice.indexOf(" ");
  return { text: `… ${slice.slice(space > 0 ? space + 1 : 0)}`, truncated: true };
}

/** Live-Transkript und Antwort von JARVIS auf dem Hauptbildschirm. */
export function Subtitles() {
  const listening = useJarvis((s) => s.listening);
  const interim = useJarvis((s) => s.interim);
  const thinking = useJarvis((s) => s.thinking);
  const lastUserText = useJarvis((s) => s.lastUserText);
  const lastAssistantText = useJarvis((s) => s.lastAssistantText);
  const profile = useJarvis((s) => s.profile);
  // Begrüßung hängt von der lokalen Uhrzeit ab – daher erst im Browser.
  const salutation = useClientValue(() => greeting(), "");
  const name = profile.formOfAddress || profile.userName;
  const hello = salutation ? `${salutation}${name ? `, ${name}` : ""}. Wie kann ich helfen?` : "";

  const answer = toSpeakable(lastAssistantText);
  const hasCode = lastAssistantText.includes("```");
  const shown = tail(answer);

  return (
    <div className="flex min-h-[4.5rem] w-full max-w-2xl flex-col items-center px-2 text-center short:min-h-0" aria-live="polite">
      {listening ? (
        <p className="text-lg font-medium leading-snug text-ink sm:text-xl">
          <span className={cn(interim ? "" : "text-ink-muted")}>{interim || "Ich höre zu …"}</span>
          <span className="caret" />
        </p>
      ) : answer || thinking ? (
        <>
          {lastUserText && (
            <p className="line-clamp-1 text-xs text-ink-faint sm:text-sm">
              <span className="hud-label mr-2 text-[10px] text-arc-dim">Du</span>
              {lastUserText}
            </p>
          )}
          <p
            className={cn(
              "mt-1.5 line-clamp-4 text-base leading-relaxed text-ink sm:line-clamp-3 sm:text-lg short:line-clamp-2 short:text-base",
              thinking && !answer && "text-ink-muted",
            )}
          >
            {answer ? shown.text : "…"}
          </p>
          {(shown.truncated || hasCode) && !thinking && (
            <button
              type="button"
              onClick={() => jarvis.openChat()}
              className="hud-label mt-2 inline-flex items-center gap-1.5 text-[11px] text-arc hover:text-arc-soft"
            >
              Vollständige Antwort im Chat <ArrowRight className="size-3.5" />
            </button>
          )}
        </>
      ) : (
        <p className="text-lg leading-snug text-ink-muted sm:text-xl short:text-base">{hello || " "}</p>
      )}
    </div>
  );
}
