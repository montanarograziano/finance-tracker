import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MonthlyAveragesRow } from './MonthlyAveragesRow'

describe('MonthlyAveragesRow', () => {
  it('renders nothing when averages are null', () => {
    const { container } = render(<MonthlyAveragesRow averages={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the three averages and the caption', () => {
    render(
      <MonthlyAveragesRow
        averages={{
          avgIncome: 1500,
          avgExpense: 400,
          avgSavings: 1100,
          monthsCounted: 12,
          fromMonth: '2025-07',
          toMonth: '2026-06',
        }}
      />,
    )
    expect(screen.getByText('Media mensile')).toBeInTheDocument()
    expect(screen.getByText(/12 mesi completi/)).toBeInTheDocument()
    expect(screen.getByText((t) => t.replace(/\s/g, ' ') === '1.500,00 €')).toBeInTheDocument()
    expect(screen.getByText((t) => t.replace(/\s/g, ' ') === '400,00 €')).toBeInTheDocument()
    expect(screen.getByText((t) => t.replace(/\s/g, ' ') === '1.100,00 €')).toBeInTheDocument()
  })
})
