import { useContext } from 'react'
import { AuthContextObject, type AuthContextValue } from './types'

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContextObject)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
