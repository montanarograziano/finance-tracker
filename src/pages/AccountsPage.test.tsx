import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AccountsPage } from './AccountsPage'

const account = {
  id: 'a1',
  user_id: 'u1',
  name: 'Conto corrente',
  type: 'checking',
  currency: 'EUR',
  initial_balance: 100,
  created_at: '2026-01-01T00:00:00Z',
}

vi.mock('../data/hooks', () => ({
  useAccountBalances: () => ({ data: [{ ...account, balance: 150 }], isLoading: false }),
  useCreateAccount: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateAccount: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteAccount: () => ({ mutate: vi.fn(), isPending: false }),
}))

describe('AccountsPage', () => {
  it('shows each account with its computed balance', () => {
    render(<AccountsPage />)
    expect(screen.getAllByText('Conto corrente')).toHaveLength(2)
    // balance served by the account_balances RPC
    expect(screen.getAllByText((t) => t.replace(/\s/g, ' ') === '150,00 €').length).toBeGreaterThan(
      0,
    )
  })
})
