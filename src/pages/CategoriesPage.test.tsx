import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CategoriesPage } from './CategoriesPage'

const categories = [
  {
    id: 'c1',
    user_id: 'u1',
    name: 'Cibo',
    type: 'expense',
    color: '#f97316',
    icon: '🍽️',
    parent_id: null,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c2',
    user_id: 'u1',
    name: 'Ristoranti',
    type: 'expense',
    color: '#f97316',
    icon: '🍕',
    parent_id: 'c1',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c3',
    user_id: 'u1',
    name: 'Stipendio',
    type: 'income',
    color: '#10b981',
    icon: '💰',
    parent_id: null,
    created_at: '2026-01-01T00:00:00Z',
  },
]

vi.mock('../data/hooks', () => ({
  useCategories: () => ({ data: categories, isLoading: false }),
  useCreateCategory: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateCategory: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteCategory: () => ({ mutate: vi.fn(), isPending: false }),
}))

describe('CategoriesPage', () => {
  it('renders expense and income sections with subcategories', () => {
    render(<CategoriesPage />)
    expect(screen.getByRole('heading', { name: 'Spese' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Entrate' })).toBeInTheDocument()
    expect(screen.getByText('Cibo')).toBeInTheDocument()
    expect(screen.getByText('Ristoranti')).toBeInTheDocument()
    expect(screen.getByText('Stipendio')).toBeInTheDocument()
  })
})
