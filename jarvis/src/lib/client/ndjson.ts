/**
 * Liest einen NDJSON-Stream (eine JSON-Zeile pro Ereignis) inkrementell.
 * Unvollständige Zeilen werden gepuffert; kaputte Zeilen übersprungen.
 */
export async function* readNdjson<T>(body: ReadableStream<Uint8Array>): AsyncGenerator<T, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        const parsed = parseLine<T>(line);
        if (parsed !== undefined) yield parsed;
      }
    }
    buffer += decoder.decode();
    const parsed = parseLine<T>(buffer.trim());
    if (parsed !== undefined) yield parsed;
  } finally {
    reader.releaseLock();
  }
}

function parseLine<T>(line: string): T | undefined {
  if (!line) return undefined;
  try {
    return JSON.parse(line) as T;
  } catch {
    return undefined;
  }
}
