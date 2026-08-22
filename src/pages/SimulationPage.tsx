import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ScenarioItemForm } from '../components/ScenarioItemForm'
import { useCategories, useNetWorthSeries, useTransactions } from '../data/hooks'
import { monthlyAverages, monthOf } from '../domain/aggregations'
import {
  categoryMonthlyAverages,
  lastCompleteMonthsRange,
  scenarioMonthlyCost,
  simulateNetWorth,
  type ScenarioItem,
} from '../domain/simulation'
import {
  CHART,
  chartTick,
  legendStyle,
  tooltipContentStyle,
  tooltipLabelStyle,
} from '../lib/chartTheme'
import { formatEur, tickEur } from '../lib/money'

export function SimulationPage() {
  const { t } = useTranslation()
  const { data: baseline = [], isLoading } = useNetWorthSeries()
  const { data: transactions = [] } = useTransactions()
  const { data: categories = [] } = useCategories()

  const [items, setItems] = useState<ScenarioItem[]>([])
  const [horizonMonths, setHorizonMonths] = useState(12)
  const [windowMonths, setWindowMonths] = useState<number | ''>(12) // '' = tutto lo storico

  const sim = useMemo(() => {
    const today = new Date()
    const avgWindow = lastCompleteMonthsRange(today, 12)
    // Clamp to the first recorded month: without this, an empty or short history
    // still yields 12 "complete" zero months and a bogus flat projection.
    const firstTxMonth = transactions.reduce(
      (min, t) => (monthOf(t.date) < min ? monthOf(t.date) : min),
      '9999-12',
    )
    if (`${firstTxMonth}-01` > avgWindow.from) avgWindow.from = `${firstTxMonth}-01`
    const averages = monthlyAverages(transactions, avgWindow, today)
    const categoryAvg = categoryMonthlyAverages(transactions, avgWindow, today)
    const points = simulateNetWorth(baseline, transactions, items, {
      horizonMonths,
      today,
      avgMonthlySavings: averages?.avgSavings ?? null,
      categoryMonthlyAvg: categoryAvg,
    })
    return {
      points,
      projectionDisabled: averages === null,
      monthlyCost: scenarioMonthlyCost(items, categoryAvg),
    }
  }, [baseline, transactions, items, horizonMonths])

  const visiblePoints = useMemo(() => {
    if (windowMonths === '') return sim.points
    const past = sim.points.filter((p) => !p.isProjection)
    if (past.length <= windowMonths) return sim.points
    const cutoff = past[past.length - windowMonths].month
    return sim.points.filter((p) => p.month >= cutoff)
  }, [sim.points, windowMonths])

  const lastRealIdx = visiblePoints.reduce((acc, p, i) => (p.isProjection ? acc : i), -1)
  const chartData = visiblePoints.map((p, i) => ({
    month: p.month,
    baselinePast: p.isProjection ? null : p.baseline,
    simulatedPast: p.isProjection ? null : p.simulated,
    baselineFuture: p.isProjection || i === lastRealIdx ? p.baseline : null,
    simulatedFuture: p.isProjection || i === lastRealIdx ? p.simulated : null,
  }))
  const todayMonth = lastRealIdx >= 0 ? visiblePoints[lastRealIdx].month : null

  const hasScenario = items.length > 0
  const last = sim.points[sim.points.length - 1]
  // KPIs intentionally span the full simulated series, independent of the chart's "Mostra da" window.
  const finalDelta = last ? last.simulated - last.baseline : 0
  const minSimulated = sim.points.length > 0 ? Math.min(...sim.points.map((p) => p.simulated)) : 0

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index))

  if (isLoading) return <p className="text-slate-500 dark:text-slate-400">{t('common.loading')}</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('simulation.title')}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">{t('simulation.subtitle')}</p>

      <ScenarioItemForm
        categories={categories}
        onAdd={(item) => setItems((prev) => [...prev, item])}
      />

      {hasScenario && (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="card flex items-center justify-between px-4 py-2.5 text-sm">
              <span>
                {item.description}
                <span className="money-blur ml-2 text-xs text-slate-400 dark:text-slate-500">
                  {item.kind === 'recurring' &&
                    (item.frequency === 'monthly'
                      ? `${formatEur(item.amount)}${t('simulation.perMonth')}`
                      : `${formatEur(item.amount)}${t('simulation.perYear')}`)}
                  {item.kind === 'oneoff' &&
                    `${formatEur(item.amount)} ${t('simulation.oneoffOn')} ${item.date}`}
                  {item.kind === 'adjust' && t('simulation.categoryAdjust')}
                </span>
              </span>
              <button
                onClick={() => removeItem(i)}
                aria-label={t('simulation.removeItem', { name: item.description })}
                className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          {t('simulation.showFrom')}
          <select
            aria-label={t('simulation.windowLabel')}
            value={windowMonths}
            onChange={(e) => setWindowMonths(e.target.value === '' ? '' : Number(e.target.value))}
            className="input w-auto"
          >
            <option value={12}>{t('simulation.window12')}</option>
            <option value={24}>{t('simulation.window24')}</option>
            <option value={36}>{t('simulation.window36')}</option>
            <option value="">{t('simulation.windowAll')}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          {t('simulation.horizon', { months: horizonMonths })}
          <input
            aria-label={t('simulation.horizonLabel')}
            type="range"
            min="0"
            max="36"
            value={horizonMonths}
            onChange={(e) => setHorizonMonths(Number(e.target.value))}
            className="accent-brand-600 dark:accent-brand-400"
          />
        </label>
      </div>

      {sim.projectionDisabled && horizonMonths > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
          {t('simulation.projectionDisabled')}
        </p>
      )}

      {hasScenario && last && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="card p-5">
            <p className="kpi-label">{t('simulation.netWorthDelta')}</p>
            <p className={`kpi-value money-blur ${finalDelta < 0 ? 'text-neg' : 'text-pos'}`}>
              {formatEur(finalDelta)}
            </p>
          </div>
          <div className="card p-5">
            <p className="kpi-label">{t('simulation.monthlyCost')}</p>
            <p className="kpi-value money-blur">{formatEur(sim.monthlyCost)}</p>
          </div>
          <div className="card p-5">
            <p className="kpi-label">{t('simulation.minNetWorth')}</p>
            <p className={`kpi-value money-blur ${minSimulated < 0 ? 'text-neg' : ''}`}>
              {formatEur(minSimulated)}
            </p>
            {minSimulated < 0 && (
              <p className="mt-1 text-xs font-medium text-neg">{t('simulation.negativeWarning')}</p>
            )}
          </div>
        </div>
      )}

      <section className="card p-5">
        <h2 className="mb-3 font-semibold tracking-tight">{t('simulation.chartTitle')}</h2>
        {chartData.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('simulation.noHistory')}</p>
        ) : (
          <div className="money-blur">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="month" tick={chartTick} axisLine={false} tickLine={false} />
                <YAxis
                  width={60}
                  tickFormatter={tickEur}
                  tick={chartTick}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => formatEur(Number(v))}
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                />
                <Legend wrapperStyle={legendStyle} />
                {todayMonth && horizonMonths > 0 && !sim.projectionDisabled && (
                  <ReferenceLine x={todayMonth} stroke={CHART.axis} label={t('simulation.today')} />
                )}
                <Line
                  type="monotone"
                  dataKey="baselinePast"
                  stroke={CHART.line}
                  strokeWidth={2}
                  name={t('simulation.lineBaseline')}
                  dot={false}
                />
                {hasScenario && (
                  <Line
                    type="monotone"
                    dataKey="simulatedPast"
                    stroke={CHART.alt}
                    strokeWidth={2}
                    name={t('simulation.lineSimulated')}
                    dot={false}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="baselineFuture"
                  stroke={CHART.line}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name={t('simulation.lineProjection')}
                  dot={false}
                  legendType="none"
                />
                {hasScenario && (
                  <Line
                    type="monotone"
                    dataKey="simulatedFuture"
                    stroke={CHART.alt}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name={t('simulation.lineSimulatedProjection')}
                    dot={false}
                    legendType="none"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}
