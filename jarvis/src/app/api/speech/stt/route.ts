import { getProfile } from "@/server/db/repositories/users";
import { api, jsonError } from "@/server/http/api";
import { SpeechError, transcribeSpeech } from "@/server/speech";
import { LIMITS } from "@/server/validation";

export const maxDuration = 60;

const ACCEPTED = /^(audio\/|video\/webm)/;

/** POST /api/speech/stt – Audioaufnahme (multipart, Feld "audio") → Text. */
export const POST = api(
  async (request, { userId }) => {
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > LIMITS.sttBytes + 64 * 1024) {
      return jsonError(413, "too_large", "Die Aufnahme ist zu lang.");
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonError(400, "bad_request", "Ungültige Audiodaten.");
    }
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return jsonError(400, "bad_request", "Keine Aufnahme erhalten.");
    }
    if (audio.size > LIMITS.sttBytes) return jsonError(413, "too_large", "Die Aufnahme ist zu lang.");
    if (audio.type && !ACCEPTED.test(audio.type)) {
      return jsonError(415, "unsupported", "Dieses Audioformat wird nicht unterstützt.");
    }

    try {
      const profile = await getProfile(userId);
      const text = await transcribeSpeech(audio, profile.language, request.signal);
      return Response.json({ text });
    } catch (error) {
      if (error instanceof SpeechError) return jsonError(error.status, "speech_failed", error.message);
      throw error;
    }
  },
  { rateLimit: { bucket: "stt", limit: 40 } },
);
