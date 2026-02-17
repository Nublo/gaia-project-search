import { NextRequest, NextResponse } from 'next/server';
import { searchGames } from '@/lib/search';
import type { SearchRequest } from '@/types/game';

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();
    const games = await searchGames(body);
    return NextResponse.json({ games, total: games.length });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
