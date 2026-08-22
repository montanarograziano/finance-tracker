import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useAccountBalances,
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from '../data/hooks'
import { formatEur, sumAmounts } from '../lib/money'
import type { AccountType } from '../lib/types'

interface FormState {
  name: string
  type: AccountType
  initial_balance: string
}

const emptyForm: FormState = { name: '', type: 'checking', initial_balance: '0' }

export function AccountsPage() {
  const { t } = useTranslation()
  const { data: accounts = [], isLoading } = useAccountBalances()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const deleteAccount = useDeleteAccount()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)

  const typeLabels: Record<AccountType, string> = {
    checking: t('accounts.checking'),
    cash: t('accounts.cash'),
    investment: t('accounts.investment'),
    other: t('accounts.other'),
  }

  const startCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const startEdit = (account: (typeof accounts)[number]) => {
    setEditingId(account.id)
    setForm({
      name: account.name,
      type: account.type as AccountType,
      initial_balance: String(account.initial_balance),
    })
    setShowForm(true)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const input = {
      name: form.name.trim(),
      type: form.type,
      initial_balance: Number(form.initial_balance) || 0,
    }
    if (editingId) {
      updateAccount.mutate({ id: editingId, input })
    } else {
      createAccount.mutate(input)
    }
    setShowForm(false)
    setEditingId(null)
  }

  const onDelete = (account: (typeof accounts)[number]) => {
    if (window.confirm(t('accounts.confirmDelete', { name: account.name }))) {
      deleteAccount.mutate(account.id)
    }
  }

  if (isLoading) return <p className="text-slate-500 dark:text-slate-400">{t('common.loading')}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('accounts.title')}</h1>
        <button onClick={startCreate} className="btn-primary">
          {t('accounts.newButton')}
        </button>
      </div>

      <p className="text-slate-600 dark:text-slate-400">
        {t('accounts.totalWealth')}{' '}
        <span className="money-blur font-semibold text-slate-900 dark:text-slate-50">
          {formatEur(sumAmounts(accounts.map((a) => a.balance)))}
        </span>
      </p>

      {showForm && (
        <form onSubmit={onSubmit} className="card space-y-3 p-5">
          <div>
            <label htmlFor="account-name" className="form-label">
              {t('accounts.name')}
            </label>
            <input
              id="account-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="account-type" className="form-label">
              {t('accounts.type')}
            </label>
            <select
              id="account-type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
              className="input"
            >
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="account-balance" className="form-label">
              {t('accounts.initialBalance')}
            </label>
            <input
              id="account-balance"
              type="number"
              step="0.01"
              value={form.initial_balance}
              onChange={(e) => setForm({ ...form, initial_balance: e.target.value })}
              className="input"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              {t('accounts.save')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              {t('accounts.cancel')}
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {accounts.map((account) => (
          <li
            key={account.id}
            className="card flex items-center justify-between p-4 transition-shadow hover:shadow-sm"
          >
            <div>
              <p className="font-medium">{account.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {typeLabels[account.type as AccountType]}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="money-blur font-semibold">{formatEur(account.balance)}</span>
              <button
                onClick={() => startEdit(account)}
                className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                {t('accounts.edit')}
              </button>
              <button
                onClick={() => onDelete(account)}
                className="text-sm font-medium text-rose-600 transition-colors hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
              >
                {t('accounts.delete')}
              </button>
            </div>
          </li>
        ))}
        {accounts.length === 0 && (
          <li className="card p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('accounts.noAccounts')}
          </li>
        )}
      </ul>
    </div>
  )
}
