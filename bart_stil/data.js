/* ============================================================
   BART_STIL — Struktur der Bartstile (sprachunabhängig)
   Alle Texte liegen in lang.de.js / lang.en.js / lang.ar.js
   und werden zur Laufzeit über die id zusammengeführt.
   ============================================================ */

const LANG = {};

const CAT_KEYS = ['kurz', 'vollbart', 'kinnbart', 'schnurrbart', 'koteletten'];
const FACE_KEYS = ['oval', 'rund', 'eckig', 'herz', 'laenglich', 'dreieck'];

/* level: 0 = Einstieg, 1 = fortgeschritten, 2 = Profi
   upkeep: 1 = gering, 2 = mittel, 3 = hoch                   */
const STYLE_BASE = [
  { id: 'stoppel', cat: 'kurz', level: 0, upkeep: 1,
    faces: ['oval', 'rund', 'eckig', 'herz', 'laenglich', 'dreieck'],
    tools: ['trimmer', 'detail', 'rasierer', 'spiegel'],
    art: { mass: { top: 116, dip: 13 }, mustache: 'natural', texture: 'stubble', hair: 'buzz' } },

  { id: 'kurz-vollbart', cat: 'kurz', level: 0, upkeep: 1,
    faces: ['oval', 'rund', 'herz', 'dreieck'],
    tools: ['trimmer', 'detail', 'schere', 'kamm', 'oel'],
    art: { mass: { top: 110, dip: 15 }, mustache: 'chevron', texture: 'short', hair: 'buzz' } },

  { id: 'faded', cat: 'kurz', level: 2, upkeep: 2,
    faces: ['rund', 'eckig', 'herz'],
    tools: ['trimmer', 'detail', 'buerste', 'spiegel', 'oel'],
    art: { mass: { top: 102, dip: 17 }, mustache: 'chevron', texture: 'short', fade: true, hair: 'buzz' } },

  { id: 'glatt', cat: 'kurz', level: 0, upkeep: 3,
    faces: ['oval', 'rund', 'eckig', 'herz', 'laenglich', 'dreieck'],
    tools: ['rasierer', 'trimmer'],
    art: { mustache: 'none', texture: 'stubble', hair: 'buzz' } },

  { id: 'vollbart', cat: 'vollbart', level: 1, upkeep: 2,
    faces: ['oval', 'rund', 'herz', 'dreieck'],
    tools: ['trimmer', 'schere', 'kamm', 'buerste', 'oel', 'balm'],
    art: { mass: { top: 106, dip: 16 }, mustache: 'chevron', hang: { len: 18, shape: 'round' }, texture: 'solid', hair: 'buzz' } },

  { id: 'garibaldi', cat: 'vollbart', level: 1, upkeep: 2,
    faces: ['oval', 'eckig', 'laenglich'],
    tools: ['schere', 'kamm', 'buerste', 'oel', 'balm', 'foehn'],
    art: { mass: { top: 106, dip: 16 }, mustache: 'walrus', hang: { len: 40, shape: 'round' }, texture: 'solid', hair: 'buzz' } },

  { id: 'bandholz', cat: 'vollbart', level: 2, upkeep: 3,
    faces: ['oval', 'eckig', 'herz'],
    tools: ['buerste', 'kamm', 'oel', 'balm', 'foehn'],
    art: { mass: { top: 103, dip: 16 }, mustache: 'walrus', hang: { len: 62, shape: 'round' }, texture: 'solid', hair: 'buzz' } },

  { id: 'ducktail', cat: 'vollbart', level: 2, upkeep: 2,
    faces: ['rund', 'eckig', 'herz'],
    tools: ['trimmer', 'schere', 'kamm', 'buerste', 'balm'],
    art: { mass: { top: 110, dip: 15 }, mustache: 'chevron', hang: { len: 46, shape: 'point' }, texture: 'solid', hair: 'buzz' } },

  { id: 'verdi', cat: 'vollbart', level: 2, upkeep: 3,
    faces: ['oval', 'eckig', 'laenglich'],
    tools: ['schere', 'kamm', 'wachs', 'balm', 'buerste'],
    art: { mass: { top: 109, dip: 15 }, mustache: 'handlebar', hang: { len: 30, shape: 'round' }, texture: 'solid', hair: 'buzz' } },

  { id: 'hollywoodian', cat: 'vollbart', level: 1, upkeep: 2,
    faces: ['rund', 'eckig', 'laenglich'],
    tools: ['trimmer', 'detail', 'rasierer', 'schere', 'oel'],
    art: { mass: { top: 118, dip: 13, x0: 60, x1: 140 }, mustache: 'chevron', hang: { len: 20, shape: 'round' }, texture: 'solid', hair: 'buzz' } },

  { id: 'goatee', cat: 'kinnbart', level: 0, upkeep: 2,
    faces: ['rund', 'eckig', 'herz'],
    tools: ['trimmer', 'detail', 'rasierer', 'schere', 'spiegel'],
    art: { chin: 'goatee', mustache: 'none', texture: 'solid', hair: 'buzz' } },

  { id: 'circle', cat: 'kinnbart', level: 0, upkeep: 2,
    faces: ['rund', 'eckig', 'oval'],
    tools: ['trimmer', 'detail', 'rasierer', 'spiegel'],
    art: { chin: 'circle', mustache: 'chevron', texture: 'solid', hair: 'buzz' } },

  { id: 'vandyke', cat: 'kinnbart', level: 2, upkeep: 3,
    faces: ['rund', 'eckig', 'dreieck'],
    tools: ['trimmer', 'detail', 'schere', 'wachs', 'rasierer', 'spiegel'],
    art: { chin: 'pointed', mustache: 'handlebar', texture: 'solid', hair: 'buzz' } },

  { id: 'balbo', cat: 'kinnbart', level: 2, upkeep: 3,
    faces: ['eckig', 'laenglich', 'oval'],
    tools: ['trimmer', 'detail', 'rasierer', 'schere', 'spiegel'],
    art: { chin: 'balbo', mustache: 'chevron', texture: 'solid', hair: 'buzz' } },

  { id: 'anchor', cat: 'kinnbart', level: 2, upkeep: 3,
    faces: ['eckig', 'oval', 'dreieck'],
    tools: ['trimmer', 'detail', 'rasierer', 'spiegel'],
    art: { chin: 'anchor', mustache: 'pencil', texture: 'solid', hair: 'buzz' } },

  { id: 'royale', cat: 'kinnbart', level: 2, upkeep: 3,
    faces: ['oval', 'eckig'],
    tools: ['detail', 'rasierer', 'schere', 'wachs', 'spiegel'],
    art: { chin: 'strip', mustache: 'english', texture: 'solid', hair: 'buzz' } },

  { id: 'soulpatch', cat: 'kinnbart', level: 0, upkeep: 2,
    faces: ['oval', 'laenglich', 'eckig'],
    tools: ['detail', 'rasierer', 'spiegel'],
    art: { chin: 'patch', mustache: 'none', texture: 'solid', hair: 'buzz' } },

  { id: 'zappa', cat: 'kinnbart', level: 1, upkeep: 2,
    faces: ['oval', 'eckig', 'laenglich'],
    tools: ['trimmer', 'detail', 'schere', 'rasierer', 'kamm'],
    art: { chin: 'patch', mustache: 'walrus', texture: 'solid', hair: 'buzz' } },

  { id: 'chevron', cat: 'schnurrbart', level: 0, upkeep: 1,
    faces: ['oval', 'eckig', 'laenglich'],
    tools: ['trimmer', 'schere', 'kamm', 'detail'],
    art: { mustache: 'chevron', texture: 'solid', hair: 'buzz' } },

  { id: 'handlebar', cat: 'schnurrbart', level: 2, upkeep: 3,
    faces: ['oval', 'eckig', 'laenglich'],
    tools: ['wachs', 'kamm', 'schere', 'foehn', 'spiegel'],
    art: { mustache: 'handlebar', texture: 'solid', hair: 'buzz' } },

  { id: 'walross', cat: 'schnurrbart', level: 1, upkeep: 2,
    faces: ['eckig', 'laenglich', 'oval'],
    tools: ['schere', 'kamm', 'buerste', 'oel'],
    art: { mustache: 'walrus', texture: 'solid', hair: 'buzz' } },

  { id: 'englisch', cat: 'schnurrbart', level: 2, upkeep: 3,
    faces: ['oval', 'laenglich'],
    tools: ['wachs', 'kamm', 'schere', 'spiegel'],
    art: { mustache: 'english', texture: 'solid', hair: 'buzz' } },

  { id: 'dali', cat: 'schnurrbart', level: 2, upkeep: 3,
    faces: ['oval', 'laenglich'],
    tools: ['wachs', 'kamm', 'schere', 'foehn', 'spiegel'],
    art: { mustache: 'dali', texture: 'solid', hair: 'buzz' } },

  { id: 'pencil', cat: 'schnurrbart', level: 2, upkeep: 3,
    faces: ['oval', 'eckig', 'herz'],
    tools: ['detail', 'rasierer', 'spiegel'],
    art: { mustache: 'pencil', texture: 'solid', hair: 'buzz' } },

  { id: 'hufeisen', cat: 'schnurrbart', level: 1, upkeep: 2,
    faces: ['eckig', 'oval', 'dreieck'],
    tools: ['trimmer', 'detail', 'rasierer', 'spiegel'],
    art: { mustache: 'horseshoe', texture: 'solid', hair: 'buzz' } },

  { id: 'koteletten', cat: 'koteletten', level: 0, upkeep: 1,
    faces: ['oval', 'rund', 'herz'],
    tools: ['trimmer', 'detail', 'rasierer', 'spiegel'],
    art: { sideburn: 'long', mustache: 'none', texture: 'short', hair: 'buzz' } },

  { id: 'mutton', cat: 'koteletten', level: 1, upkeep: 2,
    faces: ['oval', 'laenglich'],
    tools: ['trimmer', 'detail', 'rasierer', 'schere', 'spiegel'],
    art: { chops: true, mustache: 'none', texture: 'solid', hair: 'buzz' } },

  { id: 'friendly-mutton', cat: 'koteletten', level: 1, upkeep: 2,
    faces: ['oval', 'laenglich', 'eckig'],
    tools: ['trimmer', 'detail', 'rasierer', 'schere', 'kamm'],
    art: { chops: true, mustache: 'chevron', texture: 'solid', hair: 'buzz' } },

  { id: 'chinstrap', cat: 'koteletten', level: 2, upkeep: 3,
    faces: ['rund', 'oval', 'herz'],
    tools: ['detail', 'rasierer', 'spiegel', 'trimmer'],
    art: { mass: { top: 126, dip: 9 }, holes: [{ scale: 0.76, oy: 146 }], mustache: 'none', texture: 'solid', hair: 'buzz' } },

  { id: 'chincurtain', cat: 'koteletten', level: 1, upkeep: 2,
    faces: ['oval', 'laenglich', 'dreieck'],
    tools: ['trimmer', 'schere', 'rasierer', 'kamm', 'oel'],
    art: { mass: { top: 114, dip: 13 }, holes: [{ d: 'M 76,130 Q 100,122 124,130 Q127,148 116,157 Q100,151 84,157 Q73,148 76,130 Z' }], mustache: 'none', hang: { len: 14, shape: 'round' }, texture: 'solid', hair: 'buzz' } },

  { id: 'olddutch', cat: 'koteletten', level: 1, upkeep: 2,
    faces: ['oval', 'laenglich'],
    tools: ['schere', 'kamm', 'buerste', 'rasierer', 'balm'],
    art: { mass: { top: 110, dip: 13 }, holes: [{ d: 'M 75,129 Q 100,121 125,129 Q128,148 117,157 Q100,151 83,157 Q72,148 75,129 Z' }], mustache: 'none', hang: { len: 44, shape: 'square' }, texture: 'solid', hair: 'buzz' } },
];

/* Umriss-Icons für den Gesichtsform-Finder */
const FACE_SHAPES = {
  oval: 'M30,6 C44,6 52,21 52,38 C52,57 43,69 30,69 C17,69 8,57 8,38 C8,21 16,6 30,6 Z',
  rund: 'M30,12 C44,12 55,23 55,37 C55,51 44,62 30,62 C16,62 5,51 5,37 C5,23 16,12 30,12 Z',
  eckig: 'M8,10 L52,10 L52,54 Q52,68 38,68 L22,68 Q8,68 8,54 Z',
  herz: 'M6,14 Q30,2 54,14 C54,36 46,56 30,70 C14,56 6,36 6,14 Z',
  laenglich: 'M30,2 C41,2 47,17 47,38 C47,60 40,72 30,72 C20,72 13,60 13,38 C13,17 19,2 30,2 Z',
  dreieck: 'M18,8 L42,8 C50,26 55,46 55,54 Q55,68 30,70 Q5,68 5,54 C5,46 10,26 18,8 Z',
};

/* Bart des animierten Tutorial-Gesichts: 3-Tage-Bart */
const TUTORIAL_ART = { mass: { top: 116, dip: 13 }, mustache: 'natural', texture: 'stubble', hair: 'buzz' };
