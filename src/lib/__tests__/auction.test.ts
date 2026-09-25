import { describe, it, expect } from 'vitest';
import { resolveAuction, normalizeBids, type AuctionLogEntry } from '../auction';

function format(entry: AuctionLogEntry, players: string[], factions: string[]): string {
  const P = players[entry.player];
  const F = factions[entry.faction];
  switch (entry.kind) {
    case 'open':
      return `${P} bids 0 on ${F} (and is willing to bid up to ${entry.max} if needed)`;
    case 'outbid':
      return `${P} bids ${entry.bid} on ${F}, outbidding ${players[entry.outbid]}. (The bid was ${entry.gap} away from ${P}'s max bid of ${entry.max}.)`;
    case 'win':
      return `${P} wins the auction for ${F}, spending ${entry.bid}`;
  }
}

// Columns: [Ambas, Firacs] — examples from src/content/auction-2p.mdx
describe('resolveAuction — 2 players', () => {
  it('Scenario A: different favourites, nobody pays', () => {
    const r = resolveAuction([
      [0, 20],
      [10, 0],
    ]);
    expect(r.factions).toEqual([1, 0]);
    expect(r.outcomes.map((o) => o.payment)).toEqual([0, 0]);
  });

  it('Scenario B: same favourite, winner pays the other bid', () => {
    const r = resolveAuction([
      [0, 20],
      [0, 10],
    ]);
    expect(r.factions).toEqual([1, 0]);
    expect(r.outcomes.map((o) => o.payment)).toEqual([10, 0]);
  });

  it('only relative bids matter', () => {
    const r = resolveAuction([
      [0, 20],
      [100, 110],
    ]);
    expect(r.factions).toEqual([1, 0]);
    expect(r.outcomes.map((o) => o.payment)).toEqual([10, 0]);
  });
});

describe('resolveAuction — replays a real BGA 3 player log', () => {
  // Faction order matters for tie-breaks: Itars before Terrans before Bescods.
  // Unlogged max bids (BUM-_- on Terrans/Bescods, nublo on Bescods) set to 0.
  const factions = ['Itars', 'Terrans', 'Bescods'];
  const players = ['nublo', 'BUM-_-', 'rhydemon'];
  const bids = [
    [22, 14, 0],
    [31, 0, 0],
    [24, 13, 0],
  ];

  const expected = [
    'nublo bids 0 on Itars (and is willing to bid up to 22 if needed)',
    "BUM-_- bids 1 on Itars, outbidding nublo. (The bid was 31 away from BUM-_-'s max bid of 31.)",
    "rhydemon bids 2 on Itars, outbidding BUM-_-. (The bid was 23 away from rhydemon's max bid of 24.)",
    "nublo bids 3 on Itars, outbidding rhydemon. (The bid was 20 away from nublo's max bid of 22.)",
    "BUM-_- bids 4 on Itars, outbidding nublo. (The bid was 28 away from BUM-_-'s max bid of 31.)",
    "rhydemon bids 5 on Itars, outbidding BUM-_-. (The bid was 20 away from rhydemon's max bid of 24.)",
    "nublo bids 6 on Itars, outbidding rhydemon. (The bid was 17 away from nublo's max bid of 22.)",
    "BUM-_- bids 7 on Itars, outbidding nublo. (The bid was 25 away from BUM-_-'s max bid of 31.)",
    "rhydemon bids 8 on Itars, outbidding BUM-_-. (The bid was 17 away from rhydemon's max bid of 24.)",
    'nublo bids 0 on Terrans (and is willing to bid up to 14 if needed)',
    "BUM-_- bids 9 on Itars, outbidding rhydemon. (The bid was 23 away from BUM-_-'s max bid of 31.)",
    "rhydemon bids 10 on Itars, outbidding BUM-_-. (The bid was 15 away from rhydemon's max bid of 24.)",
    "BUM-_- bids 11 on Itars, outbidding rhydemon. (The bid was 21 away from BUM-_-'s max bid of 31.)",
    "rhydemon bids 12 on Itars, outbidding BUM-_-. (The bid was 13 away from rhydemon's max bid of 24.)",
    "BUM-_- bids 13 on Itars, outbidding rhydemon. (The bid was 19 away from BUM-_-'s max bid of 31.)",
    "rhydemon bids 1 on Terrans, outbidding nublo. (The bid was 13 away from rhydemon's max bid of 13.)",
    "nublo bids 2 on Terrans, outbidding rhydemon. (The bid was 13 away from nublo's max bid of 14.)",
    "rhydemon bids 14 on Itars, outbidding BUM-_-. (The bid was 11 away from rhydemon's max bid of 24.)",
    "BUM-_- bids 15 on Itars, outbidding rhydemon. (The bid was 17 away from BUM-_-'s max bid of 31.)",
    "rhydemon bids 3 on Terrans, outbidding nublo. (The bid was 11 away from rhydemon's max bid of 13.)",
    "nublo bids 4 on Terrans, outbidding rhydemon. (The bid was 11 away from nublo's max bid of 14.)",
    "rhydemon bids 16 on Itars, outbidding BUM-_-. (The bid was 9 away from rhydemon's max bid of 24.)",
    "BUM-_- bids 17 on Itars, outbidding rhydemon. (The bid was 15 away from BUM-_-'s max bid of 31.)",
    "rhydemon bids 5 on Terrans, outbidding nublo. (The bid was 9 away from rhydemon's max bid of 13.)",
    "nublo bids 6 on Terrans, outbidding rhydemon. (The bid was 9 away from nublo's max bid of 14.)",
    "rhydemon bids 18 on Itars, outbidding BUM-_-. (The bid was 7 away from rhydemon's max bid of 24.)",
    "BUM-_- bids 19 on Itars, outbidding rhydemon. (The bid was 13 away from BUM-_-'s max bid of 31.)",
    "rhydemon bids 7 on Terrans, outbidding nublo. (The bid was 7 away from rhydemon's max bid of 13.)",
    "nublo bids 8 on Terrans, outbidding rhydemon. (The bid was 7 away from nublo's max bid of 14.)",
    "rhydemon bids 20 on Itars, outbidding BUM-_-. (The bid was 5 away from rhydemon's max bid of 24.)",
    "BUM-_- bids 21 on Itars, outbidding rhydemon. (The bid was 11 away from BUM-_-'s max bid of 31.)",
    "rhydemon bids 9 on Terrans, outbidding nublo. (The bid was 5 away from rhydemon's max bid of 13.)",
    "nublo bids 10 on Terrans, outbidding rhydemon. (The bid was 5 away from nublo's max bid of 14.)",
    "rhydemon bids 22 on Itars, outbidding BUM-_-. (The bid was 3 away from rhydemon's max bid of 24.)",
    "BUM-_- bids 23 on Itars, outbidding rhydemon. (The bid was 9 away from BUM-_-'s max bid of 31.)",
    "rhydemon bids 11 on Terrans, outbidding nublo. (The bid was 3 away from rhydemon's max bid of 13.)",
    "nublo bids 12 on Terrans, outbidding rhydemon. (The bid was 3 away from nublo's max bid of 14.)",
    "rhydemon bids 24 on Itars, outbidding BUM-_-. (The bid was 1 away from rhydemon's max bid of 24.)",
    "BUM-_- bids 25 on Itars, outbidding rhydemon. (The bid was 7 away from BUM-_-'s max bid of 31.)",
    "rhydemon bids 13 on Terrans, outbidding nublo. (The bid was 1 away from rhydemon's max bid of 13.)",
    "nublo bids 14 on Terrans, outbidding rhydemon. (The bid was 1 away from nublo's max bid of 14.)",
    'rhydemon bids 0 on Bescods (and is willing to bid up to 0 if needed)',
    'nublo wins the auction for Terrans, spending 14',
    'BUM-_- wins the auction for Itars, spending 25',
    'rhydemon wins the auction for Bescods, spending 0',
  ];

  it('produces the exact same log', () => {
    const r = resolveAuction(bids);
    expect(r.log.map((e) => format(e, players, factions))).toEqual(expected);
  });
});

describe('normalizeBids', () => {
  it('subtracts each row minimum', () => {
    expect(normalizeBids([[100, 110], [5, 0]])).toEqual([[0, 10], [5, 0]]);
  });
});
