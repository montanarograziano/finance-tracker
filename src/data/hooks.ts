import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PreparedImportRow } from '../domain/importTransactions'
import type { Account, Category } from '../lib/types'
import { fetchAccountBalances, fetchNetWorthSeries } from './analytics'
import { executeImport } from './importer'
import {
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
  type AccountInput,
} from './accounts'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type CategoryInput,
} from './categories'
import { listInvestments } from './investments'
import {
  createTransaction,
  deleteRecurringFutureTransactions,
  deleteTransaction,
  listTransactions,
  updateTransaction,
  type ListTransactionsFilter,
  type TransactionInput,
} from './transactions'
import {
  createRecurringException,
  createRecurringRule,
  deleteAllRuleTransactions,
  deleteRecurringRule,
  listRecurringRules,
  updateRecurringRule,
  type RecurringRuleInput,
} from './recurring'

// ── Accounts ──────────────────────────────────────────────────────────────────

export function useAccounts() {
  return useQuery({ queryKey: ['accounts'], queryFn: listAccounts })
}

/** Pre-computed per-account balances from server. Replaces useAccounts + useTransactions for balance display. */
export function useAccountBalances() {
  return useQuery({ queryKey: ['account_balances'], queryFn: fetchAccountBalances })
}

/** Monthly cumulative net worth series from server. Used for the dashboard chart. */
export function useNetWorthSeries() {
  return useQuery({ queryKey: ['net_worth_series'], queryFn: fetchNetWorthSeries })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function useInvalidatingMutation<TArg>(
  mutationFn: (arg: TArg) => Promise<void>,
  ...queryKeys: string[]
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryKeys.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] })),
  })
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: listCategories })
}

/** Server-filtered transaction fetch. Pass from/to to limit rows fetched; omit for all. */
export function useTransactions(filter: ListTransactionsFilter = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['transactions', filter],
    queryFn: () => listTransactions(filter),
    enabled: options?.enabled,
  })
}

export function useInvestments() {
  return useQuery({ queryKey: ['investments'], queryFn: listInvestments })
}

// ── Account mutations ─────────────────────────────────────────────────────────

export function useCreateAccount() {
  return useInvalidatingMutation(
    (input: AccountInput) => createAccount(input),
    'accounts', 'account_balances', 'net_worth_series',
  )
}

export function useUpdateAccount() {
  return useInvalidatingMutation(
    ({ id, input }: { id: string; input: AccountInput }) => updateAccount(id, input),
    'accounts', 'account_balances', 'net_worth_series',
  )
}

export function useDeleteAccount() {
  return useInvalidatingMutation(
    (id: string) => deleteAccount(id),
    'accounts', 'account_balances', 'net_worth_series',
  )
}

// ── Category mutations ────────────────────────────────────────────────────────

export function useCreateCategory() {
  return useInvalidatingMutation((input: CategoryInput) => createCategory(input), 'categories')
}

export function useUpdateCategory() {
  return useInvalidatingMutation(
    ({ id, input }: { id: string; input: CategoryInput }) => updateCategory(id, input),
    'categories',
  )
}

export function useDeleteCategory() {
  return useInvalidatingMutation((id: string) => deleteCategory(id), 'categories')
}

// ── Transaction mutations ─────────────────────────────────────────────────────

export function useCreateTransaction() {
  return useInvalidatingMutation(
    (input: TransactionInput) => createTransaction(input),
    'transactions', 'account_balances', 'net_worth_series',
  )
}

/** Spreadsheet import: creates missing accounts/categories, then batch-inserts rows. */
export function useImportTransactions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      rows,
      accounts,
      categories,
    }: {
      rows: PreparedImportRow[]
      accounts: Account[]
      categories: Category[]
    }) => executeImport(rows, accounts, categories),
    onSuccess: () => {
      ;['transactions', 'accounts', 'categories', 'account_balances', 'net_worth_series'].forEach(
        (k) => queryClient.invalidateQueries({ queryKey: [k] }),
      )
    },
  })
}

export function useUpdateTransaction() {
  return useInvalidatingMutation(
    ({ id, input }: { id: string; input: TransactionInput }) => updateTransaction(id, input),
    'transactions', 'account_balances', 'net_worth_series',
  )
}

export function useDeleteTransaction() {
  return useInvalidatingMutation(
    (id: string) => deleteTransaction(id),
    'transactions', 'account_balances', 'net_worth_series',
  )
}

// ── Recurring ─────────────────────────────────────────────────────────────────

export function useRecurringRules() {
  return useQuery({ queryKey: ['recurring_rules'], queryFn: listRecurringRules })
}

export function useCreateRecurringRule() {
  return useInvalidatingMutation(
    (input: RecurringRuleInput) => createRecurringRule(input),
    'recurring_rules',
  )
}

export function useUpdateRecurringRule() {
  return useInvalidatingMutation(
    ({ id, input }: { id: string; input: Partial<RecurringRuleInput> }) =>
      updateRecurringRule(id, input),
    'recurring_rules',
  )
}

export function useDeleteRecurringRule() {
  return useInvalidatingMutation((id: string) => deleteRecurringRule(id), 'recurring_rules')
}

export function useDeleteAllRuleTransactions() {
  return useInvalidatingMutation(
    (ruleId: string) => deleteAllRuleTransactions(ruleId),
    'transactions', 'account_balances', 'net_worth_series',
  )
}

export function useCreateRecurringException() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      ruleId,
      occurrenceDate,
      action,
    }: {
      ruleId: string
      occurrenceDate: string
      action: 'skip' | 'modified'
    }) => createRecurringException(ruleId, occurrenceDate, action),
    onSuccess: () => {
      ;['transactions', 'recurring_rules', 'account_balances', 'net_worth_series'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      )
    },
  })
}

export function useDeleteRecurringFutureTransactions() {
  return useInvalidatingMutation(
    ({ ruleId, fromDate }: { ruleId: string; fromDate: string }) =>
      deleteRecurringFutureTransactions(ruleId, fromDate),
    'transactions', 'account_balances', 'net_worth_series',
  )
}
