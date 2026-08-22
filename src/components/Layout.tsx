import {
  ArrowLeftRight,
  BarChart3,
  LayoutDashboard,
  MoreHorizontal,
  RefreshCw,
  Settings,
  Tag,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useRecurringEngine } from '../domain/useRecurringEngine'
import { MobileMoreSheet } from './MobileMoreSheet'
import { PrivacyToggle } from './PrivacyToggle'

interface NavItem {
  to: string
  label: string
  Icon: LucideIcon
}

export function Layout() {
  const { t } = useTranslation()
  useRecurringEngine()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreButtonRef = useRef<HTMLButtonElement>(null)

  const dashboard: NavItem = { to: '/', label: t('nav.dashboard'), Icon: LayoutDashboard }
  const transactions: NavItem = {
    to: '/transactions',
    label: t('nav.transactions'),
    Icon: ArrowLeftRight,
  }
  const recurring: NavItem = { to: '/recurring', label: t('nav.recurring'), Icon: RefreshCw }
  const accounts: NavItem = { to: '/accounts', label: t('nav.accounts'), Icon: Wallet }
  const categories: NavItem = { to: '/categories', label: t('nav.categories'), Icon: Tag }
  const report: NavItem = { to: '/report', label: t('nav.report'), Icon: BarChart3 }
  const simulation: NavItem = { to: '/simulation', label: t('nav.simulation'), Icon: TrendingUp }
  const settings: NavItem = { to: '/settings', label: t('nav.settings'), Icon: Settings }

  const sidebarLinks = [
    dashboard,
    transactions,
    recurring,
    accounts,
    categories,
    report,
    simulation,
    settings,
  ]
  const primaryTabs = [dashboard, transactions, report, simulation]
  const moreLinks = [recurring, accounts, categories, settings]

  const isMoreActive = moreLinks.some(
    ({ to }) => location.pathname === to || location.pathname.startsWith(`${to}/`),
  )

  const closeMore = useCallback(() => {
    setMoreOpen(false)
    moreButtonRef.current?.focus()
  }, [])

  const tabBase =
    'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium transition-colors'
  const tabActive = 'text-brand-600 dark:text-brand-400'
  const tabIdle =
    'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <nav
        aria-label={t('nav.sidebar')}
        className="hidden border-r border-slate-200 bg-white p-4 md:flex md:w-60 md:flex-col md:gap-1 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center gap-2.5 px-2 pb-6 pt-2">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-brand-950 shadow-xs"
          >
            <Wallet size={18} />
          </span>
          <span className="truncate text-base font-semibold tracking-tight">Finance Tracker</span>
        </div>
        {sidebarLinks.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-brand-50 font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Mobile bottom bar */}
      <nav
        aria-label={t('nav.bottomBar')}
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95"
      >
        {primaryTabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `${tabBase} ${isActive ? `font-semibold ${tabActive}` : tabIdle}`
            }
          >
            <Icon size={20} className="shrink-0" />
            <span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
        <button
          ref={moreButtonRef}
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={`${tabBase} ${isMoreActive ? `font-semibold ${tabActive}` : tabIdle}`}
        >
          <MoreHorizontal size={20} className="shrink-0" />
          <span className="max-w-full truncate">{t('nav.more')}</span>
        </button>
      </nav>

      <MobileMoreSheet open={moreOpen} onClose={closeMore} links={moreLinks} />

      <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-8">
        <Outlet />
      </main>
      <PrivacyToggle />
    </div>
  )
}
