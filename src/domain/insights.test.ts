import { describe, expect, it } from 'vitest'
import type { Transaction } from '../lib/types'
import { computeInsights, monthsWithExpenses } from './insights'

let seq = 0
function tx(partial: Partial<Transaction> & { date: string; amount: number }): Transaction {
  seq += 1
  return {
    id: `t${seq}`,
    user_id: 'u1',
    account_id: 'a1',
    category_id: 'food',
    type: 'expense',
    description: 'test',
    notes: null,
    tags: [],
    transfer_to_account_id: null,
    recurring_rule_id: null,
    created_at: '2026-01-01T00:00:00Z',
    ...partial,
  }
}

describe('monthsWithExpenses', () => {
  it('returns distinct expense months ascending, ignoring income and transfers', () => {
    const txs = [
      tx({ date: '2026-03-10', amount: 50 }),
      tx({ date: '2026-01-05', amount: 20 }),
      tx({ date: '2026-01-20', amount: 30 }),
      tx({ date: '2026-02-01', amount: 900, type: 'income' }),
      tx({ date: '2026-04-01', amount: 100, type: 'transfer' }),
    ]
    expect(monthsWithExpenses(txs)).toEqual(['2026-01', '2026-03'])
  })
})

describe('computeInsights', () => {
  it('returns null when there is no data before the anchor month', () => {
    const txs = [tx({ date: '2026-06-10', amount: 50 })]
    expect(computeInsights(txs, '2026-06')).toBeNull()
    expect(computeInsights([], '2026-06')).toBeNull()
  })

  it('computes category deltas vs previous month and baseline average', () => {
    const txs = [
      // food: mar 100, apr 100, may 100, jun 160
      tx({ date: '2026-03-05', amount: 100 }),
      tx({ date: '2026-04-05', amount: 100 }),
      tx({ date: '2026-05-05', amount: 100 }),
      tx({ date: '2026-06-05', amount: 160 }),
    ]
    const result = computeInsights(txs, '2026-06')
    expect(result).not.toBeNull()
    const food = result!.deltas.find((d) => d.categoryId === 'food')!
    expect(food.current).toBe(160)
    expect(food.previous).toBe(100)
    expect(food.baselineAvg).toBe(100)
    expect(food.deltaPrev).toBe(60)
    expect(food.deltaAvg).toBe(60)
    expect(food.pctPrev).toBeCloseTo(0.6)
    expect(food.pctAvg).toBeCloseTo(0.6)
  })

  it('sorts deltas by absolute deltaPrev descending', () => {
    const txs = [
      tx({ date: '2026-05-01', amount: 100, category_id: 'food' }),
      tx({ date: '2026-06-01', amount: 110, category_id: 'food' }), // |Δ| 10
      tx({ date: '2026-05-01', amount: 100, category_id: 'car' }),
      tx({ date: '2026-06-01', amount: 30, category_id: 'car' }), // |Δ| 70
    ]
    const result = computeInsights(txs, '2026-06')!
    expect(result.deltas.map((d) => d.categoryId)).toEqual(['car', 'food'])
  })

  it('excludes categories entirely below the noise floor', () => {
    const txs = [
      tx({ date: '2026-05-01', amount: 5, category_id: 'gum' }),
      tx({ date: '2026-06-01', amount: 12, category_id: 'gum' }),
      tx({ date: '2026-05-01', amount: 100, category_id: 'food' }),
      tx({ date: '2026-06-01', amount: 100, category_id: 'food' }),
    ]
    const result = computeInsights(txs, '2026-06')!
    expect(result.deltas.find((d) => d.categoryId === 'gum')).toBeUndefined()
    expect(result.deltas.find((d) => d.categoryId === 'food')).toBeDefined()
  })

  it('reports pctPrev null for resumed spending (previous 0, baseline > 0) and keeps it in deltas', () => {
    const txs = [
      // subs: mar 90, apr 90, may 0, jun 90 → in deltas, pctPrev null
      tx({ date: '2026-03-01', amount: 90, category_id: 'subs' }),
      tx({ date: '2026-04-01', amount: 90, category_id: 'subs' }),
      tx({ date: '2026-06-01', amount: 90, category_id: 'subs' }),
      // keep another category so months exist
      tx({ date: '2026-05-01', amount: 50, category_id: 'food' }),
    ]
    const result = computeInsights(txs, '2026-06')!
    const subs = result.deltas.find((d) => d.categoryId === 'subs')!
    expect(subs.pctPrev).toBeNull()
    expect(subs.deltaPrev).toBe(90)
    expect(result.newCategories.find((n) => n.categoryId === 'subs')).toBeUndefined()
  })

  it('detects new categories (zero in every baseline month) and keeps them out of deltas', () => {
    const txs = [
      tx({ date: '2026-05-01', amount: 100, category_id: 'food' }),
      tx({ date: '2026-06-01', amount: 100, category_id: 'food' }),
      tx({ date: '2026-06-15', amount: 45, category_id: 'subs' }),
    ]
    const result = computeInsights(txs, '2026-06')!
    expect(result.newCategories).toEqual([{ categoryId: 'subs', total: 45 }])
    expect(result.deltas.find((d) => d.categoryId === 'subs')).toBeUndefined()
  })

  it('ignores new spending below the noise floor', () => {
    const txs = [
      tx({ date: '2026-05-01', amount: 100, category_id: 'food' }),
      tx({ date: '2026-06-15', amount: 10, category_id: 'subs' }),
    ]
    const result = computeInsights(txs, '2026-06')!
    expect(result.newCategories).toEqual([])
  })

  it('detects vanished categories and keeps them out of deltas', () => {
    const txs = [
      tx({ date: '2026-03-01', amount: 60, category_id: 'taxi' }),
      tx({ date: '2026-04-01', amount: 60, category_id: 'taxi' }),
      tx({ date: '2026-05-01', amount: 60, category_id: 'taxi' }),
      tx({ date: '2026-06-01', amount: 100, category_id: 'food' }),
      tx({ date: '2026-05-02', amount: 100, category_id: 'food' }),
    ]
    const result = computeInsights(txs, '2026-06')!
    expect(result.vanishedCategories).toEqual([{ categoryId: 'taxi', baselineAvg: 60 }])
    expect(result.deltas.find((d) => d.categoryId === 'taxi')).toBeUndefined()
  })

  it('clamps the baseline to the first month with any data', () => {
    const txs = [tx({ date: '2026-05-10', amount: 80 }), tx({ date: '2026-06-10', amount: 120 })]
    const result = computeInsights(txs, '2026-06')!
    expect(result.monthsAnalyzed).toBe(1)
    expect(result.baselineFrom).toBe('2026-05')
    const food = result.deltas.find((d) => d.categoryId === 'food')!
    expect(food.baselineAvg).toBe(80)
  })

  it('counts zero-spend months inside the clamped baseline as zero', () => {
    const txs = [
      tx({ date: '2026-03-10', amount: 90 }),
      // april, may: nothing at all
      tx({ date: '2026-06-10', amount: 90 }),
    ]
    const result = computeInsights(txs, '2026-06')!
    expect(result.monthsAnalyzed).toBe(3)
    const food = result.deltas.find((d) => d.categoryId === 'food')!
    expect(food.baselineAvg).toBe(30) // 90/3
    expect(food.previous).toBe(0)
    expect(food.pctPrev).toBeNull()
  })

  it('computes totals including income and savings', () => {
    const txs = [
      tx({ date: '2026-05-01', amount: 400 }),
      tx({ date: '2026-05-02', amount: 2000, type: 'income', category_id: null }),
      tx({ date: '2026-06-01', amount: 500 }),
      tx({ date: '2026-06-02', amount: 2100, type: 'income', category_id: null }),
      tx({ date: '2026-06-03', amount: 999, type: 'transfer', category_id: null }),
    ]
    const result = computeInsights(txs, '2026-06')!
    expect(result.totals.current).toBe(500)
    expect(result.totals.previous).toBe(400)
    expect(result.totals.incomeCurrent).toBe(2100)
    expect(result.totals.incomePrevious).toBe(2000)
    expect(result.totals.savingsCurrent).toBe(1600)
    expect(result.totals.savingsPrevious).toBe(1600)
  })

  it('groups uncategorized expenses under the uncategorized pseudo-id', () => {
    const txs = [
      tx({ date: '2026-05-01', amount: 50, category_id: null }),
      tx({ date: '2026-06-01', amount: 90, category_id: null }),
    ]
    const result = computeInsights(txs, '2026-06')!
    const unc = result.deltas.find((d) => d.categoryId === 'uncategorized')!
    expect(unc.deltaPrev).toBe(40)
  })

  it('detects a rising streak of at least 3 months', () => {
    const txs = [
      tx({ date: '2026-03-01', amount: 50 }),
      tx({ date: '2026-04-01', amount: 60 }),
      tx({ date: '2026-05-01', amount: 70 }),
      tx({ date: '2026-06-01', amount: 80 }),
    ]
    const result = computeInsights(txs, '2026-06')!
    expect(result.streaks).toEqual([{ categoryId: 'food', direction: 'rising', months: 4 }])
  })

  it('detects a falling streak, allowing it to end at zero', () => {
    const txs = [
      tx({ date: '2026-03-01', amount: 80, category_id: 'taxi' }),
      tx({ date: '2026-04-01', amount: 40, category_id: 'taxi' }),
      tx({ date: '2026-05-01', amount: 10, category_id: 'taxi' }),
      // june: zero
      tx({ date: '2026-06-01', amount: 100, category_id: 'food' }),
      tx({ date: '2026-05-02', amount: 100, category_id: 'food' }),
    ]
    const result = computeInsights(txs, '2026-06')!
    expect(result.streaks).toContainEqual({ categoryId: 'taxi', direction: 'falling', months: 4 })
  })

  it('breaks a streak on an equal month and requires minimum length 3', () => {
    const txs = [
      // food: 50, 50, 60, 70 → streak is only 60→70... plus the transition 50→60: 3 months (apr,may,jun)
      tx({ date: '2026-03-01', amount: 50 }),
      tx({ date: '2026-04-01', amount: 50 }),
      tx({ date: '2026-05-01', amount: 60 }),
      tx({ date: '2026-06-01', amount: 70 }),
      // car: 30 then 40 → only 2 months, no streak
      tx({ date: '2026-05-03', amount: 30, category_id: 'car' }),
      tx({ date: '2026-06-03', amount: 40, category_id: 'car' }),
    ]
    const result = computeInsights(txs, '2026-06')!
    expect(result.streaks).toContainEqual({ categoryId: 'food', direction: 'rising', months: 3 })
    expect(result.streaks.find((s) => s.categoryId === 'car')).toBeUndefined()
  })

  it('applies noise guards to streaks', () => {
    const txs = [
      // rising but anchor below floor: 2, 4, 8 → suppressed
      tx({ date: '2026-04-01', amount: 2, category_id: 'gum' }),
      tx({ date: '2026-05-01', amount: 4, category_id: 'gum' }),
      tx({ date: '2026-06-01', amount: 8, category_id: 'gum' }),
      // falling from below floor: 15, 10, 5 → suppressed (start < 20)
      tx({ date: '2026-04-02', amount: 15, category_id: 'candy' }),
      tx({ date: '2026-05-02', amount: 10, category_id: 'candy' }),
      tx({ date: '2026-06-02', amount: 5, category_id: 'candy' }),
    ]
    const result = computeInsights(txs, '2026-06')!
    expect(result.streaks).toEqual([])
  })

  it('truncates a rising streak at a zero month instead of discarding it', () => {
    const txs = [
      // unrelated category anchors history in january so march is a real zero month
      tx({ date: '2026-01-15', amount: 100, category_id: 'other' }),
      tx({ date: '2026-04-01', amount: 30 }),
      tx({ date: '2026-05-01', amount: 40 }),
      tx({ date: '2026-06-01', amount: 50 }),
    ]
    const result = computeInsights(txs, '2026-06')!
    expect(result.streaks).toContainEqual({ categoryId: 'food', direction: 'rising', months: 3 })
  })

  it('respects a custom baselineMonths option', () => {
    const txs = [
      tx({ date: '2026-01-01', amount: 10 }),
      tx({ date: '2026-02-01', amount: 20 }),
      tx({ date: '2026-03-01', amount: 30 }),
      tx({ date: '2026-04-01', amount: 40 }),
      tx({ date: '2026-05-01', amount: 50 }),
      tx({ date: '2026-06-01', amount: 60 }),
    ]
    const result = computeInsights(txs, '2026-06', { baselineMonths: 5 })!
    expect(result.monthsAnalyzed).toBe(5)
    expect(result.baselineFrom).toBe('2026-01')
    const food = result.deltas.find((d) => d.categoryId === 'food')!
    expect(food.baselineAvg).toBe(30) // (10+20+30+40+50)/5
  })
})
