"use client";

import { Lock, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { CoreVisualizer } from "@/components/hud/CoreVisualizer";

/** Zugangscode-Formular (nur aktiv, wenn JARVIS_ACCESS_CODE gesetzt ist). */
export function LoginForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code || busy) return;
    setBusy(true);
    setError(null);
    try {
      const next = new URLSearchParams(window.location.search).get("next") ?? "/";
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, next }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        next?: string;
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(data.error?.message ?? "Anmeldung fehlgeschlagen.");
      window.location.href = data.next ?? "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen.");
      setCode("");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="glass-strong hud-frame w-full max-w-sm rounded-2xl p-7 text-center">
      <div className="mx-auto size-28">
        <CoreVisualizer variant="mini" />
      </div>
      <h1 className="mt-3 font-display text-xl font-bold tracking-[0.42em] text-arc-soft text-glow">J.A.R.V.I.S.</h1>
      <p className="hud-label mt-2 text-[10px] text-ink-faint">Zugang erforderlich</p>

      <label htmlFor="access-code" className="sr-only">
        Zugangscode
      </label>
      <div className="mt-6 flex items-center gap-2 rounded-xl border border-line bg-void/50 px-3 focus-within:border-line-strong">
        <Lock className="size-4 shrink-0 text-arc-dim" />
        <input
          id="access-code"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Zugangscode"
          className="min-w-0 flex-1 bg-transparent py-3 text-base text-ink placeholder:text-ink-faint focus:outline-none focus-visible:outline-none"
        />
      </div>
      {error && (
        <p className="mt-3 text-sm text-alert" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!code || busy}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-arc py-3 font-hud text-sm font-bold tracking-[0.2em] text-void uppercase shadow-[0_0_24px_rgba(95,243,255,0.45)] transition-all hover:bg-arc-soft disabled:opacity-40"
      >
        {busy && <LoaderCircle className="size-4 animate-spin" />}
        Entsperren
      </button>
    </form>
  );
}
