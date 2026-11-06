"use client";

import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/client/cn";
import { useJarvis } from "@/lib/client/store";

const ICONS = { info: Info, success: CircleCheck, warning: TriangleAlert, error: TriangleAlert };

export function Toasts() {
  const toasts = useJarvis((s) => s.toasts);
  const dismiss = useJarvis((s) => s.dismissToast);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+4.25rem)] z-[70] flex flex-col items-center gap-2 px-4"
      aria-live="assertive"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.kind];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "glass-strong pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl px-4 py-3 text-sm",
                toast.kind === "error" && "border-alert/50",
                toast.kind === "warning" && "border-amber/50",
                toast.kind === "success" && "border-ok/40",
              )}
              role={toast.kind === "error" ? "alert" : "status"}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  toast.kind === "error" && "text-alert",
                  toast.kind === "warning" && "text-amber",
                  toast.kind === "success" && "text-ok",
                  toast.kind === "info" && "text-arc",
                )}
              />
              <p className="flex-1 leading-snug text-ink">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="-m-1 rounded-md p-1 text-ink-faint hover:text-ink"
                aria-label="Hinweis schließen"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
