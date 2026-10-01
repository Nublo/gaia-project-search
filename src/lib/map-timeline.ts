// Galaxy map timeline of a stored game, rebuilt from its BGA log
// (raw_game_log.rawLog.data.logs). Map-changing notifications carry a full map
// snapshot (`args.map`); starting buildings and upgrades only carry the hex.
// Each change becomes one step, so the map can be replayed from the empty
// board (step 0) to the final position.
import { getBuildingName } from '@/lib/gaia-constants';
import { MAP_LAYOUT_KEYS, hexKey, layoutHexKeys, type MapLayoutKey, type PlanetMap } from '@/lib/galaxy-map';

// One piece on a hex: buildingId (1 satellite, 2 gaiaformer, 4-9 buildings,
// 50 Lost Fleet shuttle), its owner, and whether it's part of a federation.
export interface MapStructure {
  buildingId: number;
  playerId: number;
  fed: boolean;
}

export type StructureMap = Record<string, MapStructure[]>; // hexKey -> pieces

export interface MapChange {
  hex: string;
  planet?: number; // new planet type (0 = empty space)
  structures?: MapStructure[]; // the hex's new full list of pieces
}

export interface MapStep {
  round: number; // 0 = setup (starting buildings), 1-6 = game rounds
  playerId: number | null;
  label: string;
  changes: MapChange[];
}

export interface MapTimeline {
  layoutKey: MapLayoutKey;
  planets: PlanetMap; // the map before anything was built
  steps: MapStep[];
}

const STRUCTURE_NAMES: Record<number, string> = { 1: 'Satellite', 2: 'Gaiaformer', 50: 'Shuttle' };
export const structureName = (id: number) => STRUCTURE_NAMES[id] ?? getBuildingName(id);

interface BgaHex {
  planetType: number | string;
  buildings?: { buildingId: number | string; playerId: number | string; isPartOfFed?: number | string }[];
}
type BgaMap = Record<string, Record<string, BgaHex>>;

interface State {
  planets: Record<string, number>; // every hex, 0 = empty space
  structures: StructureMap;
}

// Pieces in a fixed order, so lists compare equal whatever order BGA sent them in.
const sortPieces = (pieces: MapStructure[]) =>
  [...pieces].sort((a, b) => a.playerId - b.playerId || a.buildingId - b.buildingId);

function readSnapshot(map: BgaMap): State {
  const state: State = { planets: {}, structures: {} };
  for (const [q, column] of Object.entries(map)) {
    for (const [r, hex] of Object.entries(column)) {
      const k = hexKey(Number(q), Number(r));
      state.planets[k] = Number(hex.planetType) || 0;
      const pieces = (hex.buildings ?? []).map((b) => ({
        buildingId: Number(b.buildingId),
        playerId: Number(b.playerId),
        fed: Number(b.isPartOfFed) > 0,
      }));
      if (pieces.length) state.structures[k] = sortPieces(pieces);
    }
  }
  return state;
}

const sameStructures = (a: MapStructure[] = [], b: MapStructure[] = []) =>
  a.length === b.length &&
  a.every((s, i) => s.buildingId === b[i].buildingId && s.playerId === b[i].playerId && s.fed === b[i].fed);

function diff(from: State, to: State): MapChange[] {
  const changes: MapChange[] = [];
  const hexes = new Set([...Object.keys(to.planets), ...Object.keys(from.structures), ...Object.keys(to.structures)]);
  for (const k of hexes) {
    const change: MapChange = { hex: k };
    if (k in to.planets && to.planets[k] !== from.planets[k]) change.planet = to.planets[k];
    if (!sameStructures(from.structures[k], to.structures[k])) change.structures = to.structures[k] ?? [];
    if (change.planet != null || change.structures) changes.push(change);
  }
  return changes;
}

export function applyChanges(planets: PlanetMap, structures: StructureMap, changes: MapChange[]) {
  for (const c of changes) {
    if (c.planet != null) {
      if (c.planet) planets[c.hex] = c.planet;
      else delete planets[c.hex];
    }
    if (c.structures) {
      if (c.structures.length) structures[c.hex] = c.structures;
      else delete structures[c.hex];
    }
  }
}

// What a step did, from the piece it added or upgraded (or the planet it
// changed), and whose it was when the notification doesn't say.
function describe(changes: MapChange[], from: State, playerId: number | null): { label: string; playerId: number | null } {
  const label = (text: string, owner = playerId) => ({ label: text, playerId: owner });
  for (const c of changes) {
    const before = from.structures[c.hex] ?? [];
    const isNew = (s: MapStructure) => !before.some((b) => b.buildingId === s.buildingId && b.playerId === s.playerId);
    const added = c.structures?.find((s) => s.playerId === playerId && isNew(s)) ?? c.structures?.find(isNew);
    if (added) {
      const upgraded = before.find((b) => b.playerId === added.playerId && b.buildingId >= 4 && added.buildingId >= 4);
      const name = upgraded ? `${structureName(upgraded.buildingId)} → ${structureName(added.buildingId)}` : structureName(added.buildingId);
      return label(name, playerId ?? added.playerId);
    }
  }
  if (changes.some((c) => c.planet === 8)) return label('Gaia planet formed');
  if (changes.some((c) => c.planet === 10)) return label('Lost Planet');
  if (changes.some((c) => c.structures?.some((s) => s.fed))) return label('Federation');
  return label('Map change');
}

// The layout whose hexes are exactly this map's.
function layoutFor(hexes: string[]): MapLayoutKey | null {
  const set = new Set(hexes);
  return MAP_LAYOUT_KEYS.find((key) => {
    const layout = layoutHexKeys(key);
    return layout.length === set.size && layout.every((k) => set.has(k));
  }) ?? null;
}

type BgaEvent = { type: string; args?: Record<string, unknown> & { map?: BgaMap } };

// Some notifications carry an empty `map` ([] or {}).
const hasMap = (e: BgaEvent) => !!e.args?.map && !Array.isArray(e.args.map) && Object.keys(e.args.map).length > 0;

export function buildMapTimeline(logs: { data: BgaEvent[] }[]): MapTimeline | null {
  const events = logs.flatMap((packet) => packet.data ?? []);
  const first = events.find(hasMap);
  if (!first) return null;

  const initial = readSnapshot(first.args!.map!);
  const layoutKey = layoutFor(Object.keys(initial.planets));
  if (!layoutKey) {
    console.warn(`[map-timeline] no layout matches a ${Object.keys(initial.planets).length} hex map`);
    return null;
  }

  // The empty board: each hex's planet as first seen, before gaiaforming or
  // the Lost Planet changed it.
  const startPlanets: Record<string, number> = { ...initial.planets };
  const state: State = { planets: { ...startPlanets }, structures: {} };
  const steps: MapStep[] = [];
  let round = 0;

  for (const e of events) {
    if (e.type === 'notifyRoundEnd') round++;
    const args = e.args ?? {};
    const playerId = args.playerId != null ? Number(args.playerId) : args.player_id != null ? Number(args.player_id) : null;
    let next: State | null = null;

    if (hasMap(e)) {
      next = readSnapshot(args.map!);
    } else if ((e.type === 'notifyPlaceStartingBldg' || e.type === 'notifyUpgrade') && playerId != null) {
      const k = hexKey(Number(args.q), Number(args.r));
      const pieces = (state.structures[k] ?? []).filter((s) => s.playerId !== playerId || s.buildingId < 4);
      const old = (state.structures[k] ?? []).find((s) => s.playerId === playerId && s.buildingId >= 4);
      next = { planets: state.planets, structures: { ...state.structures, [k]: sortPieces([...pieces, { buildingId: Number(args.buildingId), playerId, fed: old?.fed ?? false }]) } };
    }
    if (!next) continue;

    const changes = diff(state, next);
    if (!changes.length) continue;
    // Lost Fleet setup rotates sectors before anything is built: still the empty board.
    if (!steps.length && !Object.keys(next.structures).length) {
      Object.assign(startPlanets, next.planets);
      state.planets = { ...next.planets };
      continue;
    }
    // Round 1 starts with the first action after the starting buildings.
    const stepRound = e.type === 'notifyPlaceStartingBldg' ? 0 : round + 1;
    steps.push({ round: stepRound, ...describe(changes, state, playerId), changes });
    for (const c of changes) {
      if (c.planet != null) state.planets[c.hex] = c.planet;
    }
    state.structures = next.structures;
  }

  const planets: PlanetMap = Object.fromEntries(Object.entries(startPlanets).filter(([, t]) => t > 0));
  return { layoutKey, planets, steps };
}
