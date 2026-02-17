'use client';

import { useState } from 'react';
import type { SearchRequest, StructureCondition } from '@/types/game';

interface FormState {
  winnerRace?: string;
  winnerPlayerName?: string;
  minPlayerElo?: number;
  race?: string;
  structure?: string;
  maxRound?: number;
  playerCount?: number;
  playerName?: string;
}

interface SearchFormProps {
  onSearch: (req: SearchRequest) => void;
  isLoading?: boolean;
}

export default function SearchForm({ onSearch, isLoading = false }: SearchFormProps) {
  const [criteria, setCriteria] = useState<FormState>({});
  const [selectedLevel, setSelectedLevel] = useState<string>('');

  // State for added conditions
  const [playerNameConditions, setPlayerNameConditions] = useState<string[]>([]);
  const [structureConditions, setStructureConditions] = useState<StructureCondition[]>([]);
  const [playerCountConditions, setPlayerCountConditions] = useState<number[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      winnerRace: criteria.winnerRace,
      winnerPlayerName: criteria.winnerPlayerName,
      minPlayerElo: criteria.minPlayerElo,
      playerNames: playerNameConditions,
      playerCounts: playerCountConditions,
      structureConditions,
    });
  };

  const handleReset = () => {
    setCriteria({});
    setSelectedLevel('');
    setPlayerNameConditions([]);
    setStructureConditions([]);
    setPlayerCountConditions([]);
  };

  const inputClassName = "w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Search Gaia Project Games</h2>

      {/* Section 1: Single Selection Filters */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Single Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Winner Race */}
          <div>
            <label htmlFor="winnerRace" className="block text-sm font-medium text-gray-700 mb-2">
              Winner Race
            </label>
            <select
              id="winnerRace"
              value={criteria.winnerRace || ''}
              onChange={(e) => setCriteria({ ...criteria, winnerRace: e.target.value || undefined })}
              className={inputClassName}
            >
              <option value="">Any Race</option>
              <option value="Terrans">Terrans</option>
              <option value="Lantids">Lantids</option>
              <option value="Xenos">Xenos</option>
              <option value="Gleens">Gleens</option>
              <option value="Taklons">Taklons</option>
              <option value="Ambas">Ambas</option>
              <option value="Hadsch Hallas">Hadsch Hallas</option>
              <option value="Ivits">Ivits</option>
              <option value="Geodens">Geodens</option>
              <option value="Bal T'aks">Bal T&apos;aks</option>
              <option value="Firacs">Firacs</option>
              <option value="Bescods">Bescods</option>
              <option value="Nevlas">Nevlas</option>
              <option value="Itars">Itars</option>
            </select>
          </div>

          {/* Winning Player */}
          <div>
            <label htmlFor="winnerPlayerName" className="block text-sm font-medium text-gray-700 mb-2">
              Winning Player
            </label>
            <input
              type="text"
              id="winnerPlayerName"
              value={criteria.winnerPlayerName || ''}
              onChange={(e) => setCriteria({ ...criteria, winnerPlayerName: e.target.value || undefined })}
              placeholder="Search by winner name"
              className={inputClassName}
            />
          </div>

          {/* Player ELO and Level - Combined Row */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Player ELO / Level (at least)
            </label>
            <div className="flex gap-4">
              {/* Player Level Dropdown */}
              <div className="flex-1">
                <select
                  id="playerLevelDropdown"
                  value={selectedLevel}
                  onChange={(e) => {
                    setSelectedLevel(e.target.value);
                    if (e.target.value !== '') {
                      setCriteria({ ...criteria, minPlayerElo: parseInt(e.target.value) });
                    } else {
                      setCriteria({ ...criteria, minPlayerElo: undefined });
                    }
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

              {/* Player ELO Manual Input */}
              <div className="flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  id="minPlayerElo"
                  value={criteria.minPlayerElo ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow digits
                    if (value === '' || /^\d+$/.test(value)) {
                      setSelectedLevel(''); // Reset dropdown to default
                      setCriteria({ ...criteria, minPlayerElo: value !== '' ? parseInt(value) : undefined });
                    }
                  }}
                  onKeyDown={(e) => {
                    // Allow only: digits, Backspace, Delete, Tab, Enter, Arrow keys
                    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
                    const isDigit = /^[0-9]$/.test(e.key);

                    if (!isDigit && !allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="e.g., 150 or 230"
                  className={inputClassName}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-6"></div>

      {/* Section 2: Multiple Selection Filters */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Multiple Filters</h3>

        {/* Fraction Config Section */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase">Fraction Config</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="race" className="block text-sm font-medium text-gray-700 mb-2">
                Race
              </label>
              <select
                id="race"
                value={criteria.race || ''}
                onChange={(e) => setCriteria({ ...criteria, race: e.target.value || undefined })}
                className={inputClassName}
              >
                <option value="">Any Race</option>
                <option value="Terrans">Terrans</option>
                <option value="Lantids">Lantids</option>
                <option value="Xenos">Xenos</option>
                <option value="Gleens">Gleens</option>
                <option value="Taklons">Taklons</option>
                <option value="Ambas">Ambas</option>
                <option value="Hadsch Hallas">Hadsch Hallas</option>
                <option value="Ivits">Ivits</option>
                <option value="Geodens">Geodens</option>
                <option value="Bal T'aks">Bal T&apos;aks</option>
                <option value="Firacs">Firacs</option>
                <option value="Bescods">Bescods</option>
                <option value="Nevlas">Nevlas</option>
                <option value="Itars">Itars</option>
              </select>
            </div>

            <div>
              <label htmlFor="structure" className="block text-sm font-medium text-gray-700 mb-2">
                Structure
              </label>
              <select
                id="structure"
                value={criteria.structure || ''}
                onChange={(e) => setCriteria({ ...criteria, structure: e.target.value || undefined })}
                className={inputClassName}
              >
                <option value="">Any Structure</option>
                <option value="mine">Mine</option>
                <option value="trading-station">Trading Station</option>
                <option value="research-lab">Research Lab</option>
                <option value="planetary-institute">Planetary Institute</option>
                <option value="knowledge-academy">Knowledge Academy</option>
                <option value="qic-academy">QIC Academy</option>
              </select>
            </div>

            <div>
              <label htmlFor="maxRound" className="block text-sm font-medium text-gray-700 mb-2">
                Built in Round (max)
              </label>
              <select
                id="maxRound"
                value={criteria.maxRound || ''}
                onChange={(e) => setCriteria({ ...criteria, maxRound: e.target.value ? parseInt(e.target.value) : undefined })}
                className={inputClassName}
              >
                <option value="">Any</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
              </select>
            </div>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                if (criteria.structure || criteria.race) {
                  const newCondition: StructureCondition = {
                    race: criteria.race,
                    structure: criteria.structure,
                    maxRound: criteria.maxRound,
                  };
                  setStructureConditions([...structureConditions, newCondition]);
                  const { race, structure, maxRound, ...restCriteria } = criteria;
                  void race; void structure; void maxRound;
                  setCriteria(restCriteria);
                }
              }}
              className="px-4 h-10 bg-green-600 text-white rounded-md hover:bg-green-700 whitespace-nowrap"
            >
              Add condition
            </button>
          </div>

          {/* Display added conditions */}
          {structureConditions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {structureConditions.map((condition, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  <span>
                    {condition.race && `${condition.race}`}
                    {condition.race && condition.structure && ': '}
                    {condition.structure && condition.structure.replace('-', ' ')}
                    {condition.maxRound && ` (round ≤ ${condition.maxRound})`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStructureConditions(structureConditions.filter((_, i) => i !== index));
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

        {/* Amount of Players Section */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase">Amount of Players</h4>
          <div className="flex gap-2">
            <select
              id="playerCount"
              value={criteria.playerCount || ''}
              onChange={(e) => setCriteria({ ...criteria, playerCount: e.target.value ? parseInt(e.target.value) : undefined })}
              className={inputClassName}
            >
              <option value="">Any</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
            <button
              type="button"
              onClick={() => {
                if (criteria.playerCount && !playerCountConditions.includes(criteria.playerCount)) {
                  setPlayerCountConditions([...playerCountConditions, criteria.playerCount]);
                  setCriteria({ ...criteria, playerCount: undefined });
                }
              }}
              className="px-4 h-10 bg-green-600 text-white rounded-md hover:bg-green-700 whitespace-nowrap"
            >
              Add condition
            </button>
          </div>

          {/* Display added conditions */}
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
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase">Player Name</h4>
          <div className="flex gap-2">
            <input
              type="text"
              id="playerName"
              value={criteria.playerName || ''}
              onChange={(e) => setCriteria({ ...criteria, playerName: e.target.value || undefined })}
              placeholder="Search by player name"
              className={inputClassName}
            />
            <button
              type="button"
              onClick={() => {
                if (criteria.playerName && criteria.playerName.trim() && !playerNameConditions.includes(criteria.playerName)) {
                  setPlayerNameConditions([...playerNameConditions, criteria.playerName]);
                  setCriteria({ ...criteria, playerName: undefined });
                }
              }}
              className="px-4 h-10 bg-green-600 text-white rounded-md hover:bg-green-700 whitespace-nowrap"
            >
              Add condition
            </button>
          </div>

          {/* Display added conditions */}
          {playerNameConditions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {playerNameConditions.map((name, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  <span>{name}</span>
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
      </div>

      {/* Buttons */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Searching...' : 'Search Games'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
