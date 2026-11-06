"use client";

import { AnimatePresence, MotionConfig } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { BootSequence } from "@/components/BootSequence";
import { ChatView } from "@/components/chat/ChatView";
import { HomeView } from "@/components/home/HomeView";
import { HudBackground } from "@/components/hud/HudBackground";
import { HistoryDrawer } from "@/components/panels/HistoryDrawer";
import { SettingsPanel } from "@/components/panels/SettingsPanel";
import { Toasts } from "@/components/ui/Toasts";
import { jarvis } from "@/lib/client/controller";
import { useClientValue } from "@/lib/client/hooks";
import { loadPreferences } from "@/lib/client/preferences";
import { useJarvis } from "@/lib/client/store";

const BOOT_KEY = "jarvis.booted";

let bootDecision: boolean | null = null;

/** Start-Sequenz nur einmal pro Browser-Sitzung (und nie bei reduzierter Bewegung). */
function readBootWanted(): boolean {
  if (bootDecision === null) {
    let seen = true;
    try {
      seen = sessionStorage.getItem(BOOT_KEY) === "1";
      sessionStorage.setItem(BOOT_KEY, "1");
    } catch {
      seen = true;
    }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    bootDecision = !seen && !reduced && loadPreferences().bootAnimation;
  }
  return bootDecision;
}

function focusInput() {
  const input = document.getElementById("chat-input") ?? document.getElementById("home-input");
  (input as HTMLInputElement | null)?.focus();
}

/** Wurzel der Oberfläche: Ansichten, Panels, Tastenkürzel, Start-Sequenz. */
export function JarvisApp() {
  const view = useJarvis((s) => s.view);
  const bootWanted = useClientValue(readBootWanted, false);
  const [bootDone, setBootDone] = useState(false);
  const finishBoot = useCallback(() => setBootDone(true), []);
  const booting = bootWanted && !bootDone;

  useEffect(() => {
    jarvis.init();
    jarvis.syncViewFromLocation();
    void jarvis.bootstrap();

    const onPopState = () => jarvis.syncViewFromLocation();
    window.addEventListener("popstate", onPopState);

    // Status regelmäßig aktualisieren (z. B. nach Server-Neustart).
    const statusTimer = setInterval(() => {
      if (!document.hidden) void jarvis.refreshStatus();
    }, 60_000);

    return () => {
      window.removeEventListener("popstate", onPopState);
      clearInterval(statusTimer);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const state = useJarvis.getState();
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target?.closest("input, textarea, select, [contenteditable='true']"));

      if (event.key === "Escape") {
        if (state.panel) {
          state.set({ panel: null });
        } else if (jarvis.isBusy) {
          jarvis.stopAll();
        } else if (state.view === "chat" && !typing) {
          jarvis.goHome();
        }
        return;
      }
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        focusInput();
        return;
      }
      if (typing || state.panel) return;
      if (event.key === "/") {
        event.preventDefault();
        focusInput();
        return;
      }
      if (
        event.code === "Space" &&
        !event.repeat &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !target?.closest("button, a, [role='switch'], [role='radio']")
      ) {
        event.preventDefault();
        void jarvis.toggleListening();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative isolate h-dvh w-full overflow-hidden">
        <HudBackground />
        <AnimatePresence mode="wait" initial={false}>
          {view === "home" ? <HomeView key="home" /> : <ChatView key="chat" />}
        </AnimatePresence>
        <HistoryDrawer />
        <SettingsPanel />
        <Toasts />
        <AnimatePresence>{booting && <BootSequence onDone={finishBoot} />}</AnimatePresence>
      </div>
    </MotionConfig>
  );
}
