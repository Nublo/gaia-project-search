import GameCard from './GameCard';
import type { GameResult, SearchRequest } from '@/types/game';
import { SearchCriteriaSummary } from '@/components/SearchCriteriaSummary';

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
            <GameCard
              key={game.id}
              game={game}
              structureConditions={searchRequest?.structureConditions}
              researchConditions={searchRequest?.researchConditions}
              highlightedFinalScorings={searchRequest?.finalScorings}
              highlightedArtifacts={searchRequest?.artifacts}
              advancedTechConditions={searchRequest?.advancedTechConditions}
              standardTechConditions={searchRequest?.standardTechConditions}
              sortBy={searchRequest?.sortBy}
            />
          ))}
        </div>
      </div>
    </>
  );
}
