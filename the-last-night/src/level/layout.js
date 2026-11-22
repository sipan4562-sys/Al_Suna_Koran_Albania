// Grundriss der Anstalt St. Aldric. 1 Zelle = 1 Meter.
// Erdgeschoss (y=0) und Keller (y=-4) liegen in getrennten XZ-Bereichen
// und sind über ein echtes Treppenhaus verbunden.

export const W = 68;
export const H = 44;

// Zonen: Materialien, Höhen und Bodenart (für Schrittgeräusche).
export const ZONES = {
  corridor: { floor: 'linoleum', wall: 'hospitalWall', ceil: 'ceilingTiles', y: 0, c: 3, surface: 'tile', wallH: 3 },
  patient: { floor: 'tileWorn', wall: 'patientWall', ceil: 'ceilingTiles', y: 0, c: 3, surface: 'tile', wallH: 3 },
  dayroom: { floor: 'linoleum', wall: 'patientWall', ceil: 'ceilingTiles', y: 0, c: 3, surface: 'tile', wallH: 3 },
  lobby: { floor: 'marble', wall: 'lobbyWall', ceil: 'plaster', y: 0, c: 4.2, surface: 'tile', wallH: 4.2 },
  exitway: { floor: 'marble', wall: 'lobbyWall', ceil: 'plaster', y: 0, c: 3.2, surface: 'tile', wallH: 4.2 },
  nurse: { floor: 'linoleum', wall: 'hospitalWall', ceil: 'ceilingTiles', y: 0, c: 3, surface: 'tile', wallH: 3 },
  office: { floor: 'wood', wall: 'wallpaper', ceil: 'plaster', y: 0, c: 3, surface: 'wood', wallH: 3 },
  records: { floor: 'wood', wall: 'wallpaper', ceil: 'plaster', y: 0, c: 3, surface: 'wood', wallH: 3 },
  surveillance: { floor: 'linoleumDark', wall: 'hospitalWall', ceil: 'ceilingTiles', y: 0, c: 3, surface: 'tile', wallH: 3 },
  operating: { floor: 'whiteTile', wall: 'whiteTileWall', ceil: 'ceilingTiles', y: 0, c: 3.4, surface: 'tile', wallH: 2 },
  isolation: { floor: 'padded', wall: 'padded', ceil: 'padded', y: 0, c: 2.8, surface: 'soft', wallH: 2 },
  hydro: { floor: 'whiteTile', wall: 'whiteTileWall', ceil: 'plaster', y: 0, c: 3.2, surface: 'water', wallH: 2 },
  crawl: { floor: 'concrete', wall: 'concreteWall', ceil: 'concrete', y: 0, c: 1.2, surface: 'concrete', wallH: 2 },
  secret: { floor: 'woodOld', wall: 'wallpaperRed', ceil: 'plaster', y: 0, c: 2.7, surface: 'wood', wallH: 3 },
  stairs: { floor: 'concrete', wall: 'concreteWall', ceil: 'concrete', y: 0, c: 3, surface: 'concrete', wallH: 2, ramp: true },
  basement: { floor: 'concrete', wall: 'concreteWall', ceil: 'concrete', y: -4, c: -1, surface: 'concrete', wallH: 2 },
  generator: { floor: 'grate', wall: 'concreteWall', ceil: 'concrete', y: -4, c: -0.8, surface: 'metal', wallH: 2 },
  boiler: { floor: 'concrete', wall: 'concreteWall', ceil: 'concrete', y: -4, c: -0.9, surface: 'concrete', wallH: 2 },
  flooded: { floor: 'concreteWet', wall: 'concreteWall', ceil: 'concrete', y: -4, c: -1, surface: 'water', wallH: 2 },
  morgue: { floor: 'whiteTile', wall: 'whiteTileWall', ceil: 'concrete', y: -4, c: -1.2, surface: 'tile', wallH: 2 },
  storage: { floor: 'concrete', wall: 'concreteWall', ceil: 'concrete', y: -4, c: -1, surface: 'concrete', wallH: 2 },
};

// Rechtecke (inklusive) [x0, z0, x1, z1, zone]
export const ROOMS = [
  // Erdgeschoss
  [2, 20, 46, 22, 'corridor'], // Hauptflur
  [2, 15, 4, 18, 'records'], // Archiv
  [6, 15, 10, 18, 'surveillance'], // Überwachungsraum
  [4, 24, 10, 29, 'office'], // Direktorenbüro
  [4, 31, 8, 34, 'secret'], // Geheimes Archiv
  [14, 15, 19, 18, 'nurse'], // Schwesternstation
  [21, 4, 23, 19, 'corridor'], // Nordflur
  [12, 3, 19, 10, 'operating'], // OP-Saal
  [25, 4, 28, 7, 'isolation'], // Isolationszelle 1
  [25, 9, 28, 12, 'isolation'], // Isolationszelle 2 (versiegelt)
  [30, 4, 40, 11, 'hydro'], // Hydrotherapie
  [32, 12, 32, 13, 'crawl'], // Kriechgang
  [13, 24, 23, 33, 'lobby'], // Eingangshalle
  [16, 23, 20, 23, 'lobby'], // Durchgang Flur -> Halle
  [17, 34, 19, 34, 'exitway'], // Nische Haupteingang
  [45, 23, 46, 29, 'corridor'], // Verbindungsflur Ost
  [25, 30, 46, 32, 'corridor'], // Versorgungsflur Süd
  [27, 34, 41, 41, 'dayroom'], // Aufenthaltsraum
  // Patientenzimmer
  [25, 14, 28, 18, 'patient'],
  [30, 14, 33, 18, 'patient'],
  [35, 14, 38, 18, 'patient'],
  [40, 14, 43, 18, 'patient'],
  [25, 24, 28, 28, 'patient'],
  [30, 24, 33, 28, 'patient'],
  [35, 24, 38, 28, 'patient'],
  [40, 24, 43, 28, 'patient'],
  // Treppe & Keller
  [48, 20, 55, 22, 'stairs'],
  [56, 3, 58, 41, 'basement'],
  [60, 3, 66, 9, 'generator'],
  [60, 13, 66, 21, 'boiler'],
  [60, 25, 66, 39, 'flooded'],
  [49, 4, 54, 13, 'morgue'],
  [49, 26, 54, 38, 'storage'],
];

// Zusätzliche Wandzellen (Trennwand vor dem Personaltrakt)
export const EXTRA_WALLS = [[12, 20], [12, 22]];

export const STAIRS = { x0: 48, x1: 56, h0: 0, h1: -4 };

// Türen: x,z Zelle; lock: null | Schlüssel-ID | 'keypad' | 'sealed'
export const DOORS = [
  { id: 'staff', x: 12, z: 21, lock: 'staff_key', label: 'Personaltrakt', style: 'security' },
  { id: 'records', x: 3, z: 19, label: 'Archiv' },
  { id: 'surv', x: 8, z: 19, label: 'Überwachung' },
  { id: 'director', x: 7, z: 23, label: 'Dir. Dr. K. Wehrmann', style: 'wood' },
  { id: 'nurse', x: 16, z: 19, label: 'Stationszimmer' },
  { id: 'or', x: 20, z: 6, lock: 'keypad', label: 'OP 1', style: 'security' },
  { id: 'iso1', x: 24, z: 5, label: 'Isolation 1', style: 'cell' },
  { id: 'iso2', x: 24, z: 10, lock: 'sealed', label: 'Isolation 2', style: 'cell' },
  { id: 'hydro', x: 29, z: 6, label: 'Hydrotherapie' },
  { id: 'lobbyEast', x: 24, z: 31, label: '' },
  { id: 'day1', x: 30, z: 33, label: 'Aufenthalt' },
  { id: 'day2', x: 38, z: 33, label: '' },
  { id: 'r111', x: 26, z: 19, label: '111' },
  { id: 'r112', x: 31, z: 19, label: '112' },
  { id: 'r113', x: 36, z: 19, label: '113' },
  { id: 'r114', x: 41, z: 19, label: '114' },
  { id: 'r115', x: 27, z: 23, label: '115' },
  { id: 'r116', x: 32, z: 23, label: '116' },
  { id: 'r117', x: 37, z: 23, label: '117' },
  { id: 'r118', x: 42, z: 23, label: '118' },
  { id: 'basement', x: 47, z: 21, lock: 'basement_key', label: 'KELLER', style: 'security' },
  { id: 'gen', x: 59, z: 6, label: 'Generator', style: 'security' },
  { id: 'boiler', x: 59, z: 17, label: 'Heizung', style: 'security' },
  { id: 'flood', x: 59, z: 30, label: 'Lager B', style: 'security' },
  { id: 'morgue', x: 55, z: 8, label: 'Pathologie', style: 'security' },
  { id: 'storage', x: 55, z: 32, label: 'Wäscherei', style: 'security' },
];

// Geheime Bücherregal-Tür
export const SECRET_DOOR = { id: 'bookshelf', x: 6, z: 30 };

// Lüftungsschächte (nur das Monster kann sie benutzen).
export const VENTS = [
  { id: 'v_morgue', x: 51, z: 6 },
  { id: 'v_bsouth', x: 57, z: 38 },
  { id: 'v_north', x: 22, z: 9 },
  { id: 'v_east', x: 43, z: 21 },
  { id: 'v_staff', x: 6, z: 21 },
  { id: 'v_day', x: 40, z: 40 },
  { id: 'v_lobby', x: 14, z: 26 },
];
export const VENT_LINKS = [
  ['v_morgue', 'v_north'],
  ['v_morgue', 'v_east'],
  ['v_bsouth', 'v_day'],
  ['v_east', 'v_staff'],
  ['v_north', 'v_lobby'],
  ['v_day', 'v_lobby'],
  ['v_bsouth', 'v_morgue'],
];

// Interessante Orte für die Patrouille des Monsters.
export const POIS = [
  [8, 21], [20, 21], [30, 21], [40, 21], [45, 26], [35, 31], [27, 31],
  [22, 8], [22, 15], [17, 17], [18, 28], [15, 31], [33, 37], [38, 39],
  [27, 16], [32, 16], [37, 16], [42, 16], [26, 26], [31, 26], [41, 26],
  [35, 7], [26, 6], [8, 16], [7, 26], [3, 16],
  [57, 6], [57, 15], [57, 25], [57, 35], [52, 9], [63, 6], [63, 17], [63, 33], [51, 32],
];

// Spinde (Versteck): x,z Zelle, dir = Blickrichtung der Tür (0=+z,1=-x,2=-z,3=+x)
export const LOCKERS = [
  { x: 28, z: 20, dir: 0 },
  { x: 39, z: 22, dir: 2 },
  { x: 19, z: 20, dir: 0 },
  { x: 10, z: 22, dir: 2 },
  { x: 2, z: 22, dir: 2 },
  { x: 19, z: 15, dir: 0 },
  { x: 43, z: 14, dir: 0 },
  { x: 33, z: 28, dir: 2 },
  { x: 41, z: 36, dir: 1 },
  { x: 46, z: 27, dir: 1 },
  { x: 40, z: 4, dir: 0 },
  { x: 58, z: 12, dir: 1 },
  { x: 56, z: 27, dir: 3 },
  { x: 66, z: 14, dir: 1 },
  { x: 66, z: 16, dir: 1 },
  { x: 49, z: 30, dir: 3 },
  { x: 23, z: 13, dir: 1 },
  { x: 12, z: 10, dir: 2 },
];

export const PLAYER_START = { x: 31.0, z: 26.0, yaw: Math.PI + 0.35 };
export const MONSTER_LAIR = { x: 50.6, z: 9.3 };
