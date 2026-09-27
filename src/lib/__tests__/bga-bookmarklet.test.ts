import { describe, it, expect, vi } from 'vitest';
import { buildBookmarklet } from '../bga-bookmarklet';

const BUILDER_URL = 'https://gaia-project-search.vercel.app/builder';

/** Execute the bookmarklet against a fake BGA `window`. */
function run(gameui: unknown) {
  const open = vi.fn();
  const alert = vi.fn();
  const href = buildBookmarklet(BUILDER_URL);
  expect(href.startsWith('javascript:')).toBe(true);
  const code = decodeURIComponent(href.slice('javascript:'.length));
  new Function('window', 'alert', code)({ gameui, open }, alert);
  return { open, alert };
}

describe('buildBookmarklet', () => {
  it('opens the builder with the board of table 864955433', () => {
    const { open, alert } = run({
      game_name: 'gaiaproject',
      gamedatas: {
        board: {
          techs: [3, 4, 2, 9, 6, 1, 5, 8, 7],
          advTechs: [17, 19, 20, 12, 18, 13],
          roundBonus: [0, 10, 9, 4, 7, 5, 6],
          endGameBonus: [3, 5],
        },
      },
    });
    expect(alert).not.toHaveBeenCalled();
    const url = new URL(open.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe(BUILDER_URL);
    expect(url.searchParams.getAll('std')).toEqual(['0:3', '1:4', '2:2', '3:9', '4:6', '5:1', '6:5', '7:8', '8:7']);
    expect(url.searchParams.getAll('adv')).toEqual(['0:17', '1:19', '2:20', '3:12', '4:18', '5:13']);
    // roundBonus[0] is an unused placeholder; rounds 1-6 go to rnd slots 0-5
    expect(url.searchParams.getAll('rnd')).toEqual(['0:10', '1:9', '2:4', '3:7', '4:5', '5:6']);
    expect(url.searchParams.getAll('fin')).toEqual(['0:3', '1:5']);
    expect(url.searchParams.get('lf')).toBeNull();
  });

  it('imports a Lost Fleet game: extension advanced tech, LF round tiles and lf flag', () => {
    const { open } = run({
      game_name: 'gaiaproject',
      gamedatas: {
        board: {
          techs: [8, 3, 1, 7, 9, 4, 5, 2, 6],
          advTechs: [34, 30, 21, 10, 20, 15, 18],
          roundBonus: [0, 4, 8, 12, 11, 5, 13],
          endGameBonus: [7, 8], // Lost Fleet-only scorings (table 919791132)
          config: { lostFleet: 1 },
        },
      },
    });
    const url = new URL(open.mock.calls[0][0]);
    expect(url.searchParams.getAll('adv')).toEqual(['0:34', '1:30', '2:21', '3:10', '4:20', '5:15', '6:18']);
    expect(url.searchParams.getAll('rnd')).toEqual(['0:4', '1:8', '2:12', '3:11', '4:5', '5:13']);
    expect(url.searchParams.getAll('fin')).toEqual(['0:7', '1:8']);
    expect(url.searchParams.get('lf')).toBe('1');
  });

  it('imports Lost Fleet ships: techs, federation tokens, Twilight artifacts and player count', () => {
    // logs/ships_example.png: 3 players, Twilight [9, 4, 10, 0], Eclipse 42, T.F. Mars 41, Rebellion 40
    const { open } = run({
      game_name: 'gaiaproject',
      gamedatas: {
        playerList: [89986833, 19279219, 99319569],
        board: {
          techs: [3, 4, 5, 8, 7, 2, 1, 9, 6],
          advTechs: [13, 20, 10, 15, 11, 35, 34],
          bonusFedToken: 6,
          config: { lostFleet: 1 },
          lostFleet: {
            ships: [
              { type: 18, playerIds: [], availFedTokenId: 10, availArtifacts: [9, 4, 10, 0] },
              { type: 15, playerIds: [], availFedTokenId: 14, availTech: 42 },
              { type: 16, playerIds: [], availFedTokenId: 15, availTech: 41 },
              { type: 17, playerIds: [], availFedTokenId: 11, availTech: 40 },
            ],
          },
        },
      },
    });
    const url = new URL(open.mock.calls[0][0]);
    expect(url.searchParams.get('p')).toBe('3');
    expect(url.searchParams.getAll('shp')).toEqual(['0:42', '1:41', '2:40']);
    expect(url.searchParams.getAll('art')).toEqual(['0:9', '1:4', '2:10']);
    expect(url.searchParams.getAll('fed')).toEqual(['0:6']);
    // Eclipse 14, T.F. Mars 15, Rebellion 11, Twilight 10 (slot = type - 15)
    expect(url.searchParams.getAll('shf')).toEqual(['3:10', '0:14', '1:15', '2:11']);
  });

  it('skips empty slots', () => {
    const { open } = run({ game_name: 'gaiaproject', gamedatas: { board: { techs: [3, 4], advTechs: [0, 19, null] } } });
    const url = new URL(open.mock.calls[0][0]);
    expect(url.searchParams.getAll('adv')).toEqual(['1:19']);
  });

  it('alerts when not on a Gaia Project game page', () => {
    expect(run(undefined).alert).toHaveBeenCalled();
    expect(run({ game_name: 'carcassonne', gamedatas: { board: { techs: [1] } } }).alert).toHaveBeenCalled();
  });
});
