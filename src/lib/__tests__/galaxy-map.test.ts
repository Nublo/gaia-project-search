import { describe, it, expect } from 'vitest';
import {
  availablePlanets,
  fitPlanets,
  mapGeometry,
  mapLayoutKey,
  parseMapSize,
  parsePlanets,
  planetsToParams,
  samplePlanets,
  type MapLayoutKey,
} from '../galaxy-map';

describe('mapLayoutKey', () => {
  it('picks the layout for the setup', () => {
    expect(mapLayoutKey(2, false, false)).toBe('base2');
    expect(mapLayoutKey(2, false, true)).toBe('base2');
    expect(mapLayoutKey(3, false, false)).toBe('base8');
    expect(mapLayoutKey(3, false, true)).toBe('base10');
    expect(mapLayoutKey(4, false, true)).toBe('base10');
    expect(mapLayoutKey(4, true, false)).toBe('lf4');
  });
});

describe('mapGeometry', () => {
  // Hex counts per setup, as seen across stored BGA games.
  it.each([
    ['base2', 133, 7, 0],
    ['base8', 152, 8, 0],
    ['base10', 190, 10, 0],
    ['lf2', 157, 7, 24],
    ['lf3', 203, 9, 32],
    ['lf4', 224, 10, 34],
  ] as [MapLayoutKey, number, number, number][])('%s has %i hexes, %i sectors, %i pieces', (key, hexes, sectors, pieces) => {
    const g = mapGeometry(key);
    expect(g.hexes).toHaveLength(hexes);
    expect(g.sectors).toHaveLength(sectors);
    expect(g.pieces).toHaveLength(pieces);
    for (const b of [...g.sectors, ...g.pieces, ...g.hexes]) {
      expect(b.left).toBeGreaterThanOrEqual(0);
      expect(b.top).toBeGreaterThanOrEqual(0);
      expect(b.left + b.width).toBeLessThanOrEqual(g.width);
      expect(b.top + b.height).toBeLessThanOrEqual(g.height);
    }
  });

  it('keeps neighbouring hexes one BGA grid step apart', () => {
    const g = mapGeometry('base8');
    const at = (q: number, r: number) => g.hexes.find((h) => h.q === q && h.r === r)!;
    // Inside a sector: (q, r+1) is 134 px lower; (q+1, r) is 116 px right, 67 px lower.
    const c = at(0, 0);
    expect(at(0, 1).top - c.top).toBe(134);
    expect(at(1, 0).left - c.left).toBe(116);
    expect(at(1, 0).top - c.top).toBe(67);
  });
});

describe('planets', () => {
  it('has a sample map for every layout', () => {
    expect(Object.keys(samplePlanets('base2')).length).toBe(41);
    expect(Object.values(samplePlanets('lf3'))).toContain(17); // Rebellion at 3 players
    expect(Object.values(samplePlanets('lf2'))).not.toContain(17);
  });

  it('offers Lost Fleet planets only in Lost Fleet mode, no Rebellion at 2 players', () => {
    expect(availablePlanets(false, 4)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(availablePlanets(true, 3)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17, 18]);
    expect(availablePlanets(true, 2)).not.toContain(17);
  });

  it('drops planets off the layout or not allowed in the mode', () => {
    const planets = { '0,0': 8, '7,7': 1, '0,1': 11 };
    expect(fitPlanets(planets, 'base8', false, 3)).toEqual({ '0,0': 8 });
  });
});

describe('link params', () => {
  it('round-trips planets', () => {
    const params = new URLSearchParams();
    planetsToParams({ '0,0': 8, '-2,3': 1 }, 'base8', params);
    expect(params.getAll('pl')).toEqual(['0,0:8', '-2,3:1']);
    expect(parsePlanets(params.getAll('pl'))).toEqual({ '0,0': 8, '-2,3': 1 });
  });

  it('omits the sample map and marks an empty one', () => {
    const sample = new URLSearchParams();
    planetsToParams(samplePlanets('lf4'), 'lf4', sample);
    expect(sample.has('pl')).toBe(false);

    const empty = new URLSearchParams();
    planetsToParams({}, 'lf4', empty);
    expect(empty.getAll('pl')).toEqual(['']);
    expect(parsePlanets(empty.getAll('pl'))).toEqual({});
    expect(parsePlanets(undefined)).toBeNull();
  });

  it('ignores malformed planets', () => {
    expect(parsePlanets(['1,2:99', 'x', '3,4:7'])).toEqual({ '3,4': 7 });
  });

  it('parses map size with a per-player default', () => {
    expect(parseMapSize('l', 3)).toBe(true);
    expect(parseMapSize('s', 4)).toBe(false);
    expect(parseMapSize(undefined, 4)).toBe(true);
    expect(parseMapSize(undefined, 3)).toBe(false);
  });
});
