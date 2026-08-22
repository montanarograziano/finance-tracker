import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useImportTransactions, useTransactions } from '../data/hooks'
import {
  buildImportPlan,
  missingColumns,
  parseSpreadsheet,
  type ImportPlan,
} from '../domain/importTransactions'
import { formatEur } from '../lib/money'
import type { Account, Category } from '../lib/types'

interface Props {
  accounts: Account[]
  categories: Category[]
  onClose: () => void
}

export function ImportTransactions({ accounts, categories, onClose }: Props) {
  const { t } = useTranslation()
  // Full unfiltered history: duplicate detection must not depend on the page's period filter.
  const { data: transactions = [] } = useTransactions()
  const importMutation = useImportTransactions()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fileName, setFileName] = useState<string | null>(null)
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [importedCount, setImportedCount] = useState<number | null>(null)

  const onFile = async (file: File) => {
    setFileError(null)
    setPlan(null)
    setImportedCount(null)
    setFileName(file.name)
    try {
      const raw = parseSpreadsheet(await file.arrayBuffer())
      const missing = missingColumns(raw)
      if (missing.length > 0) {
        setFileError(t('import.missingColumns', { columns: missing.join(', ') }))
        return
      }
      const nextPlan = buildImportPlan(raw, accounts, categories, transactions)
      setPlan(nextPlan)
      setExcluded(new Set(nextPlan.rows.filter((r) => r.isDuplicate).map((r) => r.row)))
    } catch {
      setFileError(t('import.parseError'))
    }
  }

  const toggleRow = (row: number) => {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(row)) next.delete(row)
      else next.add(row)
      return next
    })
  }

  const included = plan ? plan.rows.filter((r) => !excluded.has(r.row)) : []

  const onConfirm = () => {
    importMutation.mutate(
      { rows: included, accounts, categories },
      { onSuccess: (count) => setImportedCount(count) },
    )
  }

  if (importedCount !== null) {
    return (
      <section className="card space-y-3 p-5">
        <h2 className="font-semibold tracking-tight">{t('import.title')}</h2>
        <p className="text-sm text-pos">{t('import.success', { count: importedCount })}</p>
        <button onClick={onClose} className="btn-secondary">
          {t('import.close')}
        </button>
      </section>
    )
  }

  return (
    <section className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold tracking-tight">{t('import.title')}</h2>
        <button onClick={onClose} className="btn-secondary px-3 py-1.5">
          {t('import.cancel')}
        </button>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">{t('import.hint')}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500">{t('import.schemaHint')}</p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          aria-label={t('import.fileLabel')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void onFile(file)
            e.target.value = ''
          }}
        />
        <button onClick={() => fileInputRef.current?.click()} className="btn-primary">
          {t('import.chooseFile')}
        </button>
        {fileName && <span className="text-sm text-slate-500 dark:text-slate-400">{fileName}</span>}
      </div>

      {fileError && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
          {fileError}
        </p>
      )}

      {plan && (
        <div className="space-y-4">
          {plan.errors.length > 0 && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
              <p className="font-medium">
                {t('import.errorsTitle', { count: plan.errors.length })}
              </p>
              <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto">
                {plan.errors.map((e) => (
                  <li key={e.row}>{t('import.rowError', { row: e.row, message: e.message })}</li>
                ))}
              </ul>
            </div>
          )}

          {(plan.newAccounts.length > 0 || plan.newCategories.length > 0) && (
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">
              <p className="font-medium">{t('import.willCreateTitle')}</p>
              {plan.newAccounts.length > 0 && (
                <p className="mt-1">
                  {t('import.newAccounts')}: {plan.newAccounts.join(', ')}
                </p>
              )}
              {plan.newCategories.length > 0 && (
                <p className="mt-1">
                  {t('import.newCategories')}:{' '}
                  {plan.newCategories.map((c) => `${c.name} (${c.type})`).join(', ')}
                </p>
              )}
            </div>
          )}

          {plan.rows.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t('import.previewTitle', { count: plan.rows.length })}
              </p>
              <ul className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
                {plan.rows.map((r) => (
                  <li
                    key={r.row}
                    className={`flex items-center gap-2 border-b border-slate-100 py-1.5 text-sm last:border-0 dark:border-slate-800 ${
                      excluded.has(r.row) ? 'opacity-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      aria-label={t('import.includeRow', { row: r.row })}
                      checked={!excluded.has(r.row)}
                      onChange={() => toggleRow(r.row)}
                      className="accent-brand-600 dark:accent-brand-400"
                    />
                    <span className="w-20 shrink-0 text-xs text-slate-400 dark:text-slate-500">
                      {r.date}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {r.description}
                      <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">
                        · {r.account}
                        {r.category ? ` · ${r.category}` : ''}
                        {r.toAccount ? ` → ${r.toAccount}` : ''}
                      </span>
                      {r.isDuplicate && (
                        <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                          {t('import.duplicateBadge')}
                        </span>
                      )}
                    </span>
                    <span
                      className={`money-blur shrink-0 font-semibold ${
                        r.type === 'expense'
                          ? 'text-neg'
                          : r.type === 'income'
                            ? 'text-pos'
                            : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {r.type === 'expense' ? '-' : r.type === 'income' ? '+' : '⇄'}
                      {formatEur(r.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              {importMutation.isError && (
                <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                  {t('import.importError', { message: importMutation.error.message })}
                </p>
              )}
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={onConfirm}
                  disabled={included.length === 0 || importMutation.isPending}
                  className="btn-primary"
                >
                  {importMutation.isPending
                    ? t('import.importing')
                    : t('import.confirm', { count: included.length })}
                </button>
                {excluded.size > 0 && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t('import.excludedNote', { count: excluded.size })}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('import.noValidRows')}</p>
          )}
        </div>
      )}
    </section>
  )
}
