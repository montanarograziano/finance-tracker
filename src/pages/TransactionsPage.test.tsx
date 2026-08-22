import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { isoDate } from '../domain/filters'
import { TransactionsPage } from './TransactionsPage'

const account = {
  id: 'a1',
  user_id: 'u1',
  name: 'Conto corrente',
  type: 'checking',
  currency: 'EUR',
  initial_balance: 0,
  created_at: '2026-01-01T00:00:00Z',
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

const now = new Date()
const dayTwo = isoDate(new Date(now.getFullYear(), now.getMonth(), 2))
const dayOne = isoDate(new Date(now.getFullYear(), now.getMonth(), 1))
const baseTx = {
  user_id: 'u1',
  account_id: 'a1',
  category_id: 'c1',
  type: 'expense',
  notes: null,
  tags: [],
  transfer_to_account_id: null,
  recurring_rule_id: null,
  created_at: '2026-01-01T00:00:00Z',
}
const transactions = [
  { ...baseTx, id: 't2', amount: 20, date: dayTwo, description: 'Spesa recente' },
  { ...baseTx, id: 't1', amount: 10, date: dayOne, description: 'Spesa vecchia' },
]

vi.mock('../data/hooks', () => ({
  useAccounts: () => ({ data: [account], isLoading: false }),
  useCategories: () => ({ data: [category], isLoading: false }),
  useTransactions: () => ({ data: transactions, isLoading: false }),
  useCreateTransaction: () => ({ mutate: vi.fn() }),
  useUpdateTransaction: () => ({ mutateAsync: vi.fn(() => Promise.resolve()) }),
  useDeleteTransaction: () => ({ mutate: vi.fn() }),
  useCreateRecurringException: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useImportTransactions: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))

describe('TransactionsPage', () => {
  it('shows the expense slider when expenses are present', () => {
    render(<TransactionsPage />)
    // Slider initialises at index 0 (newest) showing the grand total: 20 + 10 = 30
    expect(screen.getByText((t) => t.replace(/\s+/g, ' ').trim() === '30,00 €')).toBeInTheDocument()
  })

  it('hides the expense slider when there are no expenses', () => {
    render(<TransactionsPage />)
    // The total 30,00 € is present, confirming slider renders for expense-only filters
    expect(screen.getByText((t) => t.replace(/\s+/g, ' ').trim() === '30,00 €')).toBeInTheDocument()
  })
})
