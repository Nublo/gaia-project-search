import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { GameLogParser } from '../game-parser'
import type { GameTableInfo, GetGameLogResponse, GetTableInfoResponse } from '../bga-types'

// ============================================================================
// HELPERS & FIXTURES
// ============================================================================

const FIXTURES_DIR = resolve(__dirname, 'fixtures')

function loadLogsFixture(): GetGameLogResponse {
  return JSON.parse(readFileSync(resolve(FIXTURES_DIR, 'test_game.json'), 'utf8'))
}

function loadBescodsFixture(): GetGameLogResponse {
  return JSON.parse(readFileSync(resolve(FIXTURES_DIR, 'game_bescods.json'), 'utf8'))
}

/**
 * Build the minimal GameTableInfo required by the parser.
 * table_id 820488760 matches the table_id in logs.json
 */
function makeGameTable(tableId = '820488760'): GameTableInfo {
  return {
    table_id: tableId,
    game_id: '1495',
    game_name: 'gaiaproject',
    ranking_disabled: '0',
    start: '1700000000',
    end: '1700003600',
    concede: '0',
    unranked: '0',
    normalend: '1',
    players: '97128233,65408553,98794136',
    player_names: 'AskimBenim,nublo,vuw628',
    scores: '164,217,196',
    ranks: '3,1,2',
    elo_win: '10',
    elo_penalty: '0',
    elo_after: '1500',
    arena_win: null,
    arena_after: null,
  }
}

/**
 * Build a minimal GetTableInfoResponse for the 3-player game in logs.json.
 * nublo (65408553) ranked 1st, others 2nd/3rd.
 * ELO values use BGA's raw format (real value + 1300 offset).
 */
function makeTableInfo(overrides?: {
  players?: { player_id: string; gamerank: string; rank_after_game: string }[]
}): GetTableInfoResponse {
  const players = overrides?.players ?? [
    { player_id: '97128233', gamerank: '3', rank_after_game: '2800' }, // AskimBenim → ELO 1500
    { player_id: '65408553', gamerank: '1', rank_after_game: '2750' }, // nublo → ELO 1450 (min)
    { player_id: '98794136', gamerank: '2', rank_after_game: '2900' }, // vuw628 → ELO 1600
  ]

  return {
    status: 1,
    data: {
      id: '820488760',
      game_id: '1495',
      game_name: 'gaiaproject',
      status: 'archive',
      result: {
        id: '820488760',
        time_start: '1700000000',
        time_end: '1700003600',
        time_duration: '3600',
        table_level: '0',
        game_id: '1495',
        concede: '0',
        endgame_reason: 'normal',
        game_name: 'gaiaproject',
        player: players.map((p) => ({
          player_id: p.player_id,
          gamerank: p.gamerank,
          rank_after_game: p.rank_after_game,
          score: '0',
          score_aux: '0',
          is_tie: '0',
          point_win: '0',
          finish_game: '1',
          arena_points_win: null,
          arena_after_game: null,
          name: '',
          avatar: '',
          gender: null,
          country: { name: '', cur: '', code: '', flag_x: 0, flag_y: 0 },
          is_premium: '0',
          is_beginner: '0',
          th_name: null,
        })),
        penalties: {},
        is_solo: false,
        stats: {},
        trophies: [],
      },
    },
  }
}

/**
 * Build a minimal log response from a list of packets, each containing an array of events.
 * Automatically wraps events in packets with the required fields.
 */
function makeLogResponse(
  events: any[],
  tableId = '820488760'
): GetGameLogResponse {
  return {
    status: 1,
    data: {
      logs: [
        {
          channel: '',
          table_id: tableId,
          packet_id: '1',
          packet_type: 'history',
          move_id: '1',
          time: '1700000000',
          data: events,
        },
      ],
    },
  }
}

// Minimal player with known research starting levels
function chooseRaceEvent(
  playerId: number,
  playerName: string,
  raceId: number,
  startResearch: number[] = [0, 0, 0, 0, 0, 0, 0] // indices 0-6; parser reads 1-6
) {
  return {
    type: 'notifyChooseRace',
    args: {
      playerId: String(playerId),
      player_name: playerName,
      raceId: String(raceId),
      player: { score: 10, research: [0, ...startResearch] },
    },
  }
}

function roundEndEvent(roundNum: number) {
  return { type: 'notifyRoundEnd', args: { roundNum } }
}

function researchEvent(playerId: number, whichResearch: number) {
  return {
    type: 'notifyResearch',
    args: { playerId: String(playerId), player_name: '', whichResearch },
  }
}

function buildEvent(playerId: number) {
  return {
    type: 'notifyBuild',
    args: { playerId: String(playerId), player_name: '' },
  }
}

function upgradeEvent(playerId: number, buildingId: number) {
  return {
    type: 'notifyUpgrade',
    args: { playerId: String(playerId), player_name: '', buildingId: String(buildingId) },
  }
}

function gameEndEvent(results: { id: string; name: string; score: string }[]) {
  return {
    type: 'gameStateChange',
    args: { args: { result: results } },
  }
}

// ============================================================================
// TESTS: REAL FIXTURE (logs.json)
// ============================================================================

describe('GameLogParser.parseGameLog — real fixture (logs.json)', () => {
  const logResponse = loadLogsFixture()
  const gameTable = makeGameTable()
  const tableInfo = makeTableInfo()
  const result = GameLogParser.parseGameLog(gameTable, logResponse, tableInfo)

  it('extracts correct player count', () => {
    expect(result.playerCount).toBe(3)
    expect(result.players).toHaveLength(3)
  })

  it('marks the game as complete (6 rounds played)', () => {
    expect(result.isComplete).toBe(true)
  })

  it('captures exactly 2 final scoring missions', () => {
    expect(result.finalScorings).toHaveLength(2)
    expect(result.finalScorings).toEqual(expect.arrayContaining([4, 2])) // Gaia planets + structures
  })

  it('returns final scorings sorted ascending', () => {
    const sorted = [...result.finalScorings].sort((a, b) => a - b)
    expect(result.finalScorings).toEqual(sorted)
  })

  it('identifies the correct winner (nublo, highest score 217)', () => {
    expect(result.winnerName).toBe('nublo')
    const nublo = result.players.find((p) => p.playerName === 'nublo')!
    expect(nublo.isWinner).toBe(true)
  })

  it('marks non-winners correctly', () => {
    const loser = result.players.find((p) => p.playerName === 'AskimBenim')!
    expect(loser.isWinner).toBe(false)
  })

  it('extracts correct final scores', () => {
    const nublo = result.players.find((p) => p.playerName === 'nublo')!
    const vuw628 = result.players.find((p) => p.playerName === 'vuw628')!
    const askim = result.players.find((p) => p.playerName === 'AskimBenim')!
    expect(nublo.finalScore).toBe(217)
    expect(vuw628.finalScore).toBe(196)
    expect(askim.finalScore).toBe(164)
  })

  it('normalizes ELO by subtracting 1300 offset', () => {
    const askim = result.players.find((p) => p.playerName === 'AskimBenim')!
    expect(askim.playerElo).toBe(2800 - 1300) // 1500
    const nublo = result.players.find((p) => p.playerName === 'nublo')!
    expect(nublo.playerElo).toBe(2750 - 1300) // 1450
  })

  it('returns the minimum ELO across all players', () => {
    // nublo 1450, AskimBenim 1500, vuw628 1600 → min = 1450
    expect(result.minPlayerElo).toBe(1450)
  })

  it('calculates totalScoredPoints = finalScore - startingScore', () => {
    const nublo = result.players.find((p) => p.playerName === 'nublo')!
    expect(nublo.totalScoredPoints).toBe(nublo.finalScore - nublo.startingScore)
  })

  it('assigns correct race IDs', () => {
    const askim = result.players.find((p) => p.playerName === 'AskimBenim')!
    expect(askim.raceId).toBe(10) // Bal'taks
    const nublo = result.players.find((p) => p.playerName === 'nublo')!
    expect(nublo.raceId).toBe(11) // Firacs
    const vuw628 = result.players.find((p) => p.playerName === 'vuw628')!
    expect(vuw628.raceId).toBe(14) // Itars
  })

  it('snapshots research levels for nublo at each round end', () => {
    const nublo = result.players.find((p) => p.playerName === 'nublo')!
    expect(nublo.research).toHaveLength(6)
    // Round 0 (end of round 1): Economy=2
    expect(nublo.research[0]).toEqual([0, 0, 0, 0, 2, 0])
    // Round 4 (end of round 5): Terraforming=5, Navigation=4, AI=2, Economy=4
    expect(nublo.research[4]).toEqual([5, 4, 2, 0, 4, 0])
  })

  it('snapshots research levels for vuw628 at each round end', () => {
    const vuw628 = result.players.find((p) => p.playerName === 'vuw628')!
    expect(vuw628.research).toHaveLength(6)
    // Round 0: Gaia=1 (starting level)
    expect(vuw628.research[0]).toEqual([0, 0, 0, 1, 0, 0])
    // Round 5: Navigation=4, AI=4, Gaia=4, Science=5
    expect(vuw628.research[5]).toEqual([1, 4, 4, 4, 0, 5])
  })

  it('records buildings per round for nublo', () => {
    const nublo = result.players.find((p) => p.playerName === 'nublo')!
    // round 0: [5,4,6] (TS, Mine, ResLab)
    expect(nublo.buildings[0]).toEqual([5, 4, 6])
    // round 1: [4,5,9,5] (Mine, TS, PI, TS)
    expect(nublo.buildings[1]).toEqual([4, 5, 9, 5])
  })

  it('records buildings per round for AskimBenim', () => {
    const askim = result.players.find((p) => p.playerName === 'AskimBenim')!
    // round 0: [5,6,7] (TS, ResLab, Academy)
    expect(askim.buildings[0]).toEqual([5, 6, 7])
    // round 3: [8,5,4,4] (QIC Academy, TS, Mine, Mine)
    expect(askim.buildings[3]).toEqual([8, 5, 4, 4])
  })

  it('records advanced tech tiles', () => {
    const vuw628 = result.players.find((p) => p.playerName === 'vuw628')!
    expect(vuw628.advancedTechs).toContain(20)
    expect(vuw628.advancedTechs).toContain(13)
  })

  it('does not duplicate tech tiles', () => {
    for (const player of result.players) {
      const uniqueAdv = new Set(player.advancedTechs)
      expect(player.advancedTechs).toHaveLength(uniqueAdv.size)
      const uniqueStd = new Set(player.standardTechs)
      expect(player.standardTechs).toHaveLength(uniqueStd.size)
    }
  })

  it('records standard tech tiles', () => {
    const askim = result.players.find((p) => p.playerName === 'AskimBenim')!
    expect(askim.standardTechs).toContain(4)
    expect(askim.standardTechs).toContain(9)
  })

  it('stores a rawLog reference', () => {
    expect(result.rawLog).toBe(logResponse)
  })
})

// ============================================================================
// TESTS: SMOKE TEST — logs_bescods.json
// ============================================================================

describe('GameLogParser.parseGameLog — smoke test (logs_bescods.json)', () => {
  it('parses without errors and returns players', () => {
    const logResponse = loadBescodsFixture()
    const tableId = logResponse.data.logs[0].table_id

    const gameTable: GameTableInfo = {
      ...makeGameTable(String(tableId)),
      table_id: String(tableId),
    }
    const tableInfo = makeTableInfo({ players: [] })

    const result = GameLogParser.parseGameLog(gameTable, logResponse, tableInfo)
    expect(result.players.length).toBeGreaterThan(0)
    expect(typeof result.isComplete).toBe('boolean')
    expect(Array.isArray(result.finalScorings)).toBe(true)
  })
})

// ============================================================================
// TESTS: WINNER DETECTION WITH TIES
// ============================================================================

describe('GameLogParser — winner detection', () => {
  function buildTieGame(scores: { id: string; name: string; score: string }[], gameranks: { id: string; rank: string }[]) {
    const players = gameranks.map((g) => ({
      player_id: g.id,
      gamerank: g.rank,
      rank_after_game: '2600',
    }))

    const logResponse = makeLogResponse([
      chooseRaceEvent(parseInt(gameranks[0].id), 'Alice', 1),
      chooseRaceEvent(parseInt(gameranks[1].id), 'Bob', 2),
      roundEndEvent(6),
      gameEndEvent(scores),
    ])

    return GameLogParser.parseGameLog(makeGameTable(), logResponse, makeTableInfo({ players }))
  }

  it('marks both players as winners when they tie for first (gamerank=1)', () => {
    const result = buildTieGame(
      [
        { id: '1', name: 'Alice', score: '150' },
        { id: '2', name: 'Bob', score: '150' },
      ],
      [
        { id: '1', rank: '1' },
        { id: '2', rank: '1' },
      ]
    )
    expect(result.players.find((p) => p.playerName === 'Alice')!.isWinner).toBe(true)
    expect(result.players.find((p) => p.playerName === 'Bob')!.isWinner).toBe(true)
    expect(result.winnerName).toContain('Alice')
    expect(result.winnerName).toContain('Bob')
  })

  it('falls back to highest score when tableInfo has no gamerank=1 players', () => {
    const logResponse = makeLogResponse([
      chooseRaceEvent(1, 'Alice', 1),
      chooseRaceEvent(2, 'Bob', 2),
      roundEndEvent(6),
      gameEndEvent([
        { id: '1', name: 'Alice', score: '170' },
        { id: '2', name: 'Bob', score: '130' },
      ]),
    ])

    // tableInfo with no rank-1 players
    const tableInfo = makeTableInfo({
      players: [
        { player_id: '1', gamerank: '2', rank_after_game: '2600' },
        { player_id: '2', gamerank: '2', rank_after_game: '2600' },
      ],
    })

    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    expect(result.players.find((p) => p.playerName === 'Alice')!.isWinner).toBe(true)
    expect(result.players.find((p) => p.playerName === 'Bob')!.isWinner).toBe(false)
  })

  it('marks multiple players as winners in score-based fallback when tied', () => {
    const logResponse = makeLogResponse([
      chooseRaceEvent(1, 'Alice', 1),
      chooseRaceEvent(2, 'Bob', 2),
      roundEndEvent(6),
      gameEndEvent([
        { id: '1', name: 'Alice', score: '160' },
        { id: '2', name: 'Bob', score: '160' },
      ]),
    ])

    const tableInfo = makeTableInfo({ players: [] }) // No rank-1 players
    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    expect(result.players.find((p) => p.playerName === 'Alice')!.isWinner).toBe(true)
    expect(result.players.find((p) => p.playerName === 'Bob')!.isWinner).toBe(true)
  })
})

// ============================================================================
// TESTS: PLACEHOLDER SCORE DETECTION
// ============================================================================

describe('GameLogParser — placeholder score detection', () => {
  function buildGame(scores: { id: string; name: string; score: string }[], hadRound6 = true) {
    const events: any[] = [
      chooseRaceEvent(1, 'Alice', 1),
      chooseRaceEvent(2, 'Bob', 2),
    ]
    if (hadRound6) events.push(roundEndEvent(6))
    events.push(gameEndEvent(scores))
    return GameLogParser.parseGameLog(makeGameTable(), makeLogResponse(events), makeTableInfo({ players: [] }))
  }

  it('marks game as incomplete when scores are [0, 1] placeholder pattern', () => {
    const result = buildGame([
      { id: '1', name: 'Alice', score: '0' },
      { id: '2', name: 'Bob', score: '1' },
    ])
    expect(result.isComplete).toBe(false)
  })

  it('marks game as incomplete when all scores are 0', () => {
    const result = buildGame([
      { id: '1', name: 'Alice', score: '0' },
      { id: '2', name: 'Bob', score: '0' },
    ])
    expect(result.isComplete).toBe(false)
  })

  it('marks game as complete when scores are normal (above 1)', () => {
    const result = buildGame([
      { id: '1', name: 'Alice', score: '140' },
      { id: '2', name: 'Bob', score: '155' },
    ])
    expect(result.isComplete).toBe(true)
  })

  it('marks game as incomplete when round 6 never occurred', () => {
    const result = buildGame(
      [
        { id: '1', name: 'Alice', score: '120' },
        { id: '2', name: 'Bob', score: '130' },
      ],
      false // no round 6
    )
    expect(result.isComplete).toBe(false)
  })
})

// ============================================================================
// TESTS: RESEARCH TRACKING
// ============================================================================

describe('GameLogParser — research level tracking', () => {
  it('stores race starting research levels in round-0 snapshot', () => {
    const logResponse = makeLogResponse([
      chooseRaceEvent(1, 'Alice', 4, [0, 1, 0, 0, 0, 0]), // Navigation=1 starting level
      roundEndEvent(1),
    ])

    const tableInfo = makeTableInfo({ players: [{ player_id: '1', gamerank: '1', rank_after_game: '2600' }] })
    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    const alice = result.players[0]

    expect(alice.research[0][1]).toBe(1)
  })

  it('increments research level on notifyResearch event', () => {
    const logResponse = makeLogResponse([
      chooseRaceEvent(1, 'Alice', 1),
      researchEvent(1, 2),
      roundEndEvent(1),
    ])

    const tableInfo = makeTableInfo({ players: [{ player_id: '1', gamerank: '1', rank_after_game: '2600' }] })
    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    const alice = result.players[0]

    expect(alice.research[0][1]).toBe(1)
  })

  it('captures research snapshot before incrementing round counter', () => {
    const logResponse = makeLogResponse([
      chooseRaceEvent(1, 'Alice', 1),
      researchEvent(1, 1),
      roundEndEvent(1),
      researchEvent(1, 1),
      roundEndEvent(2),
    ])

    const tableInfo = makeTableInfo({ players: [{ player_id: '1', gamerank: '1', rank_after_game: '2600' }] })
    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    const alice = result.players[0]

    expect(alice.research[0][0]).toBe(1)
    expect(alice.research[1][0]).toBe(2)
  })
})

// ============================================================================
// TESTS: BUILDING HISTORY
// ============================================================================

describe('GameLogParser — building history', () => {
  it('records mine (buildingId=4) from notifyBuild events', () => {
    const logResponse = makeLogResponse([
      chooseRaceEvent(1, 'Alice', 1),
      buildEvent(1),
      roundEndEvent(1),
      buildEvent(1),
      roundEndEvent(2),
    ])

    const tableInfo = makeTableInfo({ players: [{ player_id: '1', gamerank: '1', rank_after_game: '2600' }] })
    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    const alice = result.players[0]

    expect(alice.buildings[0]).toContain(4) // Mine in round 0
    expect(alice.buildings[1]).toContain(4) // Mine in round 1
  })

  it('records the correct buildingId from notifyUpgrade events', () => {
    const logResponse = makeLogResponse([
      chooseRaceEvent(1, 'Alice', 1),
      upgradeEvent(1, 5), // Trading Station in round 0
      roundEndEvent(1),
      upgradeEvent(1, 6), // Research Lab in round 1
    ])

    const tableInfo = makeTableInfo({ players: [{ player_id: '1', gamerank: '1', rank_after_game: '2600' }] })
    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    const alice = result.players[0]

    expect(alice.buildings[0]).toContain(5) // Trading Station in round 0
    expect(alice.buildings[1]).toContain(6) // Research Lab in round 1
  })
})

// ============================================================================
// TESTS: LEGACY RESULT FORMAT (object-keyed vs array result)
// ============================================================================

describe('GameLogParser — legacy result format', () => {
  it('parses object-keyed result format (older logs)', () => {
    const logResponse: GetGameLogResponse = {
      status: 1,
      data: {
        logs: [
          {
            channel: '',
            table_id: '820488760',
            packet_id: '1',
            packet_type: 'history',
            move_id: '1',
            time: '1700000000',
            data: [
              chooseRaceEvent(1, 'Alice', 1),
              chooseRaceEvent(2, 'Bob', 2),
              roundEndEvent(6),
              {
                type: 'gameStateChange',
                args: {
                  args: {
                    result: {
                      // Object format (older BGA logs)
                      '1': { id: '1', name: 'Alice', score: '150' },
                      '2': { id: '2', name: 'Bob', score: '130' },
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    }

    const tableInfo = makeTableInfo({
      players: [
        { player_id: '1', gamerank: '1', rank_after_game: '2600' },
        { player_id: '2', gamerank: '2', rank_after_game: '2600' },
      ],
    })

    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)

    const alice = result.players.find((p) => p.playerName === 'Alice')!
    expect(alice.finalScore).toBe(150)
    const bob = result.players.find((p) => p.playerName === 'Bob')!
    expect(bob.finalScore).toBe(130)
  })
})

// ============================================================================
// TESTS: FIELD NAME NORMALIZATION (player_id vs playerId)
// ============================================================================

describe('GameLogParser — field name normalization', () => {
  it('handles player_id (snake_case) in notifyBuild events', () => {
    const logResponse: GetGameLogResponse = {
      status: 1,
      data: {
        logs: [
          {
            channel: '',
            table_id: '820488760',
            packet_id: '1',
            packet_type: 'history',
            move_id: '1',
            time: '1700000000',
            data: [
              chooseRaceEvent(42, 'Alice', 1),
              {
                type: 'notifyBuild',
                args: { player_id: '42', player_name: 'Alice' },
              },
              roundEndEvent(6),
            ],
          },
        ],
      },
    }

    const tableInfo = makeTableInfo({ players: [{ player_id: '42', gamerank: '1', rank_after_game: '2600' }] })
    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    expect(result.players[0].buildings[0]).toContain(4)
  })
})

// ============================================================================
// TESTS: ELO NORMALIZATION
// ============================================================================

describe('GameLogParser — ELO normalization', () => {
  it('subtracts 1300 offset from raw BGA ELO', () => {
    const logResponse = makeLogResponse([
      chooseRaceEvent(1, 'Alice', 1),
      roundEndEvent(6),
    ])

    const tableInfo = makeTableInfo({
      players: [{ player_id: '1', gamerank: '1', rank_after_game: '2600' }], // raw = 2600 → normalized = 1300
    })

    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    expect(result.players[0].playerElo).toBe(1300)
  })

  it('sets playerElo to null when rank_after_game is non-numeric', () => {
    const logResponse = makeLogResponse([
      chooseRaceEvent(1, 'Alice', 1),
      roundEndEvent(6),
    ])

    const tableInfo = makeTableInfo({
      players: [{ player_id: '1', gamerank: '1', rank_after_game: 'N/A' }],
    })

    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    expect(result.players[0].playerElo).toBeNull()
  })

  it('returns null minPlayerElo when all players have null ELO', () => {
    const logResponse = makeLogResponse([
      chooseRaceEvent(1, 'Alice', 1),
      roundEndEvent(6),
    ])

    const tableInfo = makeTableInfo({ players: [] }) // No ELO data
    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    expect(result.minPlayerElo).toBeNull()
  })
})

// ============================================================================
// TESTS: TECH TILE COLLECTION
// ============================================================================

describe('GameLogParser — tech tile collection', () => {
  it('classifies advanced tech when coverupTechId != 0', () => {
    const logResponse = makeLogResponse([
      chooseRaceEvent(1, 'Alice', 1),
      {
        type: 'notifyGainTech',
        args: { playerId: '1', player_name: 'Alice', techId: 15, coverupTechId: 3 }, // advanced
      },
      roundEndEvent(6),
    ])

    const tableInfo = makeTableInfo({ players: [{ player_id: '1', gamerank: '1', rank_after_game: '2600' }] })
    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    expect(result.players[0].advancedTechs).toContain(15)
    expect(result.players[0].standardTechs).not.toContain(15)
  })

  it('classifies standard tech when coverupTechId === 0', () => {
    const logResponse = makeLogResponse([
      chooseRaceEvent(1, 'Alice', 1),
      {
        type: 'notifyGainTech',
        args: { playerId: '1', player_name: 'Alice', techId: 7, coverupTechId: 0 }, // standard
      },
      roundEndEvent(6),
    ])

    const tableInfo = makeTableInfo({ players: [{ player_id: '1', gamerank: '1', rank_after_game: '2600' }] })
    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    expect(result.players[0].standardTechs).toContain(7)
    expect(result.players[0].advancedTechs).not.toContain(7)
  })

  it('does not add duplicate tech IDs', () => {
    const logResponse = makeLogResponse([
      chooseRaceEvent(1, 'Alice', 1),
      { type: 'notifyGainTech', args: { playerId: '1', player_name: 'Alice', techId: 5, coverupTechId: 0 } },
      { type: 'notifyGainTech', args: { playerId: '1', player_name: 'Alice', techId: 5, coverupTechId: 0 } },
      roundEndEvent(6),
    ])

    const tableInfo = makeTableInfo({ players: [{ player_id: '1', gamerank: '1', rank_after_game: '2600' }] })
    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    const count = result.players[0].standardTechs.filter((id) => id === 5).length
    expect(count).toBe(1)
  })
})

// ============================================================================
// TESTS: QIC POINTS AND TECH POINTS
// ============================================================================

describe('GameLogParser — QIC and tech points', () => {
  it('accumulates QIC points from actionId=6 + notifyGainResource within same packet', () => {
    const logResponse: GetGameLogResponse = {
      status: 1,
      data: {
        logs: [
          {
            channel: '',
            table_id: '820488760',
            packet_id: '1',
            packet_type: 'history',
            move_id: '1',
            time: '1700000000',
            data: [
              chooseRaceEvent(1, 'Alice', 1),
              roundEndEvent(6),
            ],
          },
          {
            channel: '',
            table_id: '820488760',
            packet_id: '2',
            packet_type: 'history',
            move_id: '2',
            time: '1700000001',
            data: [
              {
                type: 'notifyAction',
                args: { playerId: '1', actionId: '6' },
              },
              {
                type: 'notifyGainResource',
                args: { playerId: '1', gainStr: '[VP5]' },
              },
            ],
          },
        ],
      },
    }

    const tableInfo = makeTableInfo({ players: [{ player_id: '1', gamerank: '1', rank_after_game: '2600' }] })
    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    expect(result.players[0].qicPoints).toBe(5)
  })

  it('does NOT carry QIC pending state across packet boundaries', () => {
    // Action in packet 2, resource gain in packet 3 — should NOT accumulate
    const logResponse: GetGameLogResponse = {
      status: 1,
      data: {
        logs: [
          {
            channel: '',
            table_id: '820488760',
            packet_id: '1',
            packet_type: 'history',
            move_id: '1',
            time: '1700000000',
            data: [chooseRaceEvent(1, 'Alice', 1), roundEndEvent(6)],
          },
          {
            channel: '',
            table_id: '820488760',
            packet_id: '2',
            packet_type: 'history',
            move_id: '2',
            time: '1700000001',
            data: [{ type: 'notifyAction', args: { playerId: '1', actionId: '6' } }],
          },
          {
            channel: '',
            table_id: '820488760',
            packet_id: '3',
            packet_type: 'history',
            move_id: '3',
            time: '1700000002',
            data: [{ type: 'notifyGainResource', args: { playerId: '1', gainStr: '[VP5]' } }],
          },
        ],
      },
    }

    const tableInfo = makeTableInfo({ players: [{ player_id: '1', gamerank: '1', rank_after_game: '2600' }] })
    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    expect(result.players[0].qicPoints).toBe(0) // Pending cleared at end of packet 2
  })
})

// ============================================================================
// TESTS: FACTION COST
// ============================================================================

describe('GameLogParser — faction auction cost', () => {
  it('extracts faction cost from "wins the auction for" event', () => {
    const logResponse = makeLogResponse([
      chooseRaceEvent(1, 'Alice', 1),
      {
        type: 'notifyGeneric',
        log: '${player_name} wins the auction for [RACE1], spending [VP8]',
        args: { player_name: 'Alice', vp: 8 },
      },
      roundEndEvent(6),
    ])

    const tableInfo = makeTableInfo({ players: [{ player_id: '1', gamerank: '1', rank_after_game: '2600' }] })
    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    expect(result.players[0].factionCost).toBe(8)
  })

  it('leaves factionCost at 0 when no auction event exists', () => {
    const logResponse = makeLogResponse([
      chooseRaceEvent(1, 'Alice', 1),
      roundEndEvent(6),
    ])

    const tableInfo = makeTableInfo({ players: [{ player_id: '1', gamerank: '1', rank_after_game: '2600' }] })
    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    expect(result.players[0].factionCost).toBe(0)
  })
})

// ============================================================================
// TESTS: FINAL SCORING COLLECTION
// ============================================================================

describe('GameLogParser — final scoring missions', () => {
  it('collects 2 unique final scoring mission IDs sorted ascending', () => {
    const logResponse = makeLogResponse([
      chooseRaceEvent(1, 'Alice', 1),
      roundEndEvent(6),
      { type: 'notifyScore', args: { desc: 'Most structures' }, log: '' },
      { type: 'notifyScore', args: { desc: 'Most Gaia planets' }, log: '' },
    ])

    const tableInfo = makeTableInfo({ players: [{ player_id: '1', gamerank: '1', rank_after_game: '2600' }] })
    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    expect(result.finalScorings).toEqual([2, 4]) // structures=2, gaia planets=4
  })

  it('ignores unknown/unrecognised score descriptions', () => {
    const logResponse = makeLogResponse([
      chooseRaceEvent(1, 'Alice', 1),
      roundEndEvent(6),
      { type: 'notifyScore', args: { desc: 'Unknown mission' }, log: '' },
    ])

    const tableInfo = makeTableInfo({ players: [{ player_id: '1', gamerank: '1', rank_after_game: '2600' }] })
    const result = GameLogParser.parseGameLog(makeGameTable(), logResponse, tableInfo)
    expect(result.finalScorings).toHaveLength(0)
  })
})

// ============================================================================
// TESTS: AUCTION DETECTION
// ============================================================================

describe('GameLogParser — auction detection', () => {
  function chooseRaceWithScore(playerId: number, playerName: string, raceId: number, score: number) {
    return {
      type: 'notifyChooseRace',
      args: {
        playerId: String(playerId),
        player_name: playerName,
        raceId: String(raceId),
        player: { score, research: [0, 0, 0, 0, 0, 0, 0] },
      },
    }
  }

  function buildGame(events: any[]) {
    return GameLogParser.parseGameLog(makeGameTable(), makeLogResponse(events), makeTableInfo({ players: [] }))
  }

  it('marks game as non-auction when every player starts with 10 VP', () => {
    const result = buildGame([
      chooseRaceWithScore(1, 'Alice', 1, 10),
      chooseRaceWithScore(2, 'Bob', 2, 10),
      roundEndEvent(6),
      gameEndEvent([
        { id: '1', name: 'Alice', score: '120' },
        { id: '2', name: 'Bob', score: '110' },
      ]),
    ])
    expect(result.isAuction).toBe(false)
  })

  it('marks game as auction when any player starts with a non-10 VP total', () => {
    const result = buildGame([
      chooseRaceWithScore(1, 'Alice', 1, 10),
      chooseRaceWithScore(2, 'Bob', 2, 35),
      roundEndEvent(6),
      gameEndEvent([
        { id: '1', name: 'Alice', score: '120' },
        { id: '2', name: 'Bob', score: '110' },
      ]),
    ])
    expect(result.isAuction).toBe(true)
  })

  it('defaults missing starting score to 10 (treated as non-auction)', () => {
    const result = buildGame([
      chooseRaceEvent(1, 'Alice', 1), // helper omits an explicit bid → score 10
      chooseRaceEvent(2, 'Bob', 2),
      roundEndEvent(6),
      gameEndEvent([
        { id: '1', name: 'Alice', score: '120' },
        { id: '2', name: 'Bob', score: '110' },
      ]),
    ])
    expect(result.isAuction).toBe(false)
  })
})
