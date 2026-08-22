import { fromCents, toCents } from '../lib/money'
import type { Transaction } from '../lib/types'
import { monthOf } from './aggregations'

export interface InsightsOptions {
  /** Complete months before the anchor averaged as baseline. */
  baselineMonths: number
  /** Months (including the anchor) scanned for trend streaks. */
  streakWindow: number
  /** Noise floor in EUR: smaller category movements are ignored. */
  minAmount: number
}

const DEFAULT_OPTIONS: InsightsOptions = {
  baselineMonths: 3,
  streakWindow: 12,
  minAmount: 20,
}

export interface CategoryDelta {
  categoryId: string
  current: number
  previous: number
  baselineAvg: number
  deltaPrev: number
  deltaAvg: number
  pctPrev: number | null
  pctAvg: number | null
}

export interface TrendStreak {
  categoryId: string
  direction: 'rising' | 'falling'
  months: number
}

export interface MonthlyInsights {
  anchorMonth: string
  baselineFrom: string
  monthsAnalyzed: number
  totals: {
    current: number
    previous: number
    baselineAvg: number
    incomeCurrent: number
    incomePrevious: number
    savingsCurrent: number
    savingsPrevious: number
  }
  deltas: CategoryDelta[]
  newCategories: { categoryId: string; total: number }[]
  vanishedCategories: { categoryId: string; baselineAvg: number }[]
  streaks: TrendStreak[]
}

/** Distinct 'YYYY-MM' months containing at least one expense, ascending. */
export function monthsWithExpenses(txs: Transaction[]): string[] {
  const months = new Set<string>()
  for (const t of txs) if (t.type === 'expense') months.add(monthOf(t.date))
  return [...months].sort()
}

function prevMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

/** The n months immediately before anchor, ascending. */
function monthsBack(anchor: string, n: number): string[] {
  const months: string[] = []
  let cur = anchor
  for (let i = 0; i < n; i++) {
    cur = prevMonth(cur)
    months.unshift(cur)
  }
  return months
}

export function computeInsights(
  txs: Transaction[],
  anchorMonth: string,
  options?: Partial<InsightsOptions>,
): MonthlyInsights | null {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  if (txs.length === 0) return null

  let firstMonth: string | null = null
  for (const t of txs) {
    const m = monthOf(t.date)
    if (firstMonth === null || m < firstMonth) firstMonth = m
  }

  const baseline = monthsBack(anchorMonth, opts.baselineMonths).filter((m) => m >= firstMonth!)
  if (baseline.length === 0) return null

  const windowMonths = [
    ...monthsBack(anchorMonth, Math.max(opts.streakWindow - 1, opts.baselineMonths)),
    anchorMonth,
  ]
  const windowSet = new Set(windowMonths)
  const previous = prevMonth(anchorMonth)

  // Per-month per-category expense totals in cents; income totals for anchor and previous.
  const byMonthCat = new Map<string, Map<string, number>>()
  let incomeCurrentCents = 0
  let incomePreviousCents = 0
  for (const t of txs) {
    const m = monthOf(t.date)
    if (t.type === 'income') {
      if (m === anchorMonth) incomeCurrentCents += toCents(t.amount)
      else if (m === previous) incomePreviousCents += toCents(t.amount)
      continue
    }
    if (t.type !== 'expense' || !windowSet.has(m)) continue
    const key = t.category_id ?? 'uncategorized'
    const catMap = byMonthCat.get(m) ?? new Map<string, number>()
    catMap.set(key, (catMap.get(key) ?? 0) + toCents(t.amount))
    byMonthCat.set(m, catMap)
  }

  const catCents = (month: string, cat: string): number => byMonthCat.get(month)?.get(cat) ?? 0
  const monthCents = (month: string): number => {
    let sum = 0
    for (const v of byMonthCat.get(month)?.values() ?? []) sum += v
    return sum
  }

  const minCents = toCents(opts.minAmount)

  const comparisonCats = new Set<string>()
  for (const m of [anchorMonth, ...baseline]) {
    for (const k of byMonthCat.get(m)?.keys() ?? []) comparisonCats.add(k)
  }

  const deltas: CategoryDelta[] = []
  const newCategories: { categoryId: string; total: number }[] = []
  const vanishedCategories: { categoryId: string; baselineAvg: number }[] = []

  for (const cat of comparisonCats) {
    const currentC = catCents(anchorMonth, cat)
    const previousC = catCents(previous, cat)
    const baselineSumC = baseline.reduce((acc, m) => acc + catCents(m, cat), 0)
    const baselineAvgC = Math.round(baselineSumC / baseline.length)

    if (currentC >= minCents && baselineSumC === 0) {
      newCategories.push({ categoryId: cat, total: fromCents(currentC) })
      continue
    }
    if (currentC === 0 && baselineAvgC >= minCents) {
      vanishedCategories.push({ categoryId: cat, baselineAvg: fromCents(baselineAvgC) })
      continue
    }
    if (Math.max(currentC, previousC, baselineAvgC) < minCents) continue

    const deltaPrevC = currentC - previousC
    const deltaAvgC = currentC - baselineAvgC
    deltas.push({
      categoryId: cat,
      current: fromCents(currentC),
      previous: fromCents(previousC),
      baselineAvg: fromCents(baselineAvgC),
      deltaPrev: fromCents(deltaPrevC),
      deltaAvg: fromCents(deltaAvgC),
      pctPrev: previousC === 0 ? null : deltaPrevC / previousC,
      pctAvg: baselineAvgC === 0 ? null : deltaAvgC / baselineAvgC,
    })
  }

  deltas.sort((a, b) => Math.abs(b.deltaPrev) - Math.abs(a.deltaPrev))
  newCategories.sort((a, b) => b.total - a.total)
  vanishedCategories.sort((a, b) => b.baselineAvg - a.baselineAvg)

  const streakMonths = windowMonths.slice(-opts.streakWindow).filter((m) => m >= firstMonth!)
  const streaks: TrendStreak[] = []
  if (streakMonths.length >= 3) {
    const streakCats = new Set<string>()
    for (const m of streakMonths) {
      for (const k of byMonthCat.get(m)?.keys() ?? []) streakCats.add(k)
    }
    for (const cat of streakCats) {
      const totals = streakMonths.map((m) => catCents(m, cat))
      let length = 1
      let direction: 'rising' | 'falling' | null = null
      for (let i = totals.length - 1; i > 0; i--) {
        const diff = totals[i] - totals[i - 1]
        if (diff === 0) break
        const dir = diff > 0 ? 'rising' : 'falling'
        if (direction === null) direction = dir
        else if (dir !== direction) break
        // A zero month is "no spending yet", not the first rung of a rising
        // trend: stop extending a rising streak across the zero boundary.
        if (dir === 'rising' && totals[i - 1] === 0) break
        length += 1
      }
      if (direction === null || length < 3) continue
      const anchorC = totals[totals.length - 1]
      const startC = totals[totals.length - length]
      if (direction === 'rising' && anchorC < minCents) continue
      if (direction === 'falling' && startC < minCents) continue
      streaks.push({ categoryId: cat, direction, months: length })
    }
    streaks.sort((a, b) => b.months - a.months)
  }

  const currentTotalC = monthCents(anchorMonth)
  const previousTotalC = monthCents(previous)
  const baselineTotalAvgC = Math.round(
    baseline.reduce((acc, m) => acc + monthCents(m), 0) / baseline.length,
  )

  return {
    anchorMonth,
    baselineFrom: baseline[0],
    monthsAnalyzed: baseline.length,
    totals: {
      current: fromCents(currentTotalC),
      previous: fromCents(previousTotalC),
      baselineAvg: fromCents(baselineTotalAvgC),
      incomeCurrent: fromCents(incomeCurrentCents),
      incomePrevious: fromCents(incomePreviousCents),
      savingsCurrent: fromCents(incomeCurrentCents - currentTotalC),
      savingsPrevious: fromCents(incomePreviousCents - previousTotalC),
    },
    deltas,
    newCategories,
    vanishedCategories,
    streaks,
  }
}
