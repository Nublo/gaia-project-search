import Image from 'next/image';
import type { SearchRequest, StructureCondition, ResearchCondition, AdvancedTechCondition, StandardTechCondition, PlayerRaceCondition } from '@/types/game';
import { getFinalScoringName, RESEARCH_TRACK_SHORT_NAMES, ADVANCED_TECH_LABELS, ADVANCED_TECH_IMAGES, STANDARD_TECH_LABELS, STANDARD_TECH_IMAGES } from '@/lib/gaia-constants';

const STRUCTURE_LABELS: Record<string, string> = {
  'mine': 'Mine',
  'trading-station': 'Trading Station',
  'research-lab': 'Research Lab',
  'knowledge-academy': 'Knowledge Academy',
  'qic-academy': 'QIC Academy',
  'planetary-institute': 'Planetary Institute',
};

export const RACE_IMAGE_FILES: Record<string, string> = {
  'Terrans': 'Terrans_tile.png',
  'Lantids': 'Lantids_tile.png',
  'Xenos': 'Xenos_tile.png',
  'Gleens': 'Gleens_tile.png',
  'Taklons': 'Taklons_tile.png',
  'Ambas': 'Ambass_tile.png',
  'Hadsch Hallas': 'HadshHallas_tile.png',
  'Ivits': 'Ivits_tile.png',
  'Geodens': 'Geodens_tile.png',
  "Bal T'aks": 'Baltaks_tile.png',
  'Firacs': 'Firacs_tile.png',
  'Bescods': 'Bescods_tile.png',
  'Nevlas': 'Nevlas_tile.png',
  'Itars': 'Itars_tile.png',
  'Tinkeroids': 'Tinkeroids_tile.png',
  'Darkanians': 'Darkanians_tile.png',
  'Moweyds': 'Moweyd_tile.png',
  'Space Giants': 'SpaceGiants_tile.png',
};

function structureChipLabel(cond: StructureCondition): string {
  if (!cond.structure) return 'Present';
  const label = STRUCTURE_LABELS[cond.structure] ?? cond.structure;
  return cond.maxRound ? `${label} (round ≤ ${cond.maxRound})` : label;
}

function researchChipLabel(cond: ResearchCondition): string {
  const parts: string[] = [];
  if (cond.track) parts.push(RESEARCH_TRACK_SHORT_NAMES[cond.track] ?? `Track ${cond.track}`);
  if (cond.minLevel !== undefined) parts.push(`≥${cond.minLevel}`);
  if (cond.maxRound) parts.push(`(round ≤ ${cond.maxRound})`);
  return parts.join(' ');
}

const SORT_LABELS: Record<string, string> = {
  qicPoints: 'QIC Points',
  techPoints: 'Tech Points',
  totalScoredPoints: 'Scored Points',
  finalScore: 'Total Points',
};

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-800">
      <span className="font-medium text-blue-600">{label}:</span>
      {value}
    </span>
  );
}

function FractionFilterChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-800">
      {children}
    </span>
  );
}

export function SearchCriteriaSummary({ req }: { req: SearchRequest }) {
  // Group structure + research + advanced tech conditions by race
  const fractionMap = new Map<string, { structures: StructureCondition[]; research: ResearchCondition[]; advancedTechs: AdvancedTechCondition[]; standardTechs: StandardTechCondition[] }>();

  for (const cond of req.structureConditions ?? []) {
    const key = cond.race ?? '';
    if (!fractionMap.has(key)) fractionMap.set(key, { structures: [], research: [], advancedTechs: [], standardTechs: [] });
    fractionMap.get(key)!.structures.push(cond);
  }
  for (const cond of req.researchConditions ?? []) {
    const key = cond.race ?? '';
    if (!fractionMap.has(key)) fractionMap.set(key, { structures: [], research: [], advancedTechs: [], standardTechs: [] });
    fractionMap.get(key)!.research.push(cond);
  }
  for (const cond of req.advancedTechConditions ?? []) {
    const key = cond.race ?? '';
    if (!fractionMap.has(key)) fractionMap.set(key, { structures: [], research: [], advancedTechs: [], standardTechs: [] });
    fractionMap.get(key)!.advancedTechs.push(cond);
  }
  for (const cond of req.standardTechConditions ?? []) {
    const key = cond.race ?? '';
    if (!fractionMap.has(key)) fractionMap.set(key, { structures: [], research: [], advancedTechs: [], standardTechs: [] });
    fractionMap.get(key)!.standardTechs.push(cond);
  }

  const hasFractionFilters = fractionMap.size > 0 || (req.standardTechConditions ?? []).length > 0;
  const hasOtherFilters =
    req.winnerRace || req.winnerPlayerName || req.minPlayerElo || req.sortBy ||
    req.playerCounts.length > 0 || req.playerNames.length > 0 || (req.finalScorings ?? []).length > 0 ||
    (req.playerRaceConditions ?? []).length > 0;

  if (!hasFractionFilters && !hasOtherFilters) {
    return <p className="text-sm text-gray-500 italic">No filters applied — showing all games</p>;
  }

  return (
    <div className="space-y-3">
      {/* Non-fraction filters */}
      {hasOtherFilters && (
        <div className="flex flex-wrap gap-2">
          {req.winnerRace && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-800">
              <span className="font-medium text-blue-600">Winner</span>
              {RACE_IMAGE_FILES[req.winnerRace] && (
                <Image src={`/races/${RACE_IMAGE_FILES[req.winnerRace]}`} alt={req.winnerRace} width={48} height={48} className="rounded" />
              )}
            </span>
          )}
          {req.winnerPlayerName && <Chip label="Winner" value={req.winnerPlayerName} />}
          {req.minPlayerElo && <Chip label="Min ELO" value={`≥ ${req.minPlayerElo}`} />}
          {req.playerCounts.length > 0 && <Chip label="Players" value={req.playerCounts.join(' or ')} />}
          {req.playerNames.map((group) => <Chip key={group.join('|')} label="Player" value={group.join(' + ')} />)}
          {(req.playerRaceConditions ?? []).map((cond) => (
            <span key={`${cond.playerNames.join('|')}-${cond.race}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-800">
              <span className="font-medium text-blue-600">{cond.playerNames.join(' + ')}</span>
              {RACE_IMAGE_FILES[cond.race] && (
                <Image src={`/races/${RACE_IMAGE_FILES[cond.race]}`} alt={cond.race} width={24} height={24} className="rounded" />
              )}
              <span>{cond.race}</span>
            </span>
          ))}
          {(req.finalScorings ?? []).map((id) => <Chip key={id} label="Final Scoring" value={getFinalScoringName(id)} />)}
          {req.sortBy && <Chip label="Sort by" value={SORT_LABELS[req.sortBy] ?? req.sortBy} />}
        </div>
      )}

      {/* Fraction-grouped filters */}
      {Array.from(fractionMap.entries()).map(([race, { structures, research, advancedTechs, standardTechs }]) => (
        <div key={race || '__any__'} className="flex items-center gap-2 flex-wrap">
          {race && RACE_IMAGE_FILES[race] && (
            <Image
              src={`/races/${RACE_IMAGE_FILES[race]}`}
              alt={race}
              width={32}
              height={32}
              className="rounded"
            />
          )}
          {structures.map((cond, i) => (
            <FractionFilterChip key={`s-${i}`}>
              {structureChipLabel(cond)}
            </FractionFilterChip>
          ))}
          {research.map((cond, i) => (
            <span key={`r-${i}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 border border-green-300 rounded-full text-sm text-green-800">
              {researchChipLabel(cond)}
            </span>
          ))}
          {advancedTechs.map((cond, i) => (
            <span key={`t-${i}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-300 rounded-full text-sm text-purple-800">
              <Image
                src={`/advanced-techs/${ADVANCED_TECH_IMAGES[cond.techId]}`}
                alt={ADVANCED_TECH_LABELS[cond.techId]}
                width={24}
                height={24}
                className="rounded"
              />
              {ADVANCED_TECH_LABELS[cond.techId]}
            </span>
          ))}
          {standardTechs.map((cond, i) => (
            <span key={`st-${i}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-300 rounded-full text-sm text-amber-800">
              <Image
                src={`/standart-techs/${STANDARD_TECH_IMAGES[cond.techId]}`}
                alt={STANDARD_TECH_LABELS[cond.techId]}
                width={24}
                height={24}
                className="rounded"
              />
              {STANDARD_TECH_LABELS[cond.techId]}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
