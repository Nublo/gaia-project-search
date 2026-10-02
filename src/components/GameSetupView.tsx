'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { TechBoardSurface } from '@/components/TechBoard';
import { RoundBoardSurface } from '@/components/RoundScoringBoard';
import { ShipBoards } from '@/components/LostFleetShips';
import { BoosterSlots } from '@/components/BoosterRow';
import { MapCanvas } from '@/components/GalaxyMap';
import { BgaLink, TimelineMap, type TimelinePlayer } from '@/components/GameMapTimeline';
import { RACE_IMAGE_FILES } from '@/components/SearchCriteriaSummary';
import { TilePlacementProvider, useTilePlacement } from '@/components/tile-placement';
import { BUILDER_GROUPS, type SlotRows } from '@/lib/builder-groups';
import { mapLayoutKey, type BuildingMap, type PlanetMap } from '@/lib/galaxy-map';
import { getRaceName } from '@/lib/gaia-constants';
import type { MapTimeline } from '@/lib/map-timeline';

interface Props {
  players: number;
  lostFleet: boolean;
  slots: SlotRows;
  planets: PlanetMap;
  buildings: BuildingMap;
  largeMap: boolean;
  vpRequirement: boolean;
  races: number[];
  query: string; // the same setup as a /builder or /game-setup query string
  // A stored game: its map timeline replaces the static map, and its players
  // are named under their factions.
  timeline?: MapTimeline;
  timelinePlayers?: TimelinePlayer[];
  tableId?: number;
}

function Panel({ title, className = '', children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-lg bg-slate-900 p-3 flex flex-col ${className}`}>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">{title}</h2>
      {children}
    </section>
  );
}

// Read-only /game-setup view, laid out like a BGA table: factions in seat order
// in the title row, tech board beside the map, then Lost Fleet ships, and the
// round board beside the boosters.
export default function GameSetupView({
  players,
  lostFleet,
  slots,
  planets,
  buildings,
  largeMap,
  vpRequirement,
  races,
  query,
  timeline,
  timelinePlayers = [],
  tableId,
}: Props) {
  const placement = useTilePlacement(BUILDER_GROUPS, slots, lostFleet, players);
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard?.writeText(window.location.href).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {}
    );
  }

  return (
    <TilePlacementProvider placement={placement} readOnly>
      <div className="mx-auto max-w-[1600px] space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-white mr-2">Game setup</h1>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">{players} players</span>
            {lostFleet && (
              <span className="rounded-full bg-purple-900/70 px-3 py-1 text-xs font-semibold text-purple-100">Lost Fleet</span>
            )}
            {races.length > 0 && (
              // Factions in seat order, compact enough to share the title row.
              <ol className="flex flex-wrap items-center gap-2 sm:ml-2" aria-label="Factions in seat order">
                {races.map((id, seat) => {
                  const name = getRaceName(id);
                  const playerName = timelinePlayers[seat]?.playerName;
                  return (
                    <li key={id} className="flex items-center gap-2 rounded-lg bg-slate-800 py-1 pl-1.5 pr-3" title={`Plays ${seat + 1}.`}>
                      <span className="shrink-0 w-5 h-5 rounded-full bg-blue-600 text-[11px] font-bold text-white flex items-center justify-center">
                        {seat + 1}
                      </span>
                      <div className="relative w-10 shrink-0 aspect-[752/632]">
                        <Image src={`/races/${RACE_IMAGE_FILES[name]}`} alt="" fill sizes="40px" className="object-contain" />
                      </div>
                      <span className="text-xs leading-tight">
                        <span className="block font-semibold text-slate-100">{name}</span>
                        {playerName && <span className="block text-slate-400">{playerName}</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="text-sm font-semibold px-4 py-2 rounded border border-slate-600 text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {copied ? 'Link copied!' : 'Copy link'}
            </button>
            {tableId != null && <BgaLink tableId={tableId} />}
            <Link
              href={`/builder?${query}`}
              className="text-sm font-semibold px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Edit in builder
            </Link>
          </div>
        </header>

        {/* Both boards are close to square, so equal columns give equal heights. */}
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel title="Technologies">
            <TechBoardSurface lostFleet={lostFleet} className="w-full" />
          </Panel>
          <Panel title="Galaxy map">
            {timeline ? (
              <TimelineMap timeline={timeline} players={timelinePlayers} className="w-full" />
            ) : (
              <div className="flex-1 flex items-center">
                <MapCanvas layoutKey={mapLayoutKey(players, lostFleet, largeMap)} planets={planets} buildings={buildings} className="w-full" />
              </div>
            )}
          </Panel>
        </div>

        {lostFleet && (
          <Panel title="Lost Fleet ships">
            <ShipBoards players={players} className="!gap-3" />
          </Panel>
        )}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Panel title="Round & final scoring">
            <RoundBoardSurface lostFleet={lostFleet} vpRequirement={vpRequirement} className="w-full" />
          </Panel>
          <Panel title="Boosters">
            <div className="flex-1 flex items-center">
              <BoosterSlots players={players} fill />
            </div>
          </Panel>
        </div>
      </div>
    </TilePlacementProvider>
  );
}
