# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project collects and parses game data for "Gaia Project" from Board Game Arena (BGA).

**Data Source**: BGA provides a public API that requires user authentication (login/password credentials in `.env`).

**End Goal**: Public interface to search Gaia Project games by in-game actions and conditions.

Example search queries:
- "Find games where Terrans built a Research Lab in round ≤ 3"
- "Find games where Gleens had Navigation level ≥ 2 by end of round 1"
- "Find games with player ELO ≥ 300 and Nevlas present"

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: PostgreSQL (local via Docker, production via Neon)
- **ORM**: Prisma
- **Frontend**: React with Tailwind CSS
- **Browser Automation**: Playwright (headless Chromium) for BGA API access

## Architecture

### Data Model

**Games Table** (`games`): One row per game
- `table_id` (Int, unique) — BGA table identifier
- `player_count`, `winner_name`, `min_player_elo`, `final_scorings`
- `raw_game_log` (JSONB) — full `ParsedGameData` including original BGA log at `.rawLog`

**Players Table** (`players`): One row per player per game
- `table_id` (Int, FK → games) — join key
- `player_id`, `player_name`, `race_id`, `race_name`, `final_score`, `player_elo`, `is_winner`
- `buildings_data` (JSONB, GIN indexed) — `{"buildings": [[4,5], [6], ...]}`
  - 2D array: `buildings[roundIdx]` = building IDs placed in that round (0-indexed)
  - Building IDs: 4=Mine, 5=Trading Station, 6=Research Lab, 7=Knowledge Academy, 8=QIC Academy, 9=Planetary Institute
- `research_data` (JSONB, GIN indexed) — `{"research": [[0,1,0,0,0,2], ...]}`
  - 2D array: `research[roundIdx]` = absolute track levels at end of that round (0-indexed)
  - Inner array indices 0-5 = tracks: Terraforming, Navigation, AI, Gaia Forming, Economy, Science
  - Includes initial race starting levels (e.g. Gleens start Navigation=1)

### Key Implementation Notes

**Re-parsing existing games**: `raw_game_log.rawLog.data.logs` contains the full BGA event stream. New fields can be backfilled without re-collecting from BGA.
Introducing new fields requires next steps:
- Introduce new field in prisma/schema.prisma
- Update game-parser.ts logic to include new field
- Run migration on a local database
- Write a backfill script to fill new field (fetch in batches for 100 games, due to rawLogs are quite large)
- After backfilling local database push updates for this specific field to the remote database

**Search pattern**: "Find games where ANY player matches condition" — uses `players: { some: { ... } }` or raw SQL EXISTS. Returns entire game rows with all players.

**Condition logic**:
- Fraction Config (structure + research) → **AND**: all conditions must be satisfied
- Player Name → **AND**
- Amount of Players → **OR**
- All filter types combine with AND

**JSONB SQL patterns**:

Buildings — "built structure X by round R":
```sql
EXISTS (
  SELECT 1 FROM jsonb_array_elements(p.buildings_data->'buildings')
  WITH ORDINALITY AS rnd(round_buildings, round_num)
  WHERE rnd.round_num <= ${maxRound}
  AND rnd.round_buildings @> jsonb_build_array(${buildingId})
)
```

Research — "track T at level ≥ N by end of round R":
```sql
jsonb_array_length(p.research_data->'research') > ${roundIdx}::int
AND (p.research_data->'research'->${roundIdx}::int->${trackIdx}::int)::int >= ${minLevel}
```
Note: explicit `::int` casts required — Prisma binds integers as `bigint`, PG's `->` operator requires `int`.

**Player ELO**: BGA stores raw ELO with +1300 offset. Subtract `BGA_ELO_OFFSET = 1300` when storing to match what users see on BGA.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Home — search form only
│   ├── results/page.tsx          # Results page (server-rendered, ?q=<JSON>)
│   └── api/
│       ├── search/route.ts       # POST /api/search
│       └── players/route.ts      # GET /api/players (autocomplete)
├── components/
│   ├── SearchForm.tsx            # All search filters
│   ├── SearchResults.tsx         # Results list + active filter chips
│   └── GameCard.tsx              # Single game card
├── lib/
│   ├── search.ts                 # searchGames() — Prisma + raw SQL
│   ├── bga-client.ts             # BGA API client (Playwright-based)
│   ├── game-collector.ts         # Automated collection with rate limiting
│   ├── game-parser.ts            # Parses BGA log → ParsedGameData
│   ├── gaia-constants.ts         # Race/building/research track enums + mappings
│   ├── game-storage.ts           # storeGame(), gameExists(), getGame()
│   └── db.ts                     # Prisma singleton
└── types/
    └── game.ts                   # GameResult, PlayerResult, SearchRequest, etc.
scripts/
├── collect-player.ts             # Collect games for a specific player
└── push-to-remote.ts             # Push new local games to remote (Neon) DB
prisma/
└── schema.prisma
```

## Development Commands

```bash
# Start local PostgreSQL
docker-compose up -d

# Run migrations
npm run db:migrate

# Start dev server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Type check
npm run type-check

# Prisma Studio (DB UI)
npm run db:studio

# Apply migrations to remote DB
POSTGRES_PRISMA_URL=<url> POSTGRES_URL_NON_POOLING=<url> npx prisma migrate deploy
```

## Data Collection

```bash
# Collect games for a specific player
npx tsx scripts/collect-player.ts Nigator
npx tsx scripts/collect-player.ts 83983741  # by BGA player ID

# Override BGA credentials
BGA_USERNAME=user2 BGA_PASSWORD=pass2 npx tsx scripts/collect-player.ts Nigator

# Push new games to remote DB
npx tsx scripts/push-to-remote.ts
```

**BGA Rate Limit**: ~100 game log views per day per account. The collector detects this immediately and stops cleanly. Re-run next day or use multiple accounts.

## Automated Daily Collection

`scripts/collect-daily.sh` runs automatically via launchd (macOS). It picks eligible players from the `PlayerCollectionState` table (via `scripts/list-collectable-players.ts`: `reachEnd = false` OR `collectionDate` older than 1 month), runs `collect-player.ts` for them, then `push-to-remote.ts`. Each run shifts the next scheduled time +10 min to avoid BGA rate limit collisions.

- **State file**: `~/.config/bgagaia/state.json` — contains `nextRunAt` and `lastRunDate`; edit `nextRunAt` to reset the schedule
- **Logs**: `logs/collect-YYYY-MM-DD.log`
- **Check interval**: every 15 min (catches up within 15 min after machine wake)
- **launchd plist**: `~/Library/LaunchAgents/com.bgagaiaparser.collect.plist`

```bash
# Enable
launchctl load ~/Library/LaunchAgents/com.bgagaiaparser.collect.plist

# Disable
launchctl unload ~/Library/LaunchAgents/com.bgagaiaparser.collect.plist
```

## Deployment

- **Local**: Docker PostgreSQL + `npm run dev`
- **Production**: Vercel (Next.js) + Neon PostgreSQL
  - `REMOTE_POSTGRES_URL` in `.env` points to Neon
  - Migrations: `POSTGRES_PRISMA_URL=<neon_url> POSTGRES_URL_NON_POOLING=<neon_url> npx prisma migrate deploy`
  - New games synced via `npx tsx scripts/push-to-remote.ts`
