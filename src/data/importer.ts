import type { PreparedImportRow } from '../domain/importTransactions'
import type { Account, Category, CategoryType } from '../lib/types'
import { createAccountsReturning } from './accounts'
import { createCategoriesReturning } from './categories'
import { createTransactions, type TransactionInput } from './transactions'

const DEFAULT_CATEGORY_COLOR = '#6d7178'
const DEFAULT_CATEGORY_ICON = '🏷️'

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`import: unresolved ${what}`)
  return value
}

/**
 * Executes a confirmed import: creates the accounts/categories still
 * missing for the given rows, then batch-inserts the transactions.
 * Returns the number of transactions inserted.
 */
export async function executeImport(
  rows: PreparedImportRow[],
  accounts: Account[],
  categories: Category[],
): Promise<number> {
  if (rows.length === 0) return 0

  const accountId = new Map(accounts.map((a) => [a.name.trim().toLowerCase(), a.id]))
  const categoryId = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id]))

  const neededAccounts = new Map<string, string>()
  const neededCategories = new Map<string, { name: string; type: CategoryType }>()
  for (const r of rows) {
    for (const name of [r.account, ...(r.toAccount ? [r.toAccount] : [])]) {
      const key = name.toLowerCase()
      if (!accountId.has(key) && !neededAccounts.has(key)) neededAccounts.set(key, name)
    }
    if (r.category) {
      const key = r.category.toLowerCase()
      if (!categoryId.has(key) && !neededCategories.has(key)) {
        neededCategories.set(key, {
          name: r.category,
          type: r.type === 'income' ? 'income' : 'expense',
        })
      }
    }
  }

  const createdAccounts = await createAccountsReturning(
    [...neededAccounts.values()].map((name) => ({ name, type: 'other', initial_balance: 0 })),
  )
  for (const a of createdAccounts) accountId.set(a.name.trim().toLowerCase(), a.id)

  const createdCategories = await createCategoriesReturning(
    [...neededCategories.values()].map((c) => ({
      name: c.name,
      type: c.type,
      color: DEFAULT_CATEGORY_COLOR,
      icon: DEFAULT_CATEGORY_ICON,
      parent_id: null,
    })),
  )
  for (const c of createdCategories) categoryId.set(c.name.trim().toLowerCase(), c.id)

  const inputs: TransactionInput[] = rows.map((r) => ({
    account_id: must(accountId.get(r.account.toLowerCase()), `account "${r.account}"`),
    category_id: r.category
      ? must(categoryId.get(r.category.toLowerCase()), `category "${r.category}"`)
      : null,
    type: r.type,
    amount: r.amount,
    date: r.date,
    description: r.description,
    notes: r.notes,
    tags: r.tags,
    transfer_to_account_id: r.toAccount
      ? must(accountId.get(r.toAccount.toLowerCase()), `account "${r.toAccount}"`)
      : null,
  }))

  await createTransactions(inputs)
  return inputs.length
}
