'use client';

import Image from 'next/image';
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

// Percentages of the extension image, as a positioned box.
const VP_REQUIREMENT = ROUND_LAYOUT.lostFleetExtensionVpRequirement;
const VP_REQUIREMENT_STYLE = {
  top: `${VP_REQUIREMENT.top}%`,
  left: `${VP_REQUIREMENT.left}%`,
  width: `${VP_REQUIREMENT.width}%`,
  height: `${VP_REQUIREMENT.height}%`,
};

interface Props {
  lostFleet: boolean;
  // The extension's advanced tech needs 25 VP instead of 3 colonized ships (BGA board.lostFleet.scoreBoard = 0).
  vpRequirement: boolean;
  onVpRequirementChange: (vpRequirement: boolean) => void;
}

// The round board (plus the Lost Fleet extension) with its tiles, shared by
// /builder and the read-only /game-setup view.
export function RoundBoardSurface({
  lostFleet,
  vpRequirement,
  className = '',
}: {
  lostFleet: boolean;
  vpRequirement: boolean;
  className?: string;
}) {
  const ext = ROUND_LAYOUT.lostFleetExtension;
  return (
    <div className={className}>
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
          className="@container"
          style={{ width: `${ext.width}%`, marginLeft: `${ext.left}%`, marginTop: `-${ext.overlap}%` }}
          overlay={
            vpRequirement && (
              // Covers the printed "3 ships" requirement, like BGA's #gpj-roundBoardExt-techReq.
              <div className="absolute bg-black flex items-center justify-center" style={VP_REQUIREMENT_STYLE}>
                <div className="relative h-full aspect-square">
                  <Image src="/round-bonus/vp.png" alt="" fill sizes="40px" className="object-contain" />
                  <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-[3.2cqw] [text-shadow:0_0_2px_#000,0_0_2px_#000]">
                    25
                  </span>
                </div>
              </div>
            )
          }
        />
      )}
    </div>
  );
}

export default function RoundScoringBoard({ lostFleet, vpRequirement, onVpRequirementChange }: Props) {
  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h4 className="text-xs font-semibold text-gray-600 uppercase">Round scorings</h4>
        {lostFleet && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            Extension tech needs
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              {[false, true].map((vp) => (
                <button
                  key={String(vp)}
                  type="button"
                  onClick={() => onVpRequirementChange(vp)}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    vpRequirement === vp ? 'bg-white shadow-sm font-semibold text-blue-600' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {vp ? '25 VP' : '3 ships'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Drag round scoring tiles onto rounds 1–6 and final scoring tiles onto the two grey panels beside the 6/12/18 strip (or click a tile, then click a slot).
        {lostFleet && ' The Lost Fleet extension below takes an advanced tech from the Tech board.'}
      </p>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        <TileList groupKey="rounds" />
        <div className="flex-1 min-w-0 w-full flex justify-center">
          <RoundBoardSurface lostFleet={lostFleet} vpRequirement={vpRequirement} className="w-full md:w-[70%]" />
        </div>
        <TileList groupKey="final" />
      </div>
    </div>
  );
}
