import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePrivacy } from '../lib/privacyContext'

export function PrivacyToggle() {
  const { t } = useTranslation()
  const { hideMoney, toggleHideMoney } = usePrivacy()
  const label = t(hideMoney ? 'privacy.show' : 'privacy.hide')

  return (
    <button
      onClick={toggleHideMoney}
      aria-label={label}
      title={label}
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-colors hover:bg-slate-50 hover:text-slate-900 md:bottom-4 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
    >
      {hideMoney ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  )
}
