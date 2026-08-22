import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RecurringRuleForm } from '../components/RecurringRuleForm'
import type { RecurringRuleInput } from '../data/recurring'
import {
  useAccounts,
  useCategories,
  useCreateRecurringRule,
  useDeleteAllRuleTransactions,
  useDeleteRecurringFutureTransactions,
  useDeleteRecurringRule,
  useRecurringRules,
  useUpdateRecurringRule,
} from '../data/hooks'
import { isoDate } from '../domain/filters'
import { getOccurrenceDates, monthlyEquivalent, nextOccurrenceDate } from '../domain/recurring'
import { formatEur } from '../lib/money'
import type { RecurringRule } from '../lib/types'

export function RecurringPage() {
  const { t } = useTranslation()
  const { data: rules = [], isLoading } = useRecurringRules()
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const createRule = useCreateRecurringRule()
  const updateRule = useUpdateRecurringRule()
  const deleteRule = useDeleteRecurringRule()
  const deleteFutureTransactions = useDeleteRecurringFutureTransactions()
  const deleteAllTransactions = useDeleteAllRuleTransactions()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const editingRule = editingId ? rules.find((r) => r.id === editingId) : undefined

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in30Days = new Date(today)
  in30Days.setDate(in30Days.getDate() + 30)
  const fromYesterday = new Date(today)
  fromYesterday.setDate(today.getDate() - 1)

  const upcoming = rules
    .filter((r) => r.active)
    .flatMap((r) =>
      getOccurrenceDates(r, fromYesterday, in30Days).map((d) => ({
        date: isoDate(d),
        rule: r,
      })),
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  const onSubmit = (input: RecurringRuleInput) => {
    if (editingId) {
      updateRule.mutate({ id: editingId, input })
    } else {
      createRule.mutate(input)
    }
    setShowForm(false)
    setEditingId(null)
  }

  const doDelete = (rule: RecurringRule, deleteHistory: boolean) => {
    setConfirmDeleteId(null)
    const step = deleteHistory
      ? deleteAllTransactions.mutateAsync(rule.id)
      : deleteFutureTransactions.mutateAsync({ ruleId: rule.id, fromDate: isoDate(today) })
    step.then(() => deleteRule.mutate(rule.id)).catch(console.error)
  }

  const toggleActive = (rule: RecurringRule) => {
    updateRule.mutate({ id: rule.id, input: { active: !rule.active } })
  }

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id
  const categoryFor = (rule: RecurringRule) => categories.find((c) => c.id === rule.category_id)

  if (isLoading) return <p className="text-slate-500 dark:text-slate-400">{t('common.loading')}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('recurring.title')}</h1>
        <button
          onClick={() => {
            setEditingId(null)
            setShowForm(true)
          }}
          className="btn-primary"
        >
          {t('recurring.newButton')}
        </button>
      </div>

      {showForm && (
        <RecurringRuleForm
          accounts={accounts}
          categories={categories}
          initial={editingRule}
          onSubmit={onSubmit}
          onCancel={() => {
            setShowForm(false)
            setEditingId(null)
          }}
        />
      )}

      <section>
        <h2 className="mb-3 text-lg font-medium">{t('recurring.rulesSection')}</h2>
        <ul className="space-y-2">
          {rules.map((rule) => {
            const cat = categoryFor(rule)
            const monthly = monthlyEquivalent(rule)
            const next = nextOccurrenceDate(rule, today)
            return (
              <li key={rule.id} className="card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {cat && <span aria-hidden>{cat.icon}</span>}
                      <span className="font-medium">{rule.description}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          rule.active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {rule.active ? t('recurring.active') : t('recurring.inactive')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {accountName(rule.account_id)} ·{' '}
                      {rule.frequency === 'monthly'
                        ? t('recurring.monthly')
                        : t('recurring.yearly')}{' '}
                      · {t('recurring.day')} {rule.day_of_month}
                      {next && ` · ${t('recurring.next')}: ${isoDate(next)}`}
                    </p>
                    <p className="money-blur text-sm font-semibold">
                      {formatEur(rule.amount)}/
                      {rule.frequency === 'monthly'
                        ? t('recurring.perMonth')
                        : t('recurring.perYear')}
                      {rule.frequency === 'yearly' && (
                        <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
                          ({formatEur(monthly)}/{t('recurring.perMonth')})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 text-sm">
                    {confirmDeleteId === rule.id ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {t('recurring.deletePrompt')}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => doDelete(rule, true)}
                            className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
                          >
                            {t('recurring.deleteAll')}
                          </button>
                          <button
                            onClick={() => doDelete(rule, false)}
                            className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
                          >
                            {t('recurring.deleteFuture')}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            {t('recurring.cancelDelete')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          onClick={() => toggleActive(rule)}
                          className="font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                        >
                          {rule.active
                            ? t('recurring.toggleDeactivate')
                            : t('recurring.toggleActivate')}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(rule.id)
                            setShowForm(true)
                          }}
                          className="font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                        >
                          {t('recurring.editBtn')}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(rule.id)}
                          className="font-medium text-rose-600 transition-colors hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                        >
                          {t('recurring.deleteBtn')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
          {rules.length === 0 && (
            <li className="card p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('recurring.noRules')}
            </li>
          )}
        </ul>
      </section>

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium">{t('recurring.upcomingSection')}</h2>
          <ul className="space-y-1">
            {upcoming.map(({ date, rule }) => (
              <li
                key={`${rule.id}-${date}`}
                className="card flex items-center justify-between px-4 py-2.5"
              >
                <span className="text-sm text-slate-500 dark:text-slate-400">{date}</span>
                <span className="text-sm">{rule.description}</span>
                <span className="money-blur text-sm font-medium">{formatEur(rule.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
