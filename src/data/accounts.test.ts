import { describe, expect, it, vi } from 'vitest'

// vi.mock is hoisted above imports and consts: hoist the spy too
const { order } = vi.hoisted(() => ({ order: vi.fn() }))
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn(() => ({ order })) })),
  },
}))

import { listAccounts } from './accounts'

describe('listAccounts', () => {
  it('returns rows on success', async () => {
    const rows = [{ id: 'a1', name: 'Conto' }]
    order.mockResolvedValueOnce({ data: rows, error: null })
    await expect(listAccounts()).resolves.toEqual(rows)
  })

  it('throws the Supabase error message', async () => {
    order.mockResolvedValueOnce({ data: null, error: { message: 'permission denied' } })
    await expect(listAccounts()).rejects.toThrow('permission denied')
  })
})
