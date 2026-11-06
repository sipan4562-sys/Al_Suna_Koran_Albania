import "server-only";
import { z } from "zod";
import { DEFAULT_PROFILE, LANGUAGES, PERSONALITIES, type ProfileSettings } from "@/lib/shared/types";

// Validierungsmeldungen auf Deutsch (eingebaute Zod-Lokalisierung).
z.config(z.locales.de());

export const LIMITS = {
  messageChars: 12_000,
  titleChars: 120,
  memoryChars: 500,
  ttsChars: 1_200,
  sttBytes: 10 * 1024 * 1024,
  maxMemories: 500,
} as const;

/** Entfernt Steuerzeichen (außer Zeilenumbrüchen/Tabs). */
export function stripControlChars(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

const cleanText = (max: number) =>
  z
    .string()
    .transform((v) => stripControlChars(v).trim())
    .pipe(z.string().max(max));

const profileFields = {
  userName: cleanText(60),
  formOfAddress: cleanText(40),
  personality: z.enum(PERSONALITIES),
  customInstructions: cleanText(1_500),
  language: z.enum(LANGUAGES),
  homeCity: cleanText(80),
};

export const ProfileSettingsSchema = z.object({
  userName: profileFields.userName.default(DEFAULT_PROFILE.userName),
  formOfAddress: profileFields.formOfAddress.default(DEFAULT_PROFILE.formOfAddress),
  personality: profileFields.personality.default(DEFAULT_PROFILE.personality),
  customInstructions: profileFields.customInstructions.default(DEFAULT_PROFILE.customInstructions),
  language: profileFields.language.default(DEFAULT_PROFILE.language),
  homeCity: profileFields.homeCity.default(DEFAULT_PROFILE.homeCity),
});

/**
 * Teilaktualisierung OHNE Standardwerte: In Zod 4 behält `.partial()` die
 * inneren `.default()`-Werte – fehlende Felder würden sonst auf ihre
 * Standardwerte zurückgesetzt.
 */
export const ProfilePatchSchema = z.object(profileFields).partial();

/** Robust gegen kaputte/alte gespeicherte Werte: Unbekanntes wird verworfen. */
export function sanitizeProfile(raw: unknown): ProfileSettings {
  const base = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const result: ProfileSettings = { ...DEFAULT_PROFILE };
  for (const key of Object.keys(DEFAULT_PROFILE) as (keyof ProfileSettings)[]) {
    const field = ProfileSettingsSchema.shape[key];
    const parsed = field.safeParse(base[key]);
    if (parsed.success) (result as unknown as Record<string, unknown>)[key] = parsed.data;
  }
  return result;
}

export const ChatRequestSchema = z.object({
  conversationId: z.uuid().optional().nullable(),
  message: z
    .string()
    .transform((v) => stripControlChars(v).trim())
    .pipe(z.string().min(1, "Die Nachricht ist leer.").max(LIMITS.messageChars, "Die Nachricht ist zu lang.")),
  mode: z.enum(["voice", "text"]).default("text"),
  timezone: z
    .string()
    .max(64)
    .optional()
    .transform((tz) => (tz && isValidTimeZone(tz) ? tz : undefined)),
});

export const RenameConversationSchema = z.object({
  title: cleanText(LIMITS.titleChars).pipe(z.string().min(1, "Der Titel darf nicht leer sein.")),
});

export const CreateMemorySchema = z.object({
  content: cleanText(LIMITS.memoryChars).pipe(z.string().min(2, "Der Eintrag ist zu kurz.")),
  category: cleanText(30).optional(),
});

export const TtsRequestSchema = z.object({
  text: cleanText(LIMITS.ttsChars).pipe(z.string().min(1, "Kein Text zum Vorlesen angegeben.")),
});

export const LoginSchema = z.object({
  code: z.string().min(1).max(200),
  next: z.string().max(500).optional(),
});

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("de-DE", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Ungültige Anfrage.";
}
