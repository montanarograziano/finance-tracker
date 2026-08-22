import { describe, expect, it } from 'vitest'
import type { Transaction } from '../lib/types'
import {
  completeMonthsInRange,
  expensesByCategory,
  incomeVsExpenseByMonth,
  monthlyAverages,
  monthOf,
  monthsBetween,
  runningExpenseTotals,
} from './aggregations'

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
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

describe('monthOf / monthsBetween', () => {
  it('extracts the month and enumerates inclusive ranges across years', () => {
    expect(monthOf('2026-06-15')).toBe('2026-06')
    expect(monthsBetween('2025-11', '2026-02')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ])
    expect(monthsBetween('2026-06', '2026-06')).toEqual(['2026-06'])
  })
})

describe('expensesByCategory', () => {
  it('totals expenses per category, sorted desc, ignoring income and transfers', () => {
    const txs = [
      tx({ category_id: 'food', amount: 30 }),
      tx({ category_id: 'food', amount: 20 }),
      tx({ category_id: 'home', amount: 40 }),
      tx({ type: 'income', category_id: 'salary', amount: 1000 }),
      tx({ type: 'transfer', category_id: null, transfer_to_account_id: 'a2', amount: 500 }),
    ]
    expect(expensesByCategory(txs)).toEqual([
      { categoryId: 'food', total: 50 },
      { categoryId: 'home', total: 40 },
    ])
  })

  it('groups null categories under uncategorized', () => {
    const txs = [tx({ category_id: null, amount: 5 })]
    expect(expensesByCategory(txs)).toEqual([{ categoryId: 'uncategorized', total: 5 }])
  })
})

describe('incomeVsExpenseByMonth', () => {
  it('summarizes per month ascending, excluding transfers', () => {
    const txs = [
      tx({ date: '2026-06-10', type: 'expense', amount: 100 }),
      tx({ date: '2026-06-27', type: 'income', amount: 1500, category_id: 'salary' }),
      tx({ date: '2026-05-05', type: 'expense', amount: 50 }),
      tx({
        date: '2026-06-01',
        type: 'transfer',
        category_id: null,
        transfer_to_account_id: 'a2',
        amount: 999,
      }),
    ]
    expect(incomeVsExpenseByMonth(txs)).toEqual([
      { month: '2026-05', income: 0, expense: 50 },
      { month: '2026-06', income: 1500, expense: 100 },
    ])
  })
})

describe('runningExpenseTotals', () => {
  it('accumulates expenses from oldest to newest on a newest-first list', () => {
    const txs = [
      tx({ date: '2026-06-20', amount: 5 }),
      tx({ date: '2026-06-15', type: 'income', amount: 1000, category_id: 'salary' }),
      tx({ date: '2026-06-10', amount: 0.1 }),
      tx({ date: '2026-06-05', amount: 0.2 }),
    ]
    expect(runningExpenseTotals(txs)).toEqual([5.3, 0.3, 0.3, 0.2])
  })

  it('ignores transfers and handles empty lists', () => {
    expect(runningExpenseTotals([])).toEqual([])
    const txs = [
      tx({ date: '2026-06-10', amount: 7 }),
      tx({
        date: '2026-06-05',
        type: 'transfer',
        category_id: null,
        transfer_to_account_id: 'a2',
        amount: 500,
      }),
    ]
    expect(runningExpenseTotals(txs)).toEqual([7, 0])
  })
})

describe('completeMonthsInRange', () => {
  const today = new Date(2026, 6, 7) // 2026-07-07

  it('keeps only months fully covered by the range and fully in the past', () => {
    expect(completeMonthsInRange({ from: '2026-04-15', to: '2026-07-31' }, today)).toEqual([
      '2026-05',
      '2026-06',
    ])
  })

  it('includes the month ending yesterday when today is the 1st', () => {
    expect(
      completeMonthsInRange({ from: '2026-05-01', to: '2026-06-30' }, new Date(2026, 6, 1)),
    ).toEqual(['2026-05', '2026-06'])
  })
})

describe('monthlyAverages', () => {
  const today = new Date(2026, 6, 7) // 2026-07-07

  it('averages complete months, excluding the in-progress month', () => {
    const txs = [
      tx({ date: '2026-05-10', type: 'income', amount: 2000, category_id: 'salary' }),
      tx({ date: '2026-05-20', amount: 500 }),
      tx({ date: '2026-06-10', type: 'income', amount: 1000, category_id: 'salary' }),
      tx({ date: '2026-06-20', amount: 300 }),
      tx({ date: '2026-07-01', amount: 999 }), // current month: ignored
    ]
    expect(monthlyAverages(txs, { from: '2026-05-01', to: '2026-07-31' }, today)).toEqual({
      avgIncome: 1500,
      avgExpense: 400,
      avgSavings: 1100,
      monthsCounted: 2,
      fromMonth: '2026-05',
      toMonth: '2026-06',
    })
  })

  it('counts months without transactions in the denominator', () => {
    const txs = [tx({ date: '2026-05-10', amount: 400 })]
    const result = monthlyAverages(txs, { from: '2026-03-01', to: '2026-06-30' }, today)
    expect(result?.monthsCounted).toBe(4)
    expect(result?.avgExpense).toBe(100)
  })

  it('returns null with fewer than 2 complete months', () => {
    expect(monthlyAverages([], { from: '2026-06-01', to: '2026-07-31' }, today)).toBeNull()
    expect(monthlyAverages([], { from: '2026-07-01', to: '2026-07-31' }, today)).toBeNull()
  })

  it('averages in cents without float drift', () => {
    const txs = [tx({ date: '2026-05-10', amount: 0.1 }), tx({ date: '2026-06-10', amount: 0.2 })]
    const result = monthlyAverages(txs, { from: '2026-05-01', to: '2026-06-30' }, today)
    expect(result?.avgExpense).toBe(0.15)
    expect(result?.avgSavings).toBe(-0.15)
  })
})
