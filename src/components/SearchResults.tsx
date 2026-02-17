import GameCard from './GameCard';
import type { GameResult, SearchRequest, StructureCondition } from '@/types/game';

const STRUCTURE_LABELS: Record<string, string> = {
  'mine': 'Mine',
  'trading-station': 'Trading Station',
  'research-lab': 'Research Lab',
  'knowledge-academy': 'Knowledge Academy',
  'qic-academy': 'QIC Academy',
  'planetary-institute': 'Planetary Institute',
};

function formatStructureCondition(cond: StructureCondition): string {
  const parts: string[] = [];
  if (cond.race) parts.push(cond.race);
  if (cond.structure) {
    const label = STRUCTURE_LABELS[cond.structure] ?? cond.structure;
    parts.push(cond.race ? `: ${label}` : label);
  }
  if (cond.maxRound) parts.push(` (round ≤ ${cond.maxRound})`);
  return parts.join('');
}

function SearchCriteriaSummary({ req }: { req: SearchRequest }) {
  const chips: { label: string; value: string }[] = [];

  if (req.winnerRace) chips.push({ label: 'Winner race', value: req.winnerRace });
  if (req.winnerPlayerName) chips.push({ label: 'Winner', value: req.winnerPlayerName });
  if (req.minPlayerElo) chips.push({ label: 'Min ELO', value: `≥ ${req.minPlayerElo}` });
  if (req.playerCounts.length > 0)
    chips.push({ label: 'Players', value: req.playerCounts.join(' or ') });
  for (const name of req.playerNames)
    chips.push({ label: 'Player', value: name });
  for (const cond of req.structureConditions)
    chips.push({ label: 'Fraction', value: formatStructureCondition(cond) });

  if (chips.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">No filters applied — showing all games</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-800"
        >
          <span className="font-medium text-blue-600">{chip.label}:</span>
          {chip.value}
        </span>
      ))}
    </div>
  );
}

interface SearchResultsProps {
  games: GameResult[];
  total: number;
  isLoading?: boolean;
  searchRequest?: SearchRequest;
}

export default function SearchResults({ games, total, isLoading = false, searchRequest }: SearchResultsProps) {
  const criteriaBlock = searchRequest && (
    <div className="w-full max-w-4xl mx-auto px-6 pt-6 pb-3">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Active filters
        </h3>
        <SearchCriteriaSummary req={searchRequest} />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <>
        {criteriaBlock}
        <div className="w-full max-w-4xl mx-auto p-6">
          <div className="text-center text-gray-600">
            <div className="animate-pulse">Searching games...</div>
          </div>
        </div>
      </>
    );
  }

  if (games.length === 0) {
    return (
      <>
        {criteriaBlock}
        <div className="w-full max-w-4xl mx-auto px-6 pb-6">
          <div className="text-center text-gray-600 bg-white rounded-lg shadow-md p-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No games found</h3>
            <p className="text-gray-600">Try adjusting your search criteria</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {criteriaBlock}
      <div className="w-full max-w-4xl mx-auto px-6 pb-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Found {total} game{total !== 1 ? 's' : ''}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </div>
    </>
  );
}
