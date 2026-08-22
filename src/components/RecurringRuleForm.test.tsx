import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Account, Category } from '../lib/types'
import { RecurringRuleForm } from './RecurringRuleForm'

const accounts: Account[] = [
  {
    id: 'a1',
    user_id: 'u1',
    name: 'Conto',
    type: 'checking',
    currency: 'EUR',
    initial_balance: 0,
    created_at: '',
  },
]

const categories: Category[] = [
  {
    id: 'c1',
    user_id: 'u1',
    name: 'Casa',
    type: 'expense',
    color: '#ef4444',
    icon: '🏠',
    parent_id: null,
    created_at: '',
  },
  {
    id: 'c2',
    user_id: 'u1',
    name: 'Stipendio',
    type: 'income',
    color: '#10b981',
    icon: '💰',
    parent_id: null,
    created_at: '',
  },
]

describe('RecurringRuleForm', () => {
  it('calls onSubmit with valid monthly expense input', () => {
    const onSubmit = vi.fn()
    render(
      <RecurringRuleForm
        accounts={accounts}
        categories={categories}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText(/importo/i), { target: { value: '500' } })
    fireEvent.change(screen.getByLabelText(/descrizione/i), { target: { value: 'Affitto' } })
    fireEvent.change(screen.getByLabelText(/giorno del mese/i), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/categoria/i), { target: { value: 'c1' } })
    fireEvent.click(screen.getByRole('button', { name: /salva/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 500,
        description: 'Affitto',
        frequency: 'monthly',
        day_of_month: 5,
        type: 'expense',
        category_id: 'c1',
        month_of_year: null,
      }),
    )
  })

  it('shows month field only when yearly is selected', () => {
    render(
      <RecurringRuleForm
        accounts={accounts}
        categories={categories}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText(/^Mese \(1/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText(/annuale/i))

    expect(screen.getByLabelText(/^Mese \(1/i)).toBeInTheDocument()
  })

  it('shows validation error when amount is missing', () => {
    render(
      <RecurringRuleForm
        accounts={accounts}
        categories={categories}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText(/descrizione/i), { target: { value: 'Test' } })
    fireEvent.change(screen.getByLabelText(/categoria/i), { target: { value: 'c1' } })
    fireEvent.click(screen.getByRole('button', { name: /salva/i }))

    expect(screen.getByText(/importo deve essere maggiore/i)).toBeInTheDocument()
  })

  it('calls onCancel when cancel is clicked', () => {
    const onCancel = vi.fn()
    render(
      <RecurringRuleForm
        accounts={accounts}
        categories={categories}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /annulla/i }))

    expect(onCancel).toHaveBeenCalled()
  })
})
