"use client";

import { Check, MessageSquare, Pencil, SquarePen, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/client/cn";
import { jarvis } from "@/lib/client/controller";
import { dayGroup, relativeTime } from "@/lib/client/format";
import { useJarvis } from "@/lib/client/store";
import type { ConversationDTO } from "@/lib/shared/types";
import { Drawer } from "./Drawer";

function ConversationRow({ conversation, active }: { conversation: ConversationDTO; active: boolean }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [title, setTitle] = useState(conversation.title);

  if (editing) {
    return (
      <form
        className="flex items-center gap-2 rounded-xl border border-line-strong bg-arc/[0.06] px-3 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          void jarvis.renameConversation(conversation.id, title);
          setEditing(false);
        }}
      >
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          aria-label="Neuer Titel"
          className="min-w-0 flex-1 bg-transparent text-base text-ink focus:outline-none sm:text-sm"
        />
        <button type="submit" aria-label="Titel speichern" className="rounded-md p-1 text-ok hover:bg-ok/10">
          <Check className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Abbrechen"
          onClick={() => setEditing(false)}
          className="rounded-md p-1 text-ink-faint hover:bg-arc/10"
        >
          <X className="size-4" />
        </button>
      </form>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex items-center gap-1 rounded-xl border transition-colors",
        active ? "border-line-strong bg-arc/[0.08]" : "border-transparent hover:border-line hover:bg-arc/[0.04]",
      )}
    >
      <button
        type="button"
        onClick={() => void jarvis.openConversation(conversation.id)}
        className="flex min-w-0 flex-1 items-start gap-3 px-3 py-2.5 text-left"
      >
        <MessageSquare className={cn("mt-0.5 size-4 shrink-0", active ? "text-arc" : "text-ink-faint")} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{conversation.title}</span>
          <span className="mt-0.5 block truncate text-xs text-ink-faint">
            {relativeTime(conversation.updatedAt)} · {conversation.messageCount} Nachrichten
          </span>
        </span>
      </button>
      <div
        className={cn(
          "flex shrink-0 items-center pr-1.5 transition-opacity",
          confirming ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
        )}
      >
        {confirming ? (
          <>
            <button
              type="button"
              onClick={() => void jarvis.deleteConversation(conversation.id)}
              className="hud-label rounded-md bg-alert/15 px-2 py-1 text-[10px] text-alert hover:bg-alert/25"
            >
              Löschen
            </button>
            <button
              type="button"
              aria-label="Abbrechen"
              onClick={() => setConfirming(false)}
              className="rounded-md p-1.5 text-ink-faint hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              aria-label={`„${conversation.title}“ umbenennen`}
              onClick={() => {
                setTitle(conversation.title);
                setEditing(true);
              }}
              className="rounded-md p-1.5 text-ink-faint hover:bg-arc/10 hover:text-arc-soft"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label={`„${conversation.title}“ löschen`}
              onClick={() => setConfirming(true)}
              className="rounded-md p-1.5 text-ink-faint hover:bg-alert/10 hover:text-alert"
            >
              <Trash2 className="size-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function HistoryFooter() {
  const [confirmAll, setConfirmAll] = useState(false);
  return confirmAll ? (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ink-muted">Wirklich alle Unterhaltungen löschen?</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirmAll(false)}
          className="rounded-lg px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
        >
          Nein
        </button>
        <button
          type="button"
          onClick={() => void jarvis.deleteAllConversations()}
          className="rounded-lg bg-alert/15 px-3 py-1.5 text-sm text-alert hover:bg-alert/25"
        >
          Alle löschen
        </button>
      </div>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setConfirmAll(true)}
      className="inline-flex items-center gap-2 text-sm text-ink-faint hover:text-alert"
    >
      <Trash2 className="size-4" /> Gesamten Verlauf löschen
    </button>
  );
}

export function HistoryDrawer() {
  const open = useJarvis((s) => s.panel === "history");
  const set = useJarvis((s) => s.set);
  const conversations = useJarvis((s) => s.conversations);
  const activeId = useJarvis((s) => s.conversationId);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) void jarvis.refreshConversations();
  }, [open]);

  const groups = useMemo(() => {
    const filtered = query
      ? conversations.filter((c) =>
          `${c.title} ${c.preview}`.toLowerCase().includes(query.toLowerCase()),
        )
      : conversations;
    const map = new Map<string, ConversationDTO[]>();
    for (const conversation of filtered) {
      const group = dayGroup(conversation.updatedAt);
      map.set(group, [...(map.get(group) ?? []), conversation]);
    }
    return [...map.entries()];
  }, [conversations, query]);

  return (
    <Drawer
      open={open}
      side="left"
      title="Verlauf"
      onClose={() => set({ panel: null })}
      className="sm:max-w-sm"
      footer={conversations.length > 0 ? <HistoryFooter /> : null}
    >
      <div className="space-y-4 p-4">
        <button
          type="button"
          data-autofocus
          onClick={() => {
            jarvis.newConversation();
            jarvis.openChat();
          }}
          className="glass flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-arc-soft hover:border-line-strong"
        >
          <SquarePen className="size-4" /> Neue Unterhaltung
        </button>

        {conversations.length > 4 && (
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Verlauf durchsuchen …"
            aria-label="Verlauf durchsuchen"
            className="w-full rounded-xl border border-line bg-void/40 px-3 py-2 text-base text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none sm:text-sm"
          />
        )}

        {conversations.length === 0 ? (
          <p className="px-2 py-10 text-center text-sm text-ink-faint">
            Noch keine Unterhaltungen. Sprich mit JARVIS oder schreibe eine Nachricht.
          </p>
        ) : (
          groups.map(([group, items]) => (
            <section key={group}>
              <h3 className="hud-label mb-1.5 px-2 text-[10px] text-ink-faint">{group}</h3>
              <ul className="space-y-1">
                {items.map((conversation) => (
                  <li key={conversation.id}>
                    <ConversationRow conversation={conversation} active={conversation.id === activeId} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </Drawer>
  );
}
