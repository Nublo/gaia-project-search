// Galaxy map for /builder. BGA's map is a set of axial (q, r) hexes; its
// outline depends only on the setup (players, Lost Fleet, and for base 3-4
// player games the map size), so map-layouts.json holds one layout per setup,
// taken from stored games, plus a real map as each layout's sample.
import mapLayouts from '@/lib/map-layouts.json';
import { PLANET_NAMES, REBELLION_PLANET, isLostFleetPlanet } from '@/lib/gaia-constants';

export type MapLayoutKey = 'base2' | 'base8' | 'base10' | 'lf2' | 'lf3' | 'lf4';

interface MapLayoutData {
  centers: [number, number][]; // sector center hexes
  hexes: [number, number, number][]; // q, r, index into centers (-1 = Lost Fleet single-hex piece)
  sample: { table: number; planets: [number, number, number][] }; // q, r, planetType
}

const LAYOUTS = mapLayouts as unknown as Record<MapLayoutKey, MapLayoutData>;

// Hex position key used by planet maps and link params.
export const hexKey = (q: number, r: number) => `${q},${r}`;

export type PlanetMap = Record<string, number>; // hexKey -> planetType

// Base 3-4 player games use 8 or 10 sectors (a BGA table option); the player
// count picks the usual one, and `large` overrides it. 2 player and Lost
// Fleet games have a single layout each.
export function mapLayoutKey(players: number, lostFleet: boolean, large: boolean): MapLayoutKey {
  if (lostFleet) return `lf${players}` as MapLayoutKey;
  if (players === 2) return 'base2';
  return large ? 'base10' : 'base8';
}

export const hasMapSizeChoice = (players: number, lostFleet: boolean) => !lostFleet && players > 2;
export const defaultLargeMap = (players: number) => players === 4;

export function samplePlanets(key: MapLayoutKey): PlanetMap {
  return Object.fromEntries(LAYOUTS[key].sample.planets.map(([q, r, t]) => [hexKey(q, r), t]));
}

export function sampleTable(key: MapLayoutKey): number {
  return LAYOUTS[key].sample.table;
}

// Planets offered in the picker. The Lost Planet is part of the base game;
// asteroids, protoplanets and the ships come with Lost Fleet (no Rebellion at 2 players).
export function availablePlanets(lostFleet: boolean, players: number): number[] {
  return Object.keys(PLANET_NAMES)
    .map(Number)
    .filter((id) => lostFleet || !isLostFleetPlanet(id))
    .filter((id) => id !== REBELLION_PLANET || players > 2);
}

// ---- Geometry, ported from BGA's gpj-map.js (renderMap) ----
// Hexes are flat-topped, 156x134 px; hex (q, r) sits at grid x = 2q, y = q + 2r,
// one grid step being 58 px across and 67 px down. A sector is a 620x671 tile
// holding 19 hexes; Lost Fleet pieces (tileNum >= 100) are single-hex tiles.
// Sector and piece tiles are laid out on a 59x68 grid, which leaves thin gaps
// between them.

export const HEX_W = 156;
export const HEX_H = 134;
export const SECTOR_W = 620;
export const SECTOR_H = 671;

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface MapHex extends Box {
  q: number;
  r: number;
}

export interface MapGeometry {
  width: number;
  height: number;
  sectors: Box[];
  pieces: Box[]; // Lost Fleet single-hex tiles
  hexes: MapHex[];
}

export function mapGeometry(key: MapLayoutKey): MapGeometry {
  const { centers, hexes } = LAYOUTS[key];
  const minX = Math.min(...hexes.map(([q]) => 2 * q));
  const minY = Math.min(...hexes.map(([q, r]) => q + 2 * r));
  const gridX = (q: number) => 2 * q - minX;
  const gridY = (q: number, r: number) => q + 2 * r - minY;

  const sectors: Box[] = centers.map(([q, r]) => ({
    left: (gridX(q) - 4) * 59,
    top: (gridY(q, r) - 4) * 68,
    width: SECTOR_W,
    height: SECTOR_H,
  }));
  const pieces: Box[] = [];
  const mapHexes: MapHex[] = hexes.map(([q, r, sector]) => {
    if (sector < 0) {
      const piece = { left: (gridX(q) - 0.08) * 59, top: (gridY(q, r) - 0.08) * 68, width: HEX_W, height: HEX_H };
      pieces.push(piece);
      return { q, r, ...piece };
    }
    const [cq, cr] = centers[sector];
    const dx = 2 * (q - cq);
    const dy = q - cq + 2 * (r - cr);
    const tile = sectors[sector];
    return { q, r, left: tile.left + dx * 58 + 232, top: tile.top + dy * 67 + 268, width: HEX_W, height: HEX_H };
  });

  // Shift everything to start at 0, 0.
  const boxes = [...sectors, ...pieces, ...mapHexes];
  const offX = Math.min(...boxes.map((b) => b.left));
  const offY = Math.min(...boxes.map((b) => b.top));
  const shift = <T extends Box>(b: T): T => ({ ...b, left: b.left - offX, top: b.top - offY });
  const shifted = { sectors: sectors.map(shift), pieces: pieces.map(shift), hexes: mapHexes.map(shift) };
  const all = [...shifted.sectors, ...shifted.pieces, ...shifted.hexes];
  return {
    width: Math.max(...all.map((b) => b.left + b.width)),
    height: Math.max(...all.map((b) => b.top + b.height)),
    ...shifted,
  };
}

// Keeps only planets on hexes of this layout (and valid for the mode).
export function fitPlanets(planets: PlanetMap, key: MapLayoutKey, lostFleet: boolean, players: number): PlanetMap {
  const onMap = new Set(LAYOUTS[key].hexes.map(([q, r]) => hexKey(q, r)));
  const allowed = new Set(availablePlanets(lostFleet, players));
  return Object.fromEntries(Object.entries(planets).filter(([k, t]) => onMap.has(k) && allowed.has(t)));
}

export function samePlanets(a: PlanetMap, b: PlanetMap): boolean {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}

// ---- Link params ----
// `pl` = one "q,r:planetType" per planet. No `pl` means the layout's sample;
// a single empty `pl=` means an empty map. `ms` = 'l' / 's' map size for base 3-4p.

export function parsePlanets(raw: string | string[] | undefined): PlanetMap | null {
  if (raw === undefined) return null;
  const values = Array.isArray(raw) ? raw : [raw];
  const planets: PlanetMap = {};
  for (const value of values) {
    const m = /^(-?\d+),(-?\d+):(\d+)$/.exec(value);
    if (m && PLANET_NAMES[Number(m[3])]) planets[hexKey(Number(m[1]), Number(m[2]))] = Number(m[3]);
  }
  return planets;
}

export function planetsToParams(planets: PlanetMap, key: MapLayoutKey, params: URLSearchParams) {
  if (samePlanets(planets, samplePlanets(key))) return;
  const entries = Object.entries(planets);
  if (entries.length === 0) params.append('pl', '');
  for (const [k, t] of entries) params.append('pl', `${k}:${t}`);
}

export function parseMapSize(raw: string | string[] | undefined, players: number): boolean {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === 'l' ? true : v === 's' ? false : defaultLargeMap(players);
}
