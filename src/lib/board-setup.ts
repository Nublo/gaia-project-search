// Board setup of a stored game (techs, scoring tiles, boosters, ships,
// factions) for /game-setup, from BGA's `gamedatas.board`: either the starting
// board read off the game's replay page, or, for Lost Fleet, the copies its log
// repeats in notifyUpdate events (base-game logs almost never have one). Its
// fields map onto /builder slots as in bga-bookmarklet.ts.
import { BUILDER_GROUPS, type SlotRows } from '@/lib/builder-groups';
import { MINE, PLANETARY_INSTITUTE, mapLayoutKey, type BuildingMap } from '@/lib/galaxy-map';
import type { Setup } from '@/lib/builder-params';
import type { MapTimeline } from '@/lib/map-timeline';

// Stored form (game_replays.setup): tile id per slot (null = empty), keyed by
// the builder's link params (std, adv, rnd, fin, fed, shp, shf, art, bst).
export interface StoredBoardSetup {
  slots: Record<string, (number | null)[]>;
  races: number[]; // seat order
  vpRequirement: boolean; // the extension tech needs 25 VP, not 3 ships
}

interface BgaShip {
  type: number | string;
  availTech?: number | string;
  availFedTokenId?: number | string;
  availArtifacts?: (number | string)[];
}

export interface BgaBoard {
  techs: (number | string)[];
  advTechs?: (number | string)[];
  roundBonus?: (number | string)[];
  endGameBonus?: (number | string)[];
  bonusFedToken?: number | string;
  availBoosters?: (number | string)[];
  config?: { lostFleet?: number | string };
  lostFleet?: { ships?: BgaShip[]; scoreBoard?: number | string };
}

type BgaEvent = { type: string; args?: Record<string, unknown> };

const TWILIGHT = 18;
const FIRST_SHIP = 15; // ship slots are numbered type - 15

const tile = (v: unknown) => (Number(v) > 0 ? Number(v) : null);

// One board's tiles per slot.
function boardSlots(board: BgaBoard): Record<string, (number | null)[]> {
  const slots: Record<string, (number | null)[]> = {
    std: board.techs.map(tile),
    adv: (board.advTechs ?? []).map(tile),
    rnd: (board.roundBonus ?? []).slice(1).map(tile), // index 0 is an unused placeholder
    fin: (board.endGameBonus ?? []).map(tile),
    fed: [tile(board.bonusFedToken)],
    shp: [],
    shf: [],
    art: [],
  };
  for (const ship of board.lostFleet?.ships ?? []) {
    const slot = Number(ship.type) - FIRST_SHIP;
    slots.shf[slot] = tile(ship.availFedTokenId);
    if (Number(ship.type) === TWILIGHT) slots.art = (ship.availArtifacts ?? []).map(tile);
    else slots.shp[slot] = tile(ship.availTech);
  }
  return slots;
}

// `startBoard` is the replay page's starting board; without it only Lost Fleet
// logs carry a board.
export function buildBoardSetup(logs: { data: BgaEvent[] }[], startBoard?: BgaBoard): StoredBoardSetup | null {
  const events = logs.flatMap((packet) => packet.data ?? []);
  const logBoards = events
    .map((e) => e.args?.board as BgaBoard | undefined)
    .filter((b): b is BgaBoard => !!b && Array.isArray(b.techs));
  if (!startBoard && (!logBoards.length || !Number(logBoards[0].config?.lostFleet))) return null;
  const boards = startBoard ? [startBoard, ...logBoards] : logBoards;

  // Tiles keep their value after being taken, but take each slot's first
  // non-empty value across snapshots in case an early one has gaps.
  const slots: Record<string, (number | null)[]> = {};
  for (const board of boards) {
    for (const [param, values] of Object.entries(boardSlots(board))) {
      const row = (slots[param] ??= []);
      values.forEach((v, i) => {
        if (row[i] == null) row[i] = v ?? null;
      });
    }
  }
  for (const row of Object.values(slots)) {
    for (let i = 0; i < row.length; i++) row[i] ??= null; // fill sparse ship slots
  }

  // A Lost Fleet log's first snapshot is usually from round 1, after the
  // booster draft, so the full set is every booster ever on offer plus every
  // one picked (the replay's starting board has them all).
  const boosters = new Set<number>();
  for (const board of boards) for (const id of board.availBoosters ?? []) if (tile(id)) boosters.add(Number(id));
  for (const e of events) if (e.type === 'notifyChooseBoosterTile' && tile(e.args?.boosterId)) boosters.add(Number(e.args!.boosterId));
  slots.bst = [...boosters].sort((a, b) => a - b);

  // Factions are picked in seat order.
  const races: number[] = [];
  const seen = new Set<number>();
  for (const e of events) {
    const playerId = Number(e.args?.playerId);
    if (e.type === 'notifyChooseRace' && tile(e.args?.raceId) && !seen.has(playerId)) {
      seen.add(playerId);
      races.push(Number(e.args!.raceId));
    }
  }

  return { slots, races, vpRequirement: Number(boards[0].lostFleet?.scoreBoard) === 0 };
}

// A /builder Setup from a stored board setup and the game's map timeline: the
// map's starting planets plus the mines / Planetary Institutes placed in setup.
export function boardSetupToSetup(stored: StoredBoardSetup, timeline: MapTimeline, players: number, lostFleet: boolean): Setup {
  const slots: SlotRows = Object.fromEntries(
    BUILDER_GROUPS.map((g) => {
      const row = stored.slots[g.param] ?? [];
      return [g.key, Array.from({ length: g.slotCount }, (_, i) => row[i] ?? null)];
    })
  );
  const buildings: BuildingMap = {};
  for (const step of timeline.steps) {
    if (step.round !== 0) break;
    for (const c of step.changes) {
      const id = c.structures?.find((s) => s.buildingId === MINE || s.buildingId === PLANETARY_INSTITUTE)?.buildingId;
      if (id === MINE || id === PLANETARY_INSTITUTE) buildings[c.hex] = id;
    }
  }
  return {
    players,
    lostFleet,
    slots,
    planets: timeline.planets,
    buildings,
    largeMap: !lostFleet && timeline.layoutKey === mapLayoutKey(players, false, true),
    vpRequirement: stored.vpRequirement,
    races: stored.races,
  };
}
