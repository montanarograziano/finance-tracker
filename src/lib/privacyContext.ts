import { createContext, useContext } from 'react'

export interface PrivacyContextValue {
  hideMoney: boolean
  toggleHideMoney: () => void
}

export const PrivacyCtx = createContext<PrivacyContextValue | null>(null)

export function usePrivacy(): PrivacyContextValue {
  const ctx = useContext(PrivacyCtx)
  if (!ctx) throw new Error('usePrivacy must be used within PrivacyProvider')
  return ctx
}
