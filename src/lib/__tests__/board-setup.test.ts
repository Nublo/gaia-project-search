import { describe, it, expect } from 'vitest';
import { boardSetupToSetup, buildBoardSetup } from '@/lib/board-setup';
import type { MapTimeline } from '@/lib/map-timeline';

const A = 111;
const B = 222;

// BGA's board as Lost Fleet logs repeat it, here after the booster draft (round 1).
const board = {
  techs: [4, 3, 2, 1, 8, 7, 5, 9, 6],
  advTechs: [33, 19, 20, 16, 15, 14, 34],
  roundBonus: [0, 8, 10, 9, 7, 2, 4],
  endGameBonus: [4, 7],
  bonusFedToken: 5,
  availBoosters: [8, 13, 11],
  config: { lostFleet: 1 },
  roundNum: 1,
  lostFleet: {
    scoreBoard: 0,
    ships: [
      { type: 18, availArtifacts: [7, 5, 0, 0], availFedTokenId: 11 },
      { type: 15, availTech: 40, availFedTokenId: 12 },
      { type: 16, availTech: 42, availFedTokenId: 13 },
    ],
  },
};

const logs = [
  {
    data: [
      { type: 'notifyChooseRace', args: { playerId: B, raceId: 17 } },
      { type: 'notifyChooseRace', args: { playerId: A, raceId: 3 } },
      { type: 'notifyChooseBoosterTile', args: { playerId: A, boosterId: 9 } },
      { type: 'notifyChooseBoosterTile', args: { playerId: B, boosterId: 5 } },
    ],
  },
  { data: [{ type: 'notifyUpdate', args: { board } }] },
];

describe('buildBoardSetup', () => {
  const setup = buildBoardSetup(logs)!;

  it('maps the board onto builder slots', () => {
    expect(setup.slots).toEqual({
      std: [4, 3, 2, 1, 8, 7, 5, 9, 6],
      adv: [33, 19, 20, 16, 15, 14, 34],
      rnd: [8, 10, 9, 7, 2, 4],
      fin: [4, 7],
      fed: [5],
      shp: [40, 42],
      shf: [12, 13, null, 11],
      art: [7, 5, null, null],
      bst: [5, 8, 9, 11, 13],
    });
  });

  it('rebuilds the boosters taken before the first snapshot', () => {
    expect(setup.slots.bst).toHaveLength(5); // 2 players + 3
  });

  it('keeps factions in pick (seat) order and the 25 VP rule', () => {
    expect(setup.races).toEqual([17, 3]);
    expect(setup.vpRequirement).toBe(true);
  });

  it('skips base games', () => {
    expect(buildBoardSetup([{ data: [{ type: 'notifyUpdate', args: { board: { ...board, config: {} } } }] }])).toBeNull();
    expect(buildBoardSetup([{ data: [] }])).toBeNull();
  });
});

describe('boardSetupToSetup', () => {
  it('takes planets and starting buildings from the map timeline', () => {
    const timeline: MapTimeline = {
      layoutKey: 'lf2',
      planets: { '0,0': 3, '1,0': 5 },
      steps: [
        { round: 0, playerId: A, changes: [{ hex: '0,0', structures: [{ buildingId: 4, playerId: A, fed: false }] }] },
        { round: 1, playerId: B, changes: [{ hex: '1,0', structures: [{ buildingId: 4, playerId: B, fed: false }] }] },
      ],
    };
    const result = boardSetupToSetup(buildBoardSetup(logs)!, timeline, 2);
    expect(result.buildings).toEqual({ '0,0': 4 });
    expect(result.planets).toEqual(timeline.planets);
    expect(result.slots.standard).toEqual([4, 3, 2, 1, 8, 7, 5, 9, 6]);
    expect(result.slots.rounds).toEqual([8, 10, 9, 7, 2, 4]);
    expect(result).toMatchObject({ players: 2, lostFleet: true, vpRequirement: true, races: [17, 3] });
  });
});
