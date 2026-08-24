import { Wallet } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { isCaptchaEnabled } from './captcha'
import { Turnstile } from './Turnstile'
import { useAuth } from './useAuth'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { session, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaReset, setCaptchaReset] = useState(0)

  if (session) return <Navigate to="/" replace />

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    if (isCaptchaEnabled() && !captchaToken) {
      setError(t('auth.captchaRequired'))
      return
    }
    setSubmitting(true)
    const result = await resetPassword(email, captchaToken ?? undefined)
    // Always show the same neutral confirmation, whether or not the address
    // is registered: resetPasswordForEmail succeeds either way by design, and
    // branching on it here would turn this form into an account-enumeration
    // oracle. Only a genuine request error (e.g. captcha failure) is surfaced.
    //
    // The raw message is deliberately NOT rendered. GoTrue answers a failed
    // mail send with a 500 whose body is literally `{}`, which supabase-js
    // hands over as the error message, so the user was shown "{}" -- observed
    // in production, not hypothetical. Backend internals are not actionable
    // for the person staring at the form, so they get one translated sentence
    // and the real message goes to the console for whoever is debugging.
    if (result.error) {
      console.error('[reset-password]', result.error)
      setError(t('auth.resetRequestFailed'))
    } else setSent(true)
    setCaptchaReset((value) => value + 1)
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
        <form onSubmit={onSubmit} className="card space-y-4 p-6 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{t('auth.forgotPasswordTitle')}</h1>
          {sent ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              {t('auth.resetLinkSent')}
            </p>
          ) : (
            <>
              <div>
                <label htmlFor="email" className="form-label">
                  {t('auth.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                />
              </div>
              <Turnstile
                label={t('auth.securityVerification')}
                onToken={setCaptchaToken}
                resetKey={captchaReset}
              />
              {error && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                  {error}
                </p>
              )}
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? t('auth.sendingResetLink') : t('auth.sendResetLink')}
              </button>
            </>
          )}
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            <Link
              to="/login"
              className="font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              {t('auth.backToSignIn')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
