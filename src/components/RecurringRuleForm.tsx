import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { RecurringRuleInput } from '../data/recurring'
import { isoDate } from '../domain/filters'
import type {
  Account,
  Category,
  RecurringFrequency,
  RecurringRule,
  TransactionType,
} from '../lib/types'

interface Props {
  accounts: Account[]
  categories: Category[]
  initial?: RecurringRule
  onSubmit: (input: RecurringRuleInput) => void
  onCancel: () => void
}

export function RecurringRuleForm({ accounts, categories, initial, onSubmit, onCancel }: Props) {
  const { t } = useTranslation()

  const typeLabels: { value: TransactionType; label: string }[] = [
    { value: 'expense', label: t('recurringForm.expense') },
    { value: 'income', label: t('recurringForm.income') },
    { value: 'transfer', label: t('recurringForm.transfer') },
  ]

  const frequencyLabels: { value: RecurringFrequency; label: string }[] = [
    { value: 'monthly', label: t('recurringForm.monthly') },
    { value: 'yearly', label: t('recurringForm.yearly') },
  ]
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [accountId, setAccountId] = useState(initial?.account_id ?? accounts[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? '')
  const [transferTo, setTransferTo] = useState(initial?.transfer_to_account_id ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [frequency, setFrequency] = useState<RecurringFrequency>(initial?.frequency ?? 'monthly')
  const [dayOfMonth, setDayOfMonth] = useState(initial ? String(initial.day_of_month) : '1')
  const [monthOfYear, setMonthOfYear] = useState(
    initial?.month_of_year ? String(initial.month_of_year) : '1',
  )
  const [startDate, setStartDate] = useState(initial?.start_date ?? isoDate(new Date()))
  const [endDate, setEndDate] = useState(initial?.end_date ?? '')
  const [error, setError] = useState<string | null>(null)

  const typeCategories = categories.filter((c) => c.type === type)

  const selectType = (next: TransactionType) => {
    setType(next)
    setCategoryId('')
    setTransferTo('')
    setError(null)
  }

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const parsedAmount = Number(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setError(t('recurringForm.errorAmount'))
      return
    }
    if (!description.trim()) {
      setError(t('recurringForm.errorDescription'))
      return
    }
    const parsedDay = Number(dayOfMonth)
    if (!parsedDay || parsedDay < 1 || parsedDay > 28) {
      setError(t('recurringForm.errorDay'))
      return
    }
    const parsedMonth = Number(monthOfYear)
    if (frequency === 'yearly' && (!parsedMonth || parsedMonth < 1 || parsedMonth > 12)) {
      setError(t('recurringForm.errorMonth'))
      return
    }
    if (type === 'transfer' && (!transferTo || transferTo === accountId)) {
      setError(t('recurringForm.errorTransfer'))
      return
    }
    if (type !== 'transfer' && !categoryId) {
      setError(t('recurringForm.errorCategory'))
      return
    }

    onSubmit({
      account_id: accountId,
      category_id: type === 'transfer' ? null : categoryId,
      type,
      transfer_to_account_id: type === 'transfer' ? transferTo : null,
      amount: parsedAmount,
      description: description.trim(),
      frequency,
      day_of_month: parsedDay,
      month_of_year: frequency === 'yearly' ? parsedMonth : null,
      start_date: startDate,
      end_date: endDate || null,
      active: initial?.active ?? true,
    })
  }

  return (
    <form onSubmit={onFormSubmit} className="card space-y-3 p-5">
      <fieldset className="flex gap-4">
        <legend className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">
          {t('recurringForm.type')}
        </legend>
        {typeLabels.map(({ value, label }) => (
          <label key={value} className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              name="rule-type"
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
          <label htmlFor="rule-amount" className="form-label">
            {t('recurringForm.amount')}
          </label>
          <input
            id="rule-amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="rule-account" className="form-label">
            {type === 'transfer' ? t('recurringForm.fromAccount') : t('recurringForm.account')}
          </label>
          <select
            id="rule-account"
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
      </div>

      {type === 'transfer' ? (
        <div>
          <label htmlFor="rule-transfer-to" className="form-label">
            {t('recurringForm.toAccount')}
          </label>
          <select
            id="rule-transfer-to"
            value={transferTo}
            onChange={(e) => setTransferTo(e.target.value)}
            className="input"
          >
            <option value="">{t('recurringForm.selectPlaceholder')}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label htmlFor="rule-category" className="form-label">
            {t('recurringForm.category')}
          </label>
          <select
            id="rule-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input"
          >
            <option value="">{t('recurringForm.selectPlaceholder')}</option>
            {typeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="rule-description" className="form-label">
          {t('recurringForm.description')}
        </label>
        <input
          id="rule-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
        />
      </div>

      <fieldset className="flex gap-4">
        <legend className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">
          {t('recurringForm.frequency')}
        </legend>
        {frequencyLabels.map(({ value, label }) => (
          <label key={value} className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              name="rule-frequency"
              checked={frequency === value}
              onChange={() => setFrequency(value)}
              aria-label={label}
              className="accent-brand-600 dark:accent-brand-400"
            />
            {label}
          </label>
        ))}
      </fieldset>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="rule-day" className="form-label">
            {t('recurringForm.dayOfMonth')}
          </label>
          <input
            id="rule-day"
            type="number"
            min="1"
            max="28"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            className="input"
          />
        </div>
        {frequency === 'yearly' && (
          <div className="flex-1">
            <label htmlFor="rule-month" className="form-label">
              {t('recurringForm.monthOfYear')}
            </label>
            <input
              id="rule-month"
              type="number"
              min="1"
              max="12"
              value={monthOfYear}
              onChange={(e) => setMonthOfYear(e.target.value)}
              className="input"
            />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="rule-start" className="form-label">
            {t('recurringForm.startDate')}
          </label>
          <input
            id="rule-start"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="rule-end" className="form-label">
            {t('recurringForm.endDate')}
          </label>
          <input
            id="rule-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input"
          />
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary">
          {t('recurringForm.save')}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          {t('recurringForm.cancel')}
        </button>
      </div>
    </form>
  )
}
