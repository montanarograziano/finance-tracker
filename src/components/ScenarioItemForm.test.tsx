import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Category } from '../lib/types'
import { ScenarioItemForm } from './ScenarioItemForm'

const food: Category = {
  id: 'food',
  user_id: 'u1',
  name: 'Cibo',
  type: 'expense',
  color: '#ef4444',
  icon: '🍕',
  parent_id: null,
  created_at: '',
}

describe('ScenarioItemForm', () => {
  it('adds a monthly recurring expense', () => {
    const onAdd = vi.fn()
    render(<ScenarioItemForm categories={[food]} onAdd={onAdd} />)
    fireEvent.change(screen.getByLabelText('Importo'), { target: { value: '800' } })
    fireEvent.change(screen.getByLabelText('Descrizione'), { target: { value: 'Mutuo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi' }))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'recurring',
        type: 'expense',
        amount: 800,
        description: 'Mutuo',
        frequency: 'monthly',
        day_of_month: 1,
        month_of_year: null,
        end_date: null,
      }),
    )
  })

  it('rejects a non-positive amount', () => {
    const onAdd = vi.fn()
    render(<ScenarioItemForm categories={[food]} onAdd={onAdd} />)
    fireEvent.change(screen.getByLabelText('Importo'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi' }))
    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getByText(/importo maggiore di zero/i)).toBeInTheDocument()
  })

  it('adds a category adjustment with a generated description', () => {
    const onAdd = vi.fn()
    render(<ScenarioItemForm categories={[food]} onAdd={onAdd} />)
    fireEvent.change(screen.getByLabelText('Tipo di voce'), { target: { value: 'adjust' } })
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'food' } })
    fireEvent.change(screen.getByLabelText('Percentuale'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi' }))
    expect(onAdd).toHaveBeenCalledWith({
      kind: 'adjust',
      category_id: 'food',
      description: 'Cibo +10%',
      percent: 10,
    })
  })

  it('rejects an adjustment without a category', () => {
    const onAdd = vi.fn()
    render(<ScenarioItemForm categories={[food]} onAdd={onAdd} />)
    fireEvent.change(screen.getByLabelText('Tipo di voce'), { target: { value: 'adjust' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi' }))
    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getByText(/seleziona una categoria/i)).toBeInTheDocument()
  })

  it('rejects an end date before the start date', () => {
    const onAdd = vi.fn()
    render(<ScenarioItemForm categories={[food]} onAdd={onAdd} />)
    fireEvent.change(screen.getByLabelText('Importo'), { target: { value: '800' } })
    fireEvent.change(screen.getByLabelText('Descrizione'), { target: { value: 'Mutuo' } })
    fireEvent.change(screen.getByLabelText('Data inizio'), { target: { value: '2026-05-01' } })
    fireEvent.change(screen.getByLabelText('Data fine (opzionale)'), {
      target: { value: '2026-04-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi' }))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('adds a one-off on a specific date', () => {
    const onAdd = vi.fn()
    render(<ScenarioItemForm categories={[food]} onAdd={onAdd} />)
    fireEvent.change(screen.getByLabelText('Tipo di voce'), { target: { value: 'oneoff' } })
    fireEvent.change(screen.getByLabelText('Importo'), { target: { value: '20000' } })
    fireEvent.change(screen.getByLabelText('Descrizione'), { target: { value: 'Anticipo' } })
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-03-15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi' }))
    expect(onAdd).toHaveBeenCalledWith({
      kind: 'oneoff',
      type: 'expense',
      amount: 20000,
      description: 'Anticipo',
      date: '2026-03-15',
    })
  })
})
