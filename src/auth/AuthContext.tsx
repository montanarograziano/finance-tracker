import type { Session } from '@supabase/supabase-js'
import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContextObject } from './types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => subscription.unsubscribe()
  }, [])

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
      options: { redirectTo: window.location.origin },
    })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContextObject.Provider
      value={{ session, loading, signIn, signUp, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContextObject.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { useAuth } from './useAuth'
