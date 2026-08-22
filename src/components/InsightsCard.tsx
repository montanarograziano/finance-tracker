import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCategories, useTransactions } from '../data/hooks'
import { isoDate, lastDayOfMonth } from '../domain/filters'
import { computeInsights, monthsWithExpenses } from '../domain/insights'
import { formatEur, formatPct, sumAmounts } from '../lib/money'

const RED = 'text-red-600 dark:text-red-400'
const GREEN = 'text-green-600 dark:text-green-400'

/** Rows shown per insight list before the "show more" toggle kicks in. */
const LIST_CAP = 4

function ShowMoreToggle({
  total,
  expanded,
  onToggle,
}: {
  total: number
  expanded: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const hidden = total - LIST_CAP
  if (hidden <= 0) return null
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-1 flex items-center text-sm font-medium text-brand-600 hover:underline max-sm:min-h-11 dark:text-brand-400"
    >
      {expanded ? t('insights.showLess') : t('insights.showMore', { count: hidden })}
    </button>
  )
}

function DeltaBadge({
  delta,
  pct,
  goodWhenRising = false,
}: {
  delta: number
  pct: number | null
  goodWhenRising?: boolean
}) {
  if (delta === 0) return null
  const rising = delta > 0
  const good = goodWhenRising ? rising : !rising
  const arrow = rising ? '↑' : '↓'
  const amount = rising ? `+${formatEur(delta)}` : formatEur(delta)
  const pctText = pct !== null ? ` (${pct > 0 ? '+' : ''}${formatPct(pct)})` : ''
  return (
    <span className={`money-blur text-sm font-medium ${good ? GREEN : RED}`}>
      {arrow} {amount}
      {pctText}
    </span>
  )
}

export function InsightsCard() {
  const { t, i18n } = useTranslation()
  const { data: transactions = [], isLoading } = useTransactions()
  const { data: categories = [] } = useCategories()
  const [pickedMonth, setPickedMonth] = useState<string | null>(null)
  const [showAllNew, setShowAllNew] = useState(false)
  const [showAllVanished, setShowAllVanished] = useState(false)
  const [showAllStreaks, setShowAllStreaks] = useState(false)

  const locale = i18n.language === 'it' ? 'it-IT' : 'en-US'
  const formatMonth = (yyyyMM: string): string => {
    const [y, m] = yyyyMM.split('-').map(Number)
    const label = new Date(y, m - 1, 1).toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }

  const months = monthsWithExpenses(transactions)
  const anchorMonth = pickedMonth ?? months[months.length - 1] ?? null
  const insights = anchorMonth ? computeInsights(transactions, anchorMonth) : null

  const categoryById = new Map(categories.map((c) => [c.id, c]))
  const nameOf = (id: string): string =>
    id === 'uncategorized'
      ? t('common.uncategorized')
      : (categoryById.get(id)?.name ?? t('common.uncategorized'))
  const colorOf = (id: string): string => categoryById.get(id)?.color ?? '#6b7280'
  const iconOf = (id: string): string => categoryById.get(id)?.icon ?? ''

  const todayIso = isoDate(new Date())
  const monthInProgress =
    anchorMonth !== null &&
    anchorMonth === todayIso.slice(0, 7) &&
    todayIso < lastDayOfMonth(anchorMonth)

  if (isLoading) {
    return (
      <section className="card p-5">
        <p className="text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
      </section>
    )
  }

  const topDeltas = insights ? insights.deltas.filter((d) => d.deltaPrev !== 0).slice(0, 5) : []
  const noChanges =
    insights !== null &&
    topDeltas.length === 0 &&
    insights.newCategories.length === 0 &&
    insights.vanishedCategories.length === 0 &&
    insights.streaks.length === 0

  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold tracking-tight">{t('insights.title')}</h2>
        {anchorMonth && (
          <select
            aria-label={t('insights.monthLabel')}
            value={anchorMonth}
            onChange={(e) => setPickedMonth(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm max-sm:min-h-11"
          >
            {[...months].reverse().map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
        )}
      </div>

      {!insights ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('insights.notEnoughHistory')}
        </p>
      ) : (
        <>
          {monthInProgress && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('insights.monthInProgress')}
            </p>
          )}

          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('insights.totalExpenses')}
            </p>
            <p className="money-blur text-2xl font-semibold">
              {formatEur(insights.totals.current)}
            </p>
            {/* Mobile: stacked label/value rows. sm+: inline wrapping sentence. */}
            <div className="mt-2 flex flex-col gap-1.5 text-sm text-slate-500 sm:mt-1 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1 dark:text-slate-400">
              <span className="flex items-baseline justify-between gap-3 sm:inline">
                {t('insights.vsPrev')}:{' '}
                <DeltaBadge
                  delta={sumAmounts([insights.totals.current, -insights.totals.previous])}
                  pct={
                    insights.totals.previous === 0
                      ? null
                      : (insights.totals.current - insights.totals.previous) /
                        insights.totals.previous
                  }
                />
              </span>
              <span className="flex items-baseline justify-between gap-3 sm:inline">
                {t('insights.vsAvg', { count: insights.monthsAnalyzed })}:{' '}
                <DeltaBadge
                  delta={sumAmounts([insights.totals.current, -insights.totals.baselineAvg])}
                  pct={
                    insights.totals.baselineAvg === 0
                      ? null
                      : (insights.totals.current - insights.totals.baselineAvg) /
                        insights.totals.baselineAvg
                  }
                />
              </span>
              <span className="flex items-baseline justify-between gap-3 sm:inline">
                {t('insights.savings')}:{' '}
                <span className="shrink-0">
                  <span className="money-blur">{formatEur(insights.totals.savingsCurrent)}</span>{' '}
                  <DeltaBadge
                    delta={sumAmounts([
                      insights.totals.savingsCurrent,
                      -insights.totals.savingsPrevious,
                    ])}
                    pct={null}
                    goodWhenRising
                  />
                </span>
              </span>
            </div>
          </div>

          {noChanges && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('insights.noChanges')}</p>
          )}

          {topDeltas.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t('insights.biggestChanges')}</h3>
              <ul className="space-y-1.5">
                {topDeltas.map((d) => (
                  <li
                    key={d.categoryId}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: colorOf(d.categoryId) }}
                      />
                      <span className="truncate">
                        {iconOf(d.categoryId) && <span aria-hidden>{iconOf(d.categoryId)} </span>}
                        {nameOf(d.categoryId)}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="money-blur">{formatEur(d.current)}</span>
                      <DeltaBadge delta={d.deltaPrev} pct={d.pctPrev} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insights.newCategories.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t('insights.newSpending')}</h3>
              <ul className="space-y-1.5">
                {(showAllNew
                  ? insights.newCategories
                  : insights.newCategories.slice(0, LIST_CAP)
                ).map((n) => (
                  <li
                    key={n.categoryId}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>{nameOf(n.categoryId)}</span>
                    <span className={`money-blur ${RED}`}>{formatEur(n.total)}</span>
                  </li>
                ))}
              </ul>
              <ShowMoreToggle
                total={insights.newCategories.length}
                expanded={showAllNew}
                onToggle={() => setShowAllNew((v) => !v)}
              />
            </div>
          )}

          {insights.vanishedCategories.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t('insights.vanishedSpending')}</h3>
              <ul className="space-y-1.5">
                {(showAllVanished
                  ? insights.vanishedCategories
                  : insights.vanishedCategories.slice(0, LIST_CAP)
                ).map((v) => (
                  <li
                    key={v.categoryId}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>{nameOf(v.categoryId)}</span>
                    <span className="money-blur text-slate-500 dark:text-slate-400">
                      {t('insights.wasPerMonth', { amount: formatEur(v.baselineAvg) })}
                    </span>
                  </li>
                ))}
              </ul>
              <ShowMoreToggle
                total={insights.vanishedCategories.length}
                expanded={showAllVanished}
                onToggle={() => setShowAllVanished((v) => !v)}
              />
            </div>
          )}

          {insights.streaks.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t('insights.trends')}</h3>
              <ul className="space-y-1.5">
                {(showAllStreaks ? insights.streaks : insights.streaks.slice(0, LIST_CAP)).map(
                  (s) => (
                    <li
                      key={s.categoryId}
                      className={`text-sm font-medium ${s.direction === 'rising' ? RED : GREEN}`}
                    >
                      {t(
                        s.direction === 'rising'
                          ? 'insights.risingStreak'
                          : 'insights.fallingStreak',
                        {
                          name: nameOf(s.categoryId),
                          count: s.months,
                        },
                      )}
                    </li>
                  ),
                )}
              </ul>
              <ShowMoreToggle
                total={insights.streaks.length}
                expanded={showAllStreaks}
                onToggle={() => setShowAllStreaks((v) => !v)}
              />
            </div>
          )}
        </>
      )}
    </section>
  )
}
