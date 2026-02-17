import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { RACE_NAMES } from '@/lib/gaia-constants';
import type { SearchRequest, GameResult } from '@/types/game';

const RACE_NAME_TO_ID: Record<string, number> = Object.fromEntries(
  Object.entries(RACE_NAMES).map(([id, name]) => [name, Number(id)])
);

const STRUCTURE_TO_ID: Record<string, number> = {
  'mine': 4,
  'trading-station': 5,
  'research-lab': 6,
  'knowledge-academy': 7,
  'qic-academy': 8,
  'planetary-institute': 9,
};

export async function searchGames(req: SearchRequest): Promise<GameResult[]> {
  const {
    winnerRace,
    winnerPlayerName,
    minPlayerElo,
    playerNames = [],
    playerCounts = [],
    structureConditions = [],
  } = req;

  const andConditions: Prisma.GameWhereInput[] = [];

  if (minPlayerElo) {
    andConditions.push({ minPlayerElo: { gte: minPlayerElo } });
  }

  if (winnerPlayerName) {
    andConditions.push({
      winnerName: { contains: winnerPlayerName, mode: 'insensitive' },
    });
  }

  if (winnerRace) {
    const raceId = RACE_NAME_TO_ID[winnerRace];
    if (raceId !== undefined) {
      andConditions.push({ players: { some: { isWinner: true, raceId } } });
    }
  }

  if (playerCounts.length > 0) {
    andConditions.push({ playerCount: { in: playerCounts } });
  }

  if (playerNames.length > 0) {
    andConditions.push({
      OR: playerNames.map((name) => ({
        players: { some: { playerName: { contains: name, mode: 'insensitive' } } },
      })),
    });
  }

  const raceOnlyConditions = structureConditions.filter(
    (cond) => cond.race && !cond.structure
  );
  const buildingConditions = structureConditions.filter((cond) => cond.structure);

  for (const cond of raceOnlyConditions) {
    const raceId = RACE_NAME_TO_ID[cond.race!];
    if (raceId !== undefined) {
      andConditions.push({ players: { some: { raceId } } });
    }
  }

  if (buildingConditions.length > 0) {
    const existsFragments: Prisma.Sql[] = [];

    for (const cond of buildingConditions) {
      const buildingId = STRUCTURE_TO_ID[cond.structure!];
      if (buildingId === undefined) continue;

      const raceId = cond.race ? RACE_NAME_TO_ID[cond.race] : undefined;
      const maxRound = cond.maxRound ?? 6;

      if (raceId !== undefined) {
        existsFragments.push(Prisma.sql`
          EXISTS (
            SELECT 1 FROM players p WHERE p.table_id = g.table_id
            AND p.race_id = ${raceId}
            AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(p.buildings_data->'buildings')
              WITH ORDINALITY AS rnd(round_buildings, round_num)
              WHERE rnd.round_num <= ${maxRound}
              AND rnd.round_buildings @> jsonb_build_array(${buildingId})
            )
          )
        `);
      } else {
        existsFragments.push(Prisma.sql`
          EXISTS (
            SELECT 1 FROM players p WHERE p.table_id = g.table_id
            AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(p.buildings_data->'buildings')
              WITH ORDINALITY AS rnd(round_buildings, round_num)
              WHERE rnd.round_num <= ${maxRound}
              AND rnd.round_buildings @> jsonb_build_array(${buildingId})
            )
          )
        `);
      }
    }

    if (existsFragments.length > 0) {
      const whereClause = Prisma.join(existsFragments, ' AND ');
      const matchingGames = await prisma.$queryRaw<{ table_id: number }[]>`
        SELECT DISTINCT g.table_id FROM games g WHERE ${whereClause}
      `;
      const matchingTableIds = matchingGames.map((r) => r.table_id);

      if (matchingTableIds.length === 0) return [];

      andConditions.push({ tableId: { in: matchingTableIds } });
    }
  }

  const games = await prisma.game.findMany({
    where: andConditions.length > 0 ? { AND: andConditions } : {},
    select: {
      id: true,
      tableId: true,
      playerCount: true,
      winnerName: true,
      minPlayerElo: true,
      players: {
        select: {
          id: true,
          playerName: true,
          raceId: true,
          raceName: true,
          finalScore: true,
          playerElo: true,
          isWinner: true,
        },
      },
    },
    take: 100,
    orderBy: { tableId: 'desc' },
  });

  return games as GameResult[];
}
