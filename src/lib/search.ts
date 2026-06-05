import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { RACE_NAMES } from '@/lib/gaia-constants';
import type { SearchRequest, GameResult, ResearchCondition, AdvancedTechCondition, StandardTechCondition, PlayerRaceCondition } from '@/types/game';

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

interface SearchGamesResult {
  games: GameResult[];
  queryMs: number;
}

export async function searchGames(req: SearchRequest): Promise<SearchGamesResult> {
  const {
    winnerRace,
    winnerPlayerName,
    minPlayerElo,
    isAuction,
    playerNames = [],
    playerCounts = [],
    structureConditions = [],
    researchConditions = [],
    finalScorings = [],
    advancedTechConditions = [],
    standardTechConditions = [],
    playerRaceConditions = [],
  } = req;

  const andConditions: Prisma.GameWhereInput[] = [{ isComplete: true }];

  if (minPlayerElo) {
    andConditions.push({ minPlayerElo: { gte: minPlayerElo } });
  }

  if (isAuction !== undefined) {
    andConditions.push({ isAuction });
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

  for (const scoringId of finalScorings) {
    andConditions.push({ finalScorings: { has: scoringId } });
  }

  for (const group of playerNames) {
    if (group.length === 1) {
      andConditions.push({
        players: { some: { playerName: { contains: group[0], mode: 'insensitive' } } },
      });
    } else {
      andConditions.push({
        OR: group.map((name) => ({
          players: { some: { playerName: { contains: name, mode: 'insensitive' } } },
        })),
      });
    }
  }

  for (const cond of playerRaceConditions) {
    const raceId = RACE_NAME_TO_ID[cond.race];
    if (raceId !== undefined) {
      if (cond.playerNames.length === 1) {
        andConditions.push({
          players: { some: { playerName: { contains: cond.playerNames[0], mode: 'insensitive' }, raceId } },
        });
      } else {
        andConditions.push({
          OR: cond.playerNames.map((name) => ({
            players: { some: { playerName: { contains: name, mode: 'insensitive' }, raceId } },
          })),
        });
      }
    }
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

  const dbStart = performance.now();

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

      if (matchingTableIds.length === 0) return { games: [], queryMs: Math.round(performance.now() - dbStart) };

      andConditions.push({ tableId: { in: matchingTableIds } });
    }
  }

  const activeResearchConditions = researchConditions.filter(
    (cond) => cond.track !== undefined && cond.minLevel !== undefined
  );

  if (activeResearchConditions.length > 0) {
    const existsFragments: Prisma.Sql[] = [];

    for (const cond of activeResearchConditions) {
      const trackId = cond.track!;
      const minLevel = cond.minLevel!;
      const maxRound = cond.maxRound ?? 6;
      const roundIdx = maxRound - 1;
      const trackIdx = trackId - 1;
      const raceId = cond.race ? RACE_NAME_TO_ID[cond.race] : undefined;

      if (raceId !== undefined) {
        existsFragments.push(Prisma.sql`
          EXISTS (
            SELECT 1 FROM players p WHERE p.table_id = g.table_id
            AND p.race_id = ${raceId}
            AND jsonb_array_length(p.research_data->'research') > ${roundIdx}::int
            AND (p.research_data->'research'->${roundIdx}::int->${trackIdx}::int)::int >= ${minLevel}
          )
        `);
      } else {
        existsFragments.push(Prisma.sql`
          EXISTS (
            SELECT 1 FROM players p WHERE p.table_id = g.table_id
            AND jsonb_array_length(p.research_data->'research') > ${roundIdx}::int
            AND (p.research_data->'research'->${roundIdx}::int->${trackIdx}::int)::int >= ${minLevel}
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

      if (matchingTableIds.length === 0) return { games: [], queryMs: Math.round(performance.now() - dbStart) };

      andConditions.push({ tableId: { in: matchingTableIds } });
    }
  }

  if (advancedTechConditions.length > 0) {
    const existsFragments: Prisma.Sql[] = [];

    for (const cond of advancedTechConditions) {
      const techId = cond.techId;
      const raceId = cond.race ? RACE_NAME_TO_ID[cond.race] : undefined;

      if (raceId !== undefined) {
        existsFragments.push(Prisma.sql`
          EXISTS (
            SELECT 1 FROM players p WHERE p.table_id = g.table_id
            AND p.race_id = ${raceId}
            AND p.advanced_techs_data @> ARRAY[${techId}::int]
          )
        `);
      } else {
        existsFragments.push(Prisma.sql`
          EXISTS (
            SELECT 1 FROM players p WHERE p.table_id = g.table_id
            AND p.advanced_techs_data @> ARRAY[${techId}::int]
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

      if (matchingTableIds.length === 0) return { games: [], queryMs: Math.round(performance.now() - dbStart) };

      andConditions.push({ tableId: { in: matchingTableIds } });
    }
  }

  if (standardTechConditions.length > 0) {
    const existsFragments: Prisma.Sql[] = [];

    for (const cond of standardTechConditions) {
      const techId = cond.techId;
      const raceId = cond.race ? RACE_NAME_TO_ID[cond.race] : undefined;

      if (raceId !== undefined) {
        existsFragments.push(Prisma.sql`
          EXISTS (
            SELECT 1 FROM players p WHERE p.table_id = g.table_id
            AND p.race_id = ${raceId}
            AND p.standard_techs_data @> ARRAY[${techId}::int]
          )
        `);
      } else {
        existsFragments.push(Prisma.sql`
          EXISTS (
            SELECT 1 FROM players p WHERE p.table_id = g.table_id
            AND p.standard_techs_data @> ARRAY[${techId}::int]
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

      if (matchingTableIds.length === 0) return { games: [], queryMs: Math.round(performance.now() - dbStart) };

      andConditions.push({ tableId: { in: matchingTableIds } });
    }
  }

  const GAME_SELECT = {
    id: true,
    tableId: true,
    playerCount: true,
    winnerName: true,
    minPlayerElo: true,
    finalScorings: true,
    isAuction: true,
    players: {
      select: {
        id: true,
        playerId: true,
        playerName: true,
        raceId: true,
        finalScore: true,
        playerElo: true,
        isWinner: true,
        buildingsData: true,
        researchData: true,
        advancedTechsData: true,
        standardTechsData: true,
        qicPoints: true,
        techPoints: true,
        totalScoredPoints: true,
        factionCost: true,
      },
    },
  } as const;

  const addRaceNames = (games: { players: { raceId: number; [key: string]: unknown }[]; [key: string]: unknown }[]) =>
    games.map((g) => ({ ...g, players: g.players.map((p) => ({ ...p, raceName: RACE_NAMES[p.raceId as keyof typeof RACE_NAMES] ?? `Unknown (${p.raceId})` })) }));

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  if (req.sortBy) {
    const SORT_COLUMN: Record<string, string> = {
      qicPoints: 'qic_points',
      techPoints: 'tech_points',
      totalScoredPoints: 'total_scored_points',
      finalScore: 'final_score',
      factionCost: 'faction_cost',
    };
    const column = SORT_COLUMN[req.sortBy];

    // Collect distinct race IDs from all fraction conditions
    const allConditionRaces = [
      ...(req.structureConditions ?? []).map((c) => c.race),
      ...(req.researchConditions ?? []).map((c) => c.race),
      ...(req.advancedTechConditions ?? []).map((c) => c.race),
      ...(req.standardTechConditions ?? []).map((c) => c.race),
    ].filter((r): r is string => !!r);
    const filteredRaceIds = [...new Set(allConditionRaces)]
      .map((name) => RACE_NAME_TO_ID[name])
      .filter((id): id is number => id !== undefined);

    // Step 1: get all filtered tableIds (no limit — we need to sort across the full result set)
    const filteredGames = await prisma.game.findMany({ where, select: { tableId: true } });
    const filteredIds = filteredGames.map((g) => g.tableId);
    if (filteredIds.length === 0) return { games: [], queryMs: Math.round(performance.now() - dbStart) };

    // Step 2: sort by MAX(column) scoped to filtered races (if any), take top 100
    const sorted = filteredRaceIds.length > 0
      ? await prisma.$queryRaw<{ table_id: number }[]>`
          SELECT p.table_id
          FROM players p
          WHERE p.table_id = ANY(${filteredIds}::int[])
          AND p.race_id = ANY(${filteredRaceIds}::int[])
          GROUP BY p.table_id
          ORDER BY MAX(p.${Prisma.raw(column)}) DESC
          LIMIT 100
        `
      : await prisma.$queryRaw<{ table_id: number }[]>`
          SELECT p.table_id
          FROM players p
          WHERE p.table_id = ANY(${filteredIds}::int[])
          GROUP BY p.table_id
          ORDER BY MAX(p.${Prisma.raw(column)}) DESC
          LIMIT 100
        `;
    const sortedIds = sorted.map((r) => r.table_id);
    if (sortedIds.length === 0) return { games: [], queryMs: Math.round(performance.now() - dbStart) };

    // Step 3: fetch full game data and restore sort order
    const gamesData = await prisma.game.findMany({
      where: { tableId: { in: sortedIds } },
      select: GAME_SELECT,
    });
    const gamesById = new Map(gamesData.map((g) => [g.tableId, g]));
    const games = sortedIds.map((id) => gamesById.get(id)).filter((g): g is NonNullable<typeof g> => g != null);

    return { games: addRaceNames(games) as GameResult[], queryMs: Math.round(performance.now() - dbStart) };
  }

  const games = await prisma.game.findMany({
    where,
    select: GAME_SELECT,
    take: 100,
    orderBy: { tableId: 'desc' },
  });

  return { games: addRaceNames(games) as GameResult[], queryMs: Math.round(performance.now() - dbStart) };
}

const LEADERBOARD_COLUMNS = {
  qicPoints: 'qic_points',
  techPoints: 'tech_points',
  totalScoredPoints: 'total_scored_points',
  factionCost: 'faction_cost',
} as const;

type LeaderboardCategory = keyof typeof LEADERBOARD_COLUMNS;

export interface LeaderboardSection {
  category: LeaderboardCategory;
  label: string;
  games: GameResult[];
}

export async function getLeaderboardGames(limit = 3): Promise<LeaderboardSection[]> {
  const GAME_SELECT = {
    id: true,
    tableId: true,
    playerCount: true,
    winnerName: true,
    minPlayerElo: true,
    finalScorings: true,
    isComplete: true,
    players: {
      select: {
        id: true,
        playerId: true,
        playerName: true,
        raceId: true,
        finalScore: true,
        playerElo: true,
        isWinner: true,
        buildingsData: true,
        researchData: true,
        advancedTechsData: true,
        standardTechsData: true,
        qicPoints: true,
        techPoints: true,
        totalScoredPoints: true,
        factionCost: true,
      },
    },
  } as const;

  const addRaceNamesLocal = (games: { players: { raceId: number; [key: string]: unknown }[]; [key: string]: unknown }[]) =>
    games.map((g) => ({ ...g, players: g.players.map((p) => ({ ...p, raceName: RACE_NAMES[p.raceId as keyof typeof RACE_NAMES] ?? `Unknown (${p.raceId})` })) }));

  const categories: { key: LeaderboardCategory; label: string }[] = [
    { key: 'qicPoints', label: 'QIC Points' },
    { key: 'techPoints', label: 'Tech Points' },
    { key: 'totalScoredPoints', label: 'Total Points' },
    { key: 'factionCost', label: 'Faction Cost' },
  ];

  const sections = await Promise.all(
    categories.map(async ({ key, label }) => {
      const column = LEADERBOARD_COLUMNS[key];
      const sorted = await prisma.$queryRaw<{ table_id: number }[]>`
        SELECT p.table_id
        FROM players p
        JOIN games g ON g.table_id = p.table_id
        WHERE g.is_complete = true
        GROUP BY p.table_id
        ORDER BY MAX(p.${Prisma.raw(column)}) DESC
        LIMIT ${limit}
      `;
      const tableIds = sorted.map((r) => r.table_id);
      if (tableIds.length === 0) return { category: key, label, games: [] };

      const gamesData = await prisma.game.findMany({
        where: { tableId: { in: tableIds } },
        select: GAME_SELECT,
      });
      const gamesById = new Map(gamesData.map((g) => [g.tableId, g]));
      const games = tableIds
        .map((id) => gamesById.get(id))
        .filter((g): g is NonNullable<typeof g> => g != null);

      return { category: key, label, games: addRaceNamesLocal(games) as GameResult[] };
    })
  );

  return sections;
}

export interface FactionStat {
  raceName: string;
  avgPts: number;
  avgElo: number;
  score: number;
  gamesCount: number;
  places: [number, number, number, number]; // counts for 1st, 2nd, 3rd, 4th place
}

export interface PlayerStat {
  playerName: string;
  places: [number, number, number, number];
  gamesCount: number;
  placesByCount?: Record<number, [number, number, number, number]>;
}

export interface PlayerAnalyticsResult {
  totalGames: number;
  factionStats: FactionStat[];
  playerStats: PlayerStat[];
  queryMs: number;
}

export async function getAnalytics(req: SearchRequest, selectedGroup?: string[]): Promise<PlayerAnalyticsResult> {
  const {
    winnerRace,
    winnerPlayerName,
    minPlayerElo,
    isAuction,
    playerNames = [],
    playerCounts = [],
    structureConditions = [],
    researchConditions = [],
    finalScorings = [],
    advancedTechConditions = [],
    standardTechConditions = [],
    playerRaceConditions = [],
  } = req;

  // When exactly one player group is filtered (or a group is explicitly selected), enable player-specific analytics view
  const singleGroup = selectedGroup ?? (playerNames.length === 1 ? playerNames[0] : undefined);

  const andConditions: Prisma.GameWhereInput[] = [];

  // Always enforce completed multi-player games
  andConditions.push({ isComplete: true });
  andConditions.push({ playerCount: { gt: 1 } });

  if (minPlayerElo) {
    andConditions.push({ minPlayerElo: { gte: minPlayerElo } });
  }

  if (isAuction !== undefined) {
    andConditions.push({ isAuction });
  }

  if (winnerPlayerName) {
    andConditions.push({ winnerName: { contains: winnerPlayerName, mode: 'insensitive' } });
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

  for (const scoringId of finalScorings) {
    andConditions.push({ finalScorings: { has: scoringId } });
  }

  for (const group of playerNames) {
    if (group.length === 1) {
      andConditions.push({ players: { some: { playerName: { contains: group[0], mode: 'insensitive' } } } });
    } else {
      andConditions.push({
        OR: group.map((name) => ({
          players: { some: { playerName: { contains: name, mode: 'insensitive' } } },
        })),
      });
    }
  }

  for (const cond of playerRaceConditions) {
    const raceId = RACE_NAME_TO_ID[cond.race];
    if (raceId !== undefined) {
      if (cond.playerNames.length === 1) {
        andConditions.push({
          players: { some: { playerName: { contains: cond.playerNames[0], mode: 'insensitive' }, raceId } },
        });
      } else {
        andConditions.push({
          OR: cond.playerNames.map((name) => ({
            players: { some: { playerName: { contains: name, mode: 'insensitive' }, raceId } },
          })),
        });
      }
    }
  }

  const raceOnlyConditions = structureConditions.filter((cond) => cond.race && !cond.structure);
  const buildingConditions = structureConditions.filter((cond) => cond.structure);

  for (const cond of raceOnlyConditions) {
    const raceId = RACE_NAME_TO_ID[cond.race!];
    if (raceId !== undefined) {
      andConditions.push({ players: { some: { raceId } } });
    }
  }

  const dbStart = performance.now();

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

      if (matchingTableIds.length === 0) return { totalGames: 0, factionStats: [], playerStats: [], queryMs: Math.round(performance.now() - dbStart) };

      andConditions.push({ tableId: { in: matchingTableIds } });
    }
  }

  const activeResearchConditions = researchConditions.filter(
    (cond) => cond.track !== undefined && cond.minLevel !== undefined
  );

  if (activeResearchConditions.length > 0) {
    const existsFragments: Prisma.Sql[] = [];

    for (const cond of activeResearchConditions) {
      const trackId = cond.track!;
      const minLevel = cond.minLevel!;
      const maxRound = cond.maxRound ?? 6;
      const roundIdx = maxRound - 1;
      const trackIdx = trackId - 1;
      const raceId = cond.race ? RACE_NAME_TO_ID[cond.race] : undefined;

      if (raceId !== undefined) {
        existsFragments.push(Prisma.sql`
          EXISTS (
            SELECT 1 FROM players p WHERE p.table_id = g.table_id
            AND p.race_id = ${raceId}
            AND jsonb_array_length(p.research_data->'research') > ${roundIdx}::int
            AND (p.research_data->'research'->${roundIdx}::int->${trackIdx}::int)::int >= ${minLevel}
          )
        `);
      } else {
        existsFragments.push(Prisma.sql`
          EXISTS (
            SELECT 1 FROM players p WHERE p.table_id = g.table_id
            AND jsonb_array_length(p.research_data->'research') > ${roundIdx}::int
            AND (p.research_data->'research'->${roundIdx}::int->${trackIdx}::int)::int >= ${minLevel}
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

      if (matchingTableIds.length === 0) return { totalGames: 0, factionStats: [], playerStats: [], queryMs: Math.round(performance.now() - dbStart) };

      andConditions.push({ tableId: { in: matchingTableIds } });
    }
  }

  if (advancedTechConditions.length > 0) {
    const existsFragments: Prisma.Sql[] = [];

    for (const cond of advancedTechConditions) {
      const techId = cond.techId;
      const raceId = cond.race ? RACE_NAME_TO_ID[cond.race] : undefined;

      if (raceId !== undefined) {
        existsFragments.push(Prisma.sql`
          EXISTS (
            SELECT 1 FROM players p WHERE p.table_id = g.table_id
            AND p.race_id = ${raceId}
            AND p.advanced_techs_data @> ARRAY[${techId}::int]
          )
        `);
      } else {
        existsFragments.push(Prisma.sql`
          EXISTS (
            SELECT 1 FROM players p WHERE p.table_id = g.table_id
            AND p.advanced_techs_data @> ARRAY[${techId}::int]
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

      if (matchingTableIds.length === 0) return { totalGames: 0, factionStats: [], playerStats: [], queryMs: Math.round(performance.now() - dbStart) };

      andConditions.push({ tableId: { in: matchingTableIds } });
    }
  }

  if (standardTechConditions.length > 0) {
    const existsFragments: Prisma.Sql[] = [];

    for (const cond of standardTechConditions) {
      const techId = cond.techId;
      const raceId = cond.race ? RACE_NAME_TO_ID[cond.race] : undefined;

      if (raceId !== undefined) {
        existsFragments.push(Prisma.sql`
          EXISTS (
            SELECT 1 FROM players p WHERE p.table_id = g.table_id
            AND p.race_id = ${raceId}
            AND p.standard_techs_data @> ARRAY[${techId}::int]
          )
        `);
      } else {
        existsFragments.push(Prisma.sql`
          EXISTS (
            SELECT 1 FROM players p WHERE p.table_id = g.table_id
            AND p.standard_techs_data @> ARRAY[${techId}::int]
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

      if (matchingTableIds.length === 0) return { totalGames: 0, factionStats: [], playerStats: [], queryMs: Math.round(performance.now() - dbStart) };

      andConditions.push({ tableId: { in: matchingTableIds } });
    }
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const games = await prisma.game.findMany({
    where,
    select: {
      playerCount: true,
      players: {
        select: { playerName: true, raceId: true, finalScore: true, playerElo: true },
      },
    },
  });

  const totalGames = games.length;
  const factionAccum = new Map<string, { scoreSum: number; ptsSum: number; eloSum: number; eloCount: number; count: number; places: [number, number, number, number] }>();
  const playerAccum = new Map<string, Record<number, [number, number, number, number]>>();

  for (const game of games) {
    const { playerCount, players } = game;

    // Sort players by finalScore DESC
    const sorted = [...players].sort((a, b) => b.finalScore - a.finalScore);

    // Assign ranks: tied players share the best (first) rank in their group
    const rankMap = new Map<string, number>();
    let rank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].finalScore < sorted[i - 1].finalScore) {
        rank = i + 1;
      }
      rankMap.set(sorted[i].playerName, rank);
    }

    // Compute ELO stats across all players in the game
    const gameEloSum = players.reduce((sum, p) => sum + (p.playerElo ?? 0), 0);
    const gameEloCount = players.filter((p) => p.playerElo != null).length;

    const scoringPlayers = singleGroup
      ? players.filter((p) => singleGroup.some((n) => p.playerName.toLowerCase().includes(n.toLowerCase())))
      : players;

    for (const targetPlayer of scoringPlayers) {
      const place = rankMap.get(targetPlayer.playerName) ?? 1;
      const f = playerCount - place;
      const raceName = RACE_NAMES[targetPlayer.raceId as keyof typeof RACE_NAMES] ?? `Unknown (${targetPlayer.raceId})`;

      const existing = factionAccum.get(raceName) ?? { scoreSum: 0, ptsSum: 0, eloSum: 0, eloCount: 0, count: 0, places: [0, 0, 0, 0] as [number, number, number, number] };
      const newPlaces: [number, number, number, number] = [...existing.places] as [number, number, number, number];
      if (place >= 1 && place <= 4) newPlaces[place - 1]++;
      // Player-specific view: average ELO of all participants in those games.
      // Global view: ELO of the player who played this faction (keeps each faction's value distinct).
      const eloAdd = singleGroup ? gameEloSum : (targetPlayer.playerElo ?? 0);
      const eloCountAdd = singleGroup ? gameEloCount : (targetPlayer.playerElo != null ? 1 : 0);
      factionAccum.set(raceName, {
        scoreSum: existing.scoreSum + f,
        ptsSum: existing.ptsSum + targetPlayer.finalScore,
        eloSum: existing.eloSum + eloAdd,
        eloCount: existing.eloCount + eloCountAdd,
        count: existing.count + 1,
        places: newPlaces,
      });

      if (playerNames.length > 0) {
        const matchingGroup = playerNames.find((group) =>
          group.some((n) => targetPlayer.playerName.toLowerCase().includes(n.toLowerCase()))
        );
        if (matchingGroup) {
          const groupKey = matchingGroup.join(' + ');
          const existingByCount = playerAccum.get(groupKey) ?? {};
          const existingPlaces = (existingByCount[playerCount] ?? [0, 0, 0, 0]) as [number, number, number, number];
          const updatedPlaces: [number, number, number, number] = [...existingPlaces] as [number, number, number, number];
          if (place >= 1 && place <= 4) updatedPlaces[place - 1]++;
          playerAccum.set(groupKey, { ...existingByCount, [playerCount]: updatedPlaces });
        }
      }
    }
  }

  const factionStats: FactionStat[] = Array.from(factionAccum.entries())
    .map(([raceName, { scoreSum, ptsSum, eloSum, eloCount, count, places }]) => ({
      raceName,
      avgPts: ptsSum / count,
      avgElo: eloCount > 0 ? eloSum / eloCount : 0,
      score: scoreSum / count,
      gamesCount: count,
      places,
    }))
    .sort((a, b) => b.score - a.score);

  const playerStats: PlayerStat[] = playerNames.map((group) => {
    const key = group.join(' + ');
    const byCount = playerAccum.get(key) ?? {};
    const places = [0, 0, 0, 0] as [number, number, number, number];
    for (const countPlaces of Object.values(byCount)) {
      for (let i = 0; i < 4; i++) places[i] += countPlaces[i];
    }
    return {
      playerName: key,
      places,
      gamesCount: places.reduce((a, b) => a + b, 0),
      placesByCount: byCount,
    };
  });

  return { totalGames, factionStats, playerStats, queryMs: Math.round(performance.now() - dbStart) };
}
