import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { isoDate } from '../domain/filters'
import type { ScenarioItem } from '../domain/simulation'
import type { Category } from '../lib/types'

const inputCls = 'input w-auto'
const textInputCls = 'input w-auto'

interface Props {
  categories: Category[]
  onAdd: (item: ScenarioItem) => void
}

export function ScenarioItemForm({ categories, onAdd }: Props) {
  const { t, i18n } = useTranslation()

  const locale = i18n.language === 'it' ? 'it-IT' : 'en-US'
  const monthLabels = Array.from({ length: 12 }, (_, i) => {
    const name = new Date(2000, i, 1).toLocaleDateString(locale, { month: 'long' })
    return name.charAt(0).toUpperCase() + name.slice(1)
  })

  const today = new Date()
  const defaultStart = isoDate(new Date(today.getFullYear() - 1, today.getMonth(), 1))

  const [kind, setKind] = useState<ScenarioItem['kind']>('recurring')
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly')
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [monthOfYear, setMonthOfYear] = useState('1')
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState('')
  const [date, setDate] = useState(isoDate(today))
  const [categoryId, setCategoryId] = useState('')
  const [percent, setPercent] = useState('10')
  const [error, setError] = useState('')

  const expenseCategories = categories.filter((c) => c.type === 'expense')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (kind === 'adjust') {
      const p = Number(percent)
      if (!categoryId) {
        setError(t('scenarioForm.errorCategory'))
        return
      }
      if (!Number.isFinite(p) || p < -100 || p > 500) {
        setError(t('scenarioForm.errorPercent'))
        return
      }
      const name = expenseCategories.find((c) => c.id === categoryId)?.name ?? ''
      onAdd({
        kind: 'adjust',
        category_id: categoryId,
        description: `${name} ${p > 0 ? '+' : ''}${p}%`,
        percent: p,
      })
    } else {
      const amt = Number(amount)
      if (!Number.isFinite(amt) || amt <= 0) {
        setError(t('scenarioForm.errorAmount'))
        return
      }
      if (!description.trim()) {
        setError(t('scenarioForm.errorDescription'))
        return
      }
      if (kind === 'oneoff') {
        if (!date) {
          setError(t('scenarioForm.errorDate'))
          return
        }
        onAdd({ kind: 'oneoff', type, amount: amt, description: description.trim(), date })
      } else {
        if (!startDate) {
          setError(t('scenarioForm.errorStartDate'))
          return
        }
        if (endDate && endDate < startDate) {
          setError(t('scenarioForm.errorEndDate'))
          return
        }
        onAdd({
          kind: 'recurring',
          type,
          amount: amt,
          description: description.trim(),
          frequency,
          day_of_month: Math.min(28, Math.max(1, Number(dayOfMonth) || 1)),
          month_of_year: frequency === 'yearly' ? Number(monthOfYear) : null,
          start_date: startDate,
          end_date: endDate || null,
        })
      }
    }
    setAmount('')
    setDescription('')
  }

  return (
    <form noValidate onSubmit={submit} className="card space-y-3 p-5">
      <h2 className="font-semibold tracking-tight">{t('scenarioForm.title')}</h2>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label={t('scenarioForm.kindLabel')}
          value={kind}
          onChange={(e) => setKind(e.target.value as ScenarioItem['kind'])}
          className={inputCls}
        >
          <option value="recurring">{t('scenarioForm.recurring')}</option>
          <option value="oneoff">{t('scenarioForm.oneoff')}</option>
          <option value="adjust">{t('scenarioForm.adjust')}</option>
        </select>

        {kind !== 'adjust' && (
          <>
            <select
              aria-label={t('scenarioForm.type')}
              value={type}
              onChange={(e) => setType(e.target.value as 'expense' | 'income')}
              className={inputCls}
            >
              <option value="expense">{t('scenarioForm.expense')}</option>
              <option value="income">{t('scenarioForm.income')}</option>
            </select>
            <input
              aria-label={t('scenarioForm.amountPlaceholder')}
              type="number"
              min="0.01"
              step="0.01"
              placeholder={t('scenarioForm.amountPlaceholder')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`w-28 ${textInputCls}`}
            />
            <input
              aria-label={t('scenarioForm.descriptionPlaceholder')}
              type="text"
              placeholder={t('scenarioForm.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`min-w-40 flex-1 ${textInputCls}`}
            />
          </>
        )}

        {kind === 'recurring' && (
          <>
            <select
              aria-label={t('scenarioForm.frequency')}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as 'monthly' | 'yearly')}
              className={inputCls}
            >
              <option value="monthly">{t('scenarioForm.monthly')}</option>
              <option value="yearly">{t('scenarioForm.yearly')}</option>
            </select>
            <input
              aria-label={t('scenarioForm.dayOfMonth')}
              type="number"
              min="1"
              max="28"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              className={`w-20 ${textInputCls}`}
            />
            {frequency === 'yearly' && (
              <select
                aria-label={t('scenarioForm.monthOfYear')}
                value={monthOfYear}
                onChange={(e) => setMonthOfYear(e.target.value)}
                className={inputCls}
              >
                {monthLabels.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
            )}
            <input
              aria-label={t('scenarioForm.startDate')}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={textInputCls}
            />
            <input
              aria-label={t('scenarioForm.endDate')}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={textInputCls}
            />
          </>
        )}

        {kind === 'oneoff' && (
          <input
            aria-label={t('scenarioForm.date')}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={textInputCls}
          />
        )}

        {kind === 'adjust' && (
          <>
            <select
              aria-label={t('scenarioForm.categoryLabel')}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputCls}
            >
              <option value="">{t('scenarioForm.categoryPlaceholder')}</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
            <input
              aria-label={t('scenarioForm.percentLabel')}
              type="number"
              min="-100"
              max="500"
              step="1"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              className={`w-24 ${textInputCls}`}
            />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {t('scenarioForm.pctSuffix')}
            </span>
          </>
        )}

        <button type="submit" className="btn-primary">
          {t('scenarioForm.addButton')}
        </button>
      </div>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </form>
  )
}
