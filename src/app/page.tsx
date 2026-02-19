import { prisma } from '@/lib/db';
import SearchSection from './SearchSection';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const gameCount = await prisma.game.count();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4">
        <p className="text-center text-gray-500 text-sm mb-4">
          Database contains {gameCount.toLocaleString()} games
        </p>
        <SearchSection />
      </div>
    </div>
  );
}
