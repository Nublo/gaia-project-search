import { describe, it, expect } from 'vitest';
import { layoutHexKeys } from '@/lib/galaxy-map';
import { buildMapTimeline, decodeMapTimeline, encodeMapTimeline, stepLabels } from '@/lib/map-timeline';

// A BGA map snapshot over the base 2 player layout: every hex empty space
// except `planets`, with `buildings` on their hexes.
type Piece = { buildingId: number; playerId: number; isPartOfFed?: number };
function snapshot(planets: Record<string, number>, buildings: Record<string, Piece[]> = {}) {
  const map: Record<string, Record<string, { planetType: number; buildings: Piece[] }>> = {};
  for (const k of layoutHexKeys('base2')) {
    const [q, r] = k.split(',');
    (map[q] ??= {})[r] = { planetType: planets[k] ?? 0, buildings: buildings[k] ?? [] };
  }
  return map;
}

const A = 111;
const B = 222;
const planets = { '-7,2': 1, '-6,1': 2, '-5,0': 9 };
const mineA = { buildingId: 4, playerId: A };

const logs = [
  { data: [{ type: 'notifyPlaceStartingBldg', args: { q: -7, r: 2, playerId: A, buildingId: 4 } }] },
  { data: [{ type: 'notifyPlaceStartingBldg', args: { q: -6, r: 1, playerId: B, buildingId: 4 } }] },
  // An empty `map` is ignored.
  { data: [{ type: 'notifyUpdate', args: { map: [] } }] },
  {
    data: [
      {
        type: 'notifyBuild',
        args: {
          playerId: B,
          map: snapshot(planets, { '-7,2': [mineA], '-6,1': [{ buildingId: 4, playerId: B }], '-5,0': [{ buildingId: 2, playerId: B }] }),
        },
      },
    ],
  },
  { data: [{ type: 'notifyUpgrade', args: { q: -7, r: 2, playerId: A, buildingId: 5 } }] },
  { data: [{ type: 'notifyRoundEnd', args: {} }] },
  {
    data: [
      {
        type: 'notifyGaiaformed',
        args: {
          map: snapshot(
            { ...planets, '-5,0': 8 },
            { '-7,2': [{ buildingId: 5, playerId: A, isPartOfFed: 1 }], '-6,1': [{ buildingId: 4, playerId: B }] }
          ),
        },
      },
    ],
  },
];

describe('buildMapTimeline', () => {
  const timeline = buildMapTimeline(logs)!;

  it('finds the layout and starts from the empty board', () => {
    expect(timeline.layoutKey).toBe('base2');
    expect(timeline.planets).toEqual({ '-7,2': 1, '-6,1': 2, '-5,0': 9 });
  });

  it('makes one step per map change, with rounds and owners', () => {
    expect(timeline.steps.map((s) => [s.round, s.playerId])).toEqual([
      [0, A],
      [0, B],
      [1, B],
      [1, A],
      [2, null],
    ]);
    expect(timeline.steps[4].changes).toContainEqual({ hex: '-5,0', planet: 8, structures: [] });
  });

  it('labels steps from their changes', () => {
    expect(stepLabels(timeline)).toEqual(['Mine', 'Mine', 'Gaiaformer', 'Mine → Trading Station', 'Gaia planet formed']);
  });

  it('returns null without a map snapshot', () => {
    expect(buildMapTimeline([{ data: [{ type: 'notifyUpdate', args: { map: {} } }] }])).toBeNull();
  });
});

describe('encodeMapTimeline / decodeMapTimeline', () => {
  it('round-trips a timeline', () => {
    const timeline = buildMapTimeline(logs)!;
    const stored = encodeMapTimeline(timeline);
    expect(stored.p).toEqual([A, B]);
    expect(decodeMapTimeline(JSON.parse(JSON.stringify(stored)))).toEqual(timeline);
  });
});
