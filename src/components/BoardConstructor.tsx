'use client';

import { useState, type ReactNode } from 'react';
import TechBoard from '@/components/TechBoard';
import RoundScoringBoard from '@/components/RoundScoringBoard';
import LostFleetShips from '@/components/LostFleetShips';
import { TilePlacementProvider, useTilePlacement } from '@/components/tile-placement';
import { BUILDER_GROUPS, PLAYER_COUNTS, slotsToParams, type SlotRows } from '@/lib/builder-groups';

interface Props {
  initialSlots: SlotRows;
  initialLostFleet: boolean;
  initialPlayers: number;
  // Rendered between the title row and the boards (e.g. the BGA import panel).
  children?: ReactNode;
}

// /builder page shell: owns the page-wide Lost Fleet toggle, the tile placement
// state shared by every board, and the "Generate link" button.
export default function BoardConstructor({ initialSlots, initialLostFleet, initialPlayers, children }: Props) {
  const [lostFleet, setLostFleet] = useState(initialLostFleet);
  const [players, setPlayers] = useState(initialPlayers);
  const placement = useTilePlacement(BUILDER_GROUPS, initialSlots, lostFleet, players);
  const [copied, setCopied] = useState(false);

  function generateLink() {
    const params = new URLSearchParams();
    params.set('p', String(players));
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
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            Players
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              {PLAYER_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPlayers(n)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    players === n ? 'bg-white shadow-sm font-semibold text-blue-600' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
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
          {lostFleet && <LostFleetShips players={players} />}
        </div>
      </TilePlacementProvider>
    </>
  );
}
