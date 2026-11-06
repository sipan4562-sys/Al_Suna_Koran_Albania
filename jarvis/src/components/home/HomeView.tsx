"use client";

import { motion } from "motion/react";
import { CoreVisualizer } from "@/components/hud/CoreVisualizer";
import { StatusReadout } from "@/components/hud/StatusReadout";
import { Subtitles } from "@/components/hud/Subtitles";
import { SystemPanel } from "@/components/hud/SystemPanel";
import { TelemetryPanel } from "@/components/hud/TelemetryPanel";
import { TopBar } from "@/components/hud/TopBar";
import { jarvis } from "@/lib/client/controller";
import { useJarvis } from "@/lib/client/store";
import { ControlDock } from "./ControlDock";

/**
 * Hauptbildschirm. Raster: Kopfzeile / Kern / Bedienfeld. Auf flachen
 * Bildschirmen (Smartphone quer) stehen Kern und Bedienfeld nebeneinander.
 * Die Kerngröße folgt per Container-Query immer dem verfügbaren Platz.
 */
export function HomeView() {
  const listening = useJarvis((s) => s.listening);
  const available = useJarvis((s) => s.sttAvailable);

  return (
    <motion.div
      key="home"
      initial={{ opacity: 0, scale: 1.03, filter: "blur(6px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.97, filter: "blur(6px)" }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="relative grid h-full grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] short:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] short:grid-rows-[auto_minmax(0,1fr)]"
    >
      <div className="min-w-0 short:col-span-2">
        <TopBar />
      </div>

      {/* Seitenpanels (nur große Bildschirme) – eigene Ebene über die volle Höhe */}
      <div className="pointer-events-none absolute inset-x-6 top-24 bottom-6 z-10 hidden items-center justify-between xl:flex">
        <SystemPanel className="pointer-events-auto max-h-full w-64 2xl:w-72" />
        <TelemetryPanel className="pointer-events-auto max-h-full w-64 overflow-y-auto 2xl:w-72" />
      </div>

      <section className="relative flex min-h-0 min-w-0 items-center justify-center px-4 py-2 [container-type:size]">
        <div className="relative aspect-square w-[min(100cqw,100cqh,640px)]">
          <CoreVisualizer />
          {/* Auch ein Tippen auf den Kern startet die Spracheingabe. */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            disabled={!available}
            onClick={() => void jarvis.toggleListening()}
            className="absolute inset-[24%] cursor-pointer rounded-full disabled:cursor-default"
            title={listening ? "Zuhören beenden" : "Tippen zum Sprechen"}
          />
        </div>
      </section>

      <section className="relative z-20 flex min-w-0 flex-col items-center justify-end gap-3 px-4 pt-1 pb-[max(1rem,var(--safe-bottom))] sm:gap-4 short:justify-center short:gap-2 short:pb-[max(0.5rem,var(--safe-bottom))]">
        <StatusReadout />
        <Subtitles />
        <ControlDock className="mt-1" />
      </section>
    </motion.div>
  );
}
