import { BGAClient } from '../src/lib/bga-client';
import { GameCollector, RateLimitError, CollectionStats } from '../src/lib/game-collector';
import { markPlayerReachedEnd } from '../src/lib/game-storage';
import { ensureVpnConnected } from './vpn-helper';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Exit codes (consumed by collect-daily.sh to decide whether to keep going):
 *   0 — reached last page (player fully exhausted, nothing left to fetch)
 *   1 — unexpected error
 *   2 — VPN not connected (set in vpn-helper)
 *   3 — BGA rate limit hit for this account (stop using these credentials today)
 *   4 — stopped early for another reason (bot detection / repeated page failures)
 */
const EXIT_EXHAUSTED = 0;
const EXIT_RATE_LIMITED = 3;
const EXIT_STOPPED_EARLY = 4;

async function collectPlayer() {
  const playerInput = process.argv[2];

  if (!playerInput) {
    console.error('❌ Error: Player name or ID required');
    console.error('Usage: npx tsx scripts/collect-player.ts <player_name_or_id>');
    console.error('Examples:');
    console.error('  npx tsx scripts/collect-player.ts AlabeSons');
    console.error('  npx tsx scripts/collect-player.ts 85051404');
    process.exit(1);
  }

  const username = process.env.BGA_USERNAME;
  const password = process.env.BGA_PASSWORD;

  if (!username || !password) {
    console.error('❌ Error: BGA_USERNAME and BGA_PASSWORD must be set in .env file');
    process.exit(1);
  }

  console.log('='.repeat(70));
  console.log('🎮 BGA Gaia Project - Player Collection');
  console.log('='.repeat(70));

  await ensureVpnConnected();

  const client = new BGAClient();

  try {
    // Initialize and login
    console.log('\n📡 Initializing BGA client...');
    await client.initialize();
    await client.login(username, password);
    console.log('✅ Logged in successfully');

    // Determine if input is player ID or name
    let playerId: number;
    let playerName: string;

    if (/^\d+$/.test(playerInput)) {
      // Input is numeric - treat as player ID
      playerId = parseInt(playerInput);
      playerName = `Player ${playerId}`;
      console.log(`\n🎯 Collecting games for player ID: ${playerId}`);
    } else {
      // Input is name - search BGA for player
      console.log(`\n🔍 Searching BGA for player: ${playerInput}`);
      const searchResults = await client.searchPlayer(playerInput);

      if (searchResults.data.players.length === 0) {
        console.error(`\n❌ Player "${playerInput}" not found on BGA`);
        console.error('Please check the player name or provide the numeric player ID instead.');
        process.exit(1);
      }

      // Use the first match
      const firstMatch = searchResults.data.players[0];
      playerId = firstMatch.id;
      playerName = firstMatch.fullname;

      console.log(`✅ Found player: ${playerName} (ID: ${playerId})`);

      // If multiple matches, show them
      if (searchResults.data.players.length > 1) {
        console.log(`\n⚠️  Multiple matches found (using first match):`);
        searchResults.data.players.slice(0, 5).forEach((p, i) => {
          console.log(`   ${i + 1}. ${p.fullname} (ID: ${p.id})`);
        });
      }
    }

    // Collect games
    const collector = new GameCollector(client, {
      rateLimit: 1500, // 1.5 seconds between requests
    });

    let stats: CollectionStats;
    try {
      stats = await collector.collectPlayerGames(playerId, playerName);
    } catch (error) {
      if (error instanceof RateLimitError) {
        stats = error.stats;
      } else {
        throw error;
      }
    }

    // Display summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 Collection Summary');
    console.log('='.repeat(70));
    console.log(`\n👤 ${stats.playerName} (ID: ${stats.playerId})`);
    console.log(`   Total games found: ${stats.totalGames}`);
    console.log(`   New games stored: ${stats.newGames}`);
    console.log(`   Already existed: ${stats.skippedGames}`);
    console.log(`   Failed: ${stats.failedGames}`);

    if (stats.rateLimited) {
      console.log(`\n   🛑 Stopped early due to BGA rate limit. Run again later to continue.`);
    }

    if (stats.errors.length > 0) {
      console.log(`\n   Errors:`);
      stats.errors.forEach((err) => {
        console.log(`     - Game ${err.tableId}: ${err.error}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log(stats.rateLimited ? `⏸️  Collection paused (rate limited). Run again to continue.` : `✅ Collection Complete!`);
    console.log('='.repeat(70));

    // Signal the outcome to the caller via exit code so the daily script can decide
    // whether to move on to the next player (exhausted) or stop the account (rate limited).
    if (stats.rateLimited) {
      process.exitCode = EXIT_RATE_LIMITED;
    } else if (stats.reachedLastPage) {
      // Persist that this player's history is fully exhausted so future runs can skip them.
      await markPlayerReachedEnd(playerId);
      process.exitCode = EXIT_EXHAUSTED;
    } else {
      process.exitCode = EXIT_STOPPED_EARLY;
    }
  } catch (error) {
    console.error('\n❌ Collection failed:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

collectPlayer();
