import { Wallet } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GoogleButton } from './GoogleButton'
import { useAuth } from './useAuth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function RegisterPage() {
  const { t } = useTranslation()
  const { session, signUp, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (session) return <Navigate to="/" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!EMAIL_RE.test(email)) {
      setError(t('auth.invalidEmail'))
      return
    }
    if (password.length < 8) {
      setError(t('auth.passwordTooShort'))
      return
    }
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'))
      return
    }
    setSubmitting(true)
    const result = await signUp(email, password)
    if (result.error) setError(result.error)
    else if (result.needsConfirmation) setConfirmationSent(true)
    setSubmitting(false)
  }

  const onGoogle = async () => {
    setError(null)
    const result = await signInWithGoogle()
    if (result.error) setError(result.error)
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
          <h1 className="text-xl font-semibold tracking-tight">{t('auth.signUp')}</h1>
          <div>
            <label htmlFor="email" className="form-label">
              {t('auth.email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="password" className="form-label">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
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
          {confirmationSent && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              {t('auth.confirmEmailSent')}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || confirmationSent}
            className="btn-primary w-full"
          >
            {submitting ? t('auth.creatingAccount') : t('auth.signUp')}
          </button>
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('auth.or')}
            </span>
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>
          <GoogleButton
            label={t('auth.continueWithGoogle')}
            onClick={() => void onGoogle()}
            disabled={submitting}
          />
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link
              to="/login"
              className="font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              {t('auth.signInLink')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
