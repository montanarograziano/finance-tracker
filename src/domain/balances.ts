import type { Transaction } from '../lib/types'

/** Effect of a transaction on the given account: positive, negative, or zero. */
export function signedAmount(accountId: string, tx: Transaction): number {
  if (tx.type === 'income') return tx.account_id === accountId ? tx.amount : 0
  if (tx.type === 'expense') return tx.account_id === accountId ? -tx.amount : 0
  // transfer: single row moves amount from source to destination
  if (tx.account_id === accountId) return -tx.amount
  if (tx.transfer_to_account_id === accountId) return tx.amount
  return 0
}
