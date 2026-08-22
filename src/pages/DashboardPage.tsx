import { ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { InsightsCard } from '../components/InsightsCard'
import { MonthlyAveragesRow } from '../components/MonthlyAveragesRow'
import { PeriodFilter, type PeriodValue } from '../components/PeriodFilter'
import {
  useAccountBalances,
  useCategories,
  useNetWorthSeries,
  useTransactions,
} from '../data/hooks'
import { expensesByCategory, incomeVsExpenseByMonth, monthlyAverages } from '../domain/aggregations'
import { lastDayOfMonth, rangeForPreset } from '../domain/filters'
import {
  CHART,
  chartTick,
  legendStyle,
  tooltipContentStyle,
  tooltipLabelStyle,
} from '../lib/chartTheme'
import { formatEur, formatPct, sumAmounts, tickEur } from '../lib/money'

const pieLabel = ({ percent }: { percent?: unknown }) =>
  formatPct(typeof percent === 'number' ? percent : 0)

type SortCol = 'date' | 'description' | 'amount'

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const { data: accountBalances = [], isLoading } = useAccountBalances()
  const { data: categories = [] } = useCategories()
  const { data: worthData = [] } = useNetWorthSeries()

  const today = new Date()
  const [period, setPeriod] = useState<PeriodValue>({
    preset: 'current-month',
    custom: rangeForPreset('current-month', today),
  })
  const [accountId, setAccountId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [sortCol, setSortCol] = useState<SortCol>('amount')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const detailRef = useRef<HTMLDivElement>(null)

  const locale = i18n.language === 'it' ? 'it-IT' : 'en-US'
  const formatMonth = (yyyyMM: string): string => {
    const [y, m] = yyyyMM.split('-').map(Number)
    const label = new Date(y, m - 1, 1).toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }

  const range = period.preset === 'custom' ? period.custom : rangeForPreset(period.preset, today)

  const { data: transactions = [] } = useTransactions({
    from: range.from,
    to: range.to,
    accountId: accountId || undefined,
  })

  const selectedRange = selectedMonth
    ? { from: `${selectedMonth}-01`, to: lastDayOfMonth(selectedMonth) }
    : null

  const { data: monthTransactions = [], isLoading: isLoadingMonth } = useTransactions(
    selectedRange ?? {},
    { enabled: !!selectedMonth },
  )

  useEffect(() => {
    if (selectedMonth && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedMonth])

  const worth = sumAmounts(accountBalances.map((a) => a.balance))
  const categoryName = new Map(categories.map((c) => [c.id, c.name]))
  const categoryColor = new Map(categories.map((c) => [c.id, c.color]))
  const categoryIcon = new Map(categories.map((c) => [c.id, c.icon]))

  const pieData = expensesByCategory(transactions).map((entry) => ({
    name: categoryName.get(entry.categoryId) ?? t('common.uncategorized'),
    value: entry.total,
    color: categoryColor.get(entry.categoryId) ?? '#6b7280',
  }))
  const monthlyData = incomeVsExpenseByMonth(transactions)
  const totalExpenses = sumAmounts(pieData.map((d) => d.value))
  const totalIncome = sumAmounts(monthlyData.map((m) => m.income))

  const monthPieData = selectedMonth
    ? expensesByCategory(monthTransactions).map((entry) => ({
        name: categoryName.get(entry.categoryId) ?? t('common.uncategorized'),
        value: entry.total,
        color: categoryColor.get(entry.categoryId) ?? '#6b7280',
      }))
    : []
  const monthTotalExpenses = sumAmounts(monthPieData.map((d) => d.value))

  const handleSort = (col: SortCol) => {
    if (col === sortCol) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const sortedTransactions = [...monthTransactions].sort((a, b) => {
    let cmp: number
    if (sortCol === 'date') cmp = a.date.localeCompare(b.date)
    else if (sortCol === 'description') cmp = a.description.localeCompare(b.description, 'it')
    else cmp = a.amount - b.amount
    return sortDir === 'desc' ? -cmp : cmp
  })

  const handleBarClick = (data: { activeLabel?: string | number }) => {
    const month = typeof data?.activeLabel === 'string' ? data.activeLabel : null
    if (month) setSelectedMonth((prev) => (prev === month ? null : month))
  }

  if (isLoading) return <p className="text-slate-500 dark:text-slate-400">{t('common.loading')}</p>

  // Fresh account with no data yet: confirm the signup worked and point
  // to the first useful actions instead of showing empty charts.
  if (accountBalances.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t('dashboard.title')}</h1>
        <section className="card flex flex-col items-center gap-4 p-8 text-center sm:p-12">
          <span
            aria-hidden
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-brand-950 shadow-md"
          >
            <Wallet size={26} />
          </span>
          <h2 className="text-lg font-semibold tracking-tight">{t('dashboard.welcomeTitle')}</h2>
          <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
            {t('dashboard.welcomeBody')}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Link to="/accounts" className="btn-primary">
              {t('dashboard.welcomeCtaAccounts')}
            </Link>
            <Link to="/transactions" className="btn-secondary">
              {t('dashboard.welcomeCtaImport')}
            </Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('dashboard.title')}</h1>
      <PeriodFilter
        value={period}
        onChange={setPeriod}
        accounts={accountBalances}
        accountId={accountId}
        onAccountChange={setAccountId}
      />

      {/* Mobile: one card with three label/value rows. md+: three separate cards with icons. */}
      <div className="card divide-y divide-slate-100 px-4 dark:divide-slate-800 md:grid md:grid-cols-3 md:gap-4 md:divide-y-0 md:border-none md:bg-transparent md:px-0 md:shadow-none dark:md:bg-transparent">
        <div className="flex items-center justify-between gap-3 py-3 md:card md:items-start md:p-5">
          <div className="flex flex-1 items-center justify-between gap-3 md:block">
            <p className="kpi-label">{t('dashboard.netWorth')}</p>
            <p className="money-blur text-lg font-semibold tracking-tight md:mt-1 md:text-2xl">
              {formatEur(worth)}
            </p>
          </div>
          <span
            aria-hidden
            className="hidden h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 md:flex dark:bg-brand-500/10 dark:text-brand-400"
          >
            <Wallet size={18} />
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 py-3 md:card md:items-start md:p-5">
          <div className="flex flex-1 items-center justify-between gap-3 md:block">
            <p className="kpi-label">{t('dashboard.periodIncome')}</p>
            <p className="text-pos money-blur text-lg font-semibold tracking-tight md:mt-1 md:text-2xl">
              {formatEur(totalIncome)}
            </p>
          </div>
          <span
            aria-hidden
            className="hidden h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 md:flex dark:bg-emerald-500/10 dark:text-emerald-400"
          >
            <ArrowUpRight size={18} />
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 py-3 md:card md:items-start md:p-5">
          <div className="flex flex-1 items-center justify-between gap-3 md:block">
            <p className="kpi-label">{t('dashboard.periodExpense')}</p>
            <p className="text-neg money-blur text-lg font-semibold tracking-tight md:mt-1 md:text-2xl">
              {formatEur(totalExpenses)}
            </p>
          </div>
          <span
            aria-hidden
            className="hidden h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 md:flex dark:bg-rose-500/10 dark:text-rose-400"
          >
            <ArrowDownRight size={18} />
          </span>
        </div>
      </div>

      <MonthlyAveragesRow averages={monthlyAverages(transactions, range, today)} />

      <InsightsCard />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold tracking-tight">{t('dashboard.netWorthChart')}</h2>
          <div className="money-blur">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={worthData}>
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
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={CHART.line}
                  strokeWidth={2}
                  name={t('dashboard.patrimony')}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-semibold tracking-tight">{t('dashboard.expensesByCategory')}</h2>
          <div className="money-blur">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  label={pieLabel}
                  innerRadius="55%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => {
                    const value = Number(v)
                    return totalExpenses > 0
                      ? `${formatEur(value)} · ${formatPct(value / totalExpenses)}`
                      : formatEur(value)
                  }}
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                />
                <Legend wrapperStyle={legendStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="lg:col-span-2 space-y-4">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold tracking-tight">
              {t('dashboard.incomeVsExpense')}
              <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                {t('dashboard.clickBarForDetails')}
              </span>
            </h2>
            <div className="money-blur">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData} style={{ cursor: 'pointer' }} onClick={handleBarClick}>
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
                    cursor={{ fill: 'var(--chart-grid)', opacity: 0.4 }}
                  />
                  <Legend wrapperStyle={legendStyle} />
                  <Bar dataKey="income" name={t('averages.income')} radius={[4, 4, 0, 0]}>
                    {monthlyData.map((entry) => (
                      <Cell
                        key={entry.month}
                        fill={selectedMonth === entry.month ? CHART.incomeActive : CHART.income}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="expense" name={t('averages.expense')} radius={[4, 4, 0, 0]}>
                    {monthlyData.map((entry) => (
                      <Cell
                        key={entry.month}
                        fill={selectedMonth === entry.month ? CHART.expenseActive : CHART.expense}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {selectedMonth && (
            <section ref={detailRef} className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold tracking-tight">{formatMonth(selectedMonth)}</h2>
                <button
                  onClick={() => setSelectedMonth(null)}
                  aria-label={t('dashboard.closeDetail')}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              </div>

              {isLoadingMonth ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {t('dashboard.expensesByCategory')}
                    </p>
                    {monthPieData.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t('dashboard.noExpenses')}
                      </p>
                    ) : (
                      <div className="money-blur">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={monthPieData}
                              dataKey="value"
                              nameKey="name"
                              label={pieLabel}
                              innerRadius="55%"
                              paddingAngle={2}
                              stroke="none"
                            >
                              {monthPieData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(v) => {
                                const value = Number(v)
                                return monthTotalExpenses > 0
                                  ? `${formatEur(value)} · ${formatPct(value / monthTotalExpenses)}`
                                  : formatEur(value)
                              }}
                              contentStyle={tooltipContentStyle}
                              labelStyle={tooltipLabelStyle}
                            />
                            <Legend wrapperStyle={legendStyle} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-1 flex items-center text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <button
                        onClick={() => handleSort('date')}
                        className={`w-24 shrink-0 text-left transition-colors hover:text-slate-600 dark:hover:text-slate-300 ${sortCol === 'date' ? 'font-semibold text-slate-700 dark:text-slate-200' : ''}`}
                      >
                        {t('dashboard.dateCol')}{' '}
                        {sortCol === 'date' && (sortDir === 'desc' ? '↓' : '↑')}
                      </button>
                      <button
                        onClick={() => handleSort('description')}
                        className={`flex-1 text-left transition-colors hover:text-slate-600 dark:hover:text-slate-300 ${sortCol === 'description' ? 'font-semibold text-slate-700 dark:text-slate-200' : ''}`}
                      >
                        {t('dashboard.nameCol')}{' '}
                        {sortCol === 'description' && (sortDir === 'desc' ? '↓' : '↑')}
                      </button>
                      <button
                        onClick={() => handleSort('amount')}
                        className={`text-right transition-colors hover:text-slate-600 dark:hover:text-slate-300 ${sortCol === 'amount' ? 'font-semibold text-slate-700 dark:text-slate-200' : ''}`}
                      >
                        {t('dashboard.amountCol')}{' '}
                        {sortCol === 'amount' && (sortDir === 'desc' ? '↓' : '↑')}
                      </button>
                    </div>
                    <ul className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
                      {sortedTransactions.map((tx) => {
                        const icon = tx.category_id ? categoryIcon.get(tx.category_id) : undefined
                        const name = tx.category_id ? categoryName.get(tx.category_id) : undefined
                        return (
                          <li
                            key={tx.id}
                            className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5 text-sm last:border-0 dark:border-slate-800"
                          >
                            <div className="min-w-0 truncate">
                              <span className="mr-1.5 text-xs text-slate-400 dark:text-slate-500">
                                {tx.date}
                              </span>
                              <span className="font-medium">{tx.description}</span>
                              {name && (
                                <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">
                                  · {icon ? `${icon} ` : ''}
                                  {name}
                                </span>
                              )}
                            </div>
                            <span
                              className={`money-blur shrink-0 font-semibold ${
                                tx.type === 'expense'
                                  ? 'text-neg'
                                  : tx.type === 'income'
                                    ? 'text-pos'
                                    : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : '⇄'}
                              {formatEur(tx.amount)}
                            </span>
                          </li>
                        )
                      })}
                      {monthTransactions.length === 0 && (
                        <li className="text-sm text-slate-500 dark:text-slate-400">
                          {t('dashboard.noTransactions')}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
