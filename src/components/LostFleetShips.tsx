'use client';

import { BoardSurface, TileList, type SurfaceSlot } from '@/components/tile-placement';
import { ARTIFACT_GROUP, SHIP_FEDERATION_GROUP, SHIP_TECH_BASE_TYPE, SHIP_TECH_GROUP, shipsInPlay, slotExists } from '@/lib/builder-groups';
import type { ShipLayout } from '@/types/tech-board-layout';

// Twilight first, then Eclipse, T.F. Mars, Rebellion — the order BGA shows them.
const SHIP_ORDER = [18, 15, 16, 17];

// Every ship has a federation shield; the standard ships add a tech screen,
// Twilight its artifact sockets (one per player).
function shipSlots(ship: ShipLayout, players: number): SurfaceSlot[] {
  const slot = ship.type - SHIP_TECH_BASE_TYPE;
  const slots: SurfaceSlot[] = [
    { group: SHIP_FEDERATION_GROUP.key, index: slot, rect: ship.federation, idleBorder: 'border-gray-300' },
  ];
  if (ship.tech) slots.push({ group: SHIP_TECH_GROUP.key, index: slot, rect: ship.tech, idleBorder: 'border-gray-300' });
  (ship.artifacts ?? []).forEach((rect, index) => {
    if (slotExists(ARTIFACT_GROUP, index, players)) {
      slots.push({ group: ARTIFACT_GROUP.key, index, rect, idleBorder: 'border-gray-300' });
    }
  });
  return slots;
}

// The ships in play with their tiles, shared by /builder and the read-only /game-setup view.
export function ShipBoards({ players, className = '' }: { players: number; className?: string }) {
  const inPlay = shipsInPlay(players);
  const ships = SHIP_ORDER.flatMap((type) => inPlay.filter((s) => s.type === type));
  return (
    <div className={`grid gap-4 lg:grid-cols-2 ${className}`}>
      {ships.map((ship) => (
        <BoardSurface
          key={ship.type}
          image={`/ships/${ship.image}`}
          alt={ship.name}
          aspect=""
          style={{ aspectRatio: `${ship.width} / ${ship.height}` }}
          className="@container rounded overflow-hidden"
          slots={shipSlots(ship, players)}
          overlay={
            // The ship art has an empty name banner in its top-left corner.
            <span className="absolute left-[1.5%] top-[2%] pointer-events-none font-bold uppercase tracking-wide text-white text-[2.2cqw]">
              {ship.name}
            </span>
          }
        />
      ))}
    </div>
  );
}

export default function LostFleetShips({ players }: { players: number }) {
  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Lost Fleet ships</h4>
      <p className="text-sm text-gray-500 mb-4">
        Lost Fleet technologies go on the ships&apos; screens, Lost Fleet federation tokens on their shields, artifacts on
        Twilight — one per player.
        {players === 2 && ' Rebellion isn’t used in 2 player games.'}
      </p>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="w-full md:w-44 shrink-0 flex flex-col gap-4">
          <TileList groupKey={SHIP_TECH_GROUP.key} />
          <TileList groupKey={SHIP_FEDERATION_GROUP.key} />
        </div>
        <ShipBoards players={players} className="flex-1 min-w-0 w-full" />
        <TileList groupKey={ARTIFACT_GROUP.key} />
      </div>
    </div>
  );
}
