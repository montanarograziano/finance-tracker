import { fromCents, sumAmounts, toCents } from '../lib/money'
import type { Transaction } from '../lib/types'
import { isoDate, lastDayOfMonth, type DateRange } from './filters'

export function monthOf(dateIso: string): string {
  return dateIso.slice(0, 7)
}

export interface CategoryTotal {
  categoryId: string
  total: number
}

export function expensesByCategory(txs: Transaction[]): CategoryTotal[] {
  const byCategory = new Map<string, number[]>()
  for (const tx of txs) {
    if (tx.type !== 'expense') continue
    const key = tx.category_id ?? 'uncategorized'
    const list = byCategory.get(key) ?? []
    list.push(tx.amount)
    byCategory.set(key, list)
  }
  return [...byCategory.entries()]
    .map(([categoryId, amounts]) => ({ categoryId, total: sumAmounts(amounts) }))
    .sort((a, b) => b.total - a.total)
}

/**
 * Running expense totals for a list displayed newest-first: result[i] is the sum
 * of all expense amounts from the oldest item up to and including item i, so the
 * newest row carries the grand total of the list. Income and transfer rows keep
 * the running value unchanged.
 */
export function runningExpenseTotals(txs: Transaction[]): number[] {
  const totals = new Array<number>(txs.length)
  let cents = 0
  for (let i = txs.length - 1; i >= 0; i--) {
    if (txs[i].type === 'expense') cents += toCents(txs[i].amount)
    totals[i] = fromCents(cents)
  }
  return totals
}

export interface MonthlySummary {
  month: string
  income: number
  expense: number
}

export function incomeVsExpenseByMonth(txs: Transaction[]): MonthlySummary[] {
  const byMonth = new Map<string, { income: number[]; expense: number[] }>()
  for (const tx of txs) {
    if (tx.type === 'transfer') continue
    const month = monthOf(tx.date)
    const entry = byMonth.get(month) ?? { income: [], expense: [] }
    entry[tx.type].push(tx.amount)
    byMonth.set(month, entry)
  }
  return [...byMonth.entries()]
    .map(([month, { income, expense }]) => ({
      month,
      income: sumAmounts(income),
      expense: sumAmounts(expense),
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

/** Inclusive list of 'YYYY-MM' months from fromMonth to toMonth. */
export function monthsBetween(fromMonth: string, toMonth: string): string[] {
  const months: string[] = []
  let [y, m] = fromMonth.split('-').map(Number)
  const [toY, toM] = toMonth.split('-').map(Number)
  while (y < toY || (y === toY && m <= toM)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return months
}

/** Months ('YYYY-MM') fully covered by `range` and fully in the past relative to `today`. */
export function completeMonthsInRange(range: DateRange, today: Date): string[] {
  const todayIso = isoDate(today)
  return monthsBetween(monthOf(range.from), monthOf(range.to)).filter((month) => {
    const first = `${month}-01`
    const last = lastDayOfMonth(month)
    return range.from <= first && range.to >= last && last < todayIso
  })
}

export interface MonthlyAverages {
  avgIncome: number
  avgExpense: number
  avgSavings: number
  monthsCounted: number
  fromMonth: string
  toMonth: string
}

/**
 * Average monthly income/expenses/savings over the complete months inside `range`.
 * The in-progress month and months only partially covered by the range are excluded.
 * Returns null when fewer than 2 complete months qualify.
 */
export function monthlyAverages(
  txs: Transaction[],
  range: DateRange,
  today: Date,
): MonthlyAverages | null {
  const months = completeMonthsInRange(range, today)
  if (months.length < 2) return null

  const byMonth = new Map(incomeVsExpenseByMonth(txs).map((m) => [m.month, m]))
  let incomeCents = 0
  let expenseCents = 0
  for (const month of months) {
    const entry = byMonth.get(month)
    if (!entry) continue
    incomeCents += toCents(entry.income)
    expenseCents += toCents(entry.expense)
  }
  const avgIncomeCents = Math.round(incomeCents / months.length)
  const avgExpenseCents = Math.round(expenseCents / months.length)
  return {
    avgIncome: fromCents(avgIncomeCents),
    avgExpense: fromCents(avgExpenseCents),
    avgSavings: fromCents(avgIncomeCents - avgExpenseCents),
    monthsCounted: months.length,
    fromMonth: months[0],
    toMonth: months[months.length - 1],
  }
}
