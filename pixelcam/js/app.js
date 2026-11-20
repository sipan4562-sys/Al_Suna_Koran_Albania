// PixelCam – App-Steuerung (ohne Anmeldung)
import { Vault } from './vault.js';
import { FaceEngine, Processor } from './engine.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');

// ---------------------------------------------------------------- Einstellungen
const DEFAULTS = {
  mode: 'eyes', effect: 'pixel', shape: 'rect', pixelScale: 0.1, padding: 0.4, brows: true,
  barThickness: 0.2, farFaces: false, safety: true, holdMs: 450,
  resolution: '720', quality: 'medium', format: 'auto', audio: true, mirror: true, facing: 'user',
};
const SETTINGS_KEY = 'pixelcam.settings';
function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    const out = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS)) if (k in stored) out[k] = stored[k];
    return out;
  } catch { return { ...DEFAULTS }; }
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* privat-Modus */ }
}
const settings = loadSettings();

// ---------------------------------------------------------------- Zustand
// Aufnahmen werden nach 1 Stunde gelöscht (nur zum Testen per ?debug&ttl=Sekunden änderbar).
const TTL_MS = DEBUG && params.get('ttl') ? Number(params.get('ttl')) * 1000 : 60 * 60 * 1000;
const vault = new Vault({ ttlMs: TTL_MS });
const engine = new FaceEngine();
const els = {
  video: $('#cam'), out: $('#out'),
  statusChip: $('#status-chip'), statusText: $('#status-text'),
  recChip: $('#rec-chip'), recTime: $('#rec-time'), recBtn: $('#rec-btn'),
  flipBtn: $('#flip-btn'), safetyBtn: $('#safety-btn'),
  overlay: $('#cam-overlay'), player: $('#player'), playerVideo: $('#player-video'),
};
const processor = new Processor(els.out, engine, settings);
let storageError = null;
let engineState = 'idle'; // idle | loading | ready | error
let engineProgress = 0;
let engineError = null;
let cameraError = null;
let camStream = null;
let camToken = 0;
let currentView = 'camera';
let rec = null;
const thumbUrls = new Set();
const canRecord = !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream);

// ---------------------------------------------------------------- Hilfen
function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('error', isError);
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), isError ? 4500 : 3200);
}
function fmtDuration(ms) {
  const s = Math.max(0, Math.round((ms || 0) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, '0'), ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
function fmtBytes(b) {
  if (!b) return '0 KB';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return `${b.toFixed(b < 10 && i > 1 ? 1 : 0)} ${u[i]}`;
}
function fmtDate(ts) {
  if (!ts) return 'Unbekanntes Datum';
  return new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
function fmtRemaining(expiresAt) {
  const ms = expiresAt - Date.now();
  if (ms <= 60_000) return 'unter 1 Min.';
  const min = Math.ceil(ms / 60_000);
  return min >= 60 ? `${Math.floor(min / 60)} Std. ${min % 60 ? `${min % 60} Min.` : ''}`.trim() : `${min} Min.`;
}
function fileBase(meta) {
  const d = new Date(meta.created || Date.now());
  const p = n => String(n).padStart(2, '0');
  return `pixelcam_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}
function extFor(mime) { return /mp4/.test(mime || '') ? 'mp4' : 'webm'; }
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// Allgemeiner Eingabe-Dialog. validate(values) → Fehlertext oder null
function ask({ title, text = '', fields = [], okText = 'OK', danger = false, validate }) {
  const dlg = $('#prompt');
  $('#prompt-title').textContent = title;
  $('#prompt-text').textContent = text;
  $('#prompt-error').textContent = '';
  const ok = $('#prompt-ok');
  ok.textContent = okText;
  ok.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
  ok.disabled = false;
  const box = $('#prompt-fields');
  box.replaceChildren();
  for (const f of fields) {
    const label = document.createElement('label');
    label.className = 'field';
    const span = document.createElement('span');
    span.textContent = f.label;
    const input = document.createElement('input');
    input.name = f.name; input.type = f.type || 'text';
    input.autocomplete = f.autocomplete || 'off';
    input.required = true;
    if (f.placeholder) input.placeholder = f.placeholder;
    label.append(span, input);
    box.append(label);
  }
  return new Promise((resolve) => {
    const form = $('#prompt-form');
    const cleanup = (val) => {
      form.removeEventListener('submit', onSubmit);
      $('#prompt-cancel').removeEventListener('click', onCancel);
      dlg.removeEventListener('cancel', onCancel);
      if (dlg.open) dlg.close();
      resolve(val);
    };
    const onCancel = (e) => { e?.preventDefault?.(); cleanup(null); };
    const onSubmit = async (e) => {
      e.preventDefault();
      const values = Object.fromEntries(fields.map(f => [f.name, form.elements[f.name].value]));
      if (validate) {
        ok.disabled = true;
        const prev = ok.textContent;
        ok.textContent = '…';
        let err;
        try { err = await validate(values); } catch (ex) { err = ex?.message || String(ex); }
        ok.disabled = false;
        ok.textContent = prev;
        if (err) { $('#prompt-error').textContent = err; return; }
      }
      cleanup(values || {});
    };
    form.addEventListener('submit', onSubmit);
    $('#prompt-cancel').addEventListener('click', onCancel);
    dlg.addEventListener('cancel', onCancel);
    dlg.showModal();
    box.querySelector('input')?.focus();
  });
}

// ---------------------------------------------------------------- Automatisch löschen
async function purge() {
  if (!vault.ready) return 0;
  let n = 0;
  try { n = await vault.purgeExpired(rec?.writer?.id); } catch (err) { console.error(err); }
  if (n && playerState && !playerState.item.kept && playerState.item.expiresAt <= Date.now()) {
    els.player.close();
    toast('Die Aufnahme wurde nach 1 Stunde automatisch gelöscht.');
  }
  return n;
}
setInterval(async () => {
  const n = await purge();
  if (currentView === 'library') {
    if (n) renderLibrary(); else updateCountdowns();
  }
  if (playerState) updatePlayerExpiry();
}, DEBUG && TTL_MS < 120_000 ? 2_000 : 20_000);

// ---------------------------------------------------------------- Sichtbarkeit
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (rec) { pauseRecording(true); return; }
    if (currentView === 'camera') stopCamera();
  } else {
    if (rec) { pauseRecording(false); return; }
    purge().then((n) => { if (n && currentView === 'library') renderLibrary(); });
    if (currentView === 'camera') startCamera();
  }
});

// ---------------------------------------------------------------- Ansichten
function showView(name, force = false) {
  if (rec && name !== 'camera') { toast('Während der Aufnahme nicht möglich.'); return; }
  if (name === currentView && !force) return;
  currentView = name;
  $$('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.view === name)));
  $$('.view').forEach(v => { v.hidden = v.dataset.view !== name; });
  if (name === 'camera') { startCamera(); ensureEngine(); } else stopCamera();
  if (name === 'library') renderLibrary(); else clearLibrary();
  if (name === 'settings') updateStorageInfo();
}
$$('.tab').forEach(t => t.addEventListener('click', () => showView(t.dataset.view)));
$$('[data-goto]').forEach(b => b.addEventListener('click', () => showView(b.dataset.goto)));

// ---------------------------------------------------------------- Gesichtserkennung
function ensureEngine() {
  if (engineState === 'ready' || engineState === 'loading') return;
  engineState = 'loading';
  engineProgress = 0;
  updateOverlay();
  engine.init({
    onProgress: (p) => { engineProgress = p; updateOverlay(); },
  }).then(() => {
    engineState = 'ready';
    updateOverlay();
    updateRecButton();
  }).catch((err) => {
    console.error(err);
    engineState = 'error';
    engineError = err;
    updateOverlay();
  });
}

function updateOverlay() {
  const ov = els.overlay;
  const title = $('#overlay-title'), text = $('#overlay-text'), prog = $('#overlay-progress'), btn = $('#overlay-btn');
  const show = (t, x, { progress = null, button = null } = {}) => {
    ov.hidden = false;
    title.textContent = t;
    text.textContent = x;
    prog.hidden = progress == null;
    if (progress != null) $('#overlay-bar').style.width = `${Math.round(progress * 100)}%`;
    btn.hidden = !button;
    if (button) { btn.textContent = button.text; btn.onclick = button.onClick; }
  };
  if (storageError) return show('Speicher nicht verfügbar', storageError);
  if (cameraError) {
    return show(cameraError.title, cameraError.text, {
      button: { text: 'Erneut versuchen', onClick: () => { cameraError = null; updateOverlay(); startCamera(); } },
    });
  }
  if (engineState === 'loading') {
    return show('Gesichtserkennung wird geladen …', 'Einmalig ca. 12 MB – danach funktioniert PixelCam auch offline. Bis dahin ist das ganze Bild verpixelt.', { progress: engineProgress });
  }
  if (engineState === 'error') {
    return show('Gesichtserkennung konnte nicht geladen werden',
      `${engineError?.message || 'Unbekannter Fehler'}. Prüfe deine Internetverbindung. Ohne Erkennung bleibt das Bild komplett verpixelt.`,
      { button: { text: 'Erneut versuchen', onClick: () => { engineState = 'idle'; ensureEngine(); } } });
  }
  ov.hidden = true;
}

let lastStatus = '';
processor.onStats = (st) => {
  let text;
  switch (st.state) {
    case 'loading': text = 'Erkennung lädt – alles verpixelt'; break;
    case 'safety': text = 'Kein Gesicht – alles verpixelt'; break;
    case 'none': text = 'Kein Gesicht erkannt'; break;
    default: {
      const what = settings.effect === 'bar' ? 'abgedeckt' : 'verpixelt';
      const n = Math.max(1, st.faces);
      text = n > 1
        ? `${n} Gesichter · ${settings.mode === 'face' ? 'Gesichter' : 'Augen'} ${what}`
        : `${settings.mode === 'face' ? 'Gesicht' : 'Augen'} ${what}`;
    }
  }
  const key = st.state + text;
  if (key !== lastStatus) {
    lastStatus = key;
    els.statusText.textContent = text;
    els.statusChip.dataset.state = st.state;
  }
};

// ---------------------------------------------------------------- Kamera
async function startCamera() {
  if (camStream || storageError) return;
  const token = ++camToken;
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError = { title: 'Keine Kamera verfügbar', text: 'Dein Browser erlaubt hier keinen Kamerazugriff. Öffne PixelCam über HTTPS in einem aktuellen Browser.' };
    updateOverlay();
    return;
  }
  const h = Number(settings.resolution);
  const w = Math.round((h * 16) / 9);
  const video = { facingMode: settings.facing, width: { ideal: w }, height: { ideal: h }, frameRate: { ideal: 30, max: 30 } };
  const audio = settings.audio ? { echoCancellation: true, noiseSuppression: true } : false;
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video, audio });
  } catch (err) {
    if (audio && err.name !== 'NotAllowedError') {
      try { stream = await navigator.mediaDevices.getUserMedia({ video, audio: false }); toast('Mikrofon nicht verfügbar – Aufnahme ohne Ton.'); } catch (err2) { err = err2; }
    }
    if (!stream) {
      if (token !== camToken) return;
      cameraError = err.name === 'NotAllowedError'
        ? { title: 'Kamerazugriff verweigert', text: 'Erlaube den Kamerazugriff in den Browser-Einstellungen (Schloss-Symbol in der Adressleiste) und versuche es erneut.' }
        : err.name === 'NotFoundError' || err.name === 'OverconstrainedError'
          ? { title: 'Keine Kamera gefunden', text: 'Schließe eine Kamera an oder prüfe, ob eine andere App sie gerade benutzt.' }
          : { title: 'Kamera konnte nicht gestartet werden', text: err.message || err.name };
      updateOverlay();
      return;
    }
  }
  if (token !== camToken || currentView !== 'camera') {
    stream.getTracks().forEach(t => t.stop());
    return;
  }
  cameraError = null;
  camStream = stream;
  els.video.srcObject = stream;
  try { await els.video.play(); } catch { /* autoplay – muted, sollte klappen */ }
  processor.start(els.video);
  updateOverlay();
  updateMirror();
  updateRecButton();
  navigator.mediaDevices.enumerateDevices().then((devs) => {
    els.flipBtn.hidden = devs.filter(d => d.kind === 'videoinput').length < 2;
  }).catch(() => {});
}

function stopCamera() {
  camToken++;
  processor.stop();
  if (camStream) camStream.getTracks().forEach(t => t.stop());
  camStream = null;
  els.video.srcObject = null;
  updateRecButton();
}

function restartCamera() {
  if (rec || currentView !== 'camera') return;
  stopCamera();
  startCamera();
}

function updateMirror() {
  const facing = camStream?.getVideoTracks()[0]?.getSettings?.().facingMode;
  const isFront = facing ? facing === 'user' : settings.facing === 'user';
  els.out.classList.toggle('mirrored', !!settings.mirror && isFront);
}

els.flipBtn.addEventListener('click', () => {
  if (rec) return;
  settings.facing = settings.facing === 'user' ? 'environment' : 'user';
  saveSettings();
  restartCamera();
});

els.safetyBtn.addEventListener('click', () => {
  settings.safety = !settings.safety;
  saveSettings();
  syncUI();
  toast(settings.safety ? 'Sicherheitsmodus an: ohne erkanntes Gesicht wird alles verpixelt.' : 'Sicherheitsmodus aus.');
});

// ---------------------------------------------------------------- Aufnahme
const MP4 = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4'];
const WEBM = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
function supports(t) { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } }
function pickMime() {
  if (!window.MediaRecorder) return '';
  const list = settings.format === 'webm' ? [...WEBM, ...MP4] : [...MP4, ...WEBM];
  return list.find(supports) || '';
}
const BITRATES = { low: 1_500_000, medium: 4_000_000, high: 8_000_000 };

function updateRecButton() {
  const ready = canRecord && vault.ready && engineState === 'ready' && !!camStream;
  els.recBtn.disabled = !ready && !rec;
  els.recBtn.classList.toggle('recording', !!rec);
  els.recBtn.setAttribute('aria-label', rec ? 'Aufnahme beenden' : 'Aufnahme starten');
  els.flipBtn.disabled = !!rec;
  $$('.tab').forEach(t => { t.disabled = !!rec && t.dataset.view !== 'camera'; });
}

els.recBtn.addEventListener('click', () => (rec ? stopRecording() : startRecording()));

async function startRecording() {
  if (rec || !camStream) return;
  if (!canRecord) { toast('Dein Browser unterstützt keine Videoaufnahme.', true); return; }
  if (engineState !== 'ready') { toast('Gesichtserkennung ist noch nicht bereit.'); return; }
  const mimeType = pickMime();
  const canvasStream = els.out.captureStream(30);
  const vTrack = canvasStream.getVideoTracks()[0];
  const tracks = [vTrack, ...(settings.audio ? camStream.getAudioTracks() : [])];
  let recorder;
  try {
    recorder = new MediaRecorder(new MediaStream(tracks), {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: BITRATES[settings.quality] || BITRATES.medium,
      audioBitsPerSecond: 128_000,
    });
  } catch (err) {
    vTrack.stop();
    toast(`Aufnahme nicht möglich: ${err.message}`, true);
    return;
  }
  const mime = recorder.mimeType || mimeType || 'video/webm';
  const meta = {
    created: Date.now(), mime, ext: extFor(mime), width: els.out.width, height: els.out.height,
    mode: settings.mode, effect: settings.effect, audio: tracks.length > 1,
  };
  let writer;
  try {
    writer = await vault.startRecording(meta, (err) => {
      console.error(err);
      toast(/quota/i.test(err?.name || err?.message) ? 'Speicher voll – Aufnahme wurde beendet.' : `Speicherfehler: ${err.message}`, true);
      stopRecording();
    });
  } catch (err) {
    vTrack.stop();
    toast(`Speicher nicht verfügbar: ${err.message}`, true);
    return;
  }

  rec = { recorder, writer, vTrack, meta, startedAt: performance.now(), pausedTotal: 0, pausedAt: 0, thumb: null, wakeLock: null, stopping: false };
  recorder.ondataavailable = (e) => writer.append(e.data);
  recorder.onerror = (e) => { toast(`Aufnahmefehler: ${e.error?.message || 'unbekannt'}`, true); stopRecording(); };
  recorder.onstop = () => finalizeRecording(rec);
  recorder.start(1000);

  setTimeout(() => { if (rec && !rec.thumb) rec.thumb = processor.snapshot(); }, 700);
  try { rec.wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* optional */ }

  els.recChip.hidden = false;
  els.recChip.classList.remove('paused');
  rec.timer = setInterval(updateRecTime, 250);
  updateRecTime();
  updateRecButton();
}

function elapsed(r) {
  const now = performance.now();
  return now - r.startedAt - r.pausedTotal - (r.pausedAt ? now - r.pausedAt : 0);
}
function updateRecTime() { if (rec) els.recTime.textContent = fmtDuration(elapsed(rec)); }

function pauseRecording(pause) {
  if (!rec || rec.stopping) return;
  const r = rec.recorder;
  if (pause && r.state === 'recording') {
    r.pause(); rec.pausedAt = performance.now(); els.recChip.classList.add('paused');
  } else if (!pause && r.state === 'paused') {
    r.resume(); rec.pausedTotal += performance.now() - rec.pausedAt; rec.pausedAt = 0; els.recChip.classList.remove('paused');
  }
}

function stopRecording() {
  if (!rec || rec.stopping) return;
  rec.stopping = true;
  rec.duration = elapsed(rec);
  els.recBtn.disabled = true;
  els.recTime.textContent = 'Speichert …';
  try { rec.recorder.state !== 'inactive' ? rec.recorder.stop() : finalizeRecording(rec); } catch { finalizeRecording(rec); }
}

async function finalizeRecording(r) {
  if (!r || r.finalized) return;
  r.finalized = true;
  clearInterval(r.timer);
  r.vTrack.stop();
  try { await r.wakeLock?.release(); } catch { /* egal */ }
  let thumb = null;
  try { thumb = await (r.thumb || processor.snapshot()); } catch { /* egal */ }
  try {
    await r.writer.finish({ ...r.meta, duration: Math.round(r.duration ?? elapsed(r)) }, thumb);
    toast(`Gespeichert ✓ – wird um ${fmtTime(Date.now() + TTL_MS)} gelöscht, außer du lädst sie herunter.`);
  } catch (err) {
    console.error(err);
    toast(`Aufnahme nur teilweise gespeichert: ${err.message}`, true);
  }
  rec = null;
  els.recChip.hidden = true;
  updateRecButton();
}

window.addEventListener('keydown', (e) => {
  if (currentView !== 'camera' || e.repeat) return;
  if (e.target.closest?.('input, select, textarea, dialog')) return;
  if (e.key === 'r' || e.key === 'R' || (e.key === ' ' && e.target === document.body)) {
    e.preventDefault();
    if (!els.recBtn.disabled) els.recBtn.click();
  }
});
window.addEventListener('beforeunload', (e) => { if (rec) { e.preventDefault(); e.returnValue = ''; } });

// ---------------------------------------------------------------- Bibliothek
function clearLibrary() {
  $('#lib-grid').replaceChildren();
  thumbUrls.forEach(u => URL.revokeObjectURL(u));
  thumbUrls.clear();
}

function expiryTag(item, tag) {
  if (item.kept) {
    tag.className = 'rec-tag tag-keep';
    tag.textContent = '✓ Behalten';
  } else if (item.expiresAt) {
    tag.className = 'rec-tag tag-expire';
    tag.textContent = `Löscht sich in ${fmtRemaining(item.expiresAt)}`;
  } else {
    tag.textContent = '';
  }
}

let libItems = [];
function updateCountdowns() {
  for (const { item, tag } of libItems) expiryTag(item, tag);
}

let libToken = 0;
async function renderLibrary() {
  const token = ++libToken;
  let list;
  try {
    await purge();
    list = await vault.listRecordings();
  } catch (err) { toast(err.message, true); return; }
  if (token !== libToken || currentView !== 'library') return;
  clearLibrary();
  libItems = [];
  const grid = $('#lib-grid');
  $('#lib-empty').hidden = list.length > 0;
  grid.hidden = list.length === 0;
  const total = list.reduce((s, r) => s + (r.size || 0), 0);
  $('#lib-summary').textContent = list.length
    ? `${list.length} ${list.length === 1 ? 'Aufnahme' : 'Aufnahmen'} · ${fmtBytes(total)} · AES-256 verschlüsselt`
    : 'Verschlüsselt gespeichert';

  for (const item of list) {
    const card = document.createElement('button');
    card.className = 'rec-card';
    card.type = 'button';
    const thumb = document.createElement('div');
    thumb.className = 'rec-thumb';
    const badge = document.createElement('span');
    badge.className = 'rec-badge';
    badge.textContent = item.meta.duration ? fmtDuration(item.meta.duration) : '––:––';
    const tag = document.createElement('span');
    expiryTag(item, tag);
    thumb.append(badge, tag);
    const info = document.createElement('div');
    info.className = 'rec-info';
    const strong = document.createElement('strong');
    strong.textContent = fmtDate(item.meta.created);
    const span = document.createElement('span');
    const effect = item.meta.effect === 'bar' ? 'Balken' : 'Pixel';
    span.textContent = `${fmtBytes(item.size)} · ${(item.meta.ext || extFor(item.meta.mime)).toUpperCase()} · ${item.meta.mode === 'face' ? 'Gesicht' : 'Augen'} (${effect})${item.status === 'done' ? '' : ' · unvollständig'}`;
    info.append(strong, span);
    card.append(thumb, info);
    card.addEventListener('click', () => openPlayer(item));
    grid.append(card);
    libItems.push({ item, tag });

    if (item.hasThumb) {
      vault.getThumbnail(item.id).then((blob) => {
        if (!blob || token !== libToken) return;
        const url = URL.createObjectURL(blob);
        thumbUrls.add(url);
        const img = document.createElement('img');
        img.alt = '';
        img.src = url;
        thumb.prepend(img);
      }).catch(() => {});
    }
  }
}

// Import
const importInput = $('#import-input');
importInput.addEventListener('change', async () => {
  const file = importInput.files?.[0];
  importInput.value = '';
  if (!file) return;
  const res = await ask({
    title: 'Verschlüsselte Datei öffnen',
    text: `„${file.name}“ – gib das Passwort ein, das beim Exportieren festgelegt wurde.`,
    fields: [{ name: 'pw', label: 'Passwort der Datei', type: 'password', autocomplete: 'current-password' }],
    okText: 'Entschlüsseln',
    validate: async (v) => {
      const id = await vault.importFile(file, v.pw);
      return id ? null : 'Falsches Passwort.';
    },
  });
  if (res) { toast('Aufnahme importiert ✓ – wird in 1 Stunde gelöscht, außer du speicherst sie.'); renderLibrary(); }
});

// ---------------------------------------------------------------- Player
let playerState = null;

function updatePlayerExpiry() {
  const p = $('#player-expiry');
  if (!playerState) { p.textContent = ''; return; }
  const { item } = playerState;
  p.classList.toggle('kept', !!item.kept);
  p.textContent = item.kept
    ? '✓ Heruntergeladen – diese Aufnahme bleibt erhalten.'
    : item.expiresAt
      ? `Wird um ${fmtTime(item.expiresAt)} automatisch gelöscht (in ${fmtRemaining(item.expiresAt)}). Speichern, teilen oder exportieren, um sie zu behalten.`
      : '';
}

async function keep() {
  if (!playerState || playerState.item.kept) return;
  try {
    await vault.markKept(playerState.item.id);
    playerState.item.kept = true;
    playerState.item.expiresAt = null;
    updatePlayerExpiry();
    if (currentView === 'library') updateCountdowns();
  } catch (err) { console.error(err); }
}

async function openPlayer(item) {
  const v = els.playerVideo;
  playerState = null;
  $('#player-title').textContent = fmtDate(item.meta.created);
  $('#player-meta').textContent = 'Wird entschlüsselt …';
  $('#player-expiry').textContent = '';
  $('#pl-share').hidden = true;
  els.player.showModal();
  try {
    const { blob, meta } = await vault.getRecordingBlob(item.id);
    if (!els.player.open) return;
    const url = URL.createObjectURL(blob);
    playerState = { item, blob, meta, url };
    v.src = url;
    $('#player-meta').textContent = [
      meta.duration ? fmtDuration(meta.duration) : null,
      fmtBytes(blob.size),
      (meta.ext || extFor(meta.mime)).toUpperCase(),
      meta.width && meta.height ? `${meta.width}×${meta.height}` : null,
      `${meta.mode === 'face' ? 'Gesicht' : 'Augen'} ${meta.effect === 'bar' ? 'abgedeckt' : 'verpixelt'}`,
    ].filter(Boolean).join(' · ');
    updatePlayerExpiry();
    const file = new File([blob], `${fileBase(meta)}.${meta.ext || extFor(meta.mime)}`, { type: blob.type });
    $('#pl-share').hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
  } catch (err) {
    console.error(err);
    $('#player-meta').textContent = `Fehler: ${err.message}`;
  }
}

els.player.addEventListener('close', () => {
  const v = els.playerVideo;
  v.pause();
  v.removeAttribute('src');
  v.load();
  if (playerState) URL.revokeObjectURL(playerState.url);
  playerState = null;
  if (currentView === 'library') updateCountdowns();
});
$$('[data-close]', els.player).forEach(b => b.addEventListener('click', () => els.player.close()));
els.player.addEventListener('click', (e) => { if (e.target === els.player) els.player.close(); });

$('#pl-download').addEventListener('click', async () => {
  if (!playerState) return;
  const { blob, meta } = playerState;
  downloadBlob(blob, `${fileBase(meta)}.${meta.ext || extFor(meta.mime)}`);
  await keep();
  toast('Video wird gespeichert ✓ – die Aufnahme wird jetzt nicht mehr automatisch gelöscht.');
});
$('#pl-share').addEventListener('click', async () => {
  if (!playerState) return;
  const { blob, meta } = playerState;
  const file = new File([blob], `${fileBase(meta)}.${meta.ext || extFor(meta.mime)}`, { type: blob.type });
  try {
    await navigator.share({ files: [file], title: 'PixelCam' });
    await keep();
    toast('Geteilt ✓ – die Aufnahme bleibt erhalten.');
  } catch (err) { if (err.name !== 'AbortError') toast(err.message, true); }
});
$('#pl-export').addEventListener('click', async () => {
  if (!playerState) return;
  const state = playerState;
  const res = await ask({
    title: 'Verschlüsselt exportieren',
    text: 'Lege ein Passwort für die Datei fest. Nur damit lässt sie sich später (auf jedem Gerät) über „Datei öffnen“ wieder abspielen.',
    fields: [
      { name: 'pw', label: 'Passwort für die Datei', type: 'password', autocomplete: 'new-password' },
      { name: 'pw2', label: 'Passwort wiederholen', type: 'password', autocomplete: 'new-password' },
    ],
    okText: 'Exportieren',
    validate: async (v) => {
      if (v.pw.length < 6) return 'Mindestens 6 Zeichen.';
      if (v.pw !== v.pw2) return 'Die Passwörter stimmen nicht überein.';
      const blob = await vault.exportRecording(state.item.id, v.pw);
      downloadBlob(blob, `${fileBase(state.meta)}.pxcam`);
      return null;
    },
  });
  if (!res) return;
  if (playerState === state) await keep();
  else await vault.markKept(state.item.id).catch(() => {});
  toast('Verschlüsselte .pxcam-Datei wird gespeichert ✓ – die Aufnahme bleibt erhalten.');
});
$('#pl-delete').addEventListener('click', async () => {
  if (!playerState) return;
  const { item } = playerState;
  const res = await ask({ title: 'Aufnahme löschen?', text: 'Die Aufnahme wird sofort und unwiderruflich gelöscht.', okText: 'Löschen', danger: true });
  if (!res) return;
  await vault.deleteRecording(item.id);
  els.player.close();
  toast('Aufnahme gelöscht.');
  renderLibrary();
});

// ---------------------------------------------------------------- Einstellungen-UI
function syncUI() {
  $$('[data-set]').forEach(b => b.setAttribute('aria-checked', String(String(settings[b.dataset.set]) === b.dataset.value)));
  $$('[data-mode]').forEach(b => b.setAttribute('aria-checked', String(settings.mode === b.dataset.mode)));
  $$('[data-show]').forEach((r) => {
    r.hidden = !r.dataset.show.split(' ').every((cond) => {
      const [k, v] = cond.split(':');
      return String(settings[k]) === v;
    });
  });
  $('#pixelScale').value = settings.pixelScale;
  $('#padding').value = settings.padding;
  $('#barThickness').value = settings.barThickness;
  const ps = settings.pixelScale;
  $('#pixel-label').textContent = ps < 0.07 ? 'Fein' : ps < 0.12 ? 'Mittel' : ps < 0.16 ? 'Grob' : 'Sehr grob';
  const bt = settings.barThickness;
  $('#bar-label').textContent = bt < 0.15 ? 'Sehr dünn' : bt < 0.4 ? 'Dünn' : bt < 0.7 ? 'Mittel' : 'Dick';
  const pd = settings.padding;
  const isBar = settings.effect === 'bar' && settings.mode === 'eyes';
  $('#pad-title').textContent = isBar ? 'Balkenlänge' : 'Abdeckung';
  $('#pad-label').textContent = isBar
    ? (pd < 0.25 ? 'Kurz' : pd < 0.65 ? 'Normal' : 'Lang')
    : (pd < 0.25 ? 'Knapp' : pd < 0.65 ? 'Normal' : 'Großzügig');
  for (const id of ['brows', 'farFaces', 'safety', 'audio', 'mirror']) $(`#${id}`).checked = !!settings[id];
  for (const id of ['resolution', 'quality', 'format']) $(`#${id}`).value = String(settings[id]);
  els.safetyBtn.setAttribute('aria-pressed', String(!!settings.safety));
  els.safetyBtn.title = settings.safety ? 'Sicherheitsmodus an' : 'Sicherheitsmodus aus';
  updateMirror();
}

function setSetting(key, value) {
  const prev = settings[key];
  settings[key] = value;
  saveSettings();
  syncUI();
  if (prev === value) return;
  if (key === 'resolution' || key === 'audio') restartCamera();
}

$$('[data-set]').forEach(b => b.addEventListener('click', () => setSetting(b.dataset.set, b.dataset.value)));
$$('[data-mode]').forEach(b => b.addEventListener('click', () => setSetting('mode', b.dataset.mode)));
['pixelScale', 'padding', 'barThickness'].forEach(id => $(`#${id}`).addEventListener('input', e => setSetting(id, Number(e.target.value))));
['brows', 'farFaces', 'safety', 'audio', 'mirror'].forEach(id => $(`#${id}`).addEventListener('change', e => setSetting(id, e.target.checked)));
['resolution', 'quality', 'format'].forEach(id => $(`#${id}`).addEventListener('change', e => setSetting(id, e.target.value)));

// Format-Hinweis: Was kann dieser Browser?
(function formatSupport() {
  if (!window.MediaRecorder) { $('#format-hint').textContent = 'Aufnahme wird nicht unterstützt'; return; }
  const mp4 = MP4.some(supports), webm = WEBM.some(supports);
  $('#format').querySelector('[value="mp4"]').disabled = !mp4;
  $('#format').querySelector('[value="webm"]').disabled = !webm;
  $('#format-hint').textContent = mp4 ? 'MP4 läuft fast überall' : 'Dieser Browser kann nur WebM aufnehmen';
})();

$('#wipe-btn').addEventListener('click', async () => {
  const res = await ask({
    title: 'Alle Aufnahmen löschen?',
    text: 'Alle Aufnahmen in PixelCam werden sofort und unwiderruflich gelöscht.',
    okText: 'Alle löschen', danger: true,
  });
  if (!res) return;
  await vault.deleteAll();
  updateStorageInfo();
  toast('Alle Aufnahmen gelöscht.');
});

async function updateStorageInfo() {
  const est = await vault.estimate();
  const info = $('#storage-info');
  info.textContent = est?.usage != null
    ? `${fmtBytes(est.usage)}${est.quota ? ` von ${fmtBytes(est.quota)} verfügbar` : ''}`
    : 'Unbekannt';
}

// ---------------------------------------------------------------- Start
async function init() {
  syncUI();
  if (!Vault.supported()) {
    storageError = window.isSecureContext
      ? 'Dein Browser unterstützt die nötige Verschlüsselung nicht. Bitte nutze einen aktuellen Chrome, Edge, Firefox oder Safari.'
      : 'PixelCam muss über HTTPS geöffnet werden, damit Kamera und Verschlüsselung funktionieren.';
    showView('camera', true);
    updateOverlay();
    return;
  }
  try {
    await vault.open();
    await purge();
  } catch (err) {
    storageError = `${err.message} Im privaten Modus funktioniert PixelCam evtl. nicht.`;
  }
  showView('camera', true);
  updateOverlay();
  vault.persisted().then(p => { if (!p) vault.persist(); });
}

if (DEBUG) window.__pixelcam = { processor, engine, settings, vault };
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
init();
