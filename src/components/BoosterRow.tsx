'use client';

import { BoardSurface, TileList, type SurfaceSlot } from '@/components/tile-placement';
import { BOOSTER_GROUP, boosterCount } from '@/lib/builder-groups';

// Slot size in px (booster art is 116x353). List tiles are half as wide, so a
// 2-row list is about as tall as the slots.
const SLOT_W = 80;
const SLOT_H = (SLOT_W * 353) / 116;
const GAP = 8;

// Lists are 2 tiles tall and grow sideways.
const LIST_CLASS = 'w-full md:w-auto';
const LIST_GRID = 'grid-rows-2 grid-flow-col auto-cols-[40px]';

// Boosters have no board art: the slots are a bare row, one per booster in play.
function boosterSlots(count: number, rowWidth: number): SurfaceSlot[] {
  return Array.from({ length: count }, (_, index) => ({
    group: BOOSTER_GROUP.key,
    index,
    rect: { left: (index * (SLOT_W + GAP) * 100) / rowWidth, top: 0, width: (SLOT_W * 100) / rowWidth, height: 100 },
    idleBorder: 'border-gray-300',
  }));
}

export default function BoosterRow({ players, lostFleet }: { players: number; lostFleet: boolean }) {
  const count = boosterCount(players);
  const rowWidth = count * SLOT_W + (count - 1) * GAP;
  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Boosters</h4>
      <p className="text-sm text-gray-500 mb-4">
        A {players} player game uses {count} boosters.
        {lostFleet && ' Lost Fleet boosters are on the right.'}
      </p>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <TileList
          groupKey={BOOSTER_GROUP.key}
          filter={(id) => !BOOSTER_GROUP.isLostFleet(id)}
          className={LIST_CLASS}
          gridClassName={LIST_GRID}
        />
        <div className="flex-1 min-w-0 w-full flex justify-center">
          <BoardSurface
            aspect=""
            style={{ aspectRatio: `${rowWidth} / ${SLOT_H}`, width: `min(100%, ${rowWidth}px)` }}
            slots={boosterSlots(count, rowWidth)}
          />
        </div>
        {lostFleet && (
          <TileList
            groupKey={BOOSTER_GROUP.key}
            title="Lost Fleet"
            filter={BOOSTER_GROUP.isLostFleet}
            className={LIST_CLASS}
            gridClassName={LIST_GRID}
          />
        )}
      </div>
    </div>
  );
}
