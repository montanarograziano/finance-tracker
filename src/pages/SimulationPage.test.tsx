import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SimulationPage } from './SimulationPage'

const category = {
  id: 'food',
  user_id: 'u1',
  name: 'Cibo',
  type: 'expense',
  color: '#ef4444',
  icon: '🍕',
  parent_id: null,
  created_at: '',
}

vi.mock('../data/hooks', () => ({
  useNetWorthSeries: () => ({
    data: [
      { month: '2026-05', value: 10000 },
      { month: '2026-06', value: 10500 },
    ],
    isLoading: false,
  }),
  useTransactions: () => ({ data: [], isLoading: false }),
  useCategories: () => ({ data: [category], isLoading: false }),
}))

describe('SimulationPage', () => {
  it('renders the page with the scenario form', () => {
    render(<SimulationPage />)
    expect(screen.getByRole('heading', { name: 'Simulazione' })).toBeInTheDocument()
    expect(screen.getByText('Aggiungi voce allo scenario')).toBeInTheDocument()
    expect(screen.getByText(/reale vs simulato/i)).toBeInTheDocument()
  })

  it('adds a scenario item and shows KPIs and the item list', () => {
    render(<SimulationPage />)
    fireEvent.change(screen.getByLabelText('Importo'), { target: { value: '800' } })
    fireEvent.change(screen.getByLabelText('Descrizione'), { target: { value: 'Mutuo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi' }))
    expect(screen.getByText('Mutuo')).toBeInTheDocument()
    expect(screen.getByText('Costo medio mensile')).toBeInTheDocument()
    expect(screen.getByText('Differenza a fine periodo')).toBeInTheDocument()
    expect(screen.getByText('Minimo patrimonio simulato')).toBeInTheDocument()
  })

  it('removes a scenario item', () => {
    render(<SimulationPage />)
    fireEvent.change(screen.getByLabelText('Importo'), { target: { value: '800' } })
    fireEvent.change(screen.getByLabelText('Descrizione'), { target: { value: 'Mutuo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi' }))
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi Mutuo' }))
    expect(screen.queryByText('Costo medio mensile')).not.toBeInTheDocument()
  })

  it('warns that history is insufficient for the projection', () => {
    // mocked transactions are empty → monthlyAverages returns null
    render(<SimulationPage />)
    expect(screen.getByText(/storico insufficiente/i)).toBeInTheDocument()
  })
})
