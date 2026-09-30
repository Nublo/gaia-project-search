import { describe, it, expect } from 'vitest';
import { fitRaces, parseRaces, pickBlocker, raceColumns } from '../builder-factions';
import { RaceId } from '../gaia-constants';

describe('raceColumns', () => {
  it('groups races by home planet, Lost Fleet ones only in Lost Fleet', () => {
    const base = raceColumns(false);
    expect(base).toHaveLength(7);
    expect(base[0]).toEqual({ planet: 1, races: [RaceId.TERRANS, RaceId.LANTIDS] });
    expect(raceColumns(true).slice(7)).toEqual([
      { planet: 11, races: [RaceId.TINKEROIDS, RaceId.DARKANIANS] },
      { planet: 12, races: [RaceId.MOWEYDS, RaceId.SPACE_GIANTS] },
    ]);
  });
});

describe('pickBlocker', () => {
  it('blocks a second race of the same home planet', () => {
    expect(pickBlocker(RaceId.LANTIDS, [RaceId.TERRANS], 4)).toMatch(/Terrans/);
    expect(pickBlocker(RaceId.XENOS, [RaceId.TERRANS], 4)).toBeNull();
  });

  it('blocks picks past one per player', () => {
    expect(pickBlocker(RaceId.XENOS, [RaceId.TERRANS, RaceId.IVITS], 2)).toMatch(/2 player/);
  });
});

describe('fitRaces', () => {
  it('drops unknown, duplicate-color, non-Lost-Fleet and extra picks, keeping order', () => {
    expect(fitRaces([99, RaceId.TERRANS, RaceId.LANTIDS, RaceId.TINKEROIDS, RaceId.IVITS, RaceId.XENOS], 2, false)).toEqual([
      RaceId.TERRANS,
      RaceId.IVITS,
    ]);
    expect(fitRaces([RaceId.TINKEROIDS, RaceId.DARKANIANS, RaceId.GLEENS], 3, true)).toEqual([RaceId.TINKEROIDS, RaceId.GLEENS]);
  });
});

describe('parseRaces', () => {
  it('reads rc params', () => {
    expect(parseRaces(['4', '9', 'x'])).toEqual([4, 9]);
    expect(parseRaces('14')).toEqual([14]);
    expect(parseRaces(undefined)).toEqual([]);
  });
});
