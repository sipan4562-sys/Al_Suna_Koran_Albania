import { getProfile } from "@/server/db/repositories/users";
import { api, jsonError, payloadErrorResponse, readJson } from "@/server/http/api";
import { SpeechError, synthesizeSpeech } from "@/server/speech";
import { firstIssue, TtsRequestSchema } from "@/server/validation";

export const maxDuration = 60;

/** POST /api/speech/tts – Text → MP3 (OpenAI oder ElevenLabs). */
export const POST = api(
  async (request, { userId }) => {
    let body: unknown;
    try {
      body = await readJson(request, 16 * 1024);
    } catch (error) {
      return payloadErrorResponse(error) ?? jsonError(400, "bad_request", "Ungültige Anfrage.");
    }
    const parsed = TtsRequestSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, "bad_request", firstIssue(parsed.error));

    try {
      const profile = await getProfile(userId);
      const audio = await synthesizeSpeech(parsed.data.text, profile.language, request.signal);
      return new Response(audio, {
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
      });
    } catch (error) {
      if (error instanceof SpeechError) return jsonError(error.status, "speech_failed", error.message);
      throw error;
    }
  },
  { rateLimit: { bucket: "tts", limit: 150 } },
);
