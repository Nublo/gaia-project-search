import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Prisma singleton so the storage helpers can be tested without a DB.
// vi.hoisted lets the mock factory (which is hoisted to the top) reference `upsert`.
const { upsert } = vi.hoisted(() => ({ upsert: vi.fn() }))

vi.mock('../db', () => ({
  prisma: {
    playerCollectionState: { upsert },
  },
}))

import { markPlayerReachedEnd } from '../game-storage'

describe('markPlayerReachedEnd', () => {
  beforeEach(() => {
    upsert.mockReset()
    upsert.mockResolvedValue({ playerId: 0, reachEnd: true })
  })

  it('upserts reachEnd=true with a collectionDate, keyed by playerId', async () => {
    await markPlayerReachedEnd(85051404)

    expect(upsert).toHaveBeenCalledTimes(1)
    expect(upsert).toHaveBeenCalledWith({
      where: { playerId: 85051404 },
      create: { playerId: 85051404, reachEnd: true, collectionDate: expect.any(Date) },
      update: { reachEnd: true, collectionDate: expect.any(Date) },
    })
  })

  it('always sets reachEnd to true (never false)', async () => {
    await markPlayerReachedEnd(123)

    const arg = upsert.mock.calls[0][0]
    expect(arg.create.reachEnd).toBe(true)
    expect(arg.update.reachEnd).toBe(true)
  })
})
