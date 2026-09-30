import type { Metadata } from 'next';
import BoardConstructor from '@/components/BoardConstructor';
import BgaImportBookmarklet from '@/components/BgaImportBookmarklet';
import { parseSetup, type SearchParams } from '@/lib/builder-params';

export const metadata: Metadata = {
  title: 'Board Constructor',
};

export default async function ConstructorPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const setup = parseSetup(await searchParams);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4">
        <BoardConstructor
          initialSlots={setup.slots}
          initialLostFleet={setup.lostFleet}
          initialPlayers={setup.players}
          initialPlanets={setup.planets}
          initialLargeMap={setup.largeMap}
          initialVpRequirement={setup.vpRequirement}
          initialRaces={setup.races}
          initialBuildings={setup.buildings}
        >
          <BgaImportBookmarklet />
        </BoardConstructor>
      </div>
    </div>
  );
}
