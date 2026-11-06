/**
 * Auswahl der natürlichsten verfügbaren Browser-Stimme für eine Sprache.
 */

const QUALITY_HINTS = [/natural/i, /neural/i, /online/i, /premium/i, /enhanced/i, /google/i, /siri/i];
// Bekannte männliche Stimmen – passend zur klassischen JARVIS-Anmutung.
const PREFERRED_NAMES = [
  /conrad/i,
  /killian/i,
  /florian/i,
  /stefan/i,
  /markus/i,
  /yannick/i,
  /daniel/i,
  /ryan/i,
  /thomas/i,
  /arthur/i,
  /guy/i,
  /oliver/i,
  /george/i,
];

export function voiceScore(voice: SpeechSynthesisVoice, lang: string): number {
  const wanted = lang.toLowerCase();
  const actual = voice.lang.toLowerCase().replace("_", "-");
  let score = 0;
  if (actual === wanted) score += 100;
  else if (actual.split("-")[0] === wanted.split("-")[0]) score += 60;
  else return -1;
  QUALITY_HINTS.forEach((hint, i) => {
    if (hint.test(voice.name)) score += 20 - i;
  });
  if (PREFERRED_NAMES.some((name) => name.test(voice.name))) score += 8;
  if (voice.localService === false) score += 4; // Cloud-Stimmen klingen meist natürlicher
  if (voice.default) score += 1;
  return score;
}

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
  preferredURI: string | null,
): SpeechSynthesisVoice | null {
  if (preferredURI) {
    const chosen = voices.find((v) => v.voiceURI === preferredURI);
    if (chosen) return chosen;
  }
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const voice of voices) {
    const score = voiceScore(voice, lang);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

/** Lädt die Stimmenliste (in Chrome asynchron über `voiceschanged`). */
export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  const initial = synth.getVoices();
  if (initial.length) return Promise.resolve(initial);
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", done);
    setTimeout(done, timeoutMs);
  });
}
