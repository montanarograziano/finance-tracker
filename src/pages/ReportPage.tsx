import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccounts, useCategories, useTransactions } from '../data/hooks'
import { expensesByCategory, monthlyAverages } from '../domain/aggregations'
import { filterTransactions } from '../domain/filters'
import { TRANSACTION_COLUMNS, toCsv, transactionsToRows } from '../export/csv'
import { downloadCsv } from '../export/download'
import { downloadReportPdf } from '../export/pdf'
import { downloadXlsx } from '../export/xlsx'
import { formatEur, formatPct, sumAmounts } from '../lib/money'
import { MonthlyAveragesRow } from '../components/MonthlyAveragesRow'

export function ReportPage() {
  const { t, i18n } = useTranslation()
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const { data: transactions = [], isLoading } = useTransactions()

  const locale = i18n.language === 'it' ? 'it-IT' : 'en-US'
  const monthLabels = Array.from({ length: 12 }, (_, i) => {
    const name = new Date(2000, i, 1).toLocaleDateString(locale, { month: 'long' })
    return name.charAt(0).toUpperCase() + name.slice(1)
  })

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState<number | ''>(now.getMonth() + 1) // '' = intero anno

  const from = month === '' ? `${year}-01-01` : `${year}-${String(month).padStart(2, '0')}-01`
  const to = month === '' ? `${year}-12-31` : `${year}-${String(month).padStart(2, '0')}-31` // lexicographic upper bound, safe for filtering
  const periodLabel =
    month === '' ? `${t('report.yearLabel')} ${year}` : `${monthLabels[Number(month) - 1]} ${year}`

  const filtered = filterTransactions(transactions, { range: { from, to } })
  const income = sumAmounts(filtered.filter((t) => t.type === 'income').map((t) => t.amount))
  const expenses = sumAmounts(filtered.filter((t) => t.type === 'expense').map((t) => t.amount))
  const categoryName = new Map(categories.map((c) => [c.id, c.name]))
  const byCategory = expensesByCategory(filtered).map((entry) => ({
    name: categoryName.get(entry.categoryId) ?? t('common.uncategorized'),
    total: entry.total,
  }))
  const averages = month === '' ? monthlyAverages(filtered, { from, to }, now) : null

  const filenameBase =
    month === '' ? `report-${year}` : `report-${year}-${String(month).padStart(2, '0')}`

  const exportCsv = () =>
    downloadCsv(
      toCsv(transactionsToRows(filtered, accounts, categories), TRANSACTION_COLUMNS),
      `${filenameBase}.csv`,
    )

  const exportXlsx = () =>
    downloadXlsx(
      [
        {
          name: t('report.xlsxSummarySheet'),
          rows: [
            { voce: t('report.xlsxPeriodRow'), valore: periodLabel },
            { voce: t('report.income'), valore: income },
            { voce: t('report.expenses'), valore: expenses },
            { voce: t('report.balance'), valore: sumAmounts([income, -expenses]) },
          ],
        },
        { name: t('report.xlsxByCategorySheet'), rows: byCategory },
        {
          name: t('report.xlsxTransactionsSheet'),
          rows: transactionsToRows(filtered, accounts, categories),
        },
      ],
      `${filenameBase}.xlsx`,
    )

  const accountName = new Map(accounts.map((a) => [a.id, a.name]))
  const exportPdf = () =>
    downloadReportPdf(
      {
        title: t('report.pdfTitle', { period: periodLabel }),
        summary: [
          { label: t('report.income'), value: formatEur(income) },
          { label: t('report.expenses'), value: formatEur(expenses) },
          { label: t('report.balance'), value: formatEur(sumAmounts([income, -expenses])) },
        ],
        byCategory: byCategory.map((c) => ({ name: c.name, total: formatEur(c.total) })),
        transactions: filtered.map((tx) => [
          tx.date,
          tx.description,
          tx.category_id ? (categoryName.get(tx.category_id) ?? '') : '',
          accountName.get(tx.account_id) ?? '',
          formatEur(tx.type === 'expense' ? -tx.amount : tx.amount),
        ]),
      },
      `${filenameBase}.pdf`,
    )

  if (isLoading) return <p className="text-slate-500 dark:text-slate-400">{t('common.loading')}</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('report.title')}</h1>

      <div className="flex flex-wrap gap-2">
        <select
          aria-label={t('report.monthLabel')}
          value={month}
          onChange={(e) => setMonth(e.target.value === '' ? '' : Number(e.target.value))}
          className="input w-auto"
        >
          <option value="">{t('report.fullYear')}</option>
          {monthLabels.map((label, i) => (
            <option key={label} value={i + 1}>
              {label}
            </option>
          ))}
        </select>
        <input
          aria-label={t('report.yearLabel')}
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="input w-24"
        />
        <button onClick={exportCsv} className="btn-secondary">
          {t('report.exportCsv')}
        </button>
        <button onClick={exportXlsx} className="btn-secondary">
          {t('report.exportXlsx')}
        </button>
        <button onClick={exportPdf} className="btn-secondary">
          {t('report.exportPdf')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="kpi-label">{t('report.income')}</p>
          <p className="kpi-value text-pos money-blur">{formatEur(income)}</p>
        </div>
        <div className="card p-5">
          <p className="kpi-label">{t('report.expenses')}</p>
          <p className="kpi-value text-neg money-blur">{formatEur(expenses)}</p>
        </div>
        <div className="card p-5">
          <p className="kpi-label">{t('report.balance')}</p>
          <p className="kpi-value money-blur">{formatEur(sumAmounts([income, -expenses]))}</p>
        </div>
      </div>

      <MonthlyAveragesRow averages={averages} />

      <section className="card p-5">
        <h2 className="mb-3 font-semibold tracking-tight">
          {t('report.expensesByCategory', { period: periodLabel })}
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="py-2">{t('report.categoryCol')}</th>
              <th className="py-2 text-right">{t('report.totalCol')}</th>
              <th className="py-2 text-right">{t('report.pctCol')}</th>
            </tr>
          </thead>
          <tbody>
            {byCategory.map((c) => (
              <tr
                key={c.name}
                className="border-b border-slate-100 last:border-0 dark:border-slate-800"
              >
                <td className="py-2.5">{c.name}</td>
                <td className="money-blur py-2.5 text-right font-medium">{formatEur(c.total)}</td>
                <td className="py-2.5 text-right text-slate-500 dark:text-slate-400">
                  {formatPct(expenses > 0 ? c.total / expenses : 0)}
                </td>
              </tr>
            ))}
            {byCategory.length === 0 && (
              <tr>
                <td colSpan={3} className="py-2.5 text-slate-500 dark:text-slate-400">
                  {t('report.noExpenses')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
