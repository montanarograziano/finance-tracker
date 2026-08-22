import { useTranslation } from 'react-i18next'
import { useTheme, type Theme } from '../lib/themeContext'
import { useAuth } from '../auth/AuthContext'
import { useAccounts, useCategories, useInvestments, useTransactions } from '../data/hooks'
import { transactionsToRows } from '../export/csv'
import { downloadXlsx } from '../export/xlsx'
import { isoDate } from '../domain/filters'

export function SettingsPage() {
  const { session, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const { data: transactions = [] } = useTransactions()
  const { data: investments = [] } = useInvestments()

  const exportBackup = () =>
    downloadXlsx(
      [
        { name: 'Conti', rows: accounts },
        { name: 'Categorie', rows: categories },
        { name: 'Transazioni', rows: transactionsToRows(transactions, accounts, categories) },
        { name: 'Investimenti', rows: investments },
      ],
      `backup-finanze-${isoDate(new Date())}.xlsx`,
    )

  const themeOptions: { value: Theme; label: string }[] = [
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
    { value: 'system', label: t('settings.themeSystem') },
  ]

  const langOptions: { value: 'it' | 'en'; label: string }[] = [
    { value: 'it', label: t('settings.languageIt') },
    { value: 'en', label: t('settings.languageEn') },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold tracking-tight">{t('settings.profileSection')}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{session?.user.email}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('settings.currency')}</p>
        <button onClick={() => void signOut()} className="btn-secondary">
          {t('settings.signOut')}
        </button>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold tracking-tight">{t('settings.themeSection')}</h2>
        <div className="seg">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`seg-btn ${theme === opt.value ? 'seg-btn-active' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold tracking-tight">{t('settings.languageSection')}</h2>
        <div className="seg">
          {langOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => void i18n.changeLanguage(opt.value)}
              className={`seg-btn ${i18n.language === opt.value ? 'seg-btn-active' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold tracking-tight">{t('settings.backupSection')}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('settings.backupDescription')}
        </p>
        <button onClick={exportBackup} className="btn-primary">
          {t('settings.exportBackup')}
        </button>
      </section>
    </div>
  )
}
