import { Navigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const { t } = useTranslation()
  if (loading)
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        {t('common.loading')}
      </div>
    )
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
