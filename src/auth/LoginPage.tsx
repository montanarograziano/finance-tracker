import { Wallet } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GoogleButton } from './GoogleButton'
import { useAuth } from './useAuth'

export function LoginPage() {
  const { t } = useTranslation()
  const { session, signIn, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (session) return <Navigate to="/" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await signIn(email, password)
    if (result.error) setError(result.error)
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
        <form onSubmit={onSubmit} className="card space-y-4 p-6 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{t('auth.signIn')}</h1>
          <div>
            <label htmlFor="email" className="form-label">
              {t('auth.email')}
            </label>
            <input
              id="email"
              type="email"
              required
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
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </div>
          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? t('auth.signingIn') : t('auth.signIn')}
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
            {t('auth.noAccount')}{' '}
            <Link
              to="/register"
              className="font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              {t('auth.register')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
