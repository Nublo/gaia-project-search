'use client';

import { useState, type ReactNode } from 'react';
import TechBoard from '@/components/TechBoard';
import RoundScoringBoard from '@/components/RoundScoringBoard';
import { TilePlacementProvider, useTilePlacement } from '@/components/tile-placement';
import { BUILDER_GROUPS, slotsToParams, type SlotRows } from '@/lib/builder-groups';

interface Props {
  initialSlots: SlotRows;
  initialLostFleet: boolean;
  // Rendered between the title row and the boards (e.g. the BGA import panel).
  children?: ReactNode;
}

// /builder page shell: owns the page-wide Lost Fleet toggle, the tile placement
// state shared by every board, and the "Generate link" button.
export default function BoardConstructor({ initialSlots, initialLostFleet, children }: Props) {
  const [lostFleet, setLostFleet] = useState(initialLostFleet);
  const placement = useTilePlacement(BUILDER_GROUPS, initialSlots, lostFleet);
  const [copied, setCopied] = useState(false);

  function generateLink() {
    const params = new URLSearchParams();
    if (lostFleet) params.set('lf', '1');
    slotsToParams(BUILDER_GROUPS, placement.slots, params);
    const qs = params.toString();
    const url = `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ''}`;
    window.history.replaceState(null, '', url);
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {}
    );
  }

  return (
    <>
      <div className="w-full max-w-6xl mx-auto pt-2 pb-4 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Board Constructor</h1>
        <div className="flex items-center gap-4 shrink-0">
          <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={lostFleet}
              onChange={(e) => setLostFleet(e.target.checked)}
              className="h-6 w-6 rounded border-gray-300"
            />
            Lost fleet
          </label>
          <button
            type="button"
            onClick={generateLink}
            className="text-sm font-semibold px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {copied ? 'Link copied!' : 'Generate link'}
          </button>
        </div>
      </div>

      {children}

      <TilePlacementProvider placement={placement}>
        <div className="space-y-4">
          <TechBoard lostFleet={lostFleet} />
          <RoundScoringBoard lostFleet={lostFleet} />
        </div>
      </TilePlacementProvider>
    </>
  );
}
