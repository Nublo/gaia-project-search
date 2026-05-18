'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { SearchRequest, StructureCondition, ResearchCondition, AdvancedTechCondition, StandardTechCondition } from '@/types/game';
import { FINAL_SCORING_NAMES, getFinalScoringName, RESEARCH_TRACK_SHORT_NAMES, ADVANCED_TECH_LABELS, ADVANCED_TECH_IMAGES, STANDARD_TECH_LABELS, STANDARD_TECH_IMAGES } from '@/lib/gaia-constants';
import { serializeSearchRequest } from '@/lib/search-url';

interface FormState {
  winnerRace?: string;
  winnerPlayerName?: string;
  minPlayerElo?: number;
  playerCount?: number;
  playerName?: string;
}

interface FractionConfig {
  race: string;
  conditions: { structure?: string; maxRound?: number }[];
  tempStructure?: string;
  tempMaxRound?: number;
  researchConditions: { track?: number; minLevel?: number; maxRound?: number }[];
  tempResearchTrack?: number;
  tempResearchMinLevel?: number;
  tempResearchMaxRound?: number;
  advancedTechs: number[];
  standardTechs: number[];
  playedBy?: string;
  tempPlayedBy: string;
}

interface SearchFormProps {
  onSearch: (req: SearchRequest) => void;
  isLoading?: boolean;
}

const races: { name: string; file: string }[] = [
  { name: 'Terrans',       file: 'Terrans_tile.png' },
  { name: 'Lantids',       file: 'Lantids_tile.png' },
  { name: 'Xenos',         file: 'Xenos_tile.png' },
  { name: 'Gleens',        file: 'Gleens_tile.png' },
  { name: 'Taklons',       file: 'Taklons_tile.png' },
  { name: 'Ambas',         file: 'Ambass_tile.png' },
  { name: 'Hadsch Hallas', file: 'HadshHallas_tile.png' },
  { name: 'Ivits',         file: 'Ivits_tile.png' },
  { name: 'Geodens',       file: 'Geodens_tile.png' },
  { name: "Bal T'aks",     file: 'Baltaks_tile.png' },
  { name: 'Firacs',        file: 'Firacs_tile.png' },
  { name: 'Bescods',       file: 'Bescods_tile.png' },
  { name: 'Nevlas',        file: 'Nevlas_tile.png' },
  { name: 'Itars',         file: 'Itars_tile.png' },
];

const raceRows = [races.slice(0, 7), races.slice(7)];

// Factions sharing a home planet — can't coexist in the same game
const FACTION_PAIRS: Record<string, string> = {
  'Terrans':       'Lantids',
  'Lantids':       'Terrans',
  'Xenos':         'Gleens',
  'Gleens':        'Xenos',
  'Taklons':       'Ambas',
  'Ambas':         'Taklons',
  'Hadsch Hallas': 'Ivits',
  'Ivits':         'Hadsch Hallas',
  'Geodens':       "Bal T'aks",
  "Bal T'aks":     'Geodens',
  'Firacs':        'Bescods',
  'Bescods':       'Firacs',
  'Nevlas':        'Itars',
  'Itars':         'Nevlas',
};

function getRaceFile(name: string): string {
  return races.find((r) => r.name === name)?.file ?? '';
}

export default function SearchForm({ onSearch, isLoading = false }: SearchFormProps) {
  const router = useRouter();
  const [criteria, setCriteria] = useState<FormState>({});
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('');

  const [fractionConfigs, setFractionConfigs] = useState<FractionConfig[]>([]);
  const [advancedTechDialogRace, setAdvancedTechDialogRace] = useState<string | null>(null);
  const [standardTechDialogRace, setStandardTechDialogRace] = useState<string | null>(null);
  const [playerNameConditions, setPlayerNameConditions] = useState<string[][]>([]);
  const [playerCountConditions, setPlayerCountConditions] = useState<number[]>([]);
  const [finalScoringConditions, setFinalScoringConditions] = useState<number[]>([]);

  // Player name autocomplete
  const [allPlayerNames, setAllPlayerNames] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showWinnerSuggestions, setShowWinnerSuggestions] = useState(false);

  // Played by dropdowns (keyed by race name)
  const [showPlayedBySuggestions, setShowPlayedBySuggestions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/players')
      .then((r) => r.json())
      .then((names: string[]) => setAllPlayerNames(names))
      .catch(() => {});
  }, []);

  const suggestions =
    criteria.playerName && criteria.playerName.length >= 2
      ? allPlayerNames
          .filter((n) => n.toLowerCase().includes(criteria.playerName!.toLowerCase()))
          .slice(0, 5)
      : [];

  const winnerSuggestions =
    criteria.winnerPlayerName && criteria.winnerPlayerName.length >= 2
      ? allPlayerNames
          .filter((n) => n.toLowerCase().includes(criteria.winnerPlayerName!.toLowerCase()))
          .slice(0, 5)
      : [];

  const buildSearchRequest = (): SearchRequest => {
    const structureConditions: StructureCondition[] = fractionConfigs.flatMap((fc) =>
      fc.conditions.length === 0 && fc.researchConditions.length === 0 && fc.advancedTechs.length === 0
        ? [{ race: fc.race }]
        : fc.conditions.map((c) => ({ race: fc.race, ...c }))
    );
    const researchConditions: ResearchCondition[] = fractionConfigs.flatMap((fc) =>
      fc.researchConditions.map((c) => ({ race: fc.race, ...c }))
    );
    const advancedTechConditions: AdvancedTechCondition[] = fractionConfigs.flatMap((fc) =>
      fc.advancedTechs.map((techId) => ({ race: fc.race, techId }))
    );
    const standardTechConditions: StandardTechCondition[] = fractionConfigs.flatMap((fc) =>
      fc.standardTechs.map((techId) => ({ race: fc.race, techId }))
    );
    const playerRaceConditions = fractionConfigs
      .filter((fc) => fc.playedBy)
      .map((fc) => ({ playerNames: [fc.playedBy!], race: fc.race }));
    return {
      winnerRace: criteria.winnerRace,
      winnerPlayerName: criteria.winnerPlayerName,
      minPlayerElo: criteria.minPlayerElo,
      playerNames: playerNameConditions,
      playerCounts: playerCountConditions,
      structureConditions,
      researchConditions,
      finalScorings: finalScoringConditions,
      advancedTechConditions,
      standardTechConditions,
      playerRaceConditions,
      sortBy: (sortBy as SearchRequest['sortBy']) || undefined,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(buildSearchRequest());
  };

  const handleReset = () => {
    setCriteria({});
    setSelectedLevel('');
    setSortBy('');
    setFractionConfigs([]);
    setAdvancedTechDialogRace(null);
    setStandardTechDialogRace(null);
    setPlayerNameConditions([]);
    setPlayerCountConditions([]);
    setFinalScoringConditions([]);
  };

  function defaultFractionConfig(name: string): FractionConfig {
    return { race: name, conditions: [], researchConditions: [], advancedTechs: [], standardTechs: [], tempStructure: 'knowledge-academy', tempMaxRound: 1, tempResearchTrack: 1, tempResearchMinLevel: 4, tempResearchMaxRound: 6, tempPlayedBy: '' };
  }

  function toggleFraction(name: string) {
    if (fractionConfigs.some((fc) => fc.race === name)) {
      setFractionConfigs(fractionConfigs.filter((fc) => fc.race !== name));
    } else if (fractionConfigs.length < 4) {
      setFractionConfigs([...fractionConfigs, defaultFractionConfig(name)]);
    }
  }

  function updateFractionTemp(race: string, patch: Partial<Pick<FractionConfig, 'tempStructure' | 'tempMaxRound'>>) {
    setFractionConfigs(fractionConfigs.map((fc) => fc.race !== race ? fc : { ...fc, ...patch }));
  }

  function updateFractionPlayedByTemp(race: string, value: string) {
    setFractionConfigs(fractionConfigs.map((fc) => fc.race !== race ? fc : { ...fc, tempPlayedBy: value }));
  }

  function setFractionPlayedBy(race: string, playerName: string) {
    setFractionConfigs(fractionConfigs.map((fc) => fc.race !== race ? fc : { ...fc, playedBy: playerName, tempPlayedBy: '' }));
  }

  function clearFractionPlayedBy(race: string) {
    setFractionConfigs(fractionConfigs.map((fc) => fc.race !== race ? fc : { ...fc, playedBy: undefined, tempPlayedBy: '' }));
  }

  function addConditionToFraction(race: string) {
    setFractionConfigs(fractionConfigs.map((fc) => {
      if (fc.race !== race) return fc;
      return {
        ...fc,
        conditions: [...fc.conditions, { structure: fc.tempStructure, maxRound: fc.tempMaxRound }],
      };
    }));
  }

  function removeConditionFromFraction(race: string, idx: number) {
    setFractionConfigs(fractionConfigs.map((fc) =>
      fc.race !== race ? fc : { ...fc, conditions: fc.conditions.filter((_, i) => i !== idx) }
    ));
  }

  function updateFractionResearchTemp(race: string, patch: Partial<Pick<FractionConfig, 'tempResearchTrack' | 'tempResearchMinLevel' | 'tempResearchMaxRound'>>) {
    setFractionConfigs(fractionConfigs.map((fc) => fc.race !== race ? fc : { ...fc, ...patch }));
  }

  function addResearchConditionToFraction(race: string) {
    setFractionConfigs(fractionConfigs.map((fc) => {
      if (fc.race !== race) return fc;
      return {
        ...fc,
        researchConditions: [...fc.researchConditions, {
          track: fc.tempResearchTrack,
          minLevel: fc.tempResearchMinLevel,
          maxRound: fc.tempResearchMaxRound,
        }],
      };
    }));
  }

  function removeResearchConditionFromFraction(race: string, idx: number) {
    setFractionConfigs(fractionConfigs.map((fc) =>
      fc.race !== race ? fc : { ...fc, researchConditions: fc.researchConditions.filter((_, i) => i !== idx) }
    ));
  }

  function toggleAdvancedTech(race: string, techId: number) {
    setFractionConfigs(fractionConfigs.map((fc) => {
      if (fc.race !== race) return fc;
      const has = fc.advancedTechs.includes(techId);
      const next = has
        ? fc.advancedTechs.filter((id) => id !== techId)
        : [...fc.advancedTechs, techId].sort((a, b) => a - b);
      return { ...fc, advancedTechs: next };
    }));
  }

  function removeAdvancedTechFromFraction(race: string, techId: number) {
    setFractionConfigs(fractionConfigs.map((fc) =>
      fc.race !== race ? fc : { ...fc, advancedTechs: fc.advancedTechs.filter((id) => id !== techId) }
    ));
  }

  function toggleStandardTech(race: string, techId: number) {
    setFractionConfigs(fractionConfigs.map((fc) => {
      if (fc.race !== race) return fc;
      const has = fc.standardTechs.includes(techId);
      const next = has
        ? fc.standardTechs.filter((id) => id !== techId)
        : [...fc.standardTechs, techId].sort((a, b) => a - b);
      return { ...fc, standardTechs: next };
    }));
  }

  function removeStandardTechFromFraction(race: string, techId: number) {
    setFractionConfigs(fractionConfigs.map((fc) =>
      fc.race !== race ? fc : { ...fc, standardTechs: fc.standardTechs.filter((id) => id !== techId) }
    ));
  }

  const inputClassName = "w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500 text-gray-900";

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Search Gaia Project Games</h2>

      {/* Section 1: Single Selection Filters */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Winner Fraction — full width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Winner
            </label>
            <div className="flex flex-col gap-2">
              {raceRows.map((row, rowIdx) => (
                <div key={rowIdx} className="flex justify-between">
                  {row.map(({ name, file }) => {
                    const isSelected = criteria.winnerRace === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        title={name}
                        onClick={() =>
                          setCriteria({ ...criteria, winnerRace: isSelected ? undefined : name })
                        }
                        className={`rounded-md overflow-hidden transition-all ${
                          isSelected
                            ? 'ring-4 ring-blue-500 ring-offset-2'
                            : 'opacity-60 hover:opacity-90'
                        }`}
                      >
                        <Image
                          src={`/races/${file}`}
                          alt={name}
                          width={80}
                          height={80}
                        />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Final Scoring Mission */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Final Scoring Missions
            </label>
            <div className="flex justify-between">
              {(Object.keys(FINAL_SCORING_NAMES) as unknown as number[]).map((id) => {
                const numId = Number(id);
                const isSelected = finalScoringConditions.includes(numId);
                const isDisabled = !isSelected && finalScoringConditions.length >= 2;
                return (
                  <button
                    key={numId}
                    type="button"
                    title={isDisabled ? 'Deselect a mission first' : getFinalScoringName(numId)}
                    disabled={isDisabled}
                    onClick={() => {
                      if (isSelected) {
                        setFinalScoringConditions(finalScoringConditions.filter((x) => x !== numId));
                      } else {
                        setFinalScoringConditions([...finalScoringConditions, numId]);
                      }
                    }}
                    className={`rounded-md overflow-hidden transition-all ${
                      isSelected
                        ? 'ring-4 ring-blue-500 ring-offset-2'
                        : isDisabled
                        ? 'opacity-20 cursor-not-allowed'
                        : 'opacity-60 hover:opacity-90'
                    }`}
                  >
                    <Image
                      src={`/final-scorings/${numId}.webp`}
                      alt={getFinalScoringName(numId)}
                      width={80}
                      height={56}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort by */}
          <div className="md:col-span-2">
            <label htmlFor="sortByDropdown" className="block text-sm font-medium text-gray-700 mb-2">
              Sort by
            </label>
            <select
              id="sortByDropdown"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={inputClassName}
            >
              <option value="">No sorting</option>
              <option value="qicPoints">QIC Points</option>
              <option value="techPoints">Tech Points</option>
              <option value="totalScoredPoints">Scored Points</option>
              <option value="finalScore">Total Points</option>
              <option value="factionCost">Faction Cost (VP)</option>
            </select>
          </div>

          {/* Player ELO (min) */}
          <div>
            <label htmlFor="playerLevelDropdown" className="block text-sm font-medium text-gray-700 mb-2">
              Players ELO (min)
            </label>
            <select
              id="playerLevelDropdown"
              value={selectedLevel}
              onChange={(e) => {
                setSelectedLevel(e.target.value);
                setCriteria({ ...criteria, minPlayerElo: e.target.value !== '' ? parseInt(e.target.value) : undefined });
              }}
              className={inputClassName}
            >
              <option value="">Select level...</option>
              <option value="0">Beginner - 0</option>
              <option value="1">Apprentice - 1</option>
              <option value="100">Average - 100</option>
              <option value="200">Good - 200</option>
              <option value="300">Strong - 300</option>
              <option value="500">Expert - 500</option>
              <option value="700">Master - 700</option>
            </select>
          </div>

          {/* Winning Player */}
          <div>
            <label htmlFor="winnerPlayerName" className="block text-sm font-medium text-gray-700 mb-2">
              Winner
            </label>
            <div className="relative">
              <input
                type="text"
                id="winnerPlayerName"
                value={criteria.winnerPlayerName || ''}
                onChange={(e) => {
                  setCriteria({ ...criteria, winnerPlayerName: e.target.value || undefined });
                  setShowWinnerSuggestions(true);
                }}
                onFocus={() => setShowWinnerSuggestions(true)}
                onBlur={() => setTimeout(() => setShowWinnerSuggestions(false), 150)}
                placeholder="Winner name"
                className={inputClassName}
                autoComplete="off"
              />
              {showWinnerSuggestions && winnerSuggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 overflow-hidden">
                  {winnerSuggestions.map((name) => (
                    <li
                      key={name}
                      onMouseDown={() => {
                        setCriteria({ ...criteria, winnerPlayerName: name });
                        setShowWinnerSuggestions(false);
                      }}
                      className="px-3 py-2 text-sm text-gray-800 hover:bg-blue-50 cursor-pointer"
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-6"></div>

      {/* Section 2: Multiple Selection Filters */}
      <div className="mb-6">

        {/* Fraction Config Section */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-xs font-semibold text-gray-600 mb-3 uppercase">Fraction Config <span className="text-green-700">(AND)</span></h4>

          {/* Tile picker */}
          <div className="flex flex-wrap gap-2 mb-4">
            {races.map(({ name, file }) => {
              const isActive = fractionConfigs.some((fc) => fc.race === name);
              const pairedName = FACTION_PAIRS[name];
              const pairSelected = pairedName ? fractionConfigs.some((fc) => fc.race === pairedName) : false;
              const isDisabled = !isActive && (fractionConfigs.length >= 4 || pairSelected);
              const disabledTitle = pairSelected
                ? `Can't pick — ${pairedName} shares the same home planet`
                : 'Deselect a faction first';
              return (
                <button
                  key={name}
                  type="button"
                  title={isDisabled ? disabledTitle : name}
                  onClick={() => toggleFraction(name)}
                  disabled={isDisabled}
                  className={`rounded-md overflow-hidden transition-all ${
                    isActive
                      ? 'ring-4 ring-blue-500 ring-offset-2'
                      : isDisabled
                      ? 'opacity-20 cursor-not-allowed'
                      : 'opacity-60 hover:opacity-90'
                  }`}
                >
                  <Image src={`/races/${file}`} alt={name} width={50} height={50} />
                </button>
              );
            })}
          </div>

          {/* Active fraction entries */}
          {fractionConfigs.map((fc) => (
            <div key={fc.race} className="mb-3 p-3 bg-white rounded border border-gray-200 relative">
              {/* Remove button — top-right corner */}
              <button
                type="button"
                onClick={() => toggleFraction(fc.race)}
                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors text-xl leading-none"
                aria-label={`Remove ${fc.race}`}
              >
                ✕
              </button>
              {/* Header: tile + name */}
              <div className="flex items-center gap-2 mb-2 pr-5">
                <Image
                  src={`/races/${getRaceFile(fc.race)}`}
                  alt={fc.race}
                  width={32}
                  height={32}
                  className="rounded"
                />
                <span className="font-medium text-sm text-gray-900">{fc.race}</span>
              </div>

              {/* Sub-form: structure + round + add */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={fc.tempStructure || ''}
                  onChange={(e) => updateFractionTemp(fc.race, { tempStructure: e.target.value || undefined })}
                  className="flex-1 min-w-0 h-9 px-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mine">Mine</option>
                  <option value="trading-station">Trading Station</option>
                  <option value="research-lab">Research Lab</option>
                  <option value="planetary-institute">Planetary Institute</option>
                  <option value="knowledge-academy">Knowledge Academy</option>
                  <option value="qic-academy">QIC Academy</option>
                </select>
                <select
                  value={fc.tempMaxRound ?? 1}
                  onChange={(e) => updateFractionTemp(fc.race, { tempMaxRound: parseInt(e.target.value) })}
                  className="w-28 h-9 px-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">Round ≤ 1</option>
                  <option value="2">Round ≤ 2</option>
                  <option value="3">Round ≤ 3</option>
                  <option value="4">Round ≤ 4</option>
                  <option value="5">Round ≤ 5</option>
                  <option value="6">Round ≤ 6</option>
                </select>
                <button
                  type="button"
                  onClick={() => addConditionToFraction(fc.race)}
                  className="flex-1 sm:flex-none px-3 h-9 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm whitespace-nowrap"
                >
                  Add
                </button>
              </div>

              {/* Sub-form: research track + min level + round + add */}
              <div className="flex flex-wrap gap-2 mt-2">
                <select
                  value={fc.tempResearchTrack || ''}
                  onChange={(e) => updateFractionResearchTemp(fc.race, { tempResearchTrack: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="flex-1 min-w-0 h-9 px-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(RESEARCH_TRACK_SHORT_NAMES).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={5}
                  placeholder="≥ Level"
                  value={fc.tempResearchMinLevel || ''}
                  onChange={(e) => updateFractionResearchTemp(fc.race, { tempResearchMinLevel: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-20 h-9 px-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
                />
                <select
                  value={fc.tempResearchMaxRound ?? 6}
                  onChange={(e) => updateFractionResearchTemp(fc.race, { tempResearchMaxRound: parseInt(e.target.value) })}
                  className="w-28 h-9 px-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">Round ≤ 1</option>
                  <option value="2">Round ≤ 2</option>
                  <option value="3">Round ≤ 3</option>
                  <option value="4">Round ≤ 4</option>
                  <option value="5">Round ≤ 5</option>
                  <option value="6">Round ≤ 6</option>
                </select>
                <button
                  type="button"
                  onClick={() => addResearchConditionToFraction(fc.race)}
                  className="flex-1 sm:flex-none px-3 h-9 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm whitespace-nowrap"
                >
                  Add
                </button>
              </div>

              {/* Add advanced tech + standard tech buttons */}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdvancedTechDialogRace(fc.race)}
                  className="px-3 h-9 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm whitespace-nowrap"
                >
                  Add advanced tech
                </button>
                <button
                  type="button"
                  onClick={() => setStandardTechDialogRace(fc.race)}
                  className="px-3 h-9 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm whitespace-nowrap"
                >
                  Add standard tech
                </button>
              </div>

              {/* Condition chips */}
              {(fc.conditions.length > 0 || fc.researchConditions.length > 0 || fc.advancedTechs.length > 0 || fc.standardTechs.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {fc.conditions.map((c, i) => (
                    <div
                      key={`s-${i}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs"
                    >
                      <span>
                        {c.structure ? c.structure.replace(/-/g, ' ').replace(/^\w/, (ch) => ch.toUpperCase()) : 'Any structure'}
                        {c.maxRound ? ` round ≤ ${c.maxRound}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeConditionFromFraction(fc.race, i)}
                        className="text-blue-500 hover:text-blue-700 ml-0.5"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {fc.researchConditions.map((c, i) => (
                    <div
                      key={`r-${i}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs"
                    >
                      <span>
                        {c.track ? RESEARCH_TRACK_SHORT_NAMES[c.track] : 'any track'}
                        {c.minLevel !== undefined ? ` ≥${c.minLevel}` : ''}
                        {c.maxRound ? ` round ≤ ${c.maxRound}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeResearchConditionFromFraction(fc.race, i)}
                        className="text-green-600 hover:text-green-800 ml-0.5"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {fc.advancedTechs.map((techId) => (
                    <button
                      key={`t-${techId}`}
                      type="button"
                      title={`Remove ${ADVANCED_TECH_LABELS[techId]}`}
                      onClick={() => removeAdvancedTechFromFraction(fc.race, techId)}
                      className="rounded-md overflow-hidden border-2 border-purple-400 hover:border-red-400 hover:opacity-70 transition-all"
                    >
                      <Image
                        src={`/advanced-techs/${ADVANCED_TECH_IMAGES[techId]}`}
                        alt={ADVANCED_TECH_LABELS[techId]}
                        width={32}
                        height={32}
                      />
                    </button>
                  ))}
                  {fc.standardTechs.map((techId) => (
                    <button
                      key={`st-${techId}`}
                      type="button"
                      title={`Remove ${STANDARD_TECH_LABELS[techId]}`}
                      onClick={() => removeStandardTechFromFraction(fc.race, techId)}
                      className="rounded-md overflow-hidden border-2 border-amber-400 hover:border-red-400 hover:opacity-70 transition-all"
                    >
                      <Image
                        src={`/standart-techs/${STANDARD_TECH_IMAGES[techId]}`}
                        alt={STANDARD_TECH_LABELS[techId]}
                        width={32}
                        height={32}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Played by */}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {fc.playedBy ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-sm text-indigo-800">
                    Played by: <strong>{fc.playedBy}</strong>
                    <button type="button" onClick={() => clearFractionPlayedBy(fc.race)} className="ml-1 text-indigo-400 hover:text-indigo-600">×</button>
                  </span>
                ) : (
                  <div className="relative">
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={fc.tempPlayedBy}
                        onChange={(e) => { updateFractionPlayedByTemp(fc.race, e.target.value); setShowPlayedBySuggestions((s) => ({ ...s, [fc.race]: true })); }}
                        onFocus={() => setShowPlayedBySuggestions((s) => ({ ...s, [fc.race]: true }))}
                        onBlur={() => setTimeout(() => setShowPlayedBySuggestions((s) => ({ ...s, [fc.race]: false })), 150)}
                        placeholder="Played by..."
                        autoComplete="off"
                        className="flex-1 min-w-0 h-9 px-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
                      />
                    </div>
                    {showPlayedBySuggestions[fc.race] && fc.tempPlayedBy.length >= 2 && (
                      <ul className="absolute z-10 w-40 bg-white border border-gray-200 rounded-md shadow-lg mt-1 overflow-hidden">
                        {allPlayerNames
                          .filter((n) => n.toLowerCase().includes(fc.tempPlayedBy.toLowerCase()))
                          .slice(0, 5)
                          .map((name) => (
                            <li
                              key={name}
                              onMouseDown={() => { setFractionPlayedBy(fc.race, name); setShowPlayedBySuggestions((s) => ({ ...s, [fc.race]: false })); }}
                              className="px-3 py-2 text-sm text-gray-800 hover:bg-blue-50 cursor-pointer"
                            >
                              {name}
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Amount of Players + Player Name — side by side */}
        <div className="mb-4 flex gap-4">
        {/* Amount of Players Section */}
        <div className="flex-1 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase">Players Count <span className="text-yellow-700">(OR)</span></h4>
          <div className="flex gap-2">
            <select
              id="playerCount"
              value={criteria.playerCount ?? 3}
              onChange={(e) => setCriteria({ ...criteria, playerCount: parseInt(e.target.value) })}
              className={inputClassName}
            >
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
            <button
              type="button"
              onClick={() => {
                const countToAdd = criteria.playerCount ?? 3;
                if (!playerCountConditions.includes(countToAdd)) {
                  setPlayerCountConditions([...playerCountConditions, countToAdd]);
                  setCriteria({ ...criteria, playerCount: undefined });
                }
              }}
              className="px-4 h-10 bg-green-600 text-white rounded-md hover:bg-green-700 whitespace-nowrap"
            >
              Add
            </button>
          </div>

          {playerCountConditions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {playerCountConditions.map((count, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  <span>{count} players</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPlayerCountConditions(playerCountConditions.filter((_, i) => i !== index));
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Player Name Section */}
        <div className="flex-1 p-4 bg-gray-50 rounded-lg border border-gray-200 mb-0">
          <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase">Player <span className="text-green-700">(AND)</span></h4>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                id="playerName"
                value={criteria.playerName || ''}
                onChange={(e) => {
                  setCriteria({ ...criteria, playerName: e.target.value || undefined });
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Player name"
                className="w-full h-10 px-3 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 overflow-hidden">
                  {suggestions.map((name) => (
                    <li
                      key={name}
                      onMouseDown={() => {
                        setCriteria({ ...criteria, playerName: name });
                        setShowSuggestions(false);
                      }}
                      className="px-3 py-2 text-sm text-gray-800 hover:bg-blue-50 cursor-pointer"
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                const name = criteria.playerName?.trim();
                if (name) {
                  setPlayerNameConditions([...playerNameConditions, [name]]);
                  setCriteria({ ...criteria, playerName: undefined });
                }
              }}
              className="px-4 h-10 bg-green-600 text-white rounded-md hover:bg-green-700 whitespace-nowrap"
            >
              Add
            </button>
          </div>

          {playerNameConditions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {playerNameConditions.map((group, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  <span>{group.join(' + ')}</span>
                  <button
                    type="button"
                    title="Merge player from input into this group"
                    onClick={() => {
                      const name = criteria.playerName?.trim();
                      if (name) {
                        setPlayerNameConditions(playerNameConditions.map((g, i) => i === index ? [...g, name] : g));
                        setCriteria({ ...criteria, playerName: undefined });
                      }
                    }}
                    className="text-blue-600 hover:text-blue-800 font-bold"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlayerNameConditions(playerNameConditions.filter((_, i) => i !== index));
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        </div> {/* end flex row */}
      </div>

      {/* Advanced Tech Dialog */}
      {advancedTechDialogRace && (() => {
        const fc = fractionConfigs.find((f) => f.race === advancedTechDialogRace);
        if (!fc) return null;
        const techIds = Object.keys(ADVANCED_TECH_LABELS).map(Number);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setAdvancedTechDialogRace(null)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">Select Advanced Techs — {advancedTechDialogRace}</h3>
                <button
                  type="button"
                  onClick={() => setAdvancedTechDialogRace(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-5 gap-4">
                {techIds.map((id) => {
                  const selected = fc.advancedTechs.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      title={ADVANCED_TECH_LABELS[id]}
                      onClick={() => toggleAdvancedTech(advancedTechDialogRace, id)}
                      className={`rounded-md overflow-hidden transition-all ${
                        selected
                          ? 'ring-4 ring-purple-500 ring-offset-2'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Image
                        src={`/advanced-techs/${ADVANCED_TECH_IMAGES[id]}`}
                        alt={ADVANCED_TECH_LABELS[id]}
                        width={72}
                        height={72}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Standard Tech Dialog */}
      {standardTechDialogRace && (() => {
        const fc = fractionConfigs.find((f) => f.race === standardTechDialogRace);
        if (!fc) return null;
        const techIds = Object.keys(STANDARD_TECH_LABELS).map(Number);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setStandardTechDialogRace(null)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">Select Standard Techs — {standardTechDialogRace}</h3>
                <button
                  type="button"
                  onClick={() => setStandardTechDialogRace(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {techIds.map((id) => {
                  const selected = fc.standardTechs.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      title={STANDARD_TECH_LABELS[id]}
                      onClick={() => toggleStandardTech(standardTechDialogRace, id)}
                      className={`rounded-md overflow-hidden transition-all ${
                        selected
                          ? 'ring-4 ring-amber-500 ring-offset-2'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Image
                        src={`/standart-techs/${STANDARD_TECH_IMAGES[id]}`}
                        alt={STANDARD_TECH_LABELS[id]}
                        width={120}
                        height={72}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Buttons */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-center"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
        <button
          type="button"
          onClick={() => {
            const req = buildSearchRequest();
            const qs = serializeSearchRequest(req);
            window.open(`/analytics?${qs}`, '_blank');
          }}
          className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors text-center"
        >
          Analytics
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-900 hover:bg-gray-50 transition-colors"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
