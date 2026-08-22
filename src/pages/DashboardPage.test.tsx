import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'

const { state } = vi.hoisted(() => ({
  state: { balances: [] as unknown[] },
}))

const account = {
  id: 'a1',
  user_id: 'u1',
  name: 'Conto corrente',
  type: 'checking',
  currency: 'EUR',
  initial_balance: 1000,
  created_at: '2026-01-01T00:00:00Z',
}
const expense = {
  id: 't1',
  user_id: 'u1',
  account_id: 'a1',
  category_id: 'c1',
  type: 'expense',
  amount: 250,
  date: '2026-07-01',
  description: 'Affitto',
  notes: null,
  tags: [],
  transfer_to_account_id: null,
  recurring_rule_id: null,
  created_at: '2026-07-01T00:00:00Z',
}
const category = {
  id: 'c1',
  user_id: 'u1',
  name: 'Casa',
  type: 'expense',
  color: '#ef4444',
  icon: '🏠',
  parent_id: null,
  created_at: '2026-01-01T00:00:00Z',
}

vi.mock('../data/hooks', () => ({
  useAccountBalances: () => ({ data: state.balances, isLoading: false }),
  useNetWorthSeries: () => ({ data: [], isLoading: false }),
  useTransactions: () => ({ data: [expense], isLoading: false }),
  useCategories: () => ({ data: [category], isLoading: false }),
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    state.balances = [{ ...account, balance: 750 }]
  })

  it('shows a welcome message with next steps when there are no accounts yet', () => {
    state.balances = []
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/il tuo account è pronto/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /crea il tuo primo conto/i })).toHaveAttribute(
      'href',
      '/accounts',
    )
    expect(screen.getByRole('link', { name: /importa transazioni/i })).toHaveAttribute(
      'href',
      '/transactions',
    )
  })

  it('shows the current net worth', () => {
    render(<DashboardPage />)
    // 1000 - 250 = 750,00 €
    expect(screen.getByText((t) => t.replace(/\s/g, ' ') === '750,00 €')).toBeInTheDocument()
    expect(screen.getByText(/patrimonio netto/i)).toBeInTheDocument()
  })

  it('hides monthly averages for the default single-month period', () => {
    render(<DashboardPage />)
    expect(screen.queryByText('Media mensile')).not.toBeInTheDocument()
  })

  it('renders the three KPIs with privacy-blurred values', () => {
    render(<DashboardPage />)
    expect(screen.getByText(/patrimonio netto/i)).toBeInTheDocument()
    expect(screen.getByText(/entrate nel periodo/i)).toBeInTheDocument()
    expect(screen.getByText(/spese nel periodo/i)).toBeInTheDocument()
    // 750,00 € net worth, 250,00 € expenses (no income in fixtures)
    expect(screen.getByText((t) => t.replace(/\s/g, ' ') === '750,00 €')).toHaveClass('money-blur')
    expect(screen.getByText((t) => t.replace(/\s/g, ' ') === '250,00 €')).toHaveClass('money-blur')
  })
})
