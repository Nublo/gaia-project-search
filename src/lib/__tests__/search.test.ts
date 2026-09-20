import { describe, it, expect, vi, beforeEach } from 'vitest'

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }))

vi.mock('../db', () => ({
  prisma: {
    game: { findMany },
  },
}))

import { searchGames, getAnalytics } from '../search'
import type { SearchRequest } from '@/types/game'

const BASE_REQ: SearchRequest = { playerNames: [], playerCounts: [], structureConditions: [], researchConditions: [] }

describe('searchGames — Lost Fleet / base-game partition', () => {
  beforeEach(() => {
    findMany.mockReset()
    findMany.mockResolvedValue([])
  })

  it('defaults to base games (isLostFleet: false) when isLostFleet is omitted', async () => {
    await searchGames(BASE_REQ)

    expect(findMany).toHaveBeenCalledTimes(1)
    const { where } = findMany.mock.calls[0][0]
    expect(where.AND).toEqual(expect.arrayContaining([{ isLostFleet: false }]))
  })

  it('searches only Lost Fleet games when isLostFleet: true', async () => {
    await searchGames({ ...BASE_REQ, isLostFleet: true })

    const { where } = findMany.mock.calls[0][0]
    expect(where.AND).toEqual(expect.arrayContaining([{ isLostFleet: true }]))
    expect(where.AND).not.toEqual(expect.arrayContaining([{ isLostFleet: false }]))
  })

  it('searches only base games when isLostFleet: false', async () => {
    await searchGames({ ...BASE_REQ, isLostFleet: false })

    const { where } = findMany.mock.calls[0][0]
    expect(where.AND).toEqual(expect.arrayContaining([{ isLostFleet: false }]))
  })
})

describe('getAnalytics — Lost Fleet / base-game partition', () => {
  beforeEach(() => {
    findMany.mockReset()
    findMany.mockResolvedValue([])
  })

  it('defaults to base games (isLostFleet: false) when isLostFleet is omitted', async () => {
    await getAnalytics(BASE_REQ)

    const { where } = findMany.mock.calls[0][0]
    expect(where.AND).toEqual(expect.arrayContaining([{ isLostFleet: false }]))
  })

  it('aggregates only Lost Fleet games when isLostFleet: true', async () => {
    await getAnalytics({ ...BASE_REQ, isLostFleet: true })

    const { where } = findMany.mock.calls[0][0]
    expect(where.AND).toEqual(expect.arrayContaining([{ isLostFleet: true }]))
    expect(where.AND).not.toEqual(expect.arrayContaining([{ isLostFleet: false }]))
  })
})
