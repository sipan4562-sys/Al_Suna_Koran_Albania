"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { audioLevels } from "@/lib/audio/levels";
import { cn } from "@/lib/client/cn";
import { selectPhase, useJarvis } from "@/lib/client/store";
import { CoreRenderer } from "@/lib/visual/core-renderer";

interface CoreVisualizerProps {
  variant?: "full" | "mini";
  className?: string;
}

/** React-Hülle um den Canvas-Renderer des holografischen Kerns. */
export function CoreVisualizer({ variant = "full", className }: CoreVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CoreRenderer | null>(null);
  const phase = useJarvis(selectPhase);
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: CoreRenderer;
    try {
      renderer = new CoreRenderer(canvas, {
        variant,
        reducedMotion,
        levels: audioLevels,
        labelFont:
          getComputedStyle(document.documentElement).getPropertyValue("--font-rajdhani").trim() || "sans-serif",
      });
    } catch {
      return; // Kein Canvas verfügbar – die Oberfläche funktioniert trotzdem.
    }
    rendererRef.current = renderer;
    renderer.setPhase(selectPhase(useJarvis.getState()));

    let inView = true;
    const updateVisibility = () => renderer.setVisible(inView && !document.hidden);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      renderer.resize(rect.width, rect.height);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? true;
      updateVisibility();
    });
    intersection.observe(canvas);
    document.addEventListener("visibilitychange", updateVisibility);
    renderer.start();

    return () => {
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [variant, reducedMotion]);

  useEffect(() => {
    rendererRef.current?.setPhase(phase);
  }, [phase]);

  return <canvas ref={canvasRef} aria-hidden="true" className={cn("block h-full w-full", className)} />;
}
