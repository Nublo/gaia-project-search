import type { Metadata } from 'next';
import BoardConstructor from '@/components/BoardConstructor';
import BgaImportBookmarklet from '@/components/BgaImportBookmarklet';
import { BUILDER_GROUPS, parsePlayers, parseSlots, slotExists, type SlotRows } from '@/lib/builder-groups';

export const metadata: Metadata = {
  title: 'Board Constructor',
};

export default async function ConstructorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialPlayers = parsePlayers(params.p);
  // slotCount comes from the board layout JSON (via the groups) so it can't
  // drift out of sync with the number of slots actually rendered. Slots that
  // don't exist at this player count are dropped.
  const initialSlots: SlotRows = Object.fromEntries(
    BUILDER_GROUPS.map((g) => [
      g.key,
      parseSlots(params[g.param], g.slotCount).map((id, i) => (slotExists(g, i, initialPlayers) ? id : null)),
    ])
  );
  // Explicit ?lf=1, or implied by any Lost Fleet tile or slot already in the
  // link (e.g. from the BGA import bookmarklet, which doesn't send lf).
  const initialLostFleet =
    params.lf === '1' ||
    BUILDER_GROUPS.some((g) =>
      initialSlots[g.key].some((id, i) => id != null && (g.isLostFleet(id) || g.lostFleetOnlySlots.includes(i)))
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4">
        <BoardConstructor initialSlots={initialSlots} initialLostFleet={initialLostFleet} initialPlayers={initialPlayers}>
          <BgaImportBookmarklet />
        </BoardConstructor>
      </div>
    </div>
  );
}
