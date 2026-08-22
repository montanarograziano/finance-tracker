import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { TransactionInput } from '../data/transactions'
import { isoDate } from '../domain/filters'
import type { Account, Category, Transaction, TransactionType } from '../lib/types'

interface Props {
  accounts: Account[]
  categories: Category[]
  initial?: Transaction
  onSubmit: (input: TransactionInput) => void
  onCancel: () => void
}

export function TransactionForm({ accounts, categories, initial, onSubmit, onCancel }: Props) {
  const { t } = useTranslation()

  const typeLabels: { value: TransactionType; label: string }[] = [
    { value: 'expense', label: t('transactionForm.expense') },
    { value: 'income', label: t('transactionForm.income') },
    { value: 'transfer', label: t('transactionForm.transfer') },
  ]
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense')
  const [date, setDate] = useState(initial?.date ?? isoDate(new Date()))
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [accountId, setAccountId] = useState(initial?.account_id ?? accounts[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '')
  const [transferTo, setTransferTo] = useState(initial?.transfer_to_account_id ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '')
  const [error, setError] = useState<string | null>(null)

  const typeCategories = categories.filter((c) => c.type === type)

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const parsedAmount = Number(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setError(t('transactionForm.errorAmount'))
      return
    }
    if (type === 'transfer' && (!transferTo || transferTo === accountId)) {
      setError(t('transactionForm.errorTransfer'))
      return
    }
    if (type !== 'transfer' && !categoryId) {
      setError(t('transactionForm.errorCategory'))
      return
    }
    onSubmit({
      account_id: accountId,
      category_id: type === 'transfer' ? null : categoryId,
      type,
      amount: parsedAmount,
      date,
      description: description.trim(),
      notes: notes.trim() || null,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      transfer_to_account_id: type === 'transfer' ? transferTo : null,
    })
  }

  const selectType = (next: TransactionType) => {
    setType(next)
    setCategoryId('')
    setTransferTo('')
    setError(null)
  }

  return (
    <form onSubmit={onFormSubmit} className="card space-y-3 p-5">
      <fieldset className="flex gap-4">
        <legend className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">
          {t('transactionForm.type')}
        </legend>
        {typeLabels.map(({ value, label }) => (
          <label key={value} className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              name="tx-type"
              checked={type === value}
              onChange={() => selectType(value)}
              className="accent-brand-600 dark:accent-brand-400"
            />
            {label}
          </label>
        ))}
      </fieldset>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="tx-date" className="form-label">
            {t('transactionForm.date')}
          </label>
          <input
            id="tx-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="tx-amount" className="form-label">
            {t('transactionForm.amount')}
          </label>
          <input
            id="tx-amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="tx-account" className="form-label">
            {type === 'transfer' ? t('transactionForm.fromAccount') : t('transactionForm.account')}
          </label>
          <select
            id="tx-account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="input"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        {type === 'transfer' ? (
          <div className="flex-1">
            <label htmlFor="tx-transfer-to" className="form-label">
              {t('transactionForm.toAccount')}
            </label>
            <select
              id="tx-transfer-to"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              className="input"
            >
              <option value="">{t('transactionForm.selectPlaceholder')}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex-1">
            <label htmlFor="tx-category" className="form-label">
              {t('transactionForm.category')}
            </label>
            <select
              id="tx-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input"
            >
              <option value="">{t('transactionForm.selectPlaceholder')}</option>
              {typeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="tx-description" className="form-label">
          {t('transactionForm.description')}
        </label>
        <input
          id="tx-description"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="tx-notes" className="form-label">
            {t('transactionForm.notes')}
          </label>
          <input
            id="tx-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="tx-tags" className="form-label">
            {t('transactionForm.tags')}
          </label>
          <input
            id="tx-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="input"
          />
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary">
          {t('transactionForm.save')}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          {t('transactionForm.cancel')}
        </button>
      </div>
    </form>
  )
}
