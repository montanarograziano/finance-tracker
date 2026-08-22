import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExpenseSlider } from '../components/ExpenseSlider'
import { ImportTransactions } from '../components/ImportTransactions'
import { TransactionForm } from '../components/TransactionForm'
import type { TransactionInput } from '../data/transactions'
import {
  useAccounts,
  useCategories,
  useCreateRecurringException,
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from '../data/hooks'
import { runningExpenseTotals } from '../domain/aggregations'
import { signedAmount } from '../domain/balances'
import { filterTransactions, isoDate, rangeForPreset, type PeriodPreset } from '../domain/filters'

function lastDayOfMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-').map(Number)
  return isoDate(new Date(y, m, 0))
}
import { formatEur } from '../lib/money'
import type { Transaction, TransactionType } from '../lib/types'

type PresetChoice = PeriodPreset | 'all' | 'custom'

export function TransactionsPage() {
  const { t } = useTranslation()
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const deleteTransaction = useDeleteTransaction()
  const createRecurringException = useCreateRecurringException()

  const today = new Date()
  const [preset, setPreset] = useState<PresetChoice>('current-month')
  const [customFrom, setCustomFrom] = useState(() =>
    isoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
  )
  const [customTo, setCustomTo] = useState(() => isoDate(today))
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [type, setType] = useState<'' | TransactionType>('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const accountName = new Map(accounts.map((a) => [a.id, a.name]))
  const categoryById = new Map(categories.map((c) => [c.id, c]))

  const range =
    preset === 'all'
      ? undefined
      : preset === 'custom'
        ? { from: customFrom, to: customTo }
        : rangeForPreset(preset, today)

  const { data: transactions = [], isLoading } = useTransactions({
    from: range?.from,
    to: range?.to,
    accountId: accountId || undefined,
  })

  const filtered = filterTransactions(transactions, {
    categoryId: categoryId || undefined,
    type: type || undefined,
    search: search || undefined,
  })

  const runningExpenses = runningExpenseTotals(filtered)
  const hasExpenses = filtered.some((tx) => tx.type === 'expense')

  const listRef = useRef<HTMLUListElement>(null)
  const [listHeight, setListHeight] = useState(0)
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return

    const measure = () => setListHeight(el.getBoundingClientRect().height)
    measure()
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const onSubmit = (input: TransactionInput) => {
    if (editing) {
      const ruleId = editing.recurring_rule_id
      const occurrenceDate = editing.date
      updateTransaction
        .mutateAsync({ id: editing.id, input })
        .then(() => {
          if (ruleId) {
            createRecurringException.mutate({
              ruleId,
              occurrenceDate,
              action: 'modified',
            })
          }
        })
        .catch(console.error)
    } else {
      createTransaction.mutate(input)
    }
    setShowForm(false)
    setEditing(null)
  }

  const onDelete = (tx: Transaction) => {
    if (window.confirm(t('transactions.confirmDelete', { name: tx.description }))) {
      deleteTransaction.mutate(tx.id)
    }
  }

  const onSkipOccurrence = (tx: Transaction) => {
    if (!tx.recurring_rule_id) return
    if (!window.confirm(t('transactions.confirmSkip', { name: tx.description }))) return
    createRecurringException
      .mutateAsync({
        ruleId: tx.recurring_rule_id,
        occurrenceDate: tx.date,
        action: 'skip',
      })
      .then(() => deleteTransaction.mutate(tx.id))
      .catch(console.error)
  }

  const amountBadge = (tx: Transaction) => {
    if (tx.type === 'transfer') {
      return (
        <span className="money-blur font-semibold text-slate-500 dark:text-slate-400">
          ⇄ {formatEur(tx.amount)}
        </span>
      )
    }
    const value = signedAmount(tx.account_id, tx)
    return (
      <span className={`money-blur font-semibold ${value < 0 ? 'text-neg' : 'text-pos'}`}>
        {formatEur(value)}
      </span>
    )
  }

  if (isLoading) return <p className="text-slate-500 dark:text-slate-400">{t('common.loading')}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('transactions.title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowForm(false)
              setShowImport(true)
            }}
            className="btn-secondary"
          >
            {t('transactions.importButton')}
          </button>
          <button
            onClick={() => {
              setEditing(null)
              setShowImport(false)
              setShowForm(true)
            }}
            className="btn-primary"
          >
            {t('transactions.newButton')}
          </button>
        </div>
      </div>

      {showImport && (
        <ImportTransactions
          accounts={accounts}
          categories={categories}
          onClose={() => setShowImport(false)}
        />
      )}

      {showForm && (
        <TransactionForm
          accounts={accounts}
          categories={categories}
          initial={editing ?? undefined}
          onSubmit={onSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      )}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <select
          aria-label={t('transactions.periodLabel')}
          value={preset}
          onChange={(e) => setPreset(e.target.value as PresetChoice)}
          className="input"
        >
          <option value="current-month">{t('transactions.currentMonth')}</option>
          <option value="last-3-months">{t('transactions.last3Months')}</option>
          <option value="current-year">{t('transactions.currentYear')}</option>
          <option value="all">{t('transactions.all')}</option>
          <option value="custom">{t('transactions.custom')}</option>
        </select>
        <select
          aria-label={t('transactions.accountLabel')}
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="input"
        >
          <option value="">{t('transactions.allAccounts')}</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          aria-label={t('transactions.categoryLabel')}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="input"
        >
          <option value="">{t('transactions.allCategories')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label={t('transactions.typeLabel')}
          value={type}
          onChange={(e) => setType(e.target.value as '' | TransactionType)}
          className="input"
        >
          <option value="">{t('transactions.allTypes')}</option>
          <option value="expense">{t('transactions.expenseType')}</option>
          <option value="income">{t('transactions.incomeType')}</option>
          <option value="transfer">{t('transactions.transferType')}</option>
        </select>
        <input
          aria-label={t('transactions.searchLabel')}
          placeholder={t('transactions.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input col-span-2 md:col-span-1"
        />
      </div>

      {preset === 'custom' && (
        <div className="card flex items-center gap-1.5 self-start px-3 py-2 text-sm">
          <span className="text-slate-400 dark:text-slate-500 text-xs">
            {t('transactions.fromLabel')}
          </span>
          <input
            aria-label={t('transactions.fromLabel')}
            type="month"
            value={customFrom.slice(0, 7)}
            onChange={(e) => {
              setCustomFrom(`${e.target.value}-01`)
              if (e.target.value > customTo.slice(0, 7)) setCustomTo(lastDayOfMonth(e.target.value))
            }}
            className="border-none bg-transparent text-sm outline-none"
          />
          <span className="text-slate-300 dark:text-slate-600 mx-1">→</span>
          <span className="text-slate-400 dark:text-slate-500 text-xs">
            {t('transactions.toLabel')}
          </span>
          <input
            aria-label={t('transactions.toLabel')}
            type="month"
            min={customFrom.slice(0, 7)}
            value={customTo.slice(0, 7)}
            onChange={(e) => setCustomTo(lastDayOfMonth(e.target.value))}
            className="border-none bg-transparent text-sm outline-none"
          />
        </div>
      )}

      <div className="flex items-start gap-2">
        <ul ref={listRef} className="min-w-0 flex-1 space-y-2">
          {filtered.map((tx) => {
            const category = tx.category_id ? categoryById.get(tx.category_id) : undefined
            return (
              <li
                key={tx.id}
                className="card flex items-center justify-between gap-3 p-4 transition-shadow hover:shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {tx.description}
                    {tx.recurring_rule_id && (
                      <span
                        className="ml-1.5 text-xs text-brand-500 dark:text-brand-400"
                        title="Transazione ricorrente"
                      >
                        🔄
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                    {tx.date} · {accountName.get(tx.account_id)}
                    {tx.type === 'transfer' &&
                      tx.transfer_to_account_id &&
                      ` → ${accountName.get(tx.transfer_to_account_id)}`}
                    {category && (
                      <>
                        {' · '}
                        <span
                          aria-hidden
                          className="inline-block h-2 w-2 rounded-full align-middle"
                          style={{ backgroundColor: category.color }}
                        />{' '}
                        {category.name}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {amountBadge(tx)}
                  <button
                    onClick={() => {
                      setEditing(tx)
                      setShowForm(true)
                    }}
                    className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    {t('transactions.editBtn')}
                  </button>
                  {tx.recurring_rule_id && (
                    <button
                      onClick={() => onSkipOccurrence(tx)}
                      className="text-sm font-medium text-amber-600 transition-colors hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400"
                    >
                      {t('transactions.skipBtn')}
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(tx)}
                    className="text-sm font-medium text-rose-600 transition-colors hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                  >
                    {t('transactions.deleteBtn')}
                  </button>
                </div>
              </li>
            )
          })}
          {filtered.length === 0 && (
            <li className="card p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('transactions.noTransactions')}
            </li>
          )}
        </ul>
        {hasExpenses && (
          <ExpenseSlider
            count={filtered.length}
            runningExpenses={runningExpenses}
            listHeight={listHeight}
          />
        )}
      </div>
    </div>
  )
}
