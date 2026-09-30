'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import TechBoard from '@/components/TechBoard';
import RoundScoringBoard from '@/components/RoundScoringBoard';
import LostFleetShips from '@/components/LostFleetShips';
import BoosterRow from '@/components/BoosterRow';
import GalaxyMap from '@/components/GalaxyMap';
import FactionPicker from '@/components/FactionPicker';
import { fitRaces } from '@/lib/builder-factions';
import { TilePlacementProvider, useTilePlacement } from '@/components/tile-placement';
import { BUILDER_GROUPS, PLAYER_COUNTS, type SlotRows } from '@/lib/builder-groups';
import { setupToQuery, validateSetup } from '@/lib/builder-params';
import {
  defaultLargeMap,
  fitPlanets,
  mapLayoutKey,
  samePlanets,
  samplePlanets,
  type PlanetMap,
} from '@/lib/galaxy-map';

interface Props {
  initialSlots: SlotRows;
  initialLostFleet: boolean;
  initialPlayers: number;
  initialPlanets: PlanetMap | null; // null = the layout's sample map
  initialLargeMap: boolean;
  initialVpRequirement: boolean;
  initialRaces: number[];
  // Rendered between the title row and the boards (e.g. the BGA import panel).
  children?: ReactNode;
}

// /builder page shell: owns the page-wide Lost Fleet toggle, the tile placement
// state shared by every board, and the "Generate link" button.
export default function BoardConstructor({
  initialSlots,
  initialLostFleet,
  initialPlayers,
  initialPlanets,
  initialLargeMap,
  initialVpRequirement,
  initialRaces,
  children,
}: Props) {
  const router = useRouter();
  const [lostFleet, setLostFleet] = useState(initialLostFleet);
  const [players, setPlayers] = useState(initialPlayers);
  const placement = useTilePlacement(BUILDER_GROUPS, initialSlots, lostFleet, players);
  const [copied, setCopied] = useState(false);
  const [vpRequirement, setVpRequirement] = useState(initialVpRequirement);

  const [largeMap, setLargeMap] = useState(initialLargeMap);
  const layoutKey = mapLayoutKey(players, lostFleet, largeMap);
  const [planets, setPlanets] = useState<PlanetMap>(() =>
    initialPlanets ? fitPlanets(initialPlanets, layoutKey, lostFleet, players) : samplePlanets(layoutKey)
  );

  // A new setup (players / Lost Fleet / map size) swaps an untouched sample map
  // for the new layout's sample; an edited map keeps the planets that still fit.
  const [prevLayoutKey, setPrevLayoutKey] = useState(layoutKey);
  if (prevLayoutKey !== layoutKey) {
    setPrevLayoutKey(layoutKey);
    setPlanets(
      samePlanets(planets, samplePlanets(prevLayoutKey))
        ? samplePlanets(layoutKey)
        : fitPlanets(planets, layoutKey, lostFleet, players)
    );
  }

  // Fewer players or Lost Fleet off drops the picks that no longer fit
  // (adjusted during render when the setup changes).
  const [races, setRaces] = useState(() => fitRaces(initialRaces, players, lostFleet));
  const raceSetup = `${players}:${lostFleet}`;
  const [prevRaceSetup, setPrevRaceSetup] = useState(raceSetup);
  if (prevRaceSetup !== raceSetup) {
    setPrevRaceSetup(raceSetup);
    setRaces(fitRaces(races, players, lostFleet));
  }

  function changePlayers(n: number) {
    setPlayers(n);
    setLargeMap(defaultLargeMap(n));
  }

  // Saves the setup into this page's URL (so Back from /game-setup returns to
  // it) and returns the query string.
  function saveToUrl(): string {
    const qs = setupToQuery({ players, lostFleet, slots: placement.slots, planets, largeMap, vpRequirement, races });
    window.history.replaceState(null, '', `${window.location.pathname}?${qs}`);
    return qs;
  }

  // /game-setup only opens for a complete setup; otherwise the problems are
  // listed under the header (live, so they clear as they get fixed).
  const [showProblems, setShowProblems] = useState(false);
  const problems = validateSetup({ players, lostFleet, slots: placement.slots, races, planets });

  function viewSetup() {
    if (problems.length > 0) {
      setShowProblems(true);
      return;
    }
    router.push(`/game-setup?${saveToUrl()}`);
  }

  function generateLink() {
    const url = `${window.location.origin}${window.location.pathname}?${saveToUrl()}`;
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
                  onClick={() => changePlayers(n)}
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
          <button
            type="button"
            onClick={viewSetup}
            className="text-sm font-semibold px-4 py-2 rounded border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors"
          >
            View setup
          </button>
        </div>
      </div>

      {showProblems && problems.length > 0 && (
        <div role="alert" className="w-full max-w-6xl mx-auto mb-4 p-4 rounded-lg border border-red-200 bg-red-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-red-800">The setup isn&apos;t complete yet</h4>
              <ul className="mt-1 text-sm text-red-700 list-disc list-inside space-y-0.5">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setShowProblems(false)}
              aria-label="Dismiss"
              className="shrink-0 text-red-400 hover:text-red-700 text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {children}

      <TilePlacementProvider placement={placement}>
        <div className="space-y-4">
          <FactionPicker races={races} onChange={setRaces} players={players} lostFleet={lostFleet} />
          <TechBoard lostFleet={lostFleet} />
          <RoundScoringBoard lostFleet={lostFleet} vpRequirement={vpRequirement} onVpRequirementChange={setVpRequirement} />
          {lostFleet && <LostFleetShips players={players} />}
          <BoosterRow players={players} lostFleet={lostFleet} />
          <GalaxyMap
            layoutKey={layoutKey}
            planets={planets}
            onChange={setPlanets}
            lostFleet={lostFleet}
            players={players}
            large={largeMap}
            onLargeChange={setLargeMap}
          />
        </div>
      </TilePlacementProvider>
    </>
  );
}
