/**
 * Test script to verify game log parser
 *
 * Usage: npx tsx scripts/test-parser.ts
 */

import { BGAClient } from '../src/lib/bga-client';
import { GameLogParser } from '../src/lib/game-parser';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function testParser() {
  const username = process.env.BGA_USERNAME;
  const password = process.env.BGA_PASSWORD;

  if (!username || !password) {
    console.error('❌ Error: BGA_USERNAME and BGA_PASSWORD must be set');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('🧪 Testing Game Log Parser');
  console.log('='.repeat(60));
  console.log('');

  const client = new BGAClient();

  try {
    // Initialize and login
    console.log('📡 Initializing and logging in...');
    await client.initialize();
    await client.login(username, password);
    console.log('✅ Logged in\n');

    // Fetch a recent game
    console.log('📋 Fetching recent game...');
    const playerId = parseInt(client.getSession().userId!);
    const gamesResponse = await client.getPlayerFinishedGames(playerId, 1495, 1);

    const recentGame = gamesResponse.data.tables[0];
    console.log(`✅ Selected game: ${recentGame.table_id}`);
    console.log(`   Players: ${recentGame.player_names}`);
    console.log(`   Scores: ${recentGame.scores}`);
    console.log('');

    // Fetch the game log
    console.log(`🎯 Fetching game log...`);
    const logResponse = await client.getGameLog(recentGame.table_id);
    console.log(`✅ Fetched ${logResponse.data.logs.length} log packets\n`);

    // Parse the game log
    console.log('⚙️  Parsing game log...');
    console.log('');
    const parsedGame = GameLogParser.parseGameLog(recentGame, logResponse);
    console.log('');
    console.log('✅ Parsing completed\n');

    // Display results
    console.log('='.repeat(60));
    console.log('📊 Parsed Game Data');
    console.log('='.repeat(60));
    console.log('');

    console.log(`Table ID: ${parsedGame.tableId}`);
    console.log(`Game: ${parsedGame.gameName} (ID: ${parsedGame.gameId})`);
    console.log(`Players: ${parsedGame.playerCount}`);
    console.log(`Winner: ${parsedGame.winnerName}`);
    console.log('');

    // Display player info with buildings
    console.log('👥 Players and Races:');
    parsedGame.players.forEach((player, index) => {
      console.log(
        `${index + 1}. ${player.playerName} - ${player.raceName} (Race ${player.raceId})`
      );
      console.log(`   Score: ${player.finalScore} points`);

      // Count total buildings
      const totalBuildings = player.buildings.reduce((sum, round) => sum + round.length, 0);
      console.log(`   Buildings: ${totalBuildings} total across ${player.buildings.length} rounds`);

      // Show buildings per round (first 3 rounds as sample)
      player.buildings.slice(0, 3).forEach((roundBuildings, roundIndex) => {
        if (roundBuildings.length > 0) {
          console.log(`     Round ${roundIndex}: [${roundBuildings.join(', ')}]`);
        }
      });
      if (player.buildings.length > 3) {
        console.log(`     ... and ${player.buildings.length - 3} more rounds`);
      }
    });
    console.log('');

    // Test player data extraction
    console.log('🎯 Testing getPlayerData for first player:');
    const firstPlayer = parsedGame.players[0];
    const playerData = GameLogParser.getPlayerData(parsedGame, firstPlayer.playerId);
    if (playerData) {
      console.log(`   Player: ${playerData.playerName}`);
      console.log(`   Race: ${playerData.raceName}`);
      console.log(`   Final Score: ${playerData.finalScore}`);
      console.log(`   Buildings structure: ${JSON.stringify(playerData.buildings)}`);
    }
    console.log('');

    // Save parsed data
    const outputPath = './scripts/test-parser-output.json';
    fs.writeFileSync(
      outputPath,
      JSON.stringify(
        {
          ...parsedGame,
          rawLog: undefined, // Don't save raw log
        },
        null,
        2
      )
    );
    console.log(`✅ Parsed data saved to: ${outputPath}`);
    console.log('');

    console.log('='.repeat(60));
    console.log('✅ Parser test completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testParser();
