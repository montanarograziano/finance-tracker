import type { Transaction, TransactionType } from '../lib/types'

export type PeriodPreset = 'current-month' | 'last-3-months' | 'current-year'

/** Inclusive ISO date range; compare lexicographically. */
export interface DateRange {
  from: string
  to: string
}

export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function lastDayOfMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-').map(Number)
  return isoDate(new Date(y, m, 0))
}

export function rangeForPreset(preset: PeriodPreset, today: Date): DateRange {
  const y = today.getFullYear()
  const m = today.getMonth()
  switch (preset) {
    case 'current-month':
      return { from: isoDate(new Date(y, m, 1)), to: isoDate(new Date(y, m + 1, 0)) }
    case 'last-3-months':
      return { from: isoDate(new Date(y, m - 2, 1)), to: isoDate(new Date(y, m + 1, 0)) }
    case 'current-year':
      return { from: `${y}-01-01`, to: `${y}-12-31` }
  }
}

export interface TransactionFilter {
  range?: DateRange
  accountId?: string
  categoryId?: string
  type?: TransactionType
  search?: string
}

export function filterTransactions(txs: Transaction[], f: TransactionFilter): Transaction[] {
  const search = f.search?.trim().toLowerCase()
  return txs.filter((tx) => {
    if (f.range && (tx.date < f.range.from || tx.date > f.range.to)) return false
    if (f.accountId && tx.account_id !== f.accountId && tx.transfer_to_account_id !== f.accountId)
      return false
    if (f.categoryId && tx.category_id !== f.categoryId) return false
    if (f.type && tx.type !== f.type) return false
    if (search && !`${tx.description} ${tx.notes ?? ''}`.toLowerCase().includes(search))
      return false
    return true
  })
}
