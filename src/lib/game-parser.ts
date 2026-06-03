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
  FINAL_SCORING_DESC_TO_ID,
  RESEARCH_TRACK_SHORT_NAMES,
  ADVANCED_TECH_LABELS,
  STANDARD_TECH_LABELS,
} from './gaia-constants';
import { GetGameLogResponse, GameTableInfo, GetTableInfoResponse } from './bga-types';

/**
 * BGA ELO offset - BGA's ELO system was redesigned and now displays ratings
 * with 1300 subtracted from the raw stored value. We normalize to match
 * what users see in the BGA interface.
 */
const BGA_ELO_OFFSET = 1300;

// ============================================================================
// PARSED GAME DATA
// ============================================================================

export interface ParsedGameData {
  // Game identification
  tableId: string;

  // Players and races (includes building data)
  playerCount: number;
  winnerName: string; // Name of the winning player
  minPlayerElo: number | null; // Minimum ELO among all players (normalized)
  finalScorings: number[]; // IDs of the 2 active final scoring missions (1–6)
  isComplete: boolean; // True if all 6 rounds were played (notifyRoundEnd roundNum===6 found)
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
    logResponse: GetGameLogResponse,
    tableInfo: GetTableInfoResponse
  ): ParsedGameData {
    // Validate log response structure
    if (!logResponse.data || !logResponse.data.logs) {
      throw new Error(
        `Invalid game log response structure for table ${gameTable.table_id}. ` +
        `Expected logResponse.data.logs but got: ${JSON.stringify(logResponse).substring(0, 200)}`
      );
    }

    const logs = logResponse.data.logs;
    const players: PlayerRaceMapping[] = [];
    const finalScoringDescs = new Set<string>();

    // Extract and normalize player ELO data from table info
    const playerEloMap = new Map<number, number>();
    tableInfo.data.result.player.forEach((playerResult) => {
      const playerId = parseInt(playerResult.player_id);
      const rawElo = parseFloat(playerResult.rank_after_game);
      if (!isNaN(rawElo)) {
        // Normalize ELO by subtracting BGA offset (1300)
        const normalizedElo = Math.round(rawElo - BGA_ELO_OFFSET);
        playerEloMap.set(playerId, normalizedElo);
      }
    });

    let currentRound = 0;
    let pendingQicActionPlayerId: number | null = null;
    let pendingTechGainPlayerId: number | null = null;

    // Parse each log packet
    for (const packet of logs) {
      const packetId = parseInt(packet.packet_id);
      const timestamp = parseInt(packet.time);

      // Parse events in this packet
      for (const event of packet.data) {
        const eventType = event.type;

        // Track round endings — snapshot research levels BEFORE incrementing round
        if (eventType === EventType.NOTIFY_ROUND_END) {
          for (const player of players) {
            player.research.push([...player.researchLevels]);
          }
          currentRound++;
          console.log(`[Parser] Round ${currentRound} ended at packet ${packetId}`);
        }

        // Parse race selection
        if (eventType === EventType.NOTIFY_CHOOSE_RACE) {
          const playerId = parseInt(event.args.playerId);
          const playerName = event.args.player_name;
          const raceId = parseInt(event.args.raceId);

          const startResearch = event.args.player?.research as number[] | undefined;
          players.push({
            playerId,
            playerName,
            raceId,
            finalScore: 0, // Will be updated when parsing game end
            startingScore: event.args.player?.score ?? 10,
            playerElo: playerEloMap.get(playerId) || null, // Get normalized ELO from table info
            buildings: [], // Will be populated as buildings are built
            research: [],  // Will be populated at each notifyRoundEnd with absolute level snapshots
            researchLevels: startResearch
              ? [startResearch[1], startResearch[2], startResearch[3], startResearch[4], startResearch[5], startResearch[6]]
              : [0, 0, 0, 0, 0, 0],
            advancedTechs: [], // Will be populated when notifyGainTech events with coverupTechId != 0 are found
            standardTechs: [], // Will be populated when notifyGainTech events with coverupTechId === 0 are found
            qicPoints: 0,
            techPoints: 0,
            totalScoredPoints: 0,
            factionCost: 0,
            isWinner: false, // Will be set after all scores are known
          });

          console.log(
            `[Parser] ${playerName} (${playerId}) chose ${getRaceName(raceId)} (race ${raceId})`
          );
        }

        // Parse game end (final scores)
        if (eventType === EventType.GAME_STATE_CHANGE) {
          const args = event.args;
          // Check for game end with results
          if (args.args?.result) {
            // result can be an array (newer logs) or an object keyed by player ID (older logs)
            const resultEntries: any[] = Array.isArray(args.args.result)
              ? args.args.result
              : Object.values(args.args.result);

            for (const playerScore of resultEntries) {
              const playerId = parseInt(playerScore.id);
              const score = parseInt(playerScore.score);

              // Match by id if available, fall back to name
              const player = isNaN(playerId)
                ? players.find((p) => p.playerName === playerScore.name)
                : players.find((p) => p.playerId === playerId);
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

        // Collect final scoring mission types from notifyScore events
        // Also capture round-end tech tile scoring
        if (eventType === EventType.NOTIFY_SCORE) {
          const desc = event.args?.desc;
          if (desc && FINAL_SCORING_DESC_TO_ID[desc] !== undefined) {
            finalScoringDescs.add(desc);
          }
          if (event.log?.startsWith('Technology:')) {
            const playerId = parseInt(event.args?.playerId);
            const vp = parseInt(event.args?.vp) || 0;
            const player = players.find((p) => p.playerId === playerId);
            if (player && vp > 0) {
              player.techPoints += vp;
            }
          }
        }

        // Track QIC actions (actionId 6 = planet diversity, 7 = rescore federation)
        if (eventType === EventType.NOTIFY_ACTION) {
          const actionId = parseInt(event.args?.actionId);
          if (actionId === 6 || actionId === 7) {
            pendingQicActionPlayerId = parseInt(event.args?.playerId);
          }
        }

        // Track tech gains (any tech tile — sets pending state for next notifyGainResource)
        if (eventType === EventType.NOTIFY_GAIN_TECH) {
          pendingTechGainPlayerId = parseInt(event.args?.playerId || event.args?.player_id);
        }

        // Consume pending QIC and tech gain states on resource gain
        if (eventType === EventType.NOTIFY_GAIN_RESOURCE) {
          const playerId = parseInt(event.args?.playerId || event.args?.player_id);
          const gainStr: string = event.args?.gainStr ?? '';
          const vpMatch = gainStr.match(/\[VP(\d+)\]/);
          const vp = vpMatch ? parseInt(vpMatch[1]) : 0;

          if (pendingQicActionPlayerId === playerId) {
            if (vp > 0) {
              const player = players.find((p) => p.playerId === playerId);
              if (player) player.qicPoints += vp;
            }
            pendingQicActionPlayerId = null;
          }
          if (pendingTechGainPlayerId === playerId) {
            const player = players.find((p) => p.playerId === playerId);
            if (player) player.techPoints += vp;
            pendingTechGainPlayerId = null;
          }
        }

        // Parse research track advances (notifyResearch events)
        if (eventType === EventType.NOTIFY_RESEARCH) {
          const args = event.args;
          const playerId = parseInt(args.playerId || args.player_id);
          const trackId = parseInt(args.whichResearch); // 1-6

          if (playerId && trackId >= 1 && trackId <= 6) {
            const player = players.find((p) => p.playerId === playerId);
            if (player) {
              player.researchLevels[trackId - 1]++;
              console.log(
                `[Parser] ${args.player_name} advanced ${RESEARCH_TRACK_SHORT_NAMES[trackId]} to level ${player.researchLevels[trackId - 1]}`
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

        // Parse faction auction cost ("wins the auction for" events)
        if (eventType === EventType.NOTIFY_GENERIC) {
          const log: string = event.log ?? '';
          if (log.includes('wins the auction for')) {
            const playerName = event.args?.player_name;
            const vp = parseInt(event.args?.vp) || 0;
            const player = players.find((p) => p.playerName === playerName);
            if (player) player.factionCost = vp;
          }
        }

        // Parse advanced and standard technology tile acquisitions (notifyGainTech events)
        if (eventType === EventType.NOTIFY_GAIN_TECH) {
          const args = event.args;
          const coverupTechId = parseInt(args.coverupTechId);
          const techId = parseInt(args.techId);
          const playerId = parseInt(args.playerId || args.player_id);
          if (coverupTechId !== 0) {
            if (playerId && techId && ADVANCED_TECH_LABELS[techId] !== undefined) {
              const player = players.find((p) => p.playerId === playerId);
              if (player && !player.advancedTechs.includes(techId)) {
                player.advancedTechs.push(techId);
                console.log(`[Parser] ${args.player_name} took advanced tech ${techId} (${ADVANCED_TECH_LABELS[techId]})`);
              }
            }
          } else if (coverupTechId === 0) {
            if (playerId && techId && STANDARD_TECH_LABELS[techId] !== undefined) {
              const player = players.find((p) => p.playerId === playerId);
              if (player && !player.standardTechs.includes(techId)) {
                player.standardTechs.push(techId);
                console.log(`[Parser] ${args.player_name} took standard tech ${techId} (${STANDARD_TECH_LABELS[techId]})`);
              }
            }
          }
        }
      }

      // Pending states are always resolved within a single packet — clear after each packet
      pendingQicActionPlayerId = null;
      pendingTechGainPlayerId = null;
    }

    // Compute totalScoredPoints for each player
    for (const player of players) {
      player.totalScoredPoints = player.finalScore - player.startingScore;
    }

    // Determine winners using gamerank from tableInfo (handles ties — multiple players can share rank 1)
    const winnerPlayerIds = new Set(
      tableInfo.data.result.player
        .filter((p) => p.gamerank === '1')
        .map((p) => parseInt(p.player_id))
    );

    // Fall back to highest score if tableInfo has no rank-1 players
    if (winnerPlayerIds.size === 0 && players.length > 0) {
      const maxScore = Math.max(...players.map((p) => p.finalScore));
      players.filter((p) => p.finalScore === maxScore).forEach((p) => winnerPlayerIds.add(p.playerId));
    }

    for (const player of players) {
      player.isWinner = winnerPlayerIds.has(player.playerId);
    }

    const winnerName = players
      .filter((p) => p.isWinner)
      .map((p) => p.playerName)
      .join(', ');

    // Calculate minimum player ELO
    const playerElos = players
      .map(p => p.playerElo)
      .filter((elo): elo is number => elo !== null);
    const minPlayerElo = playerElos.length > 0 ? Math.min(...playerElos) : null;

    // Map collected final scoring descs to IDs (sorted ascending)
    const finalScorings = Array.from(finalScoringDescs)
      .map((desc) => FINAL_SCORING_DESC_TO_ID[desc])
      .filter((id): id is number => id !== undefined)
      .sort((a, b) => a - b);

    // Determine if the game completed normally (all 6 rounds played)
    // A game is also considered incomplete if some players scored 0 and the rest scored 1 —
    // this pattern indicates a player left and BGA assigned placeholder scores.
    const hadRound6 = logs.some((packet) =>
      packet.data.some(
        (event: any) =>
          event.type === EventType.NOTIFY_ROUND_END &&
          event.args?.roundNum === 6
      )
    );
    const scores = players.map((p) => p.finalScore);
    const hasPlaceholderScores =
      scores.length > 0 &&
      scores.some((s) => s === 0) &&
      scores.every((s) => s === 0 || s === 1);
    const isComplete = hadRound6 && !hasPlaceholderScores;

    // Build the parsed data object
    const parsedData: ParsedGameData = {
      tableId: gameTable.table_id,
      playerCount: players.length,
      players,
      winnerName,
      minPlayerElo,
      finalScorings,
      isComplete,
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
