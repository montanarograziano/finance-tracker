import type { Session } from '@supabase/supabase-js'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthContextObject } from './types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      // The recovery link redirects to the bare app origin (see resetPassword
      // below), not a hash route, so we route to the update-password screen
      // ourselves once supabase-js has exchanged the `?code=` for a session.
      if (event === 'PASSWORD_RECOVERY') navigate('/update-password')
    })
    return () => subscription.unsubscribe()
  }, [navigate])

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    const credentials = captchaToken
      ? { email, password, options: { captchaToken } }
      : { email, password }
    const { error } = await supabase.auth.signInWithPassword(credentials)
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string, captchaToken?: string) => {
    const credentials = captchaToken
      ? { email, password, options: { captchaToken } }
      : { email, password }
    const { data, error } = await supabase.auth.signUp(credentials)
    // With "Confirm email" enabled on the Supabase project, signUp succeeds
    // but returns no session: the account exists and awaits the email link.
    return {
      error: error?.message ?? null,
      needsConfirmation: !error && !!data.user && !data.session,
    }
  }

  const signInWithGoogle = async () => {
    // Full-page redirect to Google; the session lands via onAuthStateChange
    // after Supabase redirects back to the app.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // GitHub Pages serves this from a /finance-tracker/ subpath, so the
      // redirect must include BASE_URL or it lands one level too high.
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    return { error: error?.message ?? null }
  }

  const resetPassword = async (email: string, captchaToken?: string) => {
    // Recovery links come back as a `?code=` query parameter (PKCE flow), not a
    // URL fragment, so redirectTo must NOT contain a hash route: appending
    // `?code=` to `.../#/update-password` would put the query string *inside*
    // the fragment, where supabase-js's detectSessionInUrl (which reads
    // window.location.search) never looks. Instead we redirect to the bare app
    // origin and let AuthContext's onAuthStateChange listener react to the
    // PASSWORD_RECOVERY event to route the user to the update-password screen.
    const options = { redirectTo: window.location.origin + import.meta.env.BASE_URL }
    const { error } = await supabase.auth.resetPasswordForEmail(
      email,
      captchaToken ? { ...options, captchaToken } : options,
    )
    // Supabase intentionally reports success here even when no account exists
    // for the address, to avoid leaking which emails are registered. Do not
    // special-case a "not found" error: there isn't one, and there must never
    // be one, or this becomes an enumeration oracle.
    return { error: error?.message ?? null }
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContextObject.Provider
      value={{
        session,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        resetPassword,
        updatePassword,
        signOut,
      }}
    >
      {children}
    </AuthContextObject.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { useAuth } from './useAuth'
