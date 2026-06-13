import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';
import { CACHE_REVALIDATE_SECONDS, CACHE_TAG_GAME_COUNT } from '@/lib/cache';
import SearchSection from './SearchSection';

// The finished-game count changes only when the daily collector adds games, so
// a stale value is harmless. Render the page statically and revalidate daily in
// the background — visitors never wait on a DB query (or a Neon cold start).
export const revalidate = CACHE_REVALIDATE_SECONDS;

const getGameCount = unstable_cache(
  () => prisma.game.count({ where: { isComplete: true } }),
  ['finished-game-count'],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: [CACHE_TAG_GAME_COUNT] }
);

export default async function Home() {
  const gameCount = await getGameCount();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-3">
      <div className="container mx-auto px-4">
        <SearchSection />
        <p className="text-center text-gray-500 text-sm mt-4">
          Database contains {gameCount.toLocaleString()} finished games
        </p>
      </div>
    </div>
  );
}
