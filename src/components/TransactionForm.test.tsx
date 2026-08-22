import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Account, Category } from '../lib/types'
import { TransactionForm } from './TransactionForm'

const accounts = [
  { id: 'a1', name: 'Conto corrente', type: 'checking', currency: 'EUR', initial_balance: 0 },
  { id: 'a2', name: 'Contanti', type: 'cash', currency: 'EUR', initial_balance: 0 },
] as Account[]
const categories = [
  { id: 'c1', name: 'Cibo', type: 'expense', color: '#f97316', icon: '🍽️', parent_id: null },
  { id: 'c2', name: 'Stipendio', type: 'income', color: '#10b981', icon: '💰', parent_id: null },
] as Category[]

describe('TransactionForm', () => {
  it('submits a parsed expense', async () => {
    const onSubmit = vi.fn()
    render(
      <TransactionForm
        accounts={accounts}
        categories={categories}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/importo/i), '12.5')
    await user.selectOptions(screen.getByLabelText(/^categoria/i), 'c1')
    await user.type(screen.getByLabelText(/descrizione/i), 'Pranzo')
    await user.type(screen.getByLabelText(/tag/i), 'lavoro, pranzo')
    await user.click(screen.getByRole('button', { name: /salva/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      type: 'expense',
      account_id: 'a1',
      category_id: 'c1',
      amount: 12.5,
      description: 'Pranzo',
      tags: ['lavoro', 'pranzo'],
      transfer_to_account_id: null,
    })
  })

  it('rejects a transfer to the same account', async () => {
    const onSubmit = vi.fn()
    render(
      <TransactionForm
        accounts={accounts}
        categories={categories}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('radio', { name: /trasferimento/i }))
    await user.type(screen.getByLabelText(/importo/i), '100')
    await user.type(screen.getByLabelText(/descrizione/i), 'Transfer')
    await user.selectOptions(screen.getByLabelText(/verso il conto/i), 'a1')
    await user.click(screen.getByRole('button', { name: /salva/i }))
    expect(await screen.findByText(/conti diversi/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
