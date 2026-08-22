import type { Account, Category, Transaction } from '../lib/types'

/** Neutralize spreadsheet formula injection: prefix risky leading chars with a quote. */
export function sanitizeSpreadsheetString(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
}

function escapeField(value: unknown): string {
  const safe = typeof value === 'string' ? sanitizeSpreadsheetString(value) : value
  const s = safe === null || safe === undefined ? '' : String(safe)
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const lines = [columns.map(escapeField).join(',')]
  for (const row of rows) {
    lines.push(columns.map((c) => escapeField(row[c])).join(','))
  }
  return lines.join('\n')
}

export const TRANSACTION_COLUMNS = [
  'date',
  'type',
  'amount',
  'account',
  'to_account',
  'category',
  'description',
  'notes',
  'tags',
]

export function transactionsToRows(
  txs: Transaction[],
  accounts: Account[],
  categories: Category[],
): Record<string, string | number>[] {
  const accountName = new Map(accounts.map((a) => [a.id, a.name]))
  const categoryName = new Map(categories.map((c) => [c.id, c.name]))
  return txs.map((tx) => ({
    date: tx.date,
    type: tx.type,
    amount: tx.amount,
    account: accountName.get(tx.account_id) ?? '',
    to_account: tx.transfer_to_account_id ? (accountName.get(tx.transfer_to_account_id) ?? '') : '',
    category: tx.category_id ? (categoryName.get(tx.category_id) ?? '') : '',
    description: tx.description,
    notes: tx.notes ?? '',
    tags: tx.tags.join('|'),
  }))
}
