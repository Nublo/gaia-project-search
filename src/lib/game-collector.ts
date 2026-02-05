import { BGAClient } from './bga-client';
import { GameLogParser } from './game-parser';
import { storeGame, gameExists } from './game-storage';

export interface CollectionStats {
  playerId: number;
  playerName: string;
  totalGames: number;
  newGames: number;
  skippedGames: number;
  failedGames: number;
  errors: Array<{ tableId: string; error: string }>;
}

export interface CollectionOptions {
  rateLimit?: number; // Delay in ms between requests (default: 3000ms)
  maxPages?: number;  // Max pages per player (default: unlimited)
  onProgress?: (message: string) => void; // Progress callback
}

export class GameCollector {
  private client: BGAClient;
  private options: Required<CollectionOptions>;

  constructor(client: BGAClient, options: CollectionOptions = {}) {
    this.client = client;
    this.options = {
      rateLimit: options.rateLimit ?? 3000,
      maxPages: options.maxPages ?? Infinity,
      onProgress: options.onProgress ?? ((msg) => console.log(msg)),
    };
  }

  /**
   * Collect all games for a specific player
   */
  async collectPlayerGames(playerId: number, playerName?: string): Promise<CollectionStats> {
    const stats: CollectionStats = {
      playerId,
      playerName: playerName || `Player ${playerId}`,
      totalGames: 0,
      newGames: 0,
      skippedGames: 0,
      failedGames: 0,
      errors: [],
    };

    this.options.onProgress(`\n🎯 Collecting games for ${stats.playerName} (ID: ${playerId})`);

    let page = 1;
    let consecutiveErrors = 0;

    while (page <= this.options.maxPages) {
      try {
        this.options.onProgress(`   📄 Fetching page ${page}...`);

        // Fetch games for this page
        const gamesResponse = await this.client.getPlayerFinishedGames(playerId, 1495, page);
        await this.delay(this.options.rateLimit);
        const games = gamesResponse.data.tables;

        if (games.length === 0) {
          this.options.onProgress(`   ✅ No more games (reached end)\n`);
          break;
        }

        this.options.onProgress(`   Found ${games.length} games on page ${page}`);
        stats.totalGames += games.length;

        // Process each game
        for (const gameTable of games) {
          const tableId = parseInt(gameTable.table_id);

          // Check if game already exists
          if (await gameExists(tableId)) {
            this.options.onProgress(`      ⏭️  Game ${tableId} already exists (skipping)`);
            stats.skippedGames++;
            continue;
          }

          // Fetch and parse game
          try {
            this.options.onProgress(`      ⬇️  Fetching game ${tableId}...`);

            // Fetch sequentially to avoid rate limiting
            const logResponse = await this.client.getGameLog(gameTable.table_id);
            await this.delay(500); // Small delay between requests
            const tableInfo = await this.client.getTableInfo(gameTable.table_id);

            const parsedGame = GameLogParser.parseGameLog(gameTable, logResponse, tableInfo);
            await storeGame(parsedGame);

            this.options.onProgress(`      ✅ Stored game ${tableId}`);
            stats.newGames++;
            consecutiveErrors = 0;

            // Rate limiting
            await this.delay(this.options.rateLimit);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);

            this.options.onProgress(`      ❌ Failed to process game ${tableId}: ${errorMsg}`);
            stats.failedGames++;
            stats.errors.push({ tableId: gameTable.table_id, error: errorMsg });
            consecutiveErrors++;

            // Stop if too many consecutive errors
            if (consecutiveErrors >= 5) {
              this.options.onProgress(`   ⚠️  Too many consecutive errors, stopping collection for this player`);
              return stats;
            }
          }
        }

        // Check if this was the last page
        if (games.length < 10) {
          this.options.onProgress(`   ✅ Reached last page (${games.length} games)\n`);
          break;
        }

        page++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.options.onProgress(`   ❌ Failed to fetch page ${page}: ${errorMsg}`);
        consecutiveErrors++;

        if (consecutiveErrors >= 3) {
          this.options.onProgress(`   ⚠️  Too many page fetch errors, stopping`);
          break;
        }

        page++;
      }
    }

    return stats;
  }

  /**
   * Collect games for multiple players
   */
  async collectMultiplePlayers(players: Array<{ id: number; name: string }>): Promise<CollectionStats[]> {
    const allStats: CollectionStats[] = [];

    for (const player of players) {
      const stats = await this.collectPlayerGames(player.id, player.name);
      allStats.push(stats);
    }

    return allStats;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
