'use client';

import Image from 'next/image';
import { RACE_IMAGE_FILES } from '@/components/SearchCriteriaSummary';
import { PLANET_IMAGES, PLANET_NAMES, getRaceName } from '@/lib/gaia-constants';
import { pickBlocker, raceColumns } from '@/lib/builder-factions';

interface Props {
  races: number[];
  onChange: (races: number[]) => void;
  players: number;
  lostFleet: boolean;
}

// One column per home planet, holding its (two) factions; a game gets one
// faction per player and never two of the same color.
export default function FactionPicker({ races, onChange, players, lostFleet }: Props) {
  const columns = raceColumns(lostFleet);
  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between gap-4 mb-2">
        <h4 className="text-xs font-semibold text-gray-600 uppercase">Factions</h4>
        <span className="text-sm text-gray-500">
          {races.length} / {players} picked
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Pick one faction per player — at most one per home planet color. Click a picked faction to remove it.
      </p>

      {/* One row on desktop; on narrow screens the color columns wrap. */}
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(72px,1fr))]">
        {columns.map(({ planet, races: columnRaces }) => (
          <div key={planet} className="flex flex-col items-center gap-2">
            <div className="relative w-7 h-7" title={PLANET_NAMES[planet]}>
              <Image src={`/map/planets/${PLANET_IMAGES[planet]}`} alt={PLANET_NAMES[planet]} fill sizes="28px" className="object-contain" />
            </div>
            {columnRaces.map((id) => {
              const name = getRaceName(id);
              const seat = races.indexOf(id);
              const picked = seat >= 0;
              const blocker = picked ? null : pickBlocker(id, races, players);
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!!blocker}
                  onClick={() => onChange(picked ? races.filter((r) => r !== id) : [...races, id])}
                  title={blocker ?? (picked ? `${name} — click to remove` : name)}
                  className={`group w-full flex flex-col items-center gap-1 rounded-lg p-1.5 border-2 transition ${
                    picked ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-50'
                  } ${blocker ? 'opacity-30 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="relative w-full aspect-[752/632]">
                    <Image src={`/races/${RACE_IMAGE_FILES[name]}`} alt={name} fill sizes="120px" className="object-contain" />
                    {picked && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                        {seat + 1}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs leading-tight text-center ${picked ? 'font-semibold text-blue-700' : 'text-gray-600'}`}>
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
