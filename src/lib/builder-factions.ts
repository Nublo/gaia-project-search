// Factions picked for a /builder game: one per player, never two of the same
// home planet, Lost Fleet factions only in Lost Fleet mode. Kept in pick (seat) order.
import { RACE_NAMES, getRaceHomePlanet, isLostFleetRace } from '@/lib/gaia-constants';

export const RACE_IDS = Object.keys(RACE_NAMES).map(Number);

// Columns of the picker: races grouped by home planet, in race id order.
export function raceColumns(lostFleet: boolean): { planet: number; races: number[] }[] {
  const columns = new Map<number, number[]>();
  for (const id of RACE_IDS) {
    if (!lostFleet && isLostFleetRace(id)) continue;
    const planet = getRaceHomePlanet(id);
    columns.set(planet, [...(columns.get(planet) ?? []), id]);
  }
  return [...columns].map(([planet, races]) => ({ planet, races }));
}

// Why a race can't be added right now, or null if it can.
export function pickBlocker(race: number, picked: number[], players: number): string | null {
  const sameColor = picked.find((id) => id !== race && getRaceHomePlanet(id) === getRaceHomePlanet(race));
  if (sameColor) return `Same home planet as ${RACE_NAMES[sameColor as keyof typeof RACE_NAMES]}`;
  if (picked.length >= players) return `A ${players} player game has ${players} factions`;
  return null;
}

// Drops picks that don't fit the setup: unknown ids, Lost Fleet races outside
// Lost Fleet, repeated home planets, and anything past one per player.
export function fitRaces(races: number[], players: number, lostFleet: boolean): number[] {
  const out: number[] = [];
  for (const id of races) {
    if (!RACE_IDS.includes(id) || (!lostFleet && isLostFleetRace(id))) continue;
    if (pickBlocker(id, out, players) || out.includes(id)) continue;
    out.push(id);
  }
  return out;
}

// Link param `rc`: one race id per value, in pick order.
export function parseRaces(raw: string | string[] | undefined): number[] {
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return values.map(Number).filter((n) => Number.isInteger(n) && n > 0);
}
