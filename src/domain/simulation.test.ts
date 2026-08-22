import { describe, expect, it } from 'vitest'
import type { Transaction } from '../lib/types'
import {
  categoryMonthlyAverages,
  lastCompleteMonthsRange,
  scenarioMonthlyCost,
  simulateNetWorth,
  type ScenarioItem,
} from './simulation'

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    user_id: 'u1',
    account_id: 'a1',
    category_id: 'food',
    type: 'expense',
    amount: 10,
    date: '2026-05-15',
    description: '',
    notes: null,
    tags: [],
    transfer_to_account_id: null,
    recurring_rule_id: null,
    created_at: '2026-05-15T00:00:00Z',
    ...overrides,
  }
}

const today = new Date(2026, 6, 7) // 2026-07-07
const baseline = [
  { month: '2026-04', value: 10000 },
  { month: '2026-05', value: 10500 },
  { month: '2026-06', value: 11000 },
  { month: '2026-07', value: 11200 },
]
const noProjection = {
  horizonMonths: 0,
  today,
  avgMonthlySavings: null,
  categoryMonthlyAvg: new Map<string, number>(),
}

const mortgage: ScenarioItem = {
  kind: 'recurring',
  type: 'expense',
  amount: 800,
  description: 'Mutuo',
  frequency: 'monthly',
  day_of_month: 1,
  month_of_year: null,
  start_date: '2026-05-01',
  end_date: null,
}

describe('simulateNetWorth — past replay', () => {
  it('applies recurring occurrences cumulatively from their start date', () => {
    const points = simulateNetWorth(baseline, [], [mortgage], noProjection)
    expect(points).toEqual([
      { month: '2026-04', baseline: 10000, simulated: 10000, isProjection: false },
      { month: '2026-05', baseline: 10500, simulated: 9700, isProjection: false },
      { month: '2026-06', baseline: 11000, simulated: 9400, isProjection: false },
      { month: '2026-07', baseline: 11200, simulated: 8800, isProjection: false },
    ])
  })

  it('buckets one-offs into the right month at boundaries', () => {
    const items: ScenarioItem[] = [
      { kind: 'oneoff', type: 'expense', amount: 100, description: 'a', date: '2026-05-31' },
      { kind: 'oneoff', type: 'expense', amount: 100, description: 'b', date: '2026-06-01' },
    ]
    const points = simulateNetWorth(baseline, [], items, noProjection)
    expect(points.map((p) => p.simulated)).toEqual([10000, 10400, 10800, 11000])
  })

  it('income items increase the simulated value', () => {
    const items: ScenarioItem[] = [
      { kind: 'oneoff', type: 'income', amount: 500, description: 'bonus', date: '2026-06-10' },
    ]
    const points = simulateNetWorth(baseline, [], items, noProjection)
    expect(points.map((p) => p.simulated)).toEqual([10000, 10500, 11500, 11700])
  })

  it('scales actual category spend for past adjustments', () => {
    const txs = [tx({ date: '2026-05-10', amount: 250 }), tx({ date: '2026-05-20', amount: 150 })]
    const items: ScenarioItem[] = [
      { kind: 'adjust', category_id: 'food', description: 'Cibo +10%', percent: 10 },
    ]
    const points = simulateNetWorth(baseline, txs, items, noProjection)
    // May spend 400 × 10% = 40 extra, carried forward
    expect(points.map((p) => p.simulated)).toEqual([10000, 10460, 10960, 11160])
  })

  it('negative adjustment percent saves money', () => {
    const txs = [tx({ date: '2026-05-10', amount: 400 })]
    const items: ScenarioItem[] = [
      { kind: 'adjust', category_id: 'food', description: 'Cibo -50%', percent: -50 },
    ]
    const points = simulateNetWorth(baseline, txs, items, noProjection)
    expect(points[1].simulated).toBe(10700)
  })

  it('returns [] for an empty baseline and plain baseline for an empty scenario', () => {
    expect(simulateNetWorth([], [], [mortgage], noProjection)).toEqual([])
    const points = simulateNetWorth(baseline, [], [], noProjection)
    expect(points.map((p) => p.simulated)).toEqual([10000, 10500, 11000, 11200])
  })
})

describe('lastCompleteMonthsRange', () => {
  it('covers the n months before the current month', () => {
    expect(lastCompleteMonthsRange(today, 12)).toEqual({ from: '2025-07-01', to: '2026-06-30' })
  })
})

describe('categoryMonthlyAverages', () => {
  it('averages spend over the window months, counting empty months', () => {
    const txs = [
      tx({ date: '2026-05-10', amount: 300 }),
      tx({ date: '2026-06-10', amount: 300 }),
      tx({ date: '2026-06-11', amount: 120, category_id: 'transport' }),
      tx({ date: '2026-06-12', type: 'income', amount: 999, category_id: 'salary' }),
    ]
    const avgs = categoryMonthlyAverages(txs, lastCompleteMonthsRange(today, 12), today)
    expect(avgs.get('food')).toBe(50) // 600 / 12
    expect(avgs.get('transport')).toBe(10) // 120 / 12
    expect(avgs.has('salary')).toBe(false)
  })
})

describe('scenarioMonthlyCost', () => {
  it('sums monthly equivalents and adjustment costs, ignoring one-offs', () => {
    const items: ScenarioItem[] = [
      mortgage, // 800/month
      {
        kind: 'recurring',
        type: 'expense',
        amount: 1200,
        description: 'Assicurazione',
        frequency: 'yearly',
        day_of_month: 1,
        month_of_year: 1,
        start_date: '2026-01-01',
        end_date: null,
      }, // 100/month
      {
        kind: 'recurring',
        type: 'income',
        amount: 50,
        description: 'Affitto box',
        frequency: 'monthly',
        day_of_month: 1,
        month_of_year: null,
        start_date: '2026-01-01',
        end_date: null,
      }, // -50/month
      { kind: 'adjust', category_id: 'food', description: 'Cibo +10%', percent: 10 }, // +30
      { kind: 'oneoff', type: 'expense', amount: 9999, description: 'ignored', date: '2026-01-01' },
    ]
    expect(scenarioMonthlyCost(items, new Map([['food', 300]]))).toBe(880)
  })
})

describe('simulateNetWorth — future projection', () => {
  it('extends the baseline by avg savings and keeps accumulating scenario deltas', () => {
    const points = simulateNetWorth(baseline, [], [mortgage], {
      horizonMonths: 2,
      today,
      avgMonthlySavings: 500,
      categoryMonthlyAvg: new Map(),
    })
    expect(points).toHaveLength(6)
    expect(points[4]).toEqual({
      month: '2026-08',
      baseline: 11700,
      simulated: 8500, // 11700 − (2400 past + 800)
      isProjection: true,
    })
    expect(points[5]).toEqual({
      month: '2026-09',
      baseline: 12200,
      simulated: 8200,
      isProjection: true,
    })
  })

  it('crosses year boundaries', () => {
    const points = simulateNetWorth([{ month: '2026-12', value: 1000 }], [], [], {
      horizonMonths: 1,
      today,
      avgMonthlySavings: 100,
      categoryMonthlyAvg: new Map(),
    })
    expect(points[1].month).toBe('2027-01')
    expect(points[1].baseline).toBe(1100)
  })

  it('uses category monthly averages for future adjustment deltas', () => {
    const items: ScenarioItem[] = [
      { kind: 'adjust', category_id: 'food', description: 'Cibo +10%', percent: 10 },
    ]
    const points = simulateNetWorth(baseline, [], items, {
      horizonMonths: 2,
      today,
      avgMonthlySavings: 0,
      categoryMonthlyAvg: new Map([['food', 300]]),
    })
    // no past food spend → past deltas 0; future: −30/month cumulative
    expect(points[4].simulated).toBe(11170)
    expect(points[5].simulated).toBe(11140)
  })

  it('skips the projection when avgMonthlySavings is null', () => {
    const points = simulateNetWorth(baseline, [], [mortgage], {
      horizonMonths: 12,
      today,
      avgMonthlySavings: null,
      categoryMonthlyAvg: new Map(),
    })
    expect(points).toHaveLength(4)
    expect(points.every((p) => !p.isProjection)).toBe(true)
  })
})
