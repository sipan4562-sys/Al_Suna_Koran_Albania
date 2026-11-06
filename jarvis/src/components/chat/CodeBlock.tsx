"use client";

import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";
import { copyText } from "@/lib/client/clipboard";

const LANGUAGE_NAMES: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  tsx: "TSX",
  jsx: "JSX",
  py: "Python",
  python: "Python",
  sh: "Shell",
  bash: "Bash",
  shell: "Shell",
  json: "JSON",
  html: "HTML",
  css: "CSS",
  sql: "SQL",
  java: "Java",
  go: "Go",
  rust: "Rust",
  cpp: "C++",
  c: "C",
  csharp: "C#",
  cs: "C#",
  php: "PHP",
  ruby: "Ruby",
  yaml: "YAML",
  yml: "YAML",
  md: "Markdown",
  markdown: "Markdown",
  xml: "XML",
  kotlin: "Kotlin",
  swift: "Swift",
};

export function CodeBlock({ language, code, children }: { language: string; code: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (await copyText(code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-[#030a14]/90 shadow-[inset_0_1px_0_rgba(170,245,255,0.05)]">
      <div className="flex items-center justify-between border-b border-line/70 bg-arc/[0.04] px-3 py-1.5">
        <span className="hud-label text-[10px] text-arc-dim">{LANGUAGE_NAMES[language] ?? (language || "Code")}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-ink-muted transition-colors hover:bg-arc/10 hover:text-arc-soft"
          aria-label="Code kopieren"
        >
          {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
          {copied ? "Kopiert" : "Kopieren"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
        <code className={`hljs${language ? ` language-${language}` : ""}`}>{children}</code>
      </pre>
    </div>
  );
}
