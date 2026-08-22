import { useTranslation } from 'react-i18next'
import type { MonthlyAverages } from '../domain/aggregations'
import { formatEur } from '../lib/money'

export function MonthlyAveragesRow({ averages }: { averages: MonthlyAverages | null }) {
  const { t, i18n } = useTranslation()
  if (!averages) return null

  const locale = i18n.language === 'it' ? 'it-IT' : 'en-US'
  const formatMonthShort = (yyyyMM: string): string => {
    const [y, m] = yyyyMM.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'short', year: 'numeric' })
  }

  return (
    <section className="card p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-1">
        <h2 className="font-semibold tracking-tight">{t('averages.title')}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('averages.caption', {
            count: averages.monthsCounted,
            from: formatMonthShort(averages.fromMonth),
            to: formatMonthShort(averages.toMonth),
          })}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <p className="kpi-label">{t('averages.income')}</p>
          <p className="money-blur mt-1 text-xl font-semibold tracking-tight text-pos">
            {formatEur(averages.avgIncome)}
          </p>
        </div>
        <div>
          <p className="kpi-label">{t('averages.expense')}</p>
          <p className="money-blur mt-1 text-xl font-semibold tracking-tight text-neg">
            {formatEur(averages.avgExpense)}
          </p>
        </div>
        <div>
          <p className="kpi-label">{t('averages.savings')}</p>
          <p
            className={`money-blur mt-1 text-xl font-semibold tracking-tight ${averages.avgSavings < 0 ? 'text-neg' : ''}`}
          >
            {formatEur(averages.avgSavings)}
          </p>
        </div>
      </div>
    </section>
  )
}
