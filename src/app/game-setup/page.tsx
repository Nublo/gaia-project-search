import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import GameSetupView from '@/components/GameSetupView';
import { parseSetup, setupPlanets, setupRaces, setupToQuery, validateSetup, type SearchParams } from '@/lib/builder-params';

export const metadata: Metadata = {
  title: 'Game Setup',
};

// Read-only view of a /builder setup; takes the same query string.
export default async function GameSetupPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const setup = parseSetup(await searchParams);
  const planets = setupPlanets(setup);
  const races = setupRaces(setup);
  const query = setupToQuery({ ...setup, planets, races });
  // Only complete setups are shown; anything else goes back to the builder to finish.
  if (validateSetup({ ...setup, planets }).length > 0) redirect(`/builder?${query}`);

  return (
    <div className="min-h-screen bg-slate-950 px-3 py-4 sm:px-4">
      <GameSetupView
        players={setup.players}
        lostFleet={setup.lostFleet}
        slots={setup.slots}
        planets={planets}
        largeMap={setup.largeMap}
        vpRequirement={setup.vpRequirement}
        races={races}
        query={query}
      />
    </div>
  );
}
