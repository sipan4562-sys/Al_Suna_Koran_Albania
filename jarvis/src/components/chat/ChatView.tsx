"use client";

import { ArrowLeft, History, Settings2, SquarePen, Volume2, VolumeX } from "lucide-react";
import { motion } from "motion/react";
import { CoreVisualizer } from "@/components/hud/CoreVisualizer";
import { IconButton } from "@/components/ui/IconButton";
import { jarvis } from "@/lib/client/controller";
import { PHASE_LABELS, selectPhase, useJarvis } from "@/lib/client/store";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";

function ChatHeader() {
  const set = useJarvis((s) => s.set);
  const title = useJarvis((s) => s.conversationTitle);
  const phase = useJarvis(selectPhase);
  const mode = useJarvis((s) => s.prefs.mode);

  return (
    <header className="relative z-20 flex items-center gap-2 border-b border-line/60 bg-abyss/70 px-3 pt-[max(0.5rem,var(--safe-top))] pb-2 backdrop-blur-xl sm:gap-3 sm:px-5">
      <button
        type="button"
        onClick={() => jarvis.goHome()}
        className="glass inline-flex h-10 shrink-0 items-center gap-2 rounded-full pr-3 pl-2.5 text-ink transition-colors hover:border-line-strong hover:text-arc-soft sm:pr-4"
        aria-label="Zurück zur Zentrale"
      >
        <ArrowLeft className="size-5" />
        <span className="hud-label hidden text-[11px] sm:inline">Zentrale</span>
      </button>
      <div className="hidden size-10 shrink-0 min-[400px]:block">
        <CoreVisualizer variant="mini" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-xs font-semibold tracking-[0.34em] text-arc-soft sm:text-sm">J.A.R.V.I.S.</div>
        <div className="truncate text-xs text-ink-muted" aria-live="polite">
          {phase === "idle" ? title || "Neue Unterhaltung" : `${PHASE_LABELS[phase].label} …`}
        </div>
      </div>
      <IconButton
        label={mode === "voice" ? "Sprachausgabe an" : "Sprachausgabe aus"}
        size="sm"
        variant="ghost"
        active={mode === "voice"}
        aria-pressed={mode === "voice"}
        onClick={() => jarvis.setMode(mode === "voice" ? "text" : "voice")}
      >
        {mode === "voice" ? <Volume2 /> : <VolumeX />}
      </IconButton>
      <IconButton label="Neue Unterhaltung" size="sm" variant="ghost" onClick={() => jarvis.newConversation()}>
        <SquarePen />
      </IconButton>
      <IconButton label="Verlauf" size="sm" variant="ghost" onClick={() => set({ panel: "history" })}>
        <History />
      </IconButton>
      <IconButton
        label="Einstellungen"
        size="sm"
        variant="ghost"
        className="hidden sm:inline-flex"
        onClick={() => set({ panel: "settings" })}
      >
        <Settings2 />
      </IconButton>
    </header>
  );
}

export function ChatView() {
  return (
    <motion.div
      key="chat"
      initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 18, filter: "blur(6px)" }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full flex-col"
    >
      <ChatHeader />
      <MessageList />
      <Composer />
    </motion.div>
  );
}
