import { describe, it, expect, vi, beforeEach } from 'vitest'

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }))

vi.mock('../db', () => ({
  prisma: {
    game: { findMany },
  },
}))

import { searchGames, getAnalytics } from '../search'
import type { SearchRequest } from '@/types/game'

describe('searchGames — Lost Fleet exclusion', () => {
  beforeEach(() => {
    findMany.mockReset()
    findMany.mockResolvedValue([])
  })

  it('always excludes isLostFleet games, regardless of other filters', async () => {
    const req: SearchRequest = { playerNames: [], playerCounts: [], structureConditions: [], researchConditions: [] }
    await searchGames(req)

    expect(findMany).toHaveBeenCalledTimes(1)
    const { where } = findMany.mock.calls[0][0]
    expect(where.AND).toEqual(expect.arrayContaining([{ isLostFleet: false }]))
  })
})

describe('getAnalytics — Lost Fleet exclusion', () => {
  beforeEach(() => {
    findMany.mockReset()
    findMany.mockResolvedValue([])
  })

  it('always excludes isLostFleet games from analytics aggregates', async () => {
    const req: SearchRequest = { playerNames: [], playerCounts: [], structureConditions: [], researchConditions: [] }
    await getAnalytics(req)

    const { where } = findMany.mock.calls[0][0]
    expect(where.AND).toEqual(expect.arrayContaining([{ isLostFleet: false }]))
  })
})
