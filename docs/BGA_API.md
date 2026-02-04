# BGA API Documentation

This document describes the BGA (Board Game Arena) API client implementation for fetching Gaia Project game data.

## Client Setup

```typescript
import { BGAClient } from './src/lib/bga-client';

const client = new BGAClient();
await client.initialize(); // Fetch request token
await client.login(username, password); // Authenticate
```

## API Methods

### `getPlayerFinishedGames(playerId, gameId, page)`

Fetches a list of finished games for a specific player.

**Parameters:**
- `playerId: number` - BGA player ID
- `gameId: number` - BGA game ID (1495 for Gaia Project)
- `page: number` - Page number (1-based, default: 1)

**Returns:** `GetPlayerFinishedGamesResponse`
- Returns 10 games per page
- Games are ordered by most recent first

**Example:**
```typescript
const playerId = 96457033;
const gameId = 1495; // Gaia Project
const page = 1;

const response = await client.getPlayerFinishedGames(playerId, gameId, page);
console.log(`Fetched ${response.data.tables.length} games`);

// Each game contains:
response.data.tables.forEach(game => {
  console.log(`Game ${game.table_id}:`);
  console.log(`  Players: ${game.player_names}`);
  console.log(`  Scores: ${game.scores}`);
  console.log(`  Date: ${new Date(parseInt(game.start) * 1000)}`);
});
```

### `getGameLog(tableId, translated?)`

Fetches detailed game log for a specific game table.

**Parameters:**
- `tableId: string` - BGA table ID (from `GameTableInfo.table_id`)
- `translated: boolean` - Whether to get translated logs (default: true)

**Returns:** `GetGameLogResponse`
- Contains chronological log of all game events
- Includes player actions, state changes, and game metadata
- See [GAME_LOG_STRUCTURE.md](./GAME_LOG_STRUCTURE.md) for detailed structure

**Example:**
```typescript
const tableId = "798145204";

const logResponse = await client.getGameLog(tableId);
console.log(`Fetched ${logResponse.data.logs.length} log packets`);

// Access log entries
logResponse.data.logs.forEach(packet => {
  console.log(`Packet ${packet.packet_id} at ${new Date(parseInt(packet.time) * 1000)}`);
  packet.data.forEach(event => {
    console.log(`  Event type: ${event.type}`);
  });
});
```

**Use with Parser:**
```typescript
import { GameLogParser } from './src/lib/game-parser';

// Fetch game list
const games = await client.getPlayerFinishedGames(playerId, 1495, 1);
const game = games.data.tables[0];

// Fetch detailed log
const log = await client.getGameLog(game.table_id);

// Parse the log
const parsed = GameLogParser.parseGameLog(game, log);

console.log(`Winner: ${parsed.winnerName}`);
console.log(`Players: ${parsed.players.length}`);
parsed.players.forEach(player => {
  console.log(`  ${player.playerName} - ${player.raceName}: ${player.finalScore} pts`);
});
```

## Response Structure

### GetPlayerFinishedGamesResponse

```typescript
{
  status: 1, // 1 = success, 0 = error
  data: {
    tables: GameTableInfo[], // Array of game objects
    stats?: { ... } // Only included when updateStats=1
  }
}
```

### GameTableInfo

Each game table contains:

```typescript
{
  table_id: string;           // Unique game identifier (e.g., "798145204")
  game_id: string;            // Game type ID ("1495" for Gaia Project)
  game_name: string;          // Game name ("gaiaproject")
  ranking_disabled: string;   // "0" or "1"
  start: string;              // Unix timestamp (seconds)
  end: string;                // Unix timestamp (seconds)
  concede: string;            // "0" = normal, "1" = someone conceded
  unranked: string;           // "0" or "1"
  normalend: string;          // "0" or "1"
  players: string;            // Comma-separated player IDs
  player_names: string;       // Comma-separated player names
  scores: string;             // Comma-separated scores
  ranks: string;              // Comma-separated ranks
  elo_win: string;            // ELO change for the player
  elo_penalty: string;        // ELO penalty (if any)
  elo_after: string;          // Player's ELO after this game
  arena_win: string | null;   // Arena points won
  arena_after: string | null; // Arena points after game
}
```

### GetGameLogResponse

```typescript
{
  status: 1, // 1 = success, 0 = error
  data: {
    logs: LogPacket[],  // Array of log packets (chronological events)
    players: PlayerInfo[] // Array of player information
  }
}
```

**LogPacket Structure:**
```typescript
{
  channel: string;
  table_id: number;
  packet_id: string;
  packet_type: string;
  move_id: string;
  time: string;  // Unix timestamp
  data: Event[]  // Array of events in this packet
}
```

For detailed information about log structure and event types, see [GAME_LOG_STRUCTURE.md](./GAME_LOG_STRUCTURE.md).

## Pagination Strategy

The BGA API uses page-based pagination:
- **10 games per page**
- **Page numbers are 1-based** (start at 1, not 0)
- To fetch all games, increment the page number until you get less than 10 games

**Example: Fetch all games for a player**
```typescript
const playerId = 96457033;
const gameId = 1495;
let page = 1;
let allGames = [];

while (true) {
  const response = await client.getPlayerFinishedGames(playerId, gameId, page);
  const games = response.data.tables;

  allGames.push(...games);

  // If we got less than 10 games, we've reached the end
  if (games.length < 10) {
    break;
  }

  page++;
}

console.log(`Fetched ${allGames.length} total games`);
```

## Implementation Notes

### Session Management

The BGA API requires:
1. Visit the gamestats page first to establish session context
2. Include session cookies in API requests
3. Include `X-Request-Token` header

This is handled automatically by both `getPlayerFinishedGames()` and `getGameLog()` methods.

### Parameters Sent to BGA API

The method sends these parameters to BGA:
- `player` - Player ID
- `opponent_id` - Always "0" (all opponents)
- `game_id` - Game type ID
- `finished` - Always "0" (returns finished games, confusingly)
- `page` - Page number
- `updateStats` - "0" (don't include stats for performance)
- `dojo.preventCache` - Timestamp for cache busting

## Related Documentation

- [GAME_LOG_STRUCTURE.md](./GAME_LOG_STRUCTURE.md) - Detailed structure of game logs and parsing strategy
- See `src/lib/game-parser.ts` - Parser implementation that extracts searchable data from logs

## Future Enhancements

Potential additions to the API:
- `getPlayerStats(playerId, gameId)` - Get aggregated player statistics
- `getLeaderboard(gameId)` - Get game leaderboard
- Additional game-specific endpoints as needed
