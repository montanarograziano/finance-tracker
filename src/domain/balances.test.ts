import { describe, expect, it } from 'vitest'
import type { Transaction } from '../lib/types'
import { signedAmount } from './balances'

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 't1',
    user_id: 'u1',
    account_id: 'a1',
    category_id: 'c1',
    type: 'expense',
    amount: 10,
    date: '2026-06-15',
    description: '',
    notes: null,
    tags: [],
    transfer_to_account_id: null,
    recurring_rule_id: null,
    created_at: '2026-06-15T00:00:00Z',
    ...overrides,
  }
}

describe('signedAmount', () => {
  it('is negative for expenses on the account, zero elsewhere', () => {
    const t = tx({ type: 'expense', amount: 25.5 })
    expect(signedAmount('a1', t)).toBe(-25.5)
    expect(signedAmount('a2', t)).toBe(0)
  })

  it('is positive for income on the account', () => {
    expect(signedAmount('a1', tx({ type: 'income', amount: 1500 }))).toBe(1500)
  })

  it('moves money from source to destination for transfers', () => {
    const t = tx({ type: 'transfer', amount: 200, category_id: null, transfer_to_account_id: 'a2' })
    expect(signedAmount('a1', t)).toBe(-200)
    expect(signedAmount('a2', t)).toBe(200)
    expect(signedAmount('a3', t)).toBe(0)
  })
})
