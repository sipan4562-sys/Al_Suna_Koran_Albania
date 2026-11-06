import "server-only";
import OpenAI from "openai";
import { getEnv } from "@/server/config/env";
import { mapOpenAIError } from "@/server/ai/providers/openai";

/**
 * Serverseitige Sprachdienste. Die Schlüssel bleiben auf dem Server; der
 * Browser erhält nur Audio bzw. Text. Ohne Konfiguration fällt die Oberfläche
 * automatisch auf die Web Speech API des Browsers zurück.
 */

export type ServerTtsProvider = "openai" | "elevenlabs";

export function serverTtsProvider(): ServerTtsProvider | null {
  const env = getEnv();
  const hasEleven = Boolean(env.ELEVENLABS_API_KEY && env.ELEVENLABS_VOICE_ID);
  // Ein OPENAI_BASE_URL deutet auf einen kompatiblen Chat-Server ohne TTS hin.
  const hasOpenAI = Boolean(env.OPENAI_API_KEY && !env.OPENAI_BASE_URL);
  switch (env.TTS_PROVIDER) {
    case "none":
      return null;
    case "elevenlabs":
      return hasEleven ? "elevenlabs" : null;
    case "openai":
      return env.OPENAI_API_KEY ? "openai" : null;
    default:
      return hasEleven ? "elevenlabs" : hasOpenAI ? "openai" : null;
  }
}

export function serverSttProvider(): "openai" | null {
  const env = getEnv();
  if (env.STT_PROVIDER === "none") return null;
  if (env.STT_PROVIDER === "openai") return env.OPENAI_API_KEY ? "openai" : null;
  return env.OPENAI_API_KEY && !env.OPENAI_BASE_URL ? "openai" : null;
}

let openaiClient: OpenAI | null = null;
function openai(): OpenAI {
  const env = getEnv();
  openaiClient ??= new OpenAI({ apiKey: env.OPENAI_API_KEY, maxRetries: 1, timeout: 30_000 });
  return openaiClient;
}

export class SpeechError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

/** Text → MP3-Audiostream. */
export async function synthesizeSpeech(text: string, language: string, signal: AbortSignal): Promise<ReadableStream<Uint8Array>> {
  const provider = serverTtsProvider();
  if (!provider) throw new SpeechError("Keine serverseitige Sprachausgabe konfiguriert.", 404);
  const env = getEnv();

  if (provider === "elevenlabs") {
    const url =
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(env.ELEVENLABS_VOICE_ID!)}/stream?` +
      new URLSearchParams({ output_format: "mp3_44100_128" });
    const response = await fetch(url, {
      method: "POST",
      signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: env.ELEVENLABS_MODEL,
        language_code: language.slice(0, 2),
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
      }),
    });
    if (!response.ok || !response.body) {
      console.error("[jarvis] ElevenLabs-TTS fehlgeschlagen:", response.status);
      throw new SpeechError(
        response.status === 401 ? "ElevenLabs hat den API-Schlüssel abgelehnt." : "Sprachausgabe fehlgeschlagen.",
        response.status === 429 ? 429 : 502,
      );
    }
    return response.body;
  }

  try {
    const response = await openai().audio.speech.create(
      {
        model: env.OPENAI_TTS_MODEL,
        voice: env.OPENAI_TTS_VOICE,
        input: text,
        response_format: "mp3",
        ...(env.OPENAI_TTS_MODEL.startsWith("gpt-") && env.OPENAI_TTS_INSTRUCTIONS
          ? { instructions: env.OPENAI_TTS_INSTRUCTIONS }
          : {}),
      },
      { signal },
    );
    if (!response.body) throw new SpeechError("Leere Audioantwort.");
    return response.body;
  } catch (error) {
    if (error instanceof SpeechError) throw error;
    const mapped = mapOpenAIError(error);
    console.error("[jarvis] OpenAI-TTS fehlgeschlagen:", mapped.code, mapped.cause ?? mapped);
    throw new SpeechError(mapped.message, mapped.code === "rate_limit" ? 429 : 502);
  }
}

/** Audio (webm/ogg/mp4/wav) → Text. */
export async function transcribeSpeech(file: File, language: string, signal: AbortSignal): Promise<string> {
  if (!serverSttProvider()) throw new SpeechError("Keine serverseitige Spracherkennung konfiguriert.", 404);
  try {
    const result = await openai().audio.transcriptions.create(
      { file, model: getEnv().OPENAI_STT_MODEL, language: language.slice(0, 2) },
      { signal },
    );
    return result.text.trim();
  } catch (error) {
    const mapped = mapOpenAIError(error);
    console.error("[jarvis] Transkription fehlgeschlagen:", mapped.code, mapped.cause ?? mapped);
    throw new SpeechError(mapped.message, mapped.code === "rate_limit" ? 429 : 502);
  }
}
