import { useState, type SubmitEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme, type Theme } from '../lib/themeContext'
import { useAuth } from '../auth/AuthContext'
import { useAccounts, useCategories, useInvestments, useTransactions } from '../data/hooks'
import { transactionsToRows } from '../export/csv'
import { downloadXlsx } from '../export/xlsx'
import { isoDate } from '../domain/filters'

export function SettingsPage() {
  const { session, deleteAccount, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [confirmingDeletion, setConfirmingDeletion] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
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

  const accountEmail = session?.user.email ?? ''
  const deletionConfirmed = accountEmail !== '' && deleteConfirmation.trim() === accountEmail

  const deleteOwnAccount = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!deletionConfirmed) return
    setDeleting(true)
    setDeleteError(false)
    const result = await deleteAccount()
    if (result.error) {
      console.error('[delete-account]', result.error)
      setDeleteError(true)
      setDeleting(false)
    }
  }

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

      <section className="card space-y-3 border border-red-200 p-5 dark:border-red-900">
        <h2 className="font-semibold tracking-tight text-red-700 dark:text-red-400">
          {t('settings.dangerSection')}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('settings.deleteAccountDescription')}
        </p>
        {!confirmingDeletion ? (
          <button
            onClick={() => setConfirmingDeletion(true)}
            className="rounded-lg border border-red-600 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            {t('settings.deleteAccount')}
          </button>
        ) : (
          <form onSubmit={(event) => void deleteOwnAccount(event)} className="space-y-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {t('settings.deleteAccountWarning')}
            </p>
            <label className="block text-sm font-medium" htmlFor="delete-account-confirmation">
              {t('settings.deleteAccountConfirmation', { email: accountEmail })}
            </label>
            <input
              id="delete-account-confirmation"
              type="email"
              autoComplete="off"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              className="input"
              disabled={deleting}
            />
            {deleteError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {t('settings.deleteAccountError')}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={!deletionConfirmed || deleting}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? t('settings.deletingAccount') : t('settings.confirmDeleteAccount')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingDeletion(false)
                  setDeleteConfirmation('')
                  setDeleteError(false)
                }}
                disabled={deleting}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
