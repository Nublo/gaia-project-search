/**
 * BGA Gaia Project faction auction simulator.
 *
 * Every player sets a maximum bid (VP) on every faction in play — one faction
 * per player. BGA then runs an automatic ascending auction, reverse-engineered
 * from its game logs:
 *
 *   - Players who don't currently hold a faction act one at a time, in queue
 *     order (initially table order; an outbid player joins the back).
 *   - An unheld faction can be taken for 0 VP; a held one costs the current
 *     bid + 1 and must not exceed the player's max bid.
 *   - The player bids on the faction with the greatest surplus
 *     (max bid − required bid). Ties go to the earlier faction.
 *   - The auction ends when every player holds a faction; each pays their
 *     final bid.
 */

export type AuctionLogEntry =
  | { kind: 'open'; player: number; faction: number; max: number }
  | { kind: 'outbid'; player: number; faction: number; bid: number; outbid: number; gap: number; max: number }
  | { kind: 'win'; player: number; faction: number; bid: number };

export interface PlayerOutcome {
  playerIdx: number;
  factionIdx: number;
  payment: number;
}

export interface AuctionResult {
  /** factionIdx for each player */
  factions: number[];
  outcomes: PlayerOutcome[];
  log: AuctionLogEntry[];
}

/** Run the auction. `bids[playerIdx][factionIdx]` = max bid; square matrix. */
export function resolveAuction(bids: number[][]): AuctionResult {
  const n = bids.length;
  const holder: (number | null)[] = new Array(n).fill(null);
  const price: number[] = new Array(n).fill(0);
  const queue = Array.from({ length: n }, (_, p) => p);
  const log: AuctionLogEntry[] = [];

  while (queue.length > 0) {
    const p = queue.shift()!;
    let best = -1;
    let bestSurplus = -Infinity;
    for (let f = 0; f < n; f++) {
      const required = holder[f] === null ? 0 : price[f] + 1;
      if (required > bids[p][f]) continue;
      const surplus = bids[p][f] - required;
      if (surplus > bestSurplus) {
        best = f;
        bestSurplus = surplus;
      }
    }
    // Unreachable: an unassigned player always has an unheld faction available at 0.
    if (best === -1) throw new Error('Auction stalled');

    const prev = holder[best];
    if (prev === null) {
      log.push({ kind: 'open', player: p, faction: best, max: bids[p][best] });
      price[best] = 0;
    } else {
      log.push({
        kind: 'outbid',
        player: p,
        faction: best,
        bid: price[best] + 1,
        outbid: prev,
        gap: bids[p][best] - price[best],
        max: bids[p][best],
      });
      price[best] += 1;
      queue.push(prev);
    }
    holder[best] = p;
  }

  const factions = new Array<number>(n);
  holder.forEach((p, f) => (factions[p!] = f));
  const outcomes = factions.map((f, p) => ({ playerIdx: p, factionIdx: f, payment: price[f] }));
  for (const o of outcomes) log.push({ kind: 'win', player: o.playerIdx, faction: o.factionIdx, bid: o.payment });

  return { factions, outcomes, log };
}

/** Bids with each player's lowest bid subtracted — only differences affect the auction. */
export function normalizeBids(bids: number[][]): number[][] {
  return bids.map((row) => {
    const min = Math.min(...row);
    return row.map((b) => b - min);
  });
}
