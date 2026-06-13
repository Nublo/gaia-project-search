import { NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { CACHE_TAG_GAME_COUNT, CACHE_TAG_PLAYER_NAMES } from '@/lib/cache';

// On-demand cache buster — visit /api/revalidate to drop the cached game count
// and player-name list so the next request reads fresh data from the DB. Handy
// after manually editing the database without waiting for the TTL to expire.
// `{ expire: 0 }` expires the entries immediately, so the next request is a
// blocking fresh read rather than stale-while-revalidate.
export async function GET() {
  revalidateTag(CACHE_TAG_GAME_COUNT, { expire: 0 });
  revalidateTag(CACHE_TAG_PLAYER_NAMES, { expire: 0 });
  // Also drop the home page's cached HTML so the fresh count is rendered.
  revalidatePath('/');

  return NextResponse.json({
    revalidated: [CACHE_TAG_GAME_COUNT, CACHE_TAG_PLAYER_NAMES, '/'],
    now: Date.now(),
  });
}
