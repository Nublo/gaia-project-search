/**
 * Gaia Project Game Log Parser
 *
 * Parses BGA game logs to extract searchable fields for database storage.
 */

import {
  BuildingType,
  EventType,
  PlayerRaceMapping,
  BuildingAction,
  getRaceName,
  getBuildingName,
} from './gaia-constants';
import { GetGameLogResponse, GameTableInfo } from './bga-types';

// ============================================================================
// PARSED GAME DATA
// ============================================================================

export interface ParsedGameData {
  // Game identification
  tableId: string;
  gameId: number;
  gameName: string;

  // Players and races (includes building data)
  playerCount: number;
  winnerName: string; // Name of the winning player,
  players: PlayerRaceMapping[];

  // Raw data for future parsing
  rawLog: any; // Full log for reference
}

// ============================================================================
// PARSER CLASS
// ============================================================================

export class GameLogParser {
  /**
   * Parse a game log and extract searchable data
   */
  static parseGameLog(
    gameTable: GameTableInfo,
    logResponse: GetGameLogResponse
  ): ParsedGameData {
    const logs = logResponse.data.logs;
    const players: PlayerRaceMapping[] = [];

    let currentRound = 0;

    // Parse each log packet
    for (const packet of logs) {
      const packetId = parseInt(packet.packet_id);
      const timestamp = parseInt(packet.time);

      // Parse events in this packet
      for (const event of packet.data) {
        const eventType = event.type;

        // Track round endings
        if (eventType === EventType.NOTIFY_ROUND_END) {
          currentRound++;
          console.log(`[Parser] Round ${currentRound} ended at packet ${packetId}`);
        }

        // Parse race selection
        if (eventType === EventType.NOTIFY_CHOOSE_RACE) {
          const playerId = parseInt(event.args.playerId);
          const playerName = event.args.player_name;
          const raceId = parseInt(event.args.raceId);

          players.push({
            playerId,
            playerName,
            raceId,
            raceName: getRaceName(raceId),
            finalScore: 0, // Will be updated when parsing game end
            buildings: [], // Will be populated as buildings are built
          });

          console.log(
            `[Parser] ${playerName} (${playerId}) chose ${getRaceName(raceId)} (race ${raceId})`
          );
        }

        // Parse game end (final scores)
        if (eventType === EventType.GAME_STATE_CHANGE) {
          const args = event.args;
          // Check for game end with results
          if (args.args?.result && Array.isArray(args.args.result)) {
            for (const playerScore of args.args.result) {
              const playerId = parseInt(playerScore.id);
              const score = parseInt(playerScore.score);

              // Update finalScore directly on the player object
              const player = players.find((p) => p.playerId === playerId);
              if (player) {
                player.finalScore = score;
              }

              console.log(`[Parser] ${playerScore.name}: ${score} points`);
            }
          }
        }

        // Parse building mines (notifyBuild events)
        if (eventType === EventType.NOTIFY_BUILD) {
          const args = event.args;

          // Extract player info (building is always a mine = 4)
          const playerId = parseInt(args.playerId || args.player_id);
          const playerName = args.player_name || args.playerName;
          const buildingId = 4; // Mine

          if (playerId) {
            // Find the player
            const player = players.find((p) => p.playerId === playerId);
            if (player) {
              // Ensure the buildings array has an entry for this round
              while (player.buildings.length <= currentRound) {
                player.buildings.push([]);
              }
              // Add the mine to the current round
              player.buildings[currentRound].push(buildingId);

              console.log(
                `[Parser] ${playerName} built ${getBuildingName(buildingId)} in round ${currentRound}`
              );
            }
          }
        }

        // Parse building upgrades (notifyUpgrade events)
        if (eventType === EventType.NOTIFY_UPGRADE) {
          const args = event.args;

          // Extract player and building info
          const playerId = parseInt(args.playerId || args.player_id);
          const playerName = args.player_name || args.playerName;
          const buildingId = parseInt(args.buildingId);

          if (playerId && buildingId) {
            // Find the player
            const player = players.find((p) => p.playerId === playerId);
            if (player) {
              // Ensure the buildings array has an entry for this round
              while (player.buildings.length <= currentRound) {
                player.buildings.push([]);
              }
              // Add the building to the current round
              player.buildings[currentRound].push(buildingId);

              console.log(
                `[Parser] ${playerName} built ${getBuildingName(buildingId)} in round ${currentRound}`
              );
            }
          }
        }
      }
    }

    // Determine winner (player with highest score)
    let winnerName = '';
    if (players.length > 0) {
      const winner = players.reduce((max, player) =>
        player.finalScore > max.finalScore ? player : max
      );
      winnerName = winner.playerName;
    }

    // Build the parsed data object
    const parsedData: ParsedGameData = {
      tableId: gameTable.table_id,
      gameId: parseInt(gameTable.game_id),
      gameName: gameTable.game_name,
      playerCount: players.length,
      players,
      winnerName,
      rawLog: logResponse,
    };

    return parsedData;
  }

  /**
   * Get parsed data for a specific player from a game
   */
  static getPlayerData(parsedGame: ParsedGameData, playerId: number) {
    return parsedGame.players.find((p) => p.playerId === playerId);
  }
}
