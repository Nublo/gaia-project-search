'use client';

import Image from 'next/image';
import { BoardSurface, TileList, type SurfaceSlot } from '@/components/tile-placement';
import { TECH_LAYOUT, TERRA_FEDERATION_GROUP } from '@/lib/builder-groups';

const SLOTS: SurfaceSlot[] = [
  ...TECH_LAYOUT.standard.map((rect, index) => ({ group: 'standard', index, rect, idleBorder: 'border-white/60' })),
  ...TECH_LAYOUT.advanced.map((rect, index) => ({ group: 'advanced', index, rect, idleBorder: 'border-gray-300' })),
  { group: TERRA_FEDERATION_GROUP.key, index: 0, rect: TECH_LAYOUT.terraformingFederation, idleBorder: 'border-white/60' },
];

// The board with its tiles, shared by /builder and the read-only /game-setup view.
export function TechBoardSurface({ lostFleet, className = '' }: { lostFleet: boolean; className?: string }) {
  const colonize = TECH_LAYOUT.lostFleetColonizeTile;
  return (
    <BoardSurface
      image="/techboard/techBoard.webp"
      alt="Gaia Project research board"
      aspect="aspect-[1220/1311]"
      className={`rounded overflow-hidden ${className}`}
      slots={SLOTS}
      overlay={
        // Lost Fleet has no QIC actions — its colonize tile covers them on the board.
        lostFleet && (
          <div
            style={{ top: `${colonize.top}%`, left: `${colonize.left}%`, width: `${colonize.width}%`, height: `${colonize.height}%` }}
            className="absolute pointer-events-none"
          >
            <Image src="/techboard/colonizeTile.webp" alt="Lost Fleet colonize tile" fill className="object-fill" />
          </div>
        )
      }
    />
  );
}

export default function TechBoard({ lostFleet }: { lostFleet: boolean }) {
  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Tech board</h4>
      <p className="text-sm text-gray-500 mb-4">Drag technology tiles onto the board and a federation token onto the top of Terraforming (or click a tile, then click a slot).</p>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="w-full md:w-44 shrink-0 flex flex-col gap-4">
          <TileList groupKey="standard" />
          <TileList groupKey={TERRA_FEDERATION_GROUP.key} />
        </div>
        <div className="flex-1 min-w-0 w-full flex justify-center">
          <TechBoardSurface lostFleet={lostFleet} className="w-full md:w-[70%]" />
        </div>
        <TileList groupKey="advanced" />
      </div>
    </div>
  );
}
