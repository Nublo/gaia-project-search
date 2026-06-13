// Shared revalidation window for slowly-changing data (game count, player names).
// These only change when the daily collector adds games/players, so a 1-day TTL
// keeps visitors off the DB request path without serving meaningfully stale data.
export const CACHE_REVALIDATE_SECONDS = 86400;

// Cache tags so /api/revalidate can drop these entries on demand (forcing a fresh
// DB read on the next request) without waiting for the TTL to expire.
export const CACHE_TAG_GAME_COUNT = 'game-count';
export const CACHE_TAG_PLAYER_NAMES = 'player-names';
