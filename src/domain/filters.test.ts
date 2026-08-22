import { describe, expect, it } from 'vitest'
import type { Transaction } from '../lib/types'
import { filterTransactions, isoDate, rangeForPreset } from './filters'

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 't1',
    user_id: 'u1',
    account_id: 'a1',
    category_id: 'c1',
    type: 'expense',
    amount: 10,
    date: '2026-06-15',
    description: 'Spesa supermercato',
    notes: null,
    tags: [],
    transfer_to_account_id: null,
    recurring_rule_id: null,
    created_at: '2026-06-15T00:00:00Z',
    ...overrides,
  }
}

describe('rangeForPreset', () => {
  const today = new Date(2026, 6, 2) // 2026-07-02

  it('current-month spans the full month', () => {
    expect(rangeForPreset('current-month', today)).toEqual({ from: '2026-07-01', to: '2026-07-31' })
  })

  it('last-3-months starts on the first of two months ago', () => {
    expect(rangeForPreset('last-3-months', today)).toEqual({ from: '2026-05-01', to: '2026-07-31' })
  })

  it('last-3-months crosses year boundaries', () => {
    expect(rangeForPreset('last-3-months', new Date(2026, 0, 15))).toEqual({
      from: '2025-11-01',
      to: '2026-01-31',
    })
  })

  it('current-year spans the calendar year', () => {
    expect(rangeForPreset('current-year', today)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
  })
})

describe('isoDate', () => {
  it('zero-pads month and day', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('filterTransactions', () => {
  const txs = [
    tx({ id: 't1', date: '2026-06-15', account_id: 'a1' }),
    tx({
      id: 't2',
      date: '2026-07-01',
      account_id: 'a2',
      type: 'income',
      description: 'Stipendio',
    }),
    tx({
      id: 't3',
      date: '2026-07-02',
      account_id: 'a1',
      type: 'transfer',
      category_id: null,
      transfer_to_account_id: 'a2',
    }),
  ]

  it('filters by inclusive date range', () => {
    const result = filterTransactions(txs, { range: { from: '2026-07-01', to: '2026-07-31' } })
    expect(result.map((t) => t.id)).toEqual(['t2', 't3'])
  })

  it('matches account on either side of a transfer', () => {
    expect(filterTransactions(txs, { accountId: 'a2' }).map((t) => t.id)).toEqual(['t2', 't3'])
  })

  it('filters by type and case-insensitive search', () => {
    expect(filterTransactions(txs, { type: 'income' }).map((t) => t.id)).toEqual(['t2'])
    expect(filterTransactions(txs, { search: 'stipendio' }).map((t) => t.id)).toEqual(['t2'])
  })
})
