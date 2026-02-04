/**
 * Test script to fetch game log and analyze structure
 *
 * Usage: npx tsx scripts/test-game-log.ts
 */

import { BGAClient } from '../src/lib/bga-client';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function testGameLog() {
  const username = process.env.BGA_USERNAME;
  const password = process.env.BGA_PASSWORD;

  if (!username || !password) {
    console.error('❌ Error: BGA_USERNAME and BGA_PASSWORD must be set');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('🎮 Testing BGA Game Log Fetching');
  console.log('='.repeat(60));
  console.log('');

  const client = new BGAClient();

  try {
    // Initialize and login
    console.log('📡 Initializing and logging in...');
    await client.initialize();
    await client.login(username, password);
    console.log('✅ Logged in\n');

    // First, get a recent game to fetch its log
    console.log('📋 Fetching recent games to get a table ID...');
    const playerId = parseInt(client.getSession().userId!);
    const gamesResponse = await client.getPlayerFinishedGames(playerId, 1495, 1);

    if (gamesResponse.data.tables.length === 0) {
      console.error('❌ No games found for this player');
      process.exit(1);
    }

    const recentGame = gamesResponse.data.tables[0];
    console.log(`✅ Found recent game: ${recentGame.table_id}`);
    console.log(`   Players: ${recentGame.player_names}`);
    console.log(`   Scores: ${recentGame.scores}`);
    console.log('');

    // Fetch the game log
    console.log(`🎯 Fetching game log for table ${recentGame.table_id}...`);
    const logResponse = await client.getGameLog(recentGame.table_id);

    console.log('✅ Game log fetched successfully\n');

    // Analyze response
    console.log('='.repeat(60));
    console.log('📊 Response Analysis');
    console.log('='.repeat(60));
    console.log('');

    console.log('Response Status:', logResponse.status);
    console.log('Response Keys:', Object.keys(logResponse));
    console.log('');

    if (logResponse.data) {
      console.log('Data Keys:', Object.keys(logResponse.data));
      console.log('');

      // Check logs array
      if (logResponse.data.logs) {
        console.log(`Number of log entries: ${logResponse.data.logs.length}`);
        console.log('');

        // Show first few log entries
        if (logResponse.data.logs.length > 0) {
          console.log('First 5 log entries:');
          logResponse.data.logs.slice(0, 5).forEach((log, index) => {
            console.log(`\n${index + 1}. ${typeof log === 'object' ? JSON.stringify(log, null, 2) : log}`);
          });
          console.log('');
        }
      }

      // Check for other data fields
      console.log('Other data fields:');
      Object.keys(logResponse.data).forEach(key => {
        if (key !== 'logs') {
          console.log(`- ${key}:`, typeof logResponse.data[key]);
        }
      });
      console.log('');
    }

    // Save full response to file
    const outputPath = './scripts/test-game-log-output.json';
    fs.writeFileSync(outputPath, JSON.stringify(logResponse, null, 2));
    console.log(`✅ Full response saved to: ${outputPath}`);
    console.log('');

    console.log('='.repeat(60));
    console.log('✅ Test completed successfully!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testGameLog();
