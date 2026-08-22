import { useEffect, useState, type ReactNode } from 'react'
import { PrivacyCtx } from './privacyContext'

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hideMoney, setHideMoney] = useState<boolean>(
    () => localStorage.getItem('hideMoney') === 'true',
  )

  useEffect(() => {
    document.documentElement.classList.toggle('privacy-mode', hideMoney)
    localStorage.setItem('hideMoney', String(hideMoney))
  }, [hideMoney])

  const toggleHideMoney = () => setHideMoney((v) => !v)

  return (
    <PrivacyCtx.Provider value={{ hideMoney, toggleHideMoney }}>{children}</PrivacyCtx.Provider>
  )
}
