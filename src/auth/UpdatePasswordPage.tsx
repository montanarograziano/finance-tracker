import { Wallet } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './useAuth'

export function UpdatePasswordPage() {
  const { t } = useTranslation()
  const { session, loading, updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (loading)
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        {t('common.loading')}
      </div>
    )

  if (done) return <Navigate to="/" replace />

  // This page only makes sense reached via the recovery link (AuthContext
  // routes here on the PASSWORD_RECOVERY event), which leaves a session
  // behind. Opened any other way there is no session, so show a dead-end
  // instead of a form that would just fail on submit.
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card w-full max-w-sm space-y-4 p-6 text-center sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">
            {t('auth.invalidResetLinkTitle')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('auth.invalidResetLinkBody')}
          </p>
          <Link to="/forgot-password" className="btn-primary block w-full">
            {t('auth.requestNewResetLink')}
          </Link>
        </div>
      </div>
    )
  }

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError(t('auth.passwordTooShort'))
      return
    }
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'))
      return
    }
    setSubmitting(true)
    const result = await updatePassword(password)
    if (result.error) setError(result.error)
    else setDone(true)
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <span
            aria-hidden
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-brand-950 shadow-md"
          >
            <Wallet size={24} />
          </span>
          <span className="text-lg font-semibold tracking-tight">Finance Tracker</span>
        </div>
        <form onSubmit={onSubmit} noValidate className="card space-y-4 p-6 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{t('auth.updatePasswordTitle')}</h1>
          <div>
            <label htmlFor="password" className="form-label">
              {t('auth.newPassword')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="form-label">
              {t('auth.confirmPassword')}
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input"
            />
          </div>
          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? t('auth.updatingPassword') : t('auth.updatePasswordButton')}
          </button>
        </form>
      </div>
    </div>
  )
}
