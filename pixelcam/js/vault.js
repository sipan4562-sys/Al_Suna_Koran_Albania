// PixelCam – verschlüsselter Speicher (ohne Anmeldung)
// --------------------------------------------------------------
// Alle Aufnahmen, Vorschaubilder und Metadaten werden mit AES-256-GCM
// verschlüsselt in IndexedDB gespeichert. Den Schlüssel erzeugt die App
// automatisch beim ersten Start; er ist „nicht exportierbar“ – JavaScript
// kann ihn benutzen, aber niemals auslesen oder kopieren.
//
// Aufnahmen werden nach Ablauf (Standard: 1 Stunde) automatisch gelöscht,
// außer sie wurden heruntergeladen, geteilt oder exportiert („behalten“).

const DB_NAME = 'pixelcam';
const DB_VERSION = 1;
const LEGACY_DB = 'pixelcam-vault'; // alte Version mit Passwort
const KDF_ITERATIONS = 600_000;
const WRAP_AAD = enc('pixelcam:datakey:v1');
const FILE_MAGIC = enc('PXCAM\u0000\u0000\u0001'); // 8 Bytes
const BATCH = 24; // Chunks pro Lese-Transaktion

const subtle = globalThis.crypto?.subtle;

function enc(str) { return new TextEncoder().encode(str); }
function dec(buf) { return new TextDecoder().decode(buf); }

function b64(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}
function unb64(str) {
  const s = atob(str);
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}
function randomBytes(n) { return crypto.getRandomValues(new Uint8Array(n)); }
function randomId() { return Array.from(randomBytes(12), b => b.toString(16).padStart(2, '0')).join(''); }
const chunkAad = (id, seq) => enc(`pixelcam:chunk:${id}:${seq}`);
const metaAad = id => enc(`pixelcam:meta:${id}`);
const thumbAad = id => enc(`pixelcam:thumb:${id}`);

// ---------- IndexedDB-Helfer ----------
function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaktion abgebrochen'));
  });
}
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('config')) db.createObjectStore('config');
      if (!db.objectStoreNames.contains('recordings')) db.createObjectStore('recordings', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('chunks')) db.createObjectStore('chunks', { keyPath: ['rec', 'seq'] });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('PixelCam ist in einem anderen Tab geöffnet.'));
  });
}
function deleteDb(name) {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}

// ---------- Krypto-Helfer ----------
async function deriveKek(password, salt, iterations) {
  const base = await subtle.importKey('raw', enc(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}
async function encryptWith(key, data, aad) {
  const iv = randomBytes(12);
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, data);
  return { iv, ct };
}
function decryptWith(key, iv, ct, aad) {
  return subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, ct);
}
async function unwrapFileKey(password, kdf, wrapped) {
  const kek = await deriveKek(password, kdf.salt, kdf.iterations);
  let raw;
  try {
    raw = new Uint8Array(await decryptWith(kek, wrapped.iv, wrapped.ct, WRAP_AAD));
  } catch {
    return null; // falsches Passwort (GCM-Authentifizierung schlägt fehl)
  }
  const key = await subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  raw.fill(0);
  return key;
}

export class Vault {
  #db = null;
  #key = null;

  constructor({ ttlMs = 60 * 60 * 1000 } = {}) {
    this.ttlMs = ttlMs;
  }

  static supported() {
    return !!(subtle && globalThis.indexedDB && globalThis.isSecureContext);
  }

  get ready() { return !!this.#key; }

  /** Öffnet den Speicher und erzeugt beim ersten Mal den Geräteschlüssel. */
  async open() {
    if (this.#key) return;
    this.#db = await openDb();
    let key = await promisify(this.#db.transaction('config').objectStore('config').get('deviceKey'));
    if (!(key instanceof CryptoKey)) {
      key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      const tx = this.#db.transaction('config', 'readwrite');
      tx.objectStore('config').put(key, 'deviceKey');
      await done(tx);
    }
    this.#key = key;
    // Reste der alten Passwort-Version entfernen.
    try {
      const dbs = await indexedDB.databases?.();
      if (!dbs || dbs.some(d => d.name === LEGACY_DB)) await deleteDb(LEGACY_DB);
    } catch { /* egal */ }
  }

  #requireKey() {
    if (!this.#key) throw new Error('Speicher ist nicht bereit.');
    return this.#key;
  }

  // ---------- Aufnahmen ----------
  async listRecordings() {
    const key = this.#requireKey();
    const rows = await promisify(this.#db.transaction('recordings').objectStore('recordings').getAll());
    const list = [];
    for (const row of rows) {
      let meta;
      try {
        meta = JSON.parse(dec(await decryptWith(key, row.metaIv, row.metaCt, metaAad(row.id))));
      } catch {
        meta = { created: 0, broken: true };
      }
      list.push({
        id: row.id, status: row.status, size: row.size, chunkCount: row.chunkCount,
        hasThumb: !!row.thumbCt, kept: !!row.kept, expiresAt: row.kept ? null : row.expiresAt ?? null, meta,
      });
    }
    return list.sort((a, b) => (b.meta.created || 0) - (a.meta.created || 0));
  }

  async getThumbnail(id) {
    const key = this.#requireKey();
    const row = await promisify(this.#db.transaction('recordings').objectStore('recordings').get(id));
    if (!row?.thumbCt) return null;
    const buf = await decryptWith(key, row.thumbIv, row.thumbCt, thumbAad(id));
    return new Blob([buf], { type: 'image/jpeg' });
  }

  async #patchRow(id, patch) {
    const tx = this.#db.transaction('recordings', 'readwrite');
    const store = tx.objectStore('recordings');
    const row = await promisify(store.get(id));
    if (row) store.put({ ...row, ...patch });
    await done(tx);
    return !!row;
  }

  /** Aufnahme behalten: wird nicht mehr automatisch gelöscht. */
  markKept(id) {
    return this.#patchRow(id, { kept: true, expiresAt: null });
  }

  /** Löscht abgelaufene Aufnahmen. Gibt die Anzahl gelöschter zurück. */
  async purgeExpired(skipId = null) {
    if (!this.#db) return 0;
    const rows = await promisify(this.#db.transaction('recordings').objectStore('recordings').getAll());
    const now = Date.now();
    const expired = rows.filter(r => !r.kept && r.expiresAt && r.expiresAt <= now && r.id !== skipId);
    for (const r of expired) await this.deleteRecording(r.id);
    return expired.length;
  }

  /**
   * Beginnt eine neue verschlüsselte Aufnahme. Jeder Datenblock des
   * MediaRecorders wird sofort verschlüsselt geschrieben – unverschlüsselte
   * Videodaten landen nie auf dem Speicher.
   */
  async startRecording(initialMeta, onError) {
    const key = this.#requireKey();
    const db = this.#db;
    const id = randomId();
    const ttl = this.ttlMs;
    const m = await encryptWith(key, enc(JSON.stringify(initialMeta)), metaAad(id));
    {
      const tx = db.transaction('recordings', 'readwrite');
      tx.objectStore('recordings').put({
        id, status: 'recording', size: 0, chunkCount: 0, metaIv: m.iv, metaCt: m.ct,
        kept: false, expiresAt: Date.now() + ttl,
      });
      await done(tx);
    }
    let seq = 0;
    let size = 0;
    let failure = null;
    let chain = Promise.resolve();

    return {
      id,
      append(blob) {
        if (failure || !blob || !blob.size) return;
        const s = seq++;
        chain = chain.then(async () => {
          if (failure) return;
          const buf = await blob.arrayBuffer();
          const c = await encryptWith(key, buf, chunkAad(id, s));
          const tx = db.transaction('chunks', 'readwrite');
          tx.objectStore('chunks').put({ rec: id, seq: s, iv: c.iv, ct: c.ct });
          await done(tx);
          size += buf.byteLength;
        }).catch((err) => {
          failure = err;
          onError?.(err);
        });
      },
      finish: async (meta, thumbBlob) => {
        await chain;
        const fm = await encryptWith(key, enc(JSON.stringify({ ...meta, size })), metaAad(id));
        const patch = {
          status: failure ? 'partial' : 'done', size, chunkCount: seq, metaIv: fm.iv, metaCt: fm.ct,
          expiresAt: Date.now() + ttl, // 1 Stunde ab Fertigstellung
        };
        if (thumbBlob) {
          const t = await encryptWith(key, await thumbBlob.arrayBuffer(), thumbAad(id));
          patch.thumbIv = t.iv;
          patch.thumbCt = t.ct;
        }
        await this.#patchRow(id, patch);
        if (failure) throw failure;
        return id;
      },
      deleteSelf: () => this.deleteRecording(id),
    };
  }

  async #readChunks(id, onChunk) {
    for (let from = 0; ; from += BATCH) {
      const range = IDBKeyRange.bound([id, from], [id, from + BATCH - 1]);
      const rows = await promisify(this.#db.transaction('chunks').objectStore('chunks').getAll(range));
      if (!rows.length) {
        const rest = await promisify(this.#db.transaction('chunks').objectStore('chunks')
          .count(IDBKeyRange.bound([id, from], [id, Infinity])));
        if (!rest) break;
        continue;
      }
      for (const row of rows) await onChunk(row);
    }
  }

  async #getRow(id) {
    return promisify(this.#db.transaction('recordings').objectStore('recordings').get(id));
  }

  async getRecordingBlob(id) {
    const key = this.#requireKey();
    const row = await this.#getRow(id);
    if (!row || (!row.kept && row.expiresAt && row.expiresAt <= Date.now())) throw new Error('Aufnahme nicht mehr vorhanden.');
    const meta = JSON.parse(dec(await decryptWith(key, row.metaIv, row.metaCt, metaAad(id))));
    const parts = [];
    await this.#readChunks(id, async (c) => {
      parts.push(await decryptWith(key, c.iv, c.ct, chunkAad(id, c.seq)));
    });
    return { blob: new Blob(parts, { type: meta.mime || 'video/webm' }), meta };
  }

  async deleteRecording(id) {
    const tx = this.#db.transaction(['recordings', 'chunks'], 'readwrite');
    tx.objectStore('recordings').delete(id);
    tx.objectStore('chunks').delete(IDBKeyRange.bound([id, 0], [id, Infinity]));
    await done(tx);
  }

  async deleteAll() {
    const tx = this.#db.transaction(['recordings', 'chunks'], 'readwrite');
    tx.objectStore('recordings').clear();
    tx.objectStore('chunks').clear();
    await done(tx);
  }

  // ---------- Export / Import (.pxcam) ----------
  // Format: 8 Byte Magic | uint32 LE Header-Länge | Header-JSON |
  //         pro Chunk: uint32 LE Länge | 12 Byte IV | Ciphertext
  // Für den Export wird alles mit einem neuen Dateischlüssel verschlüsselt,
  // der mit einem selbst gewählten Passwort (PBKDF2) geschützt ist – so lässt
  // sich die Datei auf jedem Gerät mit diesem Passwort öffnen.
  async exportRecording(id, password) {
    const key = this.#requireKey();
    const row = await this.#getRow(id);
    if (!row) throw new Error('Aufnahme nicht gefunden.');

    const salt = randomBytes(16);
    const kek = await deriveKek(password, salt, KDF_ITERATIONS);
    const raw = randomBytes(32);
    const wrapped = await encryptWith(kek, raw, WRAP_AAD);
    const fileKey = await subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    raw.fill(0);

    const meta = await decryptWith(key, row.metaIv, row.metaCt, metaAad(id));
    const fm = await encryptWith(fileKey, meta, metaAad(id));
    let ft = null;
    if (row.thumbCt) {
      const thumb = await decryptWith(key, row.thumbIv, row.thumbCt, thumbAad(id));
      ft = await encryptWith(fileKey, thumb, thumbAad(id));
    }
    const parts = [];
    let count = 0;
    await this.#readChunks(id, async (c) => {
      const plain = await decryptWith(key, c.iv, c.ct, chunkAad(id, c.seq));
      const e = await encryptWith(fileKey, plain, chunkAad(id, count));
      const len = new Uint8Array(4);
      new DataView(len.buffer).setUint32(0, 12 + e.ct.byteLength, true);
      parts.push(len, e.iv, e.ct);
      count++;
    });
    const header = enc(JSON.stringify({
      v: 1,
      kdf: { salt: b64(salt), iterations: KDF_ITERATIONS, hash: 'SHA-256' },
      wrapped: { iv: b64(wrapped.iv), ct: b64(wrapped.ct) },
      rec: {
        id,
        metaIv: b64(fm.iv), metaCt: b64(fm.ct),
        thumbIv: ft ? b64(ft.iv) : null, thumbCt: ft ? b64(ft.ct) : null,
        chunks: count,
      },
    }));
    const hlen = new Uint8Array(4);
    new DataView(hlen.buffer).setUint32(0, header.byteLength, true);
    return new Blob([FILE_MAGIC, hlen, header, ...parts], { type: 'application/octet-stream' });
  }

  /** Liest eine .pxcam-Datei, entschlüsselt sie mit ihrem Passwort und
   *  speichert sie neu verschlüsselt (mit 1-Stunden-Frist) in der App. */
  async importFile(file, password) {
    this.#requireKey();
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (head.length < 12 || FILE_MAGIC.some((b, i) => head[i] !== b)) throw new Error('Keine gültige PixelCam-Datei.');
    const hlen = new DataView(head.buffer).getUint32(8, true);
    const header = JSON.parse(dec(await file.slice(12, 12 + hlen).arrayBuffer()));
    if (header.v !== 1) throw new Error('Dateiversion wird nicht unterstützt.');
    const fileKey = await unwrapFileKey(password,
      { salt: unb64(header.kdf.salt), iterations: header.kdf.iterations },
      { iv: unb64(header.wrapped.iv), ct: unb64(header.wrapped.ct) });
    if (!fileKey) return null;

    const src = header.rec;
    const meta = JSON.parse(dec(await decryptWith(fileKey, unb64(src.metaIv), unb64(src.metaCt), metaAad(src.id))));
    const thumb = src.thumbCt
      ? await decryptWith(fileKey, unb64(src.thumbIv), unb64(src.thumbCt), thumbAad(src.id))
      : null;

    const writer = await this.startRecording(meta);
    let offset = 12 + hlen;
    try {
      for (let s = 0; s < src.chunks; s++) {
        const lenBuf = await file.slice(offset, offset + 4).arrayBuffer();
        const len = new DataView(lenBuf).getUint32(0, true);
        const body = new Uint8Array(await file.slice(offset + 4, offset + 4 + len).arrayBuffer());
        offset += 4 + len;
        const plain = await decryptWith(fileKey, body.subarray(0, 12), body.subarray(12), chunkAad(src.id, s));
        writer.append(new Blob([plain]));
      }
      await writer.finish({ ...meta, imported: Date.now() }, thumb ? new Blob([thumb], { type: 'image/jpeg' }) : null);
    } catch (err) {
      await writer.deleteSelf().catch(() => {});
      throw err;
    }
    return writer.id;
  }

  async estimate() {
    try { return await navigator.storage?.estimate?.(); } catch { return null; }
  }
  async persist() {
    try { return await navigator.storage?.persist?.(); } catch { return false; }
  }
  async persisted() {
    try { return await navigator.storage?.persisted?.(); } catch { return false; }
  }
}
