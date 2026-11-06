"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/client/cn";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "glass" | "ghost" | "danger";
  active?: boolean;
  showLabel?: boolean;
  labelClassName?: string;
}

const SIZES = {
  sm: "size-9 [&_svg]:size-4",
  md: "size-11 [&_svg]:size-5",
  lg: "size-14 [&_svg]:size-6",
};

/** Runder Icon-Button mit Pflicht-Beschriftung für Screenreader. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, size = "md", variant = "glass", active = false, showLabel = false, labelClassName, className, ...props },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 touch-manipulation items-center justify-center rounded-full transition-all duration-200",
        "disabled:cursor-not-allowed disabled:opacity-40 active:scale-95",
        SIZES[size],
        variant === "glass" && "glass text-ink hover:border-line-strong hover:text-arc-soft",
        variant === "ghost" && "text-ink-muted hover:bg-arc/[0.08] hover:text-arc-soft",
        variant === "danger" && "glass text-alert hover:border-alert/60",
        active && "glow-ring text-arc-soft",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
  if (!showLabel) return button;
  return (
    <div className="flex flex-col items-center gap-1.5">
      {button}
      <span className={cn("hud-label text-[10px] text-ink-faint", labelClassName)}>{label}</span>
    </div>
  );
});
