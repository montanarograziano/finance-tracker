import { useTranslation } from 'react-i18next'
import type { Account } from '../lib/types'
import { isoDate, type DateRange, type PeriodPreset } from '../domain/filters'

function lastDayOfMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-').map(Number)
  return isoDate(new Date(y, m, 0))
}

export interface PeriodValue {
  preset: PeriodPreset | 'custom'
  custom: DateRange
}

interface Props {
  value: PeriodValue
  onChange: (value: PeriodValue) => void
  accounts: Account[]
  accountId: string
  onAccountChange: (id: string) => void
}

export function PeriodFilter({ value, onChange, accounts, accountId, onAccountChange }: Props) {
  const { t } = useTranslation()

  const PRESETS: { value: PeriodPreset | 'custom'; label: string }[] = [
    { value: 'current-month', label: t('periodFilter.currentMonth') },
    { value: 'last-3-months', label: t('periodFilter.last3Months') },
    { value: 'current-year', label: t('periodFilter.currentYear') },
    { value: 'custom', label: t('periodFilter.custom') },
  ]

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Pill preset buttons — full-width scrollable row on mobile */}
      <div className="seg max-sm:w-full max-sm:overflow-x-auto">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onChange({ ...value, preset: p.value })}
            className={`seg-btn whitespace-nowrap max-sm:min-h-11 max-sm:flex-1 ${value.preset === p.value ? 'seg-btn-active' : ''}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range — only shown when 'custom' preset is active */}
      {value.preset === 'custom' && (
        <div className="card flex items-center gap-1.5 px-3 py-1.5 text-sm max-sm:min-h-11 max-sm:w-full max-sm:justify-between">
          <input
            aria-label={t('periodFilter.fromLabel')}
            type="month"
            value={value.custom.from.slice(0, 7)}
            onChange={(e) => {
              const newFrom = `${e.target.value}-01`
              const newTo =
                e.target.value > value.custom.to.slice(0, 7)
                  ? lastDayOfMonth(e.target.value)
                  : value.custom.to
              onChange({ ...value, custom: { from: newFrom, to: newTo } })
            }}
            className="border-none bg-transparent text-sm outline-none"
          />
          <span className="text-slate-300 dark:text-slate-600">→</span>
          <input
            aria-label={t('periodFilter.toLabel')}
            type="month"
            min={value.custom.from.slice(0, 7)}
            value={value.custom.to.slice(0, 7)}
            onChange={(e) =>
              onChange({
                ...value,
                custom: { ...value.custom, to: lastDayOfMonth(e.target.value) },
              })
            }
            className="border-none bg-transparent text-sm outline-none"
          />
        </div>
      )}

      {/* Account selector */}
      <select
        aria-label={t('periodFilter.accountLabel')}
        value={accountId}
        onChange={(e) => onAccountChange(e.target.value)}
        className="input max-sm:min-h-11 sm:w-auto"
      >
        <option value="">{t('periodFilter.allAccounts')}</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </div>
  )
}
