import type { Metadata } from 'next';
import { getLeaderboardGames } from '@/lib/search';
import GameCard from '@/components/GameCard';
import type { SearchRequest } from '@/types/game';

export const metadata: Metadata = {
  title: 'Leaderboard',
};

const CATEGORY_SORT: Record<string, SearchRequest['sortBy']> = {
  qicPoints: 'qicPoints',
  techPoints: 'techPoints',
  totalScoredPoints: 'totalScoredPoints',
  factionCost: 'factionCost',
};

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const count = Math.max(1, parseInt(String(params.count ?? '3'), 10) || 3);
  const isLostFleet = String(params.isLostFleet) === 'true';
  const sections = await getLeaderboardGames(count, isLostFleet);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="w-full max-w-4xl mx-auto px-6 pt-2 pb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Leaderboard{isLostFleet ? ' — Lost Fleet' : ''}
          </h1>
        </div>

        {sections.map(({ category, label, games }) => (
          <div key={category} className="w-full max-w-4xl mx-auto px-6 mb-10">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{label}</h2>
            {games.length === 0 ? (
              <p className="text-gray-500">No games found.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {games.map((game, i) => (
                  <div key={game.id} className="flex gap-3 items-start">
                    <div className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm items-center justify-center mt-6">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <GameCard
                        game={game}
                        sortBy={CATEGORY_SORT[category]}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
