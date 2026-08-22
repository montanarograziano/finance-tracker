import { fromCents, toCents } from '../lib/money'
import type { RecurringFrequency, Transaction } from '../lib/types'
import { completeMonthsInRange, monthOf } from './aggregations'
import { isoDate, lastDayOfMonth, type DateRange } from './filters'
import { getOccurrenceDates, monthlyEquivalent } from './recurring'

export interface ScenarioRecurringItem {
  kind: 'recurring'
  type: 'expense' | 'income'
  amount: number
  description: string
  frequency: RecurringFrequency
  day_of_month: number
  month_of_year: number | null
  start_date: string
  end_date: string | null
}

export interface ScenarioOneOffItem {
  kind: 'oneoff'
  type: 'expense' | 'income'
  amount: number
  description: string
  date: string
}

export interface ScenarioCategoryAdjustment {
  kind: 'adjust'
  category_id: string
  description: string
  percent: number
}

export type ScenarioItem = ScenarioRecurringItem | ScenarioOneOffItem | ScenarioCategoryAdjustment

export interface SimulationPoint {
  month: string
  baseline: number
  simulated: number
  isProjection: boolean
}

export interface SimulationOptions {
  horizonMonths: number
  today: Date
  /** Average monthly savings used to extend the baseline; null disables the projection. */
  avgMonthlySavings: number | null
  /** Historical average monthly spend per category, for future adjustment deltas. */
  categoryMonthlyAvg: Map<string, number>
}

/** Range covering the `n` complete months before the month of `today`. */
export function lastCompleteMonthsRange(today: Date, n: number): DateRange {
  const y = today.getFullYear()
  const m = today.getMonth()
  return { from: isoDate(new Date(y, m - n, 1)), to: isoDate(new Date(y, m, 0)) }
}

/** Average monthly expense per category over the complete months in `range` (empty months count). */
export function categoryMonthlyAverages(
  txs: Transaction[],
  range: DateRange,
  today: Date,
): Map<string, number> {
  const months = completeMonthsInRange(range, today)
  if (months.length === 0) return new Map()
  const monthSet = new Set(months)
  const totals = new Map<string, number>()
  for (const t of txs) {
    if (t.type !== 'expense' || !t.category_id) continue
    if (!monthSet.has(monthOf(t.date))) continue
    totals.set(t.category_id, (totals.get(t.category_id) ?? 0) + toCents(t.amount))
  }
  return new Map(
    [...totals].map(([id, cents]) => [id, fromCents(Math.round(cents / months.length))]),
  )
}

/** Average monthly cost of the scenario in € (positive = costs money). One-offs excluded. */
export function scenarioMonthlyCost(
  items: ScenarioItem[],
  categoryMonthlyAvg: Map<string, number>,
): number {
  let cents = 0
  for (const item of items) {
    if (item.kind === 'recurring') {
      cents += (item.type === 'expense' ? 1 : -1) * toCents(monthlyEquivalent(item))
    } else if (item.kind === 'adjust') {
      const avg = toCents(categoryMonthlyAvg.get(item.category_id) ?? 0)
      cents += Math.round((avg * item.percent) / 100)
    }
  }
  return fromCents(cents)
}

function categorySpendCentsByMonth(txs: Transaction[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of txs) {
    if (t.type !== 'expense' || !t.category_id) continue
    const key = `${monthOf(t.date)}|${t.category_id}`
    map.set(key, (map.get(key) ?? 0) + toCents(t.amount))
  }
  return map
}

function nextMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

/** Net effect of the scenario on `month`, in cents (negative = money out). */
function monthDeltaCents(
  items: ScenarioItem[],
  month: string,
  isFuture: boolean,
  spendByMonth: Map<string, number>,
  categoryMonthlyAvg: Map<string, number>,
): number {
  let cents = 0
  for (const item of items) {
    if (item.kind === 'recurring') {
      // getOccurrenceDates is exclusive of `from`: back off 1ms to include the 1st.
      const from = new Date(new Date(`${month}-01T00:00:00`).getTime() - 1)
      const to = new Date(`${lastDayOfMonth(month)}T00:00:00`)
      const occurrences = getOccurrenceDates(item, from, to).length
      cents += (item.type === 'expense' ? -1 : 1) * occurrences * toCents(item.amount)
    } else if (item.kind === 'oneoff') {
      if (monthOf(item.date) === month) {
        cents += (item.type === 'expense' ? -1 : 1) * toCents(item.amount)
      }
    } else {
      const base = isFuture
        ? toCents(categoryMonthlyAvg.get(item.category_id) ?? 0)
        : (spendByMonth.get(`${month}|${item.category_id}`) ?? 0)
      cents -= Math.round((base * item.percent) / 100)
    }
  }
  return cents
}

/**
 * Replays the scenario on top of the real net worth series. Past months carry the
 * cumulative scenario delta. Future months extend the baseline at `avgMonthlySavings` per month;
 * existing recurring rules are already part of that average and are not re-applied.
 */
export function simulateNetWorth(
  baseline: { month: string; value: number }[],
  txs: Transaction[],
  items: ScenarioItem[],
  options: SimulationOptions,
): SimulationPoint[] {
  if (baseline.length === 0) return []
  const spendByMonth = categorySpendCentsByMonth(txs)
  const points: SimulationPoint[] = []
  let cumulativeCents = 0

  for (const { month, value } of baseline) {
    cumulativeCents += monthDeltaCents(
      items,
      month,
      false,
      spendByMonth,
      options.categoryMonthlyAvg,
    )
    points.push({
      month,
      baseline: value,
      simulated: fromCents(toCents(value) + cumulativeCents),
      isProjection: false,
    })
  }

  if (options.horizonMonths > 0 && options.avgMonthlySavings !== null) {
    let baselineCents = toCents(baseline[baseline.length - 1].value)
    let month = baseline[baseline.length - 1].month
    for (let i = 0; i < options.horizonMonths; i++) {
      month = nextMonth(month)
      baselineCents += toCents(options.avgMonthlySavings)
      cumulativeCents += monthDeltaCents(
        items,
        month,
        true,
        spendByMonth,
        options.categoryMonthlyAvg,
      )
      points.push({
        month,
        baseline: fromCents(baselineCents),
        simulated: fromCents(baselineCents + cumulativeCents),
        isProjection: true,
      })
    }
  }

  return points
}
