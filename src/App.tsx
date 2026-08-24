import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HashRouter, Route, Routes } from 'react-router-dom' // GitHub Pages has no SPA rewrite, so hash routing avoids 404s on deep-link refresh
import { AuthProvider } from './auth/AuthContext'
import { LoginPage } from './auth/LoginPage'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { RegisterPage } from './auth/RegisterPage'
import { Layout } from './components/Layout'
import { useAuth } from './auth/useAuth'

const AccountsPage = lazy(() =>
  import('./pages/AccountsPage').then(({ AccountsPage }) => ({ default: AccountsPage })),
)
const CategoriesPage = lazy(() =>
  import('./pages/CategoriesPage').then(({ CategoriesPage }) => ({ default: CategoriesPage })),
)
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then(({ DashboardPage }) => ({ default: DashboardPage })),
)
const RecurringPage = lazy(() =>
  import('./pages/RecurringPage').then(({ RecurringPage }) => ({ default: RecurringPage })),
)
const ReportPage = lazy(() =>
  import('./pages/ReportPage').then(({ ReportPage }) => ({ default: ReportPage })),
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then(({ SettingsPage }) => ({ default: SettingsPage })),
)
const SimulationPage = lazy(() =>
  import('./pages/SimulationPage').then(({ SimulationPage }) => ({ default: SimulationPage })),
)
const TransactionsPage = lazy(() =>
  import('./pages/TransactionsPage').then(({ TransactionsPage }) => ({
    default: TransactionsPage,
  })),
)

function QueryRoutes() {
  const [queryClient] = useState(() => new QueryClient())
  const { t } = useTranslation()

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div role="status">{t('common.loading')}</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="recurring" element={<RecurringPage />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="report" element={<ReportPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="simulation" element={<SimulationPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </QueryClientProvider>
  )
}

function SessionRoutes() {
  const { session } = useAuth()
  return <QueryRoutes key={session?.user.id ?? 'signed-out'} />
}

export default function App() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = t('app.title')
  }, [t])

  return (
    <HashRouter>
      <AuthProvider>
        <SessionRoutes />
      </AuthProvider>
    </HashRouter>
  )
}
