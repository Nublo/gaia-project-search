// A game setup as carried in /builder and /game-setup links. Both pages take
// the same query string, so a link opens in either.
import { BUILDER_GROUPS, SHIPS, parsePlayers, parseSlots, shipsInPlay, slotExists, slotsInPlay, slotsToParams, type SlotRows } from '@/lib/builder-groups';
import {
  buildingsToParams,
  fitBuildings,
  fitPlanets,
  hasMapSizeChoice,
  mapLayoutKey,
  parseMapSize,
  parseBuildings,
  parsePlanets,
  planetsToParams,
  samplePlanets,
  type BuildingMap,
  type PlanetMap,
} from '@/lib/galaxy-map';
import { fitRaces, parseRaces } from '@/lib/builder-factions';
import { isLostFleetPlanet, isLostFleetRace } from '@/lib/gaia-constants';

export type SearchParams = Record<string, string | string[] | undefined>;

export interface Setup {
  players: number;
  lostFleet: boolean;
  slots: SlotRows;
  planets: PlanetMap | null; // null = the map layout's sample
  buildings: BuildingMap; // mine / PI per hex (in the planet's color)
  largeMap: boolean;
  vpRequirement: boolean; // Lost Fleet extension tech needs 25 VP, not 3 ships
  races: number[]; // seat order
}

export function parseSetup(params: SearchParams): Setup {
  const players = parsePlayers(params.p);
  // slotCount comes from the board layout JSON (via the groups) so it can't
  // drift out of sync with the number of slots actually rendered. Slots that
  // don't exist at this player count are dropped.
  const slots: SlotRows = Object.fromEntries(
    BUILDER_GROUPS.map((g) => [
      g.key,
      parseSlots(params[g.param], g.slotCount).map((id, i) => (slotExists(g, i, players) ? id : null)),
    ])
  );
  const planets = parsePlanets(params.pl);
  const races = parseRaces(params.rc);
  // Explicit ?lf=1, or implied by anything Lost Fleet already in the link.
  const lostFleet =
    params.lf === '1' ||
    params.xvp === '1' ||
    BUILDER_GROUPS.some((g) =>
      slots[g.key].some((id, i) => id != null && (g.isLostFleet(id) || g.lostFleetOnlySlots.includes(i)))
    ) ||
    Object.values(planets ?? {}).some(isLostFleetPlanet) ||
    races.some(isLostFleetRace);
  return {
    players,
    lostFleet,
    slots,
    planets,
    buildings: parseBuildings(params.bd),
    largeMap: parseMapSize(params.ms, players),
    vpRequirement: params.xvp === '1',
    races,
  };
}

// The planets to draw: the link's (fitted to the layout) or the layout's sample.
export function setupPlanets(setup: Setup): PlanetMap {
  const key = mapLayoutKey(setup.players, setup.lostFleet, setup.largeMap);
  return setup.planets ? fitPlanets(setup.planets, key, setup.lostFleet, setup.players) : samplePlanets(key);
}

export function setupBuildings(setup: Setup, planets: PlanetMap): BuildingMap {
  return fitBuildings(setup.buildings, planets);
}

export function setupRaces(setup: Setup): number[] {
  return fitRaces(setup.races, setup.players, setup.lostFleet);
}

export function setupToQuery(setup: Setup & { planets: PlanetMap }): string {
  const { players, lostFleet } = setup;
  const params = new URLSearchParams();
  params.set('p', String(players));
  if (lostFleet) params.set('lf', '1');
  if (lostFleet && setup.vpRequirement) params.set('xvp', '1');
  setup.races.forEach((id) => params.append('rc', String(id)));
  slotsToParams(BUILDER_GROUPS, setup.slots, params);
  if (hasMapSizeChoice(players, lostFleet)) params.set('ms', setup.largeMap ? 'l' : 's');
  planetsToParams(setup.planets, mapLayoutKey(players, lostFleet, setup.largeMap), params);
  buildingsToParams(fitBuildings(setup.buildings, setup.planets), params);
  return params.toString();
}

// What each group's slots hold (singular, plural), for "place N more …" messages.
const MISSING_LABELS: Record<string, [string, string]> = {
  standard: ['standard technology', 'standard technologies'],
  advanced: ['advanced technology', 'advanced technologies'],
  terraFed: ['federation token on top of Terraforming', 'federation tokens on top of Terraforming'],
  rounds: ['round scoring tile', 'round scoring tiles'],
  final: ['final scoring tile', 'final scoring tiles'],
  shipTech: ['Lost Fleet technology on the ships', 'Lost Fleet technologies on the ships'],
  shipFed: ['federation token on the ships', 'federation tokens on the ships'],
  artifacts: ['artifact on Twilight', 'artifacts on Twilight'],
  boosters: ['booster', 'boosters'],
};

// Lost Fleet ships on the map (planet id = ship type) must be exactly the
// ships in play, once each.
function mapShipProblems(planets: PlanetMap, players: number): string[] {
  const inPlay = new Set(shipsInPlay(players).map((s) => s.type));
  const problems: string[] = [];
  for (const ship of SHIPS) {
    const count = Object.values(planets).filter((t) => t === ship.type).length;
    if (!inPlay.has(ship.type)) {
      if (count > 0) problems.push(`Galaxy map: remove ${ship.name} — it isn't used in ${players} player games.`);
    } else if (count === 0) {
      problems.push(`Galaxy map: place ${ship.name} — every Lost Fleet ship in play goes on the map.`);
    } else if (count > 1) {
      problems.push(`Galaxy map: ${ship.name} is on the map ${count} times — each ship goes on it once.`);
    }
  }
  return problems;
}

// Everything a game setup needs before /game-setup can show it: one faction
// per player, every slot in play filled, and in Lost Fleet each ship in play
// once on the map. `planets` is the map as drawn (sample already resolved).
// Returns what's missing or wrong (empty = complete).
export function validateSetup(setup: Pick<Setup, 'players' | 'lostFleet' | 'slots' | 'races'> & { planets: PlanetMap }): string[] {
  const { players, lostFleet, slots, races, planets } = setup;
  const problems: string[] = [];
  const picked = fitRaces(races, players, lostFleet).length;
  if (picked !== players) {
    problems.push(`Pick ${players - picked} more faction${players - picked === 1 ? '' : 's'} — a ${players} player game needs ${players} (${picked} picked).`);
  }
  for (const g of BUILDER_GROUPS) {
    const inPlay = slotsInPlay(g, players, lostFleet);
    const placed = inPlay.filter((i) => slots[g.key][i] != null).length;
    if (placed < inPlay.length) {
      const missing = inPlay.length - placed;
      const [one, many] = MISSING_LABELS[g.key] ?? [g.title, g.title];
      problems.push(`Place ${missing} more ${missing === 1 ? one : many} (${placed} of ${inPlay.length}).`);
    }
  }
  if (lostFleet) problems.push(...mapShipProblems(planets, players));
  return problems;
}
