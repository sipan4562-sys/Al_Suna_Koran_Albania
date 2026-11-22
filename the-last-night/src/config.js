// Globale Konfiguration, Qualitätsstufen und persistente Einstellungen.
export const IS_TOUCH =
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export const IS_MOBILE =
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent) ||
    (IS_TOUCH && /Macintosh/.test(navigator.userAgent)));

export const DEBUG = typeof location !== 'undefined' && /[?&]debug/.test(location.search);

export const QUALITY = {
  low: { pixelRatio: 1.0, shadowSize: 512, bloom: false, lights: 4, msaa: 0, dust: 160, feeds: true },
  medium: { pixelRatio: 1.5, shadowSize: 1024, bloom: false, lights: 6, msaa: 2, dust: 300, feeds: true },
  high: { pixelRatio: 2.0, shadowSize: 2048, bloom: true, lights: 8, msaa: 4, dust: 520, feeds: true },
};

const DEFAULTS = {
  sensitivity: 1.0,
  touchSensitivity: 1.0,
  invertY: false,
  brightness: 1.0,
  volume: 0.85,
  music: 0.7,
  quality: 'auto',
  headBob: true,
  showFps: false,
  fov: 72,
};

const KEY = 'tln_settings_v1';

export const settings = { ...DEFAULTS };

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(settings, DEFAULTS, JSON.parse(raw));
  } catch (e) {
    /* ignore */
  }
  return settings;
}

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch (e) {
    /* ignore */
  }
}

export function resolveQuality() {
  let q = settings.quality;
  if (q === 'auto') q = IS_MOBILE ? 'medium' : 'high';
  return { name: q, ...QUALITY[q] };
}

export const PLAYER = {
  radius: 0.3,
  eyeStand: 1.62,
  eyeCrouch: 0.95,
  heightStand: 1.8,
  heightCrouch: 1.05,
  walk: 2.5,
  sprint: 4.7,
  crouch: 1.25,
  staminaMax: 100,
  staminaDrain: 19,
  staminaRegen: 15,
  healthMax: 100,
  batteryDrain: 0.42, // % pro Sekunde
};

export const MONSTER = {
  radius: 0.36,
  patrolSpeed: 1.35,
  investigateSpeed: 2.1,
  searchSpeed: 1.75,
  chaseSpeed: 3.55,
  chaseSpeedMax: 4.15,
  attackRange: 1.35,
  hitRange: 1.85,
  damage: 52,
  fov: Math.PI * 0.66,
  sight: 15,
};
