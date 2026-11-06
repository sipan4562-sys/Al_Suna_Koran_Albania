import "server-only";
import { z } from "zod";

/** Leere Strings aus `.env` wie "nicht gesetzt" behandeln. */
const optionalString = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

const bool = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value.trim() === "") return fallback;
      return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
    });

const effort = z
  .string()
  .optional()
  .transform((value) => {
    const v = value?.trim().toLowerCase();
    if (!v || v === "none" || v === "default") return undefined;
    return ["low", "medium", "high", "xhigh", "max"].includes(v)
      ? (v as "low" | "medium" | "high" | "xhigh" | "max")
      : undefined;
  });

const intWithDefault = (fallback: number, min: number, max: number) =>
  z
    .string()
    .optional()
    .transform((value) => {
      const parsed = Number.parseInt(value ?? "", 10);
      if (!Number.isFinite(parsed)) return fallback;
      return Math.min(max, Math.max(min, parsed));
    });

const enumWithDefault = <T extends string>(values: readonly T[], fallback: T) =>
  z
    .string()
    .optional()
    .transform((value) => {
      const v = value?.trim().toLowerCase() as T | undefined;
      return v && values.includes(v) ? v : fallback;
    });

const EnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  VERCEL: optionalString,

  AI_PROVIDER: enumWithDefault(["auto", "anthropic", "openai", "demo"] as const, "auto"),
  AI_FALLBACK_PROVIDER: optionalString,

  ANTHROPIC_API_KEY: optionalString,
  ANTHROPIC_AUTH_TOKEN: optionalString,
  ANTHROPIC_MODEL: optionalString.transform((v) => v ?? "claude-opus-5-5"),
  ANTHROPIC_EFFORT_TEXT: effort,
  ANTHROPIC_EFFORT_VOICE: effort,
  ANTHROPIC_MAX_TOKENS: intWithDefault(32_000, 1_024, 128_000),
  ANTHROPIC_REFUSAL_FALLBACK: bool(true),
  ANTHROPIC_WEB_SEARCH: bool(false),
  ANTHROPIC_BASE_URL: optionalString,

  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: optionalString.transform((v) => v ?? "gpt-5.4-mini"),
  OPENAI_BASE_URL: optionalString,

  TTS_PROVIDER: enumWithDefault(["auto", "openai", "elevenlabs", "none"] as const, "auto"),
  OPENAI_TTS_MODEL: optionalString.transform((v) => v ?? "gpt-4o-mini-tts"),
  OPENAI_TTS_VOICE: optionalString.transform((v) => v ?? "onyx"),
  OPENAI_TTS_INSTRUCTIONS: optionalString,
  ELEVENLABS_API_KEY: optionalString,
  ELEVENLABS_VOICE_ID: optionalString,
  ELEVENLABS_MODEL: optionalString.transform((v) => v ?? "eleven_flash_v2_5"),

  STT_PROVIDER: enumWithDefault(["auto", "openai", "none"] as const, "auto"),
  OPENAI_STT_MODEL: optionalString.transform((v) => v ?? "gpt-4o-mini-transcribe"),

  DATABASE_URL: optionalString,
  DATABASE_AUTH_TOKEN: optionalString,

  JARVIS_ACCESS_CODE: optionalString,
  JARVIS_SESSION_SECRET: optionalString,
  RATE_LIMIT_PER_MINUTE: intWithDefault(30, 1, 10_000),

  SKILL_WEATHER: bool(true),
  SKILL_MEMORY: bool(true),
});

export type Env = z.output<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) cached = EnvSchema.parse(process.env);
  return cached;
}

/** Nur für Tests: Konfiguration nach Änderung von process.env neu einlesen. */
export function resetEnvCache(): void {
  cached = null;
}

export const isProduction = () => getEnv().NODE_ENV === "production";
