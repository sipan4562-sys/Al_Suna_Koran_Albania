/**
 * Gemeinsamer "Pegel-Bus": Mikrofon und Sprachausgabe schreiben ihre
 * Lautstärke (0–1) hierher, die Visualisierung liest sie pro Frame.
 * Bewusst ohne React-State, damit nichts 60-mal pro Sekunde neu rendert.
 */
export const audioLevels = {
  input: 0,
  output: 0,
  /** true, wenn `output` aus echten Audiodaten stammt (Server-TTS). */
  outputIsReal: false,
  /** Zeitpunkt des letzten Wort-Ereignisses der Browser-Sprachausgabe. */
  lastBoundary: 0,
};

export function resetLevels() {
  audioLevels.input = 0;
  audioLevels.output = 0;
  audioLevels.outputIsReal = false;
}

/** RMS-Pegel eines Analysers (0–1, leicht komprimiert für schönere Ausschläge). */
export function readLevel(analyser: AnalyserNode, buffer: Uint8Array<ArrayBuffer>): number {
  analyser.getByteTimeDomainData(buffer);
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    const v = (buffer[i] - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / buffer.length);
  return Math.min(1, Math.pow(rms * 3.2, 0.8));
}

/**
 * Misst kontinuierlich den Pegel eines MediaStreams (Mikrofon) und ruft
 * `onLevel` pro Animationsframe auf. Gibt eine Stopp-Funktion zurück.
 */
export function meterStream(
  context: AudioContext,
  stream: MediaStream,
  onLevel: (level: number) => void,
): () => void {
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.6;
  source.connect(analyser);
  const buffer = new Uint8Array(new ArrayBuffer(analyser.fftSize));
  let frame = 0;
  let active = true;
  const tick = () => {
    if (!active) return;
    onLevel(readLevel(analyser, buffer));
    frame = requestAnimationFrame(tick);
  };
  tick();
  return () => {
    active = false;
    cancelAnimationFrame(frame);
    source.disconnect();
    analyser.disconnect();
    onLevel(0);
  };
}
