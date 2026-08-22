import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RecurringPage } from './RecurringPage'

// Mock all hooks used by the page
vi.mock('../data/hooks', () => ({
  useRecurringRules: () => ({
    data: [
      {
        id: 'r1',
        user_id: 'u1',
        account_id: 'a1',
        category_id: 'c1',
        type: 'expense',
        transfer_to_account_id: null,
        amount: 1200,
        description: 'Abbonamento',
        frequency: 'yearly',
        day_of_month: 1,
        month_of_year: 1,
        start_date: '2025-01-01',
        end_date: null,
        active: true,
        last_generated_date: null,
        created_at: '',
      },
    ],
    isLoading: false,
  }),
  useAccounts: () => ({
    data: [
      {
        id: 'a1',
        user_id: 'u1',
        name: 'Conto',
        type: 'checking',
        currency: 'EUR',
        initial_balance: 0,
        created_at: '',
      },
    ],
  }),
  useCategories: () => ({
    data: [
      {
        id: 'c1',
        user_id: 'u1',
        name: 'Svago',
        type: 'expense',
        color: '#3b82f6',
        icon: '🎮',
        parent_id: null,
        created_at: '',
      },
    ],
  }),
  useCreateRecurringRule: () => ({ mutate: vi.fn() }),
  useUpdateRecurringRule: () => ({ mutate: vi.fn() }),
  useDeleteRecurringRule: () => ({ mutate: vi.fn() }),
  useDeleteRecurringFutureTransactions: () => ({ mutate: vi.fn() }),
  useDeleteAllRuleTransactions: () => ({ mutate: vi.fn() }),
}))

describe('RecurringPage', () => {
  it('shows the rule with yearly and monthly equivalent amounts', () => {
    render(<RecurringPage />)

    expect(screen.getByText('Abbonamento')).toBeInTheDocument()
    expect(screen.getByText(/annuale/i)).toBeInTheDocument()
    // €1.200,00/anno with monthly equivalent €100,00/mese
    expect(screen.getByText(/100/)).toBeInTheDocument()
  })

  it('shows the "Nuova regola" button', () => {
    render(<RecurringPage />)
    expect(screen.getByRole('button', { name: /nuova regola/i })).toBeInTheDocument()
  })

  it('shows the form when "Nuova regola" is clicked', async () => {
    render(<RecurringPage />)
    fireEvent.click(screen.getByRole('button', { name: /nuova regola/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /salva/i })).toBeInTheDocument()
    })
  })
})
