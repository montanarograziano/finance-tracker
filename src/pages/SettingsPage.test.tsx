import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from 'i18next'
import { SettingsPage } from './SettingsPage'

const { deleteAccount, signOut } = vi.hoisted(() => ({
  deleteAccount: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('../data/hooks', () => ({
  useAccounts: () => ({ data: [] }),
  useCategories: () => ({ data: [] }),
  useTransactions: () => ({ data: [] }),
  useInvestments: () => ({ data: [] }),
}))

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { email: 'test@example.com' } },
    deleteAccount,
    signOut,
  }),
}))

vi.mock('../lib/themeContext', () => ({
  useTheme: () => ({ theme: 'system', setTheme: vi.fn() }),
}))

vi.mock('../export/xlsx', () => ({ downloadXlsx: vi.fn() }))

describe('SettingsPage', () => {
  beforeEach(() => {
    deleteAccount.mockReset().mockResolvedValue({ error: null })
    signOut.mockReset()
  })

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

  it('requires the account email before permanent deletion', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await user.click(screen.getByRole('button', { name: /delete account|elimina account/i }))
    const confirmButton = screen.getByRole('button', {
      name: /permanently delete account|elimina definitivamente/i,
    })
    expect(confirmButton).toBeDisabled()

    await user.type(screen.getByLabelText(/test@example\.com/i), 'test@example.com')
    expect(confirmButton).toBeEnabled()
    await user.click(confirmButton)

    expect(deleteAccount).toHaveBeenCalledOnce()
  })

  it('keeps the session and shows a safe message when deletion fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    deleteAccount.mockResolvedValueOnce({ error: 'database details' })
    const user = userEvent.setup()
    render(<SettingsPage />)

    await user.click(screen.getByRole('button', { name: /delete account|elimina account/i }))
    await user.type(screen.getByLabelText(/test@example\.com/i), 'test@example.com')
    await user.click(
      screen.getByRole('button', { name: /permanently delete account|elimina definitivamente/i }),
    )

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(signOut).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
