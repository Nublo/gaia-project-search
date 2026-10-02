import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { ParsedGameData } from './game-parser';
import { MAP_TIMELINE_VERSION, buildMapTimeline, encodeMapTimeline } from './map-timeline';
import { buildBoardSetup, type BgaBoard } from './board-setup';

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
        artifacts: parsedGame.artifacts,
        isComplete: parsedGame.isComplete,
        isAuction: parsedGame.isAuction,
        isLostFleet: parsedGame.isLostFleet,
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
            artifactsData: [...player.artifacts].sort((a, b) => a - b),
            qicPoints: player.qicPoints,
            techPoints: player.techPoints,
            totalScoredPoints: player.totalScoredPoints,
            factionCost: player.factionCost,
          }
        })
      )
    );

    // Galaxy map timeline for /timeline/[tableId], plus the board setup for
    // /game-setup: from the replay page's starting board (rawLog.gamedatas.board)
    // when the game was fetched from there, else from a Lost Fleet log's own
    // board copies. Logs without a map snapshot get no row.
    const logs = parsedGame.rawLog?.data?.logs;
    const timeline = Array.isArray(logs) ? buildMapTimeline(logs) : null;
    if (timeline) {
      const setup = buildBoardSetup(logs, parsedGame.rawLog?.gamedatas?.board);
      await tx.gameReplay.create({
        data: {
          tableId,
          version: MAP_TIMELINE_VERSION,
          mapTimeline: encodeMapTimeline(timeline) as unknown as Prisma.InputJsonValue,
          setup: (setup ?? undefined) as unknown as Prisma.InputJsonValue | undefined,
        },
      });
    }

    return { ...game, players };
  });

  return result;
}

/**
 * What collection still needs for a game: 'missing' (not stored), 'board' (stored,
 * but without the replay page's starting board or a board setup), or 'done'.
 * A game counts as done once rawLog.gamedatas.board is stored, even when no
 * setup could be built from it (no map timeline, solo games) or it is null (the
 * replay page wasn't available), so each game's replay page is fetched once.
 */
export async function gameCollectionState(tableId: number): Promise<'missing' | 'board' | 'done'> {
  const [row] = await prisma.$queryRaw<{ has_board: boolean; has_setup: boolean }[]>`
    SELECT g.raw_game_log->'rawLog'->'gamedatas' ? 'board' AS has_board, r.setup IS NOT NULL AS has_setup
    FROM games g LEFT JOIN game_replays r ON r.table_id = g.table_id
    WHERE g.table_id = ${tableId}
  `;
  if (!row) return 'missing';
  return row.has_board || row.has_setup ? 'done' : 'board';
}

/**
 * Store the starting board read off an already-stored game's replay page: raw,
 * next to its log (raw_game_log.rawLog.gamedatas.board), and as its board setup
 * when the game has a map timeline row. Returns whether a setup was stored.
 */
export async function storeStartBoard(tableId: number, board: unknown): Promise<boolean> {
  await prisma.$executeRaw`
    UPDATE games SET raw_game_log = jsonb_set(raw_game_log, '{rawLog,gamedatas}', jsonb_build_object('board', ${JSON.stringify(board)}::jsonb))
    WHERE table_id = ${tableId}
  `;
  const game = await prisma.game.findUnique({
    where: { tableId },
    select: { rawGameLog: true, replay: { select: { tableId: true } } },
  });
  const logs = (game?.rawGameLog as { rawLog?: { data?: { logs?: unknown } } } | null)?.rawLog?.data?.logs;
  if (!game?.replay || !Array.isArray(logs)) return false;
  const setup = buildBoardSetup(logs, (board ?? undefined) as BgaBoard | undefined);
  if (!setup) return false;
  await prisma.gameReplay.update({ where: { tableId }, data: { setup: setup as unknown as Prisma.InputJsonValue } });
  return true;
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
