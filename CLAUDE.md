# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project collects and parses game data for "Gaia Project" from Board Game Arena (BGA).

**Data Source**: BGA provides a public API that requires user authentication (login/password credentials provided by the user).

**Purpose**: To collect and parse Gaia Project game data from the BGA API for analysis and processing.

**End Goal**: Provide a public interface that allows users to search for specific games based on in-game actions and conditions.

Example search queries:
- "Find games where player was playing with a specific race, has final scoring points at least X, and built structure A in the first Y rounds"
- Search by race, scoring thresholds, building actions, round timing, and other game events

## Deployment Strategy

This is a web application designed with the following deployment requirements:

- **Local Development**: Should be hostable from a local computer for testing purposes from the start
- **Production Deployment**: Should be easily deployable and made accessible remotely (not limited to local-only access)
- The architecture should support both local testing and remote deployment scenarios

## Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Database**: PostgreSQL with JSONB for hybrid storage (raw JSON + preprocessed searchable fields)
- **ORM**: Prisma for type-safe database access
- **Frontend**: React with Tailwind CSS
- **Containerization**: Docker for local PostgreSQL and production deployment

## Architecture

### Data Model
- **Hybrid Storage Strategy**: Store both raw game logs (JSONB) and preprocessed searchable fields
- **Expected Scale**: 10k-100k games
- **Primary Table**: `games` with fields:
  - `id` (String, CUID) - Primary key
  - `game_id` (Integer, unique, indexed) - BGA game identifier
  - `game_log` (JSONB) - Full JSON from BGA API
  - Preprocessed searchable fields (all indexed):
    - `player_name` (String, nullable)
    - `player_race` (String, nullable)
    - `final_score` (Integer, nullable)
    - `player_elo` (Integer, nullable)
    - `game_date` (DateTime, nullable)
    - `round_count` (Integer, nullable)
    - `player_count` (Integer, nullable)
    - `buildings_data` (JSONB, nullable) - Array of building actions
  - `created_at` (DateTime) - Record creation timestamp
  - `updated_at` (DateTime) - Record update timestamp

### Data Flow
1. User authenticates with BGA credentials
2. API fetches game data (JSON logs) from BGA
3. Parser extracts searchable fields from JSON
4. Both raw JSON and preprocessed data stored in PostgreSQL
5. Search queries use indexed preprocessed fields for fast results

## Project Structure

```
bga_gaia_parser/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Home/search interface
│   │   ├── games/[id]/        # Game detail pages
│   │   └── api/               # API routes
│   │       ├── auth/          # BGA authentication
│   │       ├── collect/       # Data collection endpoints
│   │       └── search/        # Search endpoints
│   ├── components/            # React components
│   ├── lib/                   # Utility functions
│   │   ├── bga-client.ts     # BGA API client
│   │   ├── game-parser.ts    # JSON parsing logic
│   │   └── db.ts             # Prisma client
│   └── types/                 # TypeScript types
├── prisma/
│   └── schema.prisma          # Database schema
├── docker-compose.yml         # Local PostgreSQL setup
└── Dockerfile                 # Production container
```

## Development Commands

### Initial Setup
```bash
# Install dependencies
npm install

# Start local PostgreSQL database (Docker must be running)
docker-compose up -d

# Run database migrations
npm run db:migrate
# or: npx prisma migrate dev

# Generate Prisma client (usually happens automatically)
npm run db:generate
# or: npx prisma generate
```

### Development
```bash
# Start development server (http://localhost:3000)
npm run dev

# Open Prisma Studio (database UI in browser)
npm run db:studio
# or: npx prisma studio

# Run database migrations
npm run db:migrate
# or: npx prisma migrate dev

# Push schema changes without creating migration
npm run db:push
# or: npx prisma db push
```

### Building & Testing
```bash
# Build for production
npm run build

# Start production server
npm start

# Run type checking
npm run type-check

# Run linting
npm run lint
```

### Docker & Database Management
```bash
# Start PostgreSQL container
docker-compose up -d

# Stop PostgreSQL container
docker-compose down

# Stop and remove volumes (deletes all data!)
docker-compose down -v

# View container logs
docker-compose logs -f postgres

# Check container status
docker-compose ps

# Create a new migration
npx prisma migrate dev --name migration_name

# Reset database (warning: deletes all data)
npx prisma migrate reset

# Apply migrations to production
npx prisma migrate deploy
```

### NPM Scripts Reference
```bash
npm run dev           # Start Next.js dev server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
npm run type-check    # Run TypeScript compiler check
npm run db:studio     # Open Prisma Studio (database UI)
npm run db:migrate    # Run database migrations
npm run db:push       # Push schema without migration
npm run db:generate   # Generate Prisma Client
```

## Current Project Status

### ✅ Completed

**Phase 1: Project Initialization & UI Development**
- ✅ Next.js 15 project initialized with TypeScript and Tailwind CSS
- ✅ Complete search UI implemented with two sections:
  - **Single Filters**: Winner Race, Winning Player, Player ELO/Level (at least)
  - **Multiple Filters**: Fraction Config (Race + Structure + Round), Amount of Players, Player Name
- ✅ Multi-condition system implemented - users can add multiple search conditions with visual chips
- ✅ Mock data integration for UI testing (3 sample games)
- ✅ TypeScript types defined for Game, SearchCriteria, and SearchResults

**UI Features Implemented**:
- Search form with organized filter sections
- "Add condition" functionality for multiple filters
- Visual condition chips with remove buttons
- Player ELO input with both dropdown (level presets) and manual numeric input
- Input validation (ELO field only accepts digits 0-9)
- Responsive layout with Tailwind CSS
- Form reset functionality

**Phase 2: Backend & Database Setup** (✅ COMPLETE)
- ✅ **Prisma Setup**: Installed `@prisma/client` and `prisma` packages
- ✅ **Database Schema**: Created `prisma/schema.prisma` with Game model
  - Fields: `id`, `game_id` (unique), `game_log` (JSONB), searchable fields, timestamps
  - Indexes: `player_race`, `player_name`, `final_score`, `player_elo`, `game_date`
  - Migration: `20260204133634_init` applied successfully
- ✅ **Docker Compose**: Created `docker-compose.yml` with PostgreSQL 16 Alpine
  - Container: `bga_gaia_postgres`
  - Database: `bga_gaia_db` (user: `bga_user`)
  - Port: 5432, Volume: `postgres_data`
  - Image size: ~103 MB, RAM usage: ~100-200 MB idle
- ✅ **Database Connection**: Tested and verified working
  - Created `src/lib/db.ts` - Prisma client singleton
  - CRUD operations verified (Create, Read, Delete)
  - JSONB fields storing data correctly
- ✅ **NPM Scripts**: Added database management scripts
  - `npm run db:studio` - Open Prisma Studio UI
  - `npm run db:migrate` - Run migrations
  - `npm run db:push` - Push schema changes
  - `npm run db:generate` - Generate Prisma Client
- ✅ **BGA API Client**: Full implementation with authentication and data fetching
  - **Authentication**: `initialize()` and `login()` methods
    - Automatic request token extraction from BGA homepage
    - Session-based authentication with cookie management
    - Stores session cookies: `TournoiEnLigneidt`, `TournoiEnLignetkt`, `PHPSESSID`
  - **Data Fetching**: Two main API methods
    - `getPlayerFinishedGames(playerId, gameId, page)` - Fetch list of games (10 per page)
    - `getGameLog(tableId, translated)` - Fetch detailed game log with all events
  - Created `src/lib/bga-client.ts` - BGA API client class
  - Created `src/lib/bga-types.ts` - TypeScript type definitions
- ✅ **Game Log Parser**: Extracts searchable fields from game logs
  - Created `src/lib/game-parser.ts` - Main parser implementation
  - Created `src/lib/gaia-constants.ts` - Race/building/event type mappings
  - **Extracts**: Player races, final scores, winner, building actions by round
  - **Output Structure**: Compact JSON with players array containing all data
  - **Building Data**: Stored as 2D array `buildings[round][buildingIndex]` with only IDs
  - Complete race ID mapping (1-14: Terrans, Lantids, Xenos, etc.)
  - Complete building ID mapping (4-9: Mine, Trading Station, Research Lab, etc.)
  - Handles event types: `notifyChooseRace`, `notifyBuild`, `notifyUpgrade`, `notifyRoundEnd`
- ✅ **Documentation**:
  - `docs/BGA_API.md` - Complete API reference with examples
  - `docs/GAME_LOG_STRUCTURE.md` - Detailed log structure and parsing strategy
  - Test scripts in `scripts/` directory for verification

**BGA API Flow:**
1. `initialize()` - Fetches homepage and extracts request token
2. `login(username, password)` - Authenticates with credentials
3. `getPlayerFinishedGames(playerId, gameId, page)` - Fetch game list (paginated)
4. `getGameLog(tableId)` - Fetch detailed log for specific game
5. `GameLogParser.parseGameLog(gameTable, log)` - Parse log into searchable data

### 🚧 Pending Work

**Phase 3: Search Functionality**
1. Create search API endpoint that uses multiple conditions
2. Integrate search API with frontend UI
3. Replace mock data with real database queries

**Phase 4: Data Collection**
1. Create data collection API endpoints
   - `/api/collect/player-games` - Collect and parse games for a player
   - Store parsed data in PostgreSQL
2. Implement pagination logic to avoid fetching duplicate games
3. Build admin interface for triggering data collection

**Phase 5: Production Deployment**
1. Create Dockerfile for production
2. Test end-to-end workflow (collect → store → search)
3. Deploy to Vercel with PostgreSQL database

### Important Implementation Notes

**Search Filter Architecture**:
- Single filters (winner, player ELO) can only have one value
- Multiple filters support adding multiple conditions of the same type
- Conditions are stored in separate state arrays and displayed as removable chips
- Future: Multiple conditions will be combined with OR logic in search queries

**Player ELO System**:
- Users can select from preset levels (Beginner=0, Apprentice=1, Average=100, Good=200, Strong=300, Expert=500, Master=700)
- Or manually enter any numeric ELO value
- Dropdown and manual input are synchronized - changing one resets the other

**Fraction Config Filter**:
- Combines Race + Structure + Built in Round (max) into one condition
- Can add conditions with just race, just structure, or any combination
- Displays as chips: "Terrans: Mine (round ≤ 3)"

**Parsed Game Data Structure**:
```typescript
{
  tableId: string;          // BGA game table ID
  gameId: number;           // Game type (1495 for Gaia Project)
  gameName: string;         // "gaiaproject"
  playerCount: number;      // Number of players
  winnerName: string;       // Name of winning player
  players: [
    {
      playerId: number;
      playerName: string;
      raceId: number;       // 1-14 (Terrans, Lantids, Xenos, etc.)
      raceName: string;
      finalScore: number;
      buildings: number[][]; // buildings[round] = [buildingId1, buildingId2, ...]
                            // buildingId: 4=Mine, 5=Trading Station, 6=Research Lab,
                            //             7=Academy(Knowledge), 8=Academy(QIC), 9=PI
    }
  ]
}
```

## Deployment

### Local (Testing)
- **Prerequisites**: Docker Desktop installed and running
- Run PostgreSQL: `docker-compose up -d`
- Run migrations: `npm run db:migrate` (first time only)
- Start app: `npm run dev`
- Access at: `http://localhost:3000`
- View database: `npm run db:studio` (opens at `http://localhost:5555`)

### Production (Vercel - Recommended)
- Deploy Next.js to Vercel (free tier)
- Database: Vercel Postgres or Neon (free tier)
- Environment variables stored in Vercel dashboard
- Automatic deployments from Git pushes

### Docker Deployment
```bash
# Build image
docker build -t bga-gaia-parser .

# Run container
docker run -p 3000:3000 bga-gaia-parser
```
