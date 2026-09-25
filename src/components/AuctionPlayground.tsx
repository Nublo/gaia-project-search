"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { RACE_NAMES, RaceId } from "@/lib/gaia-constants";
import { RACE_IMAGE_FILES } from "@/components/SearchCriteriaSummary";
import { resolveAuction, normalizeBids, type AuctionLogEntry } from "@/lib/auction";

const MAX_BID = 100;
const PLAYER_NAMES = ["Player_A", "Player_B", "Player_C", "Player_D"];
const PLAYER_COLORS = ["bg-blue-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500"];

const FACTIONS = [RaceId.AMBAS, RaceId.FIRACS, RaceId.GEODENS, RaceId.TERRANS];
// Row 0/1 for the first two factions reproduce "Scenario B" from the 2p article.
const DEFAULT_BIDS = [
  [0, 20, 40, 5],
  [0, 10, 25, 15],
  [0, 5, 10, 30],
  [0, 15, 0, 20],
];

function RaceIcon({ raceId, size }: { raceId: RaceId; size: number }) {
  const name = RACE_NAMES[raceId];
  return (
    <Image
      src={`/races/${RACE_IMAGE_FILES[name]}`}
      alt={name}
      width={size}
      height={size}
      className="rounded shrink-0"
    />
  );
}

function PlayerDot({ idx }: { idx: number }) {
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${PLAYER_COLORS[idx]}`} />;
}

export default function AuctionPlayground() {
  const [playerCount, setPlayerCount] = useState(2);
  const [allBids, setAllBids] = useState<number[][]>(DEFAULT_BIDS);

  const factions = FACTIONS.slice(0, playerCount);
  const bids = useMemo(
    () => allBids.slice(0, playerCount).map((row) => row.slice(0, playerCount)),
    [allBids, playerCount],
  );
  const result = useMemo(() => resolveAuction(bids), [bids]);
  const relative = useMemo(() => normalizeBids(bids), [bids]);

  const factionName = (f: number) => RACE_NAMES[factions[f]];

  const setBid = (p: number, f: number, value: number) => {
    const clamped = Math.max(0, Math.min(MAX_BID, Number.isFinite(value) ? Math.round(value) : 0));
    setAllBids((prev) => prev.map((row, i) => (i === p ? row.map((b, j) => (j === f ? clamped : b)) : row)));
  };

  const reset = () => {
    setAllBids(DEFAULT_BIDS);
  };

  return (
    <div className="not-prose space-y-8">
      {/* Setup */}
      <section>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Players</span>
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                  playerCount === n ? "bg-white shadow-sm font-semibold text-blue-600" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <button onClick={reset} className="ml-auto text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2">
            Reset
          </button>
        </div>
      </section>

      {/* Bids */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Bids</h2>
        <p className="text-sm text-gray-500 mb-3">
          Drag the sliders — the result below updates instantly. The highlighted row is the faction the player wins.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {bids.map((row, p) => {
            const won = result.factions[p];
            const hasOffset = Math.min(...row) > 0;
            return (
              <div key={p} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <PlayerDot idx={p} />
                  <span className="font-semibold text-gray-900">{PLAYER_NAMES[p]}</span>
                </div>
                <div className="space-y-2">
                  {row.map((bid, f) => (
                    <div
                      key={f}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1 ${
                        f === won ? "bg-green-50 ring-1 ring-green-300" : ""
                      }`}
                    >
                      <RaceIcon raceId={factions[f]} size={24} />
                      <span className="w-24 truncate text-sm text-gray-700">{factionName(f)}</span>
                      <input
                        type="range"
                        min={0}
                        max={MAX_BID}
                        value={bid}
                        onChange={(e) => setBid(p, f, Number(e.target.value))}
                        className="flex-1 min-w-0 accent-blue-600"
                        aria-label={`${PLAYER_NAMES[p]} bid on ${factionName(f)}`}
                      />
                      <input
                        type="number"
                        min={0}
                        max={MAX_BID}
                        value={bid}
                        onChange={(e) => setBid(p, f, Number(e.target.value))}
                        className="w-14 rounded border border-gray-200 px-1 py-0.5 text-right text-sm tabular-nums"
                      />
                    </div>
                  ))}
                </div>
                {hasOffset && (
                  <p className="mt-3 text-xs text-gray-500">
                    Only differences matter — this is the same as bidding{" "}
                    {relative[p].map((b, f) => `${b} on ${factionName(f)}`).join(", ")}.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Outcome */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Outcome</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {result.outcomes.map((o) => (
            <div key={o.playerIdx} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <RaceIcon raceId={factions[o.factionIdx]} size={48} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <PlayerDot idx={o.playerIdx} />
                  {PLAYER_NAMES[o.playerIdx]}
                </div>
                <div className="font-semibold text-gray-900">{factionName(o.factionIdx)}</div>
                <div className="text-sm">
                  <span className={o.payment > 0 ? "text-rose-600 font-medium" : "text-green-700 font-medium"}>
                    pays {o.payment} VP
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bid log */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Bid log</h2>
        <p className="text-sm text-gray-500 mb-3">
          Players will automatically bid on the faction with the greatest gap between its current bid and the
          player&apos;s maximum bid.
        </p>
        <ol className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100 text-sm">
          {result.log.map((entry, i) => (
            <li
              key={i}
              className={`flex items-start gap-2 px-3 py-1.5 ${entry.kind === "win" ? "bg-green-50 font-medium" : ""}`}
            >
              <span className="w-6 shrink-0 text-right text-xs text-gray-400 tabular-nums pt-0.5">{i + 1}</span>
              <span className="pt-1.5">
                <PlayerDot idx={entry.player} />
              </span>
              <RaceIcon raceId={factions[entry.faction]} size={20} />
              <span className="min-w-0 text-gray-700">
                <LogText entry={entry} factionName={factionName} />
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function LogText({ entry, factionName }: { entry: AuctionLogEntry; factionName: (f: number) => string }) {
  const P = <b className="text-gray-900">{PLAYER_NAMES[entry.player]}</b>;
  const F = factionName(entry.faction);
  switch (entry.kind) {
    case "open":
      return (
        <>
          {P} bids 0 on {F} <span className="text-gray-500">(and is willing to bid up to {entry.max} if needed)</span>
        </>
      );
    case "outbid":
      return (
        <>
          {P} bids {entry.bid} on {F}, outbidding {PLAYER_NAMES[entry.outbid]}.{" "}
          <span className="text-gray-500">
            (The bid was {entry.gap} away from {PLAYER_NAMES[entry.player]}&apos;s max bid of {entry.max}.)
          </span>
        </>
      );
    case "win":
      return (
        <>
          {P} wins the auction for {F}, spending {entry.bid} VP
        </>
      );
  }
}
