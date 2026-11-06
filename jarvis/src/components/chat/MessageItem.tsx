"use client";

import { Check, Copy, RotateCcw, TriangleAlert, Volume2 } from "lucide-react";
import { memo, useState } from "react";
import { copyText } from "@/lib/client/clipboard";
import { cn } from "@/lib/client/cn";
import { jarvis } from "@/lib/client/controller";
import { messageTime } from "@/lib/client/format";
import type { UiMessage } from "@/lib/client/store";
import { Markdown } from "./Markdown";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { ToolChips } from "./ToolChips";

function Avatar() {
  return (
    <div className="relative mt-0.5 flex size-8 shrink-0 items-center justify-center" aria-hidden="true">
      <div className="absolute inset-0 rotate-45 rounded-md border border-arc/50 bg-arc/10 shadow-[0_0_16px_rgba(95,243,255,0.35)]" />
      <div className="relative size-2.5 rounded-full bg-arc-soft shadow-[0_0_10px_rgba(95,243,255,0.9)]" />
    </div>
  );
}

function ActionButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-ink-faint transition-colors hover:bg-arc/10 hover:text-arc-soft"
    >
      {children}
    </button>
  );
}

function AssistantActions({ message }: { message: UiMessage }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
      <ActionButton
        label="Antwort kopieren"
        onClick={async () => {
          if (await copyText(message.content)) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }
        }}
      >
        {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
        {copied ? "Kopiert" : "Kopieren"}
      </ActionButton>
      <ActionButton label="Antwort vorlesen" onClick={() => jarvis.speakText(message.content)}>
        <Volume2 className="size-3.5" /> Vorlesen
      </ActionButton>
      {message.status !== "complete" && (
        <ActionButton label="Erneut versuchen" onClick={() => jarvis.retry(message.id)}>
          <RotateCcw className="size-3.5" /> Erneut
        </ActionButton>
      )}
    </div>
  );
}

export const MessageItem = memo(function MessageItem({
  message,
  streaming,
}: {
  message: UiMessage;
  streaming: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-tr-md border border-arc/25 bg-gradient-to-b from-arc/[0.12] to-arc/[0.06] px-4 py-2.5 text-[0.975rem] leading-relaxed break-words whitespace-pre-wrap text-ink shadow-[0_0_24px_rgba(95,243,255,0.06)] sm:max-w-[75%]">
          {message.content}
        </div>
      </div>
    );
  }

  const waiting = message.pending && !message.content;
  return (
    <article className="group flex gap-3" aria-label="Antwort von JARVIS">
      <Avatar />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="hud-label text-[11px] text-arc">JARVIS</span>
          <time className="text-[11px] text-ink-faint" dateTime={message.createdAt}>
            {messageTime(message.createdAt)}
          </time>
          {message.meta?.model && (
            <span className="hidden truncate font-mono text-[10px] text-ink-faint/70 sm:inline">
              {message.meta.model}
            </span>
          )}
        </div>
        <ToolChips tools={message.tools ?? message.meta?.tools} />
        {waiting ? (
          <ThinkingIndicator
            label={message.tools?.some((t) => t.status === "running") ? "Nutze Fähigkeiten" : "JARVIS denkt nach"}
          />
        ) : message.content ? (
          <Markdown content={message.content} streaming={streaming} />
        ) : null}
        {message.errorText && (
          <div
            className={cn(
              "mt-2 flex items-start gap-2 rounded-lg border border-alert/30 bg-alert/[0.06] px-3 py-2 text-sm text-ink",
            )}
            role="alert"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-alert" />
            <span>{message.errorText}</span>
          </div>
        )}
        {!message.pending && !streaming && (message.content || message.errorText) && (
          <AssistantActions message={message} />
        )}
      </div>
    </article>
  );
});
