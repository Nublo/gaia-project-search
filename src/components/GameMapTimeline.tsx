'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { MapCanvas } from '@/components/GalaxyMap';
import { RACE_IMAGE_FILES } from '@/components/SearchCriteriaSummary';
import { raceSpriteRow } from '@/lib/galaxy-map';
import { applyChanges, type MapTimeline, type StructureMap } from '@/lib/map-timeline';

interface Player {
  playerId: number;
  playerName: string;
  raceId: number;
  raceName: string;
}

// Faction color swatches, one per structures sprite row.
const ROW_COLORS = ['#5b74d6', '#d4c21a', '#9a7454', '#d23a5c', '#ec7d12', '#8a8a8a', '#cfd6dc', '#d07ab8', '#3fd3e6'];

// Galaxy map of a stored game with a slider over its timeline: far left is
// the empty board, far right the final position, one stop per map change.
// `actions` sits at the right end of the players row.
export default function GameMapTimeline({ timeline, players, actions }: { timeline: MapTimeline; players: Player[]; actions?: ReactNode }) {
  const { steps } = timeline;
  const [pos, setPos] = useState(steps.length);

  // Map after each number of steps (frames[0] = empty board).
  const frames = useMemo(() => {
    const planets = { ...timeline.planets };
    const structures: StructureMap = {};
    const out = [{ planets: { ...planets }, structures: { ...structures } }];
    for (const step of steps) {
      applyChanges(planets, structures, step.changes);
      out.push({ planets: { ...planets }, structures: { ...structures } });
    }
    return out;
  }, [timeline, steps]);

  const byId = useMemo(() => new Map(players.map((p) => [p.playerId, p])), [players]);
  const spriteRows = useMemo(() => Object.fromEntries(players.map((p) => [p.playerId, raceSpriteRow(p.raceId)])), [players]);

  // First step of each round, for the ticks under the slider.
  const roundStarts = useMemo(() => {
    const starts: { round: number; pos: number }[] = [];
    steps.forEach((s, i) => {
      if (s.round > 0 && s.round !== steps[i - 1]?.round) starts.push({ round: s.round, pos: i + 1 });
    });
    return starts;
  }, [steps]);

  const step = pos > 0 ? steps[pos - 1] : null;
  const player = step?.playerId != null ? byId.get(step.playerId) : undefined;
  const frame = frames[pos];
  const go = (p: number) => setPos(Math.max(0, Math.min(steps.length, p)));
  const pct = (p: number) => (steps.length ? (p / steps.length) * 100 : 0);

  return (
    <section className="rounded-lg bg-slate-900 p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ul className="flex flex-wrap gap-2">
          {players.map((p) => (
            <li key={p.playerId} className="flex items-center gap-2 rounded-lg bg-slate-800 py-1 pl-1 pr-3 text-sm text-slate-200">
              {RACE_IMAGE_FILES[p.raceName] && (
                <div className="relative w-12 shrink-0 aspect-[752/632]">
                  <Image
                    src={`/races/${RACE_IMAGE_FILES[p.raceName]}`}
                    alt={p.raceName}
                    title={p.raceName}
                    fill
                    sizes="48px"
                    className="object-contain"
                  />
                </div>
              )}
              <span className="font-semibold">{p.playerName}</span>
            </li>
          ))}
        </ul>
        {actions}
      </div>

      <MapCanvas
        layoutKey={timeline.layoutKey}
        planets={frame.planets}
        structures={frame.structures}
        spriteRows={spriteRows}
        className="w-full"
      />

      <div
        className="space-y-2"
        onKeyDown={(e) => {
          if (e.key === 'Home') go(0);
          if (e.key === 'End') go(steps.length);
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => go(pos - 1)}
            disabled={pos === 0}
            aria-label="Previous step"
            className="shrink-0 w-9 h-9 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40"
          >
            ‹
          </button>
          <div className="relative flex-1 pb-5">
            <input
              type="range"
              min={0}
              max={steps.length}
              value={pos}
              onChange={(e) => go(Number(e.target.value))}
              aria-label="Game timeline"
              aria-valuetext={step ? `Step ${pos}: ${step.label}` : 'Empty map'}
              className="w-full accent-blue-500"
            />
            {roundStarts.map(({ round, pos: p }) => (
              <button
                key={round}
                type="button"
                onClick={() => go(p)}
                className="absolute bottom-0 -translate-x-1/2 text-[11px] font-semibold text-slate-400 hover:text-white"
                style={{ left: `${pct(p)}%` }}
                title={`Jump to the start of round ${round}`}
              >
                R{round}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(pos + 1)}
            disabled={pos === steps.length}
            aria-label="Next step"
            className="shrink-0 w-9 h-9 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40"
          >
            ›
          </button>
        </div>
        <p className="text-sm text-slate-200 min-h-5" aria-live="polite">
          <span className="text-slate-400 tabular-nums mr-2">
            {pos}/{steps.length}
          </span>
          {!step ? (
            'Empty map'
          ) : (
            <>
              <span className="text-slate-400 mr-2">{step.round === 0 ? 'Setup' : `Round ${step.round}`}</span>
              {player && (
                <span className="font-semibold mr-1" style={{ color: ROW_COLORS[raceSpriteRow(player.raceId)] }}>
                  {player.playerName}:
                </span>
              )}
              {step.label}
            </>
          )}
        </p>
      </div>
    </section>
  );
}
