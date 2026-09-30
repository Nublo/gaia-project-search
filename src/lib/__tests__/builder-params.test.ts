import { describe, it, expect } from 'vitest';
import { parseSetup, setupPlanets, setupToQuery, validateSetup, type SearchParams } from '../builder-params';

// Bookmarklet import of the table 919791132 replay (2 players, Lost Fleet), minus the map.
const REPLAY_QUERY =
  'p=2&std=0%3A6&std=1%3A4&std=2%3A5&std=3%3A8&std=4%3A7&std=5%3A2&std=6%3A1&std=7%3A3&std=8%3A9' +
  '&adv=0%3A24&adv=1%3A11&adv=2%3A20&adv=3%3A17&adv=4%3A21&adv=5%3A33&adv=6%3A34' +
  '&rnd=0%3A11&rnd=1%3A3&rnd=2%3A12&rnd=3%3A6&rnd=4%3A9&rnd=5%3A8&fin=0%3A7&fin=1%3A8&fed=0%3A5' +
  '&shf=3%3A15&art=0%3A8&art=1%3A9&shf=0%3A12&shp=0%3A41&shf=1%3A16&shp=1%3A42' +
  '&bst=0%3A11&bst=1%3A7&bst=2%3A10&bst=3%3A3&bst=4%3A12&rc=4&rc=9&lf=1&xvp=1';

function paramsOf(query: string): SearchParams {
  const out: SearchParams = {};
  for (const [k, v] of new URLSearchParams(query)) {
    const prev = out[k];
    out[k] = prev === undefined ? v : Array.isArray(prev) ? [...prev, v] : [prev, v];
  }
  return out;
}

// Setups as validated: the map resolved (no pl in the link = the layout's sample map).
const withMap = (query: string) => {
  const setup = parseSetup(paramsOf(query));
  return { ...setup, planets: setupPlanets(setup) };
};
const replay = () => withMap(REPLAY_QUERY);

describe('validateSetup', () => {
  it('accepts a complete imported setup', () => {
    expect(validateSetup(replay())).toEqual([]);
  });

  it('asks for one faction per player', () => {
    const setup = { ...replay(), races: [4] };
    expect(validateSetup(setup)).toEqual(['Pick 1 more faction — a 2 player game needs 2 (1 picked).']);
    expect(validateSetup({ ...setup, players: 4 })[0]).toBe('Pick 3 more factions — a 4 player game needs 4 (1 picked).');
  });

  it('lists every unfilled group with counts', () => {
    const setup = replay();
    const slots = { ...setup.slots, standard: [...setup.slots.standard], rounds: setup.slots.rounds.map(() => null), boosters: [11, 7, null, null, null, null, null] };
    slots.standard[3] = null;
    expect(validateSetup({ ...setup, slots })).toEqual([
      'Place 1 more standard technology (8 of 9).',
      'Place 6 more round scoring tiles (0 of 6).',
      'Place 3 more boosters (2 of 5).',
    ]);
  });

  it('needs ships, artifacts and the extension tech only in Lost Fleet', () => {
    const empty = withMap('p=3');
    const base = validateSetup(empty).join('\n');
    expect(base).toMatch(/Pick 3 more factions/);
    expect(base).toMatch(/Place 6 more advanced technologies \(0 of 6\)/);
    expect(base).toMatch(/Place 6 more boosters \(0 of 6\)/);
    expect(base).not.toMatch(/ships|Twilight/);

    const lf = validateSetup({ ...empty, lostFleet: true }).join('\n');
    expect(lf).toMatch(/Place 7 more advanced technologies \(0 of 7\)/);
    expect(lf).toMatch(/Place 3 more Lost Fleet technologies on the ships \(0 of 3\)/);
    expect(lf).toMatch(/Place 4 more federation tokens on the ships \(0 of 4\)/);
    expect(lf).toMatch(/Place 3 more artifacts on Twilight \(0 of 3\)/);
  });

  describe('Lost Fleet ships on the map', () => {
    // The 2 player Lost Fleet sample map has Eclipse (15), T.F. Mars (16) and Twilight (18) once each.
    const shipKeys = (planets: Record<string, number>) => Object.entries(planets).filter(([, t]) => t >= 15);

    it('wants each ship in play once', () => {
      const setup = replay();
      const [[eclipseAt]] = shipKeys(setup.planets).filter(([, t]) => t === 15);
      const withoutEclipse = { ...setup.planets };
      delete withoutEclipse[eclipseAt];
      expect(validateSetup({ ...setup, planets: withoutEclipse })).toEqual([
        'Galaxy map: place Eclipse — every Lost Fleet ship in play goes on the map.',
      ]);
      expect(validateSetup({ ...setup, planets: { ...setup.planets, '0,0': 18 } })).toEqual([
        'Galaxy map: Twilight is on the map 2 times — each ship goes on it once.',
      ]);
    });

    it('rejects Rebellion in 2 player games', () => {
      const setup = replay();
      expect(validateSetup({ ...setup, planets: { ...setup.planets, '0,0': 17 } })).toEqual([
        "Galaxy map: remove Rebellion — it isn't used in 2 player games.",
      ]);
    });

    it('ignores the map outside Lost Fleet', () => {
      const setup = replay();
      const problems = validateSetup({ ...setup, lostFleet: false, planets: {} });
      expect(problems.some((p) => p.startsWith('Galaxy map'))).toBe(false);
    });
  });
});

describe('setupToQuery', () => {
  it('round-trips buildings, dropping ones on planets that can\'t hold them', () => {
    const setup = withMap('p=3&pl=0,0:4&pl=1,1:8&pl=2,2:11&bd=0,0:4&bd=1,1:4&bd=2,2:9&bd=5,5:4');
    const query = setupToQuery(setup);
    expect(new URLSearchParams(query).getAll('bd')).toEqual(['0,0:4', '2,2:9']);
    expect(parseSetup(paramsOf(query)).buildings).toEqual({ '0,0': 4, '2,2': 9 });
  });
});
