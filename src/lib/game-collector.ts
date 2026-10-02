import { BGAClient } from './bga-client';
import { GameLogParser } from './game-parser';
import { storeGame, gameCollectionState, storeStartBoard } from './game-storage';

export interface CollectionStats {
  playerId: number;
  playerName: string;
  totalGames: number;
  newGames: number;
  newGamesLostFleet: number;
  /** Already-stored games re-fetched from their replay page for the starting board. */
  boardsFetched: number;
  /** ...of which got a board setup (the rest have no map timeline to show it with). */
  setupsAdded: number;
  skippedGames: number;
  failedGames: number;
  rateLimited: boolean;
  /** True only when we cleanly paged through to the last page (player fully exhausted). */
  reachedLastPage: boolean;
  errors: Array<{ tableId: string; error: string }>;
}

export class RateLimitError extends Error {
  public stats: CollectionStats;
  constructor(message: string, stats: CollectionStats) {
    super(message);
    this.name = 'RateLimitError';
    this.stats = stats;
  }
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
      newGamesLostFleet: 0,
      boardsFetched: 0,
      setupsAdded: 0,
      skippedGames: 0,
      failedGames: 0,
      rateLimited: false,
      reachedLastPage: false,
      errors: [],
    };

    this.options.onProgress(`\n🎯 Collecting games for ${stats.playerName} (ID: ${playerId})`);

    let page = 1;
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 3;
    let archivedLogErrors = 0;
    const MAX_ARCHIVED_LOG_ERRORS = 10;

    while (page <= this.options.maxPages) {
      try {
        this.options.onProgress(`   📄 Fetching page ${page}...`);

        // Fetch games for this page
        await this.delay(500 + Math.random() * 1500); // random delay to prevent bga from understanding scriptic requests
        const gamesResponse = await this.client.getPlayerFinishedGames(playerId, 1495, page);
        await this.delay(this.options.rateLimit);
        const games = gamesResponse.data.tables;

        if (games.length === 0) {
          this.options.onProgress(`   ✅ No more games (reached end)\n`);
          stats.reachedLastPage = true;
          break;
        }

        this.options.onProgress(`   Found ${games.length} games on page ${page}`);
        stats.totalGames += games.length;

        // Process each game
        for (const gameTable of games) {
          const tableId = parseInt(gameTable.table_id);

          // Stored games are skipped once they have their starting board (or a
          // board setup); older ones are re-fetched once to add it.
          const state = await gameCollectionState(tableId);
          if (state === 'done') {
            this.options.onProgress(`      ⏭️  Game ${tableId} already exists (skipping)`);
            stats.skippedGames++;
            continue;
          }

          try {
            if (state === 'board') {
              this.options.onProgress(`      🧩 Game ${tableId} exists without a board setup — fetching it...`);
              await this.delay(100 + Math.random() * 400);
              let board: unknown;
              try {
                ({ board } = await this.client.getGameReplay(gameTable.table_id));
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                if (msg.includes('You have reached a limit')) throw err;
                // Not available (e.g. the page never loads): store a null board so
                // later runs don't spend a replay view on it again.
                await storeStartBoard(tableId, null);
                this.options.onProgress(`      ⚠️  ${msg} — marked as unavailable`);
                await this.delay(this.options.rateLimit);
                continue;
              }
              const withSetup = await storeStartBoard(tableId, board);
              stats.boardsFetched++;
              if (withSetup) stats.setupsAdded++;
              this.options.onProgress(`      ✅ Stored starting board for ${tableId}${withSetup ? ' (+ board setup)' : ' (no map timeline, board kept raw)'}`);
              archivedLogErrors = 0;
              await this.delay(this.options.rateLimit);
              continue;
            }

            this.options.onProgress(`      ⬇️  Fetching game ${tableId}...`);

            // The replay page gives the log and the starting board; if it fails for
            // any reason but the daily limit, fall back to logs.html (log only).
            let logResponse;
            await this.delay(100 + Math.random() * 400);
            try {
              const replay = await this.client.getGameReplay(gameTable.table_id);
              logResponse = { ...replay.log, gamedatas: { board: replay.board } };
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              if (msg.includes('You have reached a limit')) throw err;
              this.options.onProgress(`      ⚠️  ${msg} — falling back to the log endpoint (no board setup)`);
            }

            // Retry loop for bot-detection errors ("archived" fake errors)
            const MAX_ARCHIVED_RETRIES = 2;
            for (let attempt = 0; !logResponse && attempt <= MAX_ARCHIVED_RETRIES; attempt++) {
              await this.delay(100 + Math.random() * 400);
              try {
                // A null board marks the replay page as tried, so it isn't re-fetched later.
                logResponse = { ...(await this.client.getGameLog(gameTable.table_id)), gamedatas: { board: null } };
                break;
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                if (msg.includes('Cannot find gamenotifs log file') && attempt < MAX_ARCHIVED_RETRIES) {
                  const cooldown = 15000 + Math.random() * 15000;
                  this.options.onProgress(`      ⚠️  Bot detection suspected, retrying in ${Math.round(cooldown / 1000)}s... (attempt ${attempt + 1}/${MAX_ARCHIVED_RETRIES})`);
                  await this.delay(cooldown);
                } else {
                  throw err;
                }
              }
            }

            await this.delay(500);
            const tableInfo = await this.client.getTableInfo(gameTable.table_id);

            const parsedGame = GameLogParser.parseGameLog(gameTable, logResponse!, tableInfo);
            await storeGame(parsedGame);

            this.options.onProgress(`      ✅ Stored game ${tableId}${parsedGame.isLostFleet ? ' (Lost Fleet)' : ''}`);
            stats.newGames++;
            if (parsedGame.isLostFleet) stats.newGamesLostFleet++;
            archivedLogErrors = 0; // reset on success

            // Rate limiting
            await this.delay(this.options.rateLimit);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);

            // Detect rate limit and bail out immediately (handles English and localized messages)
            if (errorMsg.includes('You have reached a limit') || errorMsg.includes('replay')) {
              this.options.onProgress(`   🛑 Rate limit reached! Stopping immediately.`);
              stats.rateLimited = true;
              stats.failedGames++;
              stats.errors.push({ tableId: gameTable.table_id, error: errorMsg });
              throw new RateLimitError(errorMsg, stats);
            }

            // Count consecutive archived log errors — too many suggest sustained bot detection
            if (errorMsg.includes('Cannot find gamenotifs log file')) {
              archivedLogErrors++;
              if (archivedLogErrors >= MAX_ARCHIVED_LOG_ERRORS) {
                this.options.onProgress(`   🛑 ${MAX_ARCHIVED_LOG_ERRORS} consecutive archived-log errors — stopping to avoid bot detection.`);
                stats.failedGames++;
                stats.errors.push({ tableId: gameTable.table_id, error: errorMsg });
                return stats;
              }
            }

            this.options.onProgress(`      ❌ Failed to process game ${tableId}: ${errorMsg}`);
            stats.failedGames++;
            stats.errors.push({ tableId: gameTable.table_id, error: errorMsg });
          }
        }

        // Check if this was the last page
        if (games.length < 10) {
          this.options.onProgress(`   ✅ Reached last page (${games.length} games)\n`);
          stats.reachedLastPage = true;
          break;
        }

        consecutiveFailures = 0;
        page++;
      } catch (error) {
        // Propagate rate limit errors up
        if (error instanceof RateLimitError) {
          throw error;
        }

        const errorMsg = error instanceof Error ? error.message : String(error);
        this.options.onProgress(`   ❌ Failed to fetch page ${page}: ${errorMsg}`);
        consecutiveFailures++;
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          this.options.onProgress(`   🛑 ${MAX_CONSECUTIVE_FAILURES} consecutive page failures — stopping collection.\n`);
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
      try {
        const stats = await this.collectPlayerGames(player.id, player.name);
        allStats.push(stats);
      } catch (error) {
        if (error instanceof RateLimitError) {
          allStats.push(error.stats);
          console.log(`\n🛑 Rate limit hit. Skipping remaining players.`);
          break;
        }
        throw error;
      }
    }

    return allStats;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
