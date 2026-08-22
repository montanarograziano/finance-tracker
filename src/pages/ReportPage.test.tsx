import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReportPage } from './ReportPage'

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
const expense = {
  id: 't1',
  user_id: 'u1',
  account_id: 'a1',
  category_id: 'c1',
  type: 'expense',
  amount: 400,
  date: '2026-07-01',
  description: 'Affitto',
  notes: null,
  tags: [],
  transfer_to_account_id: null,
  recurring_rule_id: null,
  created_at: '2026-07-01T00:00:00Z',
}
const expense2025a = { ...expense, id: 't2', amount: 100, date: '2025-03-10' }
const expense2025b = { ...expense, id: 't3', amount: 300, date: '2025-06-10' }

vi.mock('../data/hooks', () => ({
  useAccounts: () => ({ data: [account], isLoading: false }),
  useCategories: () => ({ data: [category], isLoading: false }),
  useTransactions: () => ({ data: [expense, expense2025a, expense2025b], isLoading: false }),
}))

describe('ReportPage', () => {
  it('shows per-category totals for the selected period', () => {
    render(<ReportPage />)
    fireEvent.change(screen.getByLabelText('Mese'), { target: { value: '07' } })
    fireEvent.change(screen.getByLabelText('Anno'), { target: { value: '2026' } })
    expect(screen.getByText('Casa')).toBeInTheDocument()
    expect(screen.getAllByText((t) => t.replace(/\s/g, ' ') === '400,00 €').length).toBeGreaterThan(
      0,
    )
    expect(screen.getByRole('button', { name: /csv/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /excel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pdf/i })).toBeInTheDocument()
  })

  it('shows monthly averages when a full past year is selected', () => {
    render(<ReportPage />)
    fireEvent.change(screen.getByLabelText('Mese'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Anno'), { target: { value: '2025' } })
    expect(screen.getByText('Media mensile')).toBeInTheDocument()
    expect(screen.getByText(/12 mesi completi/)).toBeInTheDocument()
    // (100 + 300) / 12 = 33,33 €
    expect(screen.getByText((t) => t.replace(/\s/g, ' ') === '33,33 €')).toBeInTheDocument()
  })
})
