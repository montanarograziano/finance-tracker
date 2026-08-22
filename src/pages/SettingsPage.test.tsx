import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import i18n from 'i18next'
import { SettingsPage } from './SettingsPage'

vi.mock('../data/hooks', () => ({
  useAccounts: () => ({ data: [] }),
  useCategories: () => ({ data: [] }),
  useTransactions: () => ({ data: [] }),
  useInvestments: () => ({ data: [] }),
}))

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ session: { user: { email: 'test@example.com' } }, signOut: vi.fn() }),
}))

vi.mock('../lib/themeContext', () => ({
  useTheme: () => ({ theme: 'system', setTheme: vi.fn() }),
}))

vi.mock('../export/xlsx', () => ({ downloadXlsx: vi.fn() }))

describe('SettingsPage', () => {
  it('renders language toggle buttons', () => {
    render(<SettingsPage />)
    expect(screen.getByText('Italiano')).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('calls i18n.changeLanguage when English button is clicked', async () => {
    const spy = vi.spyOn(i18n, 'changeLanguage').mockResolvedValue(undefined as never)
    render(<SettingsPage />)
    await userEvent.click(screen.getByText('English'))
    expect(spy).toHaveBeenCalledWith('en')
    spy.mockRestore()
  })

  it('calls i18n.changeLanguage when Italiano button is clicked', async () => {
    const spy = vi.spyOn(i18n, 'changeLanguage').mockResolvedValue(undefined as never)
    render(<SettingsPage />)
    await userEvent.click(screen.getByText('Italiano'))
    expect(spy).toHaveBeenCalledWith('it')
    spy.mockRestore()
  })
})
