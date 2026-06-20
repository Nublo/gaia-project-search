import { prisma } from './db';
import { ParsedGameData } from './game-parser';

/**
 * Store a parsed game and all its players in the database.
 *
 * @param parsedGame - The parsed game data from GameLogParser (includes normalized ELO data)
 * @returns The created game with all players
 */
export async function storeGame(parsedGame: ParsedGameData) {
  const tableId = parseInt(parsedGame.tableId);

  // Create game and players in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // First, create the game
    const game = await tx.game.create({
      data: {
        tableId,
        playerCount: parsedGame.playerCount,
        winnerName: parsedGame.winnerName,
        minPlayerElo: parsedGame.minPlayerElo,
        finalScorings: parsedGame.finalScorings,
        isComplete: parsedGame.isComplete,
        isAuction: parsedGame.isAuction,
        rawGameLog: parsedGame as any,
      }
    });

    // Then, create all players with explicit tableId
    const players = await Promise.all(
      parsedGame.players.map((player) =>
        tx.player.create({
          data: {
            tableId,
            playerId: player.playerId,
            playerName: player.playerName,
            raceId: player.raceId,
            finalScore: player.finalScore,
            playerElo: player.playerElo,
            isWinner: player.isWinner,
            buildingsData: {
              buildings: player.buildings
            },
            researchData: {
              research: player.research
            },
            advancedTechsData: [...player.advancedTechs].sort((a, b) => a - b),
            standardTechsData: [...player.standardTechs].sort((a, b) => a - b),
            qicPoints: player.qicPoints,
            techPoints: player.techPoints,
            totalScoredPoints: player.totalScoredPoints,
            factionCost: player.factionCost,
          }
        })
      )
    );

    return { ...game, players };
  });

  return result;
}

/**
 * Check if a game already exists in the database.
 *
 * @param tableId - BGA table ID (unique game instance identifier)
 * @returns True if game exists, false otherwise
 */
export async function gameExists(tableId: number): Promise<boolean> {
  const game = await prisma.game.findUnique({
    where: { tableId }
  });
  return game !== null;
}

/**
 * Mark a player as fully exhausted — we have paged through to the last page of
 * their finished games, so there is nothing left to fetch from BGA.
 *
 * Idempotent: safe to call on every run that reaches the last page.
 *
 * @param playerId - BGA player ID
 */
export async function markPlayerReachedEnd(playerId: number) {
  const collectionDate = new Date();
  return prisma.playerCollectionState.upsert({
    where:  { playerId },
    create: { playerId, reachEnd: true, collectionDate },
    update: { reachEnd: true, collectionDate },
  });
}

/**
 * Get a game and all its players from the database.
 *
 * @param tableId - BGA table ID (unique game instance identifier)
 * @returns The game with all players, or null if not found
 */
export async function getGame(tableId: number) {
  return await prisma.game.findUnique({
    where: { tableId },
    include: { players: true }
  });
}
