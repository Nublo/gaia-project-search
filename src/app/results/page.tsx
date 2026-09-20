import type { Metadata } from 'next';
import { searchGames } from '@/lib/search';
import SearchResults from '@/components/SearchResults';
import type { SearchRequest } from '@/types/game';
import { deserializeSearchRequest } from '@/lib/search-url';

export const metadata: Metadata = {
  title: 'Search Results',
};

const EMPTY_REQUEST: SearchRequest = {
  playerNames: [],
  playerCounts: [],
  structureConditions: [],
  researchConditions: [],
};

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const searchRequest: SearchRequest = Object.keys(params).length
    ? deserializeSearchRequest(params)
    : EMPTY_REQUEST;

  // performance.now() here is fine despite the purity lint: this is an async
  // Server Component that runs once per HTTP request on the server, not a
  // Client Component subject to React's re-render/memoization — the timing
  // is purely a debug footer ("Rendered in Xms"), not used in any decision.
  // eslint-disable-next-line react-hooks/purity
  const pageStart = performance.now();
  const { games, queryMs } = await searchGames(searchRequest);
  // eslint-disable-next-line react-hooks/purity
  const renderMs = Math.round(performance.now() - pageStart);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="w-full max-w-4xl mx-auto px-6 pt-2 pb-4">
          <h1 className="text-3xl font-bold text-gray-900">Search Results</h1>
        </div>

        <SearchResults
          games={games}
          total={games.length}
          searchRequest={searchRequest}
        />

        <div className="w-full max-w-4xl mx-auto px-6 pt-1 pb-2">
          <p className="text-xs text-gray-400 text-center">
            Rendered in {renderMs}ms &middot; DB: {queryMs}ms
          </p>
        </div>
      </div>
    </div>
  );
}
