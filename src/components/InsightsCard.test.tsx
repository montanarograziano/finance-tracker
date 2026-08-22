import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Transaction } from '../lib/types'
import { InsightsCard } from './InsightsCard'

let seq = 0
function tx(partial: Partial<Transaction> & { date: string; amount: number }): Transaction {
  seq += 1
  return {
    id: `t${seq}`,
    user_id: 'u1',
    account_id: 'a1',
    category_id: 'food',
    type: 'expense',
    description: 'test',
    notes: null,
    tags: [],
    transfer_to_account_id: null,
    recurring_rule_id: null,
    created_at: '2026-01-01T00:00:00Z',
    ...partial,
  }
}

const state: { transactions: Transaction[] } = { transactions: [] }

vi.mock('../data/hooks', () => ({
  useTransactions: () => ({ data: state.transactions, isLoading: false }),
  useCategories: () => ({
    data: [
      {
        id: 'food',
        user_id: 'u1',
        name: 'Spesa',
        type: 'expense',
        color: '#ef4444',
        icon: '🛒',
        parent_id: null,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'taxi',
        user_id: 'u1',
        name: 'Taxi',
        type: 'expense',
        color: '#3b82f6',
        icon: '🚕',
        parent_id: null,
        created_at: '2026-01-01T00:00:00Z',
      },
      ...['Viaggi', 'Svago', 'Regali', 'Salute', 'Sport'].map((name) => ({
        id: name.toLowerCase(),
        user_id: 'u1',
        name,
        type: 'expense',
        color: '#22c55e',
        icon: '🎯',
        parent_id: null,
        created_at: '2026-01-01T00:00:00Z',
      })),
    ],
    isLoading: false,
  }),
}))

function section(heading: string): HTMLElement {
  const el = screen.getByText(heading).closest('div')
  if (!el) throw new Error(`section ${heading} not found`)
  return el
}

describe('InsightsCard', () => {
  it('shows the not-enough-history state with a single month of data', () => {
    state.transactions = [tx({ date: '2026-06-10', amount: 50 })]
    render(<InsightsCard />)
    expect(screen.getByText('Insight di spesa')).toBeInTheDocument()
    expect(screen.getByText(/storico insufficiente/i)).toBeInTheDocument()
  })

  it('renders headline totals and the biggest-changes section', () => {
    state.transactions = [
      tx({ date: '2026-05-05', amount: 100 }),
      tx({ date: '2026-06-05', amount: 160 }),
    ]
    render(<InsightsCard />)
    expect(screen.getByText('Spese totali')).toBeInTheDocument()
    expect(screen.getAllByText((t) => t.replace(/\s/g, ' ') === '160,00 €').length).toBeGreaterThan(
      0,
    )
    expect(screen.getByText('Variazioni principali')).toBeInTheDocument()
    expect(screen.getByText('Spesa')).toBeInTheDocument()
  })

  it('renders new and vanished spending sections', () => {
    state.transactions = [
      tx({ date: '2026-05-01', amount: 60, category_id: 'taxi' }),
      tx({ date: '2026-05-02', amount: 100 }),
      tx({ date: '2026-06-01', amount: 100 }),
      tx({ date: '2026-06-15', amount: 45, category_id: null }),
    ]
    render(<InsightsCard />)
    expect(screen.getByText('Nuove spese')).toBeInTheDocument()
    expect(screen.getByText('Senza categoria')).toBeInTheDocument()
    expect(screen.getByText('Spese azzerate')).toBeInTheDocument()
    expect(screen.getByText('Taxi')).toBeInTheDocument()
    expect(screen.queryByText(/mostra altri/i)).not.toBeInTheDocument()
  })

  it('caps the vanished-spending list at four with an expand toggle', () => {
    state.transactions = [
      tx({ date: '2026-05-01', amount: 500, category_id: 'viaggi' }),
      tx({ date: '2026-05-02', amount: 400, category_id: 'svago' }),
      tx({ date: '2026-05-03', amount: 300, category_id: 'regali' }),
      tx({ date: '2026-05-04', amount: 200, category_id: 'salute' }),
      tx({ date: '2026-05-05', amount: 100, category_id: 'sport' }),
      tx({ date: '2026-05-06', amount: 50, category_id: 'taxi' }),
      tx({ date: '2026-05-07', amount: 100 }),
      tx({ date: '2026-06-05', amount: 80 }),
    ]
    render(<InsightsCard />)
    const vanished = section('Spese azzerate')
    expect(within(vanished).getByText('Viaggi')).toBeInTheDocument()
    expect(within(vanished).getByText('Salute')).toBeInTheDocument()
    expect(within(vanished).queryByText('Sport')).not.toBeInTheDocument()
    expect(within(vanished).queryByText('Taxi')).not.toBeInTheDocument()

    const toggle = within(vanished).getByRole('button', { name: 'Mostra altri (+2)' })
    fireEvent.click(toggle)
    expect(within(vanished).getByText('Sport')).toBeInTheDocument()
    expect(within(vanished).getByText('Taxi')).toBeInTheDocument()

    fireEvent.click(within(vanished).getByRole('button', { name: 'Mostra meno' }))
    expect(within(vanished).queryByText('Sport')).not.toBeInTheDocument()
  })

  it('caps the new-spending list at four with an expand toggle', () => {
    state.transactions = [
      tx({ date: '2026-05-01', amount: 100 }),
      tx({ date: '2026-06-01', amount: 80 }),
      tx({ date: '2026-06-02', amount: 500, category_id: 'viaggi' }),
      tx({ date: '2026-06-03', amount: 400, category_id: 'svago' }),
      tx({ date: '2026-06-04', amount: 300, category_id: 'regali' }),
      tx({ date: '2026-06-05', amount: 200, category_id: 'salute' }),
      tx({ date: '2026-06-06', amount: 100, category_id: 'sport' }),
    ]
    render(<InsightsCard />)
    const fresh = section('Nuove spese')
    expect(within(fresh).getByText('Viaggi')).toBeInTheDocument()
    expect(within(fresh).queryByText('Sport')).not.toBeInTheDocument()

    fireEvent.click(within(fresh).getByRole('button', { name: 'Mostra altri (+1)' }))
    expect(within(fresh).getByText('Sport')).toBeInTheDocument()
  })

  it('caps the trends list at four with an expand toggle', () => {
    const rising = (categoryId: string) => [
      tx({ date: '2026-04-01', amount: 10, category_id: categoryId }),
      tx({ date: '2026-05-01', amount: 20, category_id: categoryId }),
      tx({ date: '2026-06-01', amount: 30, category_id: categoryId }),
    ]
    state.transactions = [
      ...rising('viaggi'),
      ...rising('svago'),
      ...rising('regali'),
      ...rising('salute'),
      ...rising('sport'),
    ]
    render(<InsightsCard />)
    const trends = section('Tendenze')
    expect(within(trends).getAllByText(/in aumento da/)).toHaveLength(4)

    fireEvent.click(within(trends).getByRole('button', { name: 'Mostra altri (+1)' }))
    expect(within(trends).getAllByText(/in aumento da/)).toHaveLength(5)
  })

  it('renders trend streaks', () => {
    state.transactions = [
      tx({ date: '2026-03-01', amount: 50 }),
      tx({ date: '2026-04-01', amount: 60 }),
      tx({ date: '2026-05-01', amount: 70 }),
      tx({ date: '2026-06-01', amount: 80 }),
    ]
    render(<InsightsCard />)
    expect(screen.getByText('Tendenze')).toBeInTheDocument()
    expect(screen.getByText('Spesa: in aumento da 4 mesi')).toBeInTheDocument()
  })

  it('switches the anchor month via the picker', () => {
    state.transactions = [
      tx({ date: '2026-04-05', amount: 100 }),
      tx({ date: '2026-05-05', amount: 200 }),
      tx({ date: '2026-06-05', amount: 300 }),
    ]
    render(<InsightsCard />)
    // default anchor: june (latest with expenses)
    expect(screen.getAllByText((t) => t.replace(/\s/g, ' ') === '300,00 €').length).toBeGreaterThan(
      0,
    )
    fireEvent.change(screen.getByLabelText('Mese analizzato'), { target: { value: '2026-05' } })
    expect(screen.getAllByText((t) => t.replace(/\s/g, ' ') === '200,00 €').length).toBeGreaterThan(
      0,
    )
  })
})
