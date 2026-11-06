"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/client/cn";

interface DrawerProps {
  open: boolean;
  side: "left" | "right";
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  actions?: ReactNode;
}

/** Seitliches Panel (Glas-Optik) mit Hintergrund-Abdunklung und Fokusführung. */
export function Drawer({ open, side, title, onClose, children, footer, className, actions }: DrawerProps) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("[data-autofocus], button, input, textarea, select")?.focus();
    }, 60);
    return () => {
      clearTimeout(timer);
      previous?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            className="absolute inset-0 bg-void/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: side === "left" ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: side === "left" ? "-100%" : "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className={cn(
              "glass-strong absolute top-0 bottom-0 flex w-full flex-col rounded-none border-y-0",
              side === "left" ? "left-0 border-l-0 sm:rounded-r-2xl" : "right-0 border-r-0 sm:rounded-l-2xl",
              className,
            )}
          >
            <header className="flex items-center justify-between gap-3 border-b border-line/60 px-5 pt-[max(1rem,var(--safe-top))] pb-3">
              <h2 className="hud-label text-sm text-arc">{title}</h2>
              <div className="flex items-center gap-1">
                {actions}
                <IconButton label="Schließen" size="sm" variant="ghost" onClick={onClose}>
                  <X />
                </IconButton>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
            {footer && (
              <footer className="border-t border-line/60 px-5 pt-3 pb-[max(0.75rem,var(--safe-bottom))]">{footer}</footer>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
