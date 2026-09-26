'use client';

import { BoardSurface, TileList, type SurfaceSlot } from '@/components/tile-placement';
import { ADVANCED_EXTENSION_SLOT, ROUND_LAYOUT } from '@/lib/builder-groups';

const ROUND_SLOTS: SurfaceSlot[] = [
  // Wedge-shaped slots: a rectangular outline would look off, so only the
  // selection highlight is drawn.
  ...ROUND_LAYOUT.rounds.map((rect, index) => ({ group: 'rounds', index, rect, idleBorder: 'border-transparent' })),
  // Final scorings go on the two placeholder panels beside the 6/12/18 strip.
  ...ROUND_LAYOUT.finalScorings.map((rect, index) => ({ group: 'final', index, rect, idleBorder: 'border-gray-300' })),
];

// The extension's slot takes an advanced tech, picked from the Tech board's list.
const EXTENSION_SLOTS: SurfaceSlot[] = [
  { group: 'advanced', index: ADVANCED_EXTENSION_SLOT, rect: ROUND_LAYOUT.lostFleetExtensionAdvancedTech, idleBorder: 'border-gray-300' },
];

export default function RoundScoringBoard({ lostFleet }: { lostFleet: boolean }) {
  const ext = ROUND_LAYOUT.lostFleetExtension;
  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Round scorings</h4>
      <p className="text-sm text-gray-500 mb-4">
        Drag round scoring tiles onto rounds 1–6 and final scoring tiles onto the two grey panels beside the 6/12/18 strip (or click a tile, then click a slot).
        {lostFleet && ' The Lost Fleet extension below takes an advanced tech from the Tech board.'}
      </p>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        <TileList groupKey="rounds" />
        <div className="flex-1 min-w-0 w-full flex justify-center">
          <div className="w-full md:w-[70%]">
            <BoardSurface
              image="/round-bonus/roundBoard.webp"
              alt="Gaia Project scoring board"
              aspect="aspect-[1068/1054]"
              slots={ROUND_SLOTS}
            />
            {/* Percentage margins resolve against the parent's width, i.e. the round board's width. */}
            {lostFleet && (
              <BoardSurface
                image="/round-bonus/roundBoardExt.webp"
                alt="Lost Fleet scoring board extension"
                aspect="aspect-[609/214]"
                slots={EXTENSION_SLOTS}
                style={{ width: `${ext.width}%`, marginLeft: `${ext.left}%`, marginTop: `-${ext.overlap}%` }}
              />
            )}
          </div>
        </div>
        <TileList groupKey="final" />
      </div>
    </div>
  );
}
