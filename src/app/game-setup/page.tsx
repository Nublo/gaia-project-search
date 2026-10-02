import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import GameSetupView from '@/components/GameSetupView';
import { boardSetupToSetup, type StoredBoardSetup } from '@/lib/board-setup';
import { PLAYER_COUNTS } from '@/lib/builder-groups';
import { parseSetup, setupBuildings, setupPlanets, setupRaces, setupToQuery, validateSetup, type SearchParams } from '@/lib/builder-params';
import { prisma } from '@/lib/db';
import { getRaceName } from '@/lib/gaia-constants';
import { decodeMapTimeline, type StoredMapTimeline } from '@/lib/map-timeline';

export const metadata: Metadata = {
  title: 'Game Setup',
};

// Read-only view of a /builder setup; takes the same query string. With
// ?table=<id> it shows a stored game instead: its setup, and a slider over its
// galaxy map timeline.
export default async function GameSetupPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  if (params.table !== undefined) return <StoredGameSetup tableId={Number(params.table)} />;

  const setup = parseSetup(params);
  const planets = setupPlanets(setup);
  const races = setupRaces(setup);
  const buildings = setupBuildings(setup, planets);
  const query = setupToQuery({ ...setup, planets, buildings, races });
  // Only complete setups are shown; anything else goes back to the builder to finish.
  if (validateSetup({ ...setup, planets }).length > 0) redirect(`/builder?${query}`);

  return (
    <div className="min-h-screen bg-slate-950 px-3 py-4 sm:px-4">
      <GameSetupView
        players={setup.players}
        lostFleet={setup.lostFleet}
        slots={setup.slots}
        planets={planets}
        buildings={buildings}
        largeMap={setup.largeMap}
        vpRequirement={setup.vpRequirement}
        races={races}
        query={query}
      />
    </div>
  );
}

// A stored game without a complete setup (no board in its log, e.g. base
// games) falls back to its map timeline at /timeline/<id>.
async function StoredGameSetup({ tableId }: { tableId: number }) {
  if (!Number.isInteger(tableId)) redirect('/');
  const game = await prisma.game.findUnique({
    where: { tableId },
    select: {
      playerCount: true,
      replay: { select: { mapTimeline: true, setup: true } },
      players: { select: { playerId: true, playerName: true, raceId: true } },
    },
  });
  // Solo (Automa) games have no builder setup to show.
  if (!game?.replay?.setup || !(PLAYER_COUNTS as readonly number[]).includes(game.playerCount)) redirect(`/timeline/${tableId}`);

  const timeline = decodeMapTimeline(game.replay.mapTimeline as unknown as StoredMapTimeline);
  const setup = boardSetupToSetup(game.replay.setup as unknown as StoredBoardSetup, timeline, game.playerCount);
  const planets = setupPlanets(setup);
  if (validateSetup({ ...setup, planets }).length > 0) redirect(`/timeline/${tableId}`);

  // Players in seat order, matching the factions row.
  const players = setup.races.flatMap((raceId) => {
    const p = game.players.find((pl) => pl.raceId === raceId);
    return p ? [{ ...p, raceName: getRaceName(raceId) }] : [];
  });

  return (
    <div className="min-h-screen bg-slate-950 px-3 py-4 sm:px-4">
      <GameSetupView
        players={setup.players}
        lostFleet={setup.lostFleet}
        slots={setup.slots}
        planets={planets}
        buildings={setupBuildings(setup, planets)}
        largeMap={setup.largeMap}
        vpRequirement={setup.vpRequirement}
        races={setup.races}
        query={setupToQuery({ ...setup, planets })}
        timeline={timeline}
        timelinePlayers={players}
        tableId={tableId}
      />
    </div>
  );
}
