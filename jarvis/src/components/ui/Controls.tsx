"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/client/cn";

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="border-b border-line/50 px-5 py-5 last:border-0">
      <h3 className="hud-label text-xs text-arc">{title}</h3>
      {description && <p className="mt-1 text-xs leading-relaxed text-ink-faint">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-void/50 px-3 py-2.5 text-base text-ink placeholder:text-ink-faint transition-colors focus:border-line-strong focus:outline-none focus-visible:outline-none sm:text-sm";

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4", disabled && "cursor-not-allowed opacity-50")}>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-ink-faint">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked ? "border-arc/70 bg-arc/30 shadow-[0_0_14px_rgba(95,243,255,0.35)]" : "border-line bg-void/60",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-[18px] rounded-full transition-transform duration-200",
            checked ? "translate-x-5 bg-arc-soft" : "bg-ink-faint",
          )}
        />
      </button>
    </label>
  );
}

export function Slider({
  id,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 flex-1 cursor-pointer accent-[var(--color-arc)]"
      />
      <span className="w-12 text-right font-mono text-xs text-ink-muted">{format ? format(value) : value}</span>
    </div>
  );
}
