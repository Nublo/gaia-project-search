import Link from 'next/link';
import { searchGames } from '@/lib/search';
import SearchResults from '@/components/SearchResults';
import type { SearchRequest } from '@/types/game';

const EMPTY_REQUEST: SearchRequest = {
  playerNames: [],
  playerCounts: [],
  structureConditions: [],
};

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  let searchRequest: SearchRequest = EMPTY_REQUEST;
  try {
    if (q) searchRequest = JSON.parse(decodeURIComponent(q)) as SearchRequest;
  } catch {
    // malformed q param — fall back to no filters
  }

  const games = await searchGames(searchRequest);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4">
        <header className="mb-6 flex items-center gap-4">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to search
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Search Results</h1>
        </header>

        <SearchResults
          games={games}
          total={games.length}
          searchRequest={searchRequest}
        />
      </div>
    </div>
  );
}
