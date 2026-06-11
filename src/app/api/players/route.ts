import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';

// Player names change only when the daily collector adds a brand-new player,
// and stale entries are harmless (a new name is just missing from autocomplete
// until the next refresh). So cache aggressively with a 1-day TTL.
const getPlayerNames = unstable_cache(
  async () => {
    const rows = await prisma.player.findMany({
      select: { playerName: true },
      distinct: ['playerName'],
      orderBy: { playerName: 'asc' },
    });
    return rows.map((r: { playerName: string }) => r.playerName);
  },
  ['player-names'],
  { revalidate: 86400 }
);

export async function GET() {
  try {
    const names = await getPlayerNames();
    return NextResponse.json(names, {
      headers: {
        // CDN/browser serve cached list instantly, refresh in the background
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Failed to fetch player names:', error);
    return NextResponse.json([], { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
