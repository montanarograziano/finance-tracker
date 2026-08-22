import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PrivacyProvider } from '../lib/privacy'
import { Layout } from './Layout'

vi.mock('../domain/useRecurringEngine', () => ({ useRecurringEngine: () => {} }))

function renderLayout(initialPath = '/') {
  return render(
    <PrivacyProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<div>home page</div>} />
            <Route path="/transactions" element={<div />} />
            <Route path="/recurring" element={<div />} />
            <Route path="/accounts" element={<div />} />
            <Route path="/categories" element={<div />} />
            <Route path="/report" element={<div />} />
            <Route path="/simulation" element={<div />} />
            <Route path="/settings" element={<div>settings page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </PrivacyProvider>,
  )
}

const bottomNav = () => screen.getByRole('navigation', { name: /navigazione inferiore/i })
const moreButton = () => within(bottomNav()).getByRole('button', { name: /altro/i })
const moreSheet = () => screen.getByRole('dialog', { name: /altre pagine/i })

describe('Layout mobile bottom bar', () => {
  it('shows the four primary tabs and a More button', () => {
    renderLayout()
    const nav = bottomNav()
    expect(within(nav).getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/')
    expect(within(nav).getByRole('link', { name: /transazioni/i })).toHaveAttribute(
      'href',
      '/transactions',
    )
    expect(within(nav).getByRole('link', { name: /report/i })).toHaveAttribute('href', '/report')
    expect(within(nav).getByRole('link', { name: /simulazione/i })).toHaveAttribute(
      'href',
      '/simulation',
    )
    expect(moreButton()).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: /impostazioni/i })).not.toBeInTheDocument()
  })

  it('keeps all eight destinations in the desktop sidebar', () => {
    renderLayout()
    const sidebar = screen.getByRole('navigation', { name: /navigazione laterale/i })
    const links = within(sidebar).getAllByRole('link')
    expect(links).toHaveLength(8)
  })

  it('opens the More sheet listing the secondary destinations', async () => {
    renderLayout()
    await userEvent.click(moreButton())
    const sheet = moreSheet()
    expect(within(sheet).getByRole('link', { name: /ricorrenti/i })).toHaveAttribute(
      'href',
      '/recurring',
    )
    expect(within(sheet).getByRole('link', { name: /conti/i })).toHaveAttribute('href', '/accounts')
    expect(within(sheet).getByRole('link', { name: /categorie/i })).toHaveAttribute(
      'href',
      '/categories',
    )
    expect(within(sheet).getByRole('link', { name: /impostazioni/i })).toHaveAttribute(
      'href',
      '/settings',
    )
  })

  it('moves focus into the sheet when opened', async () => {
    renderLayout()
    await userEvent.click(moreButton())
    const firstLink = within(moreSheet()).getAllByRole('link')[0]
    expect(firstLink).toHaveFocus()
  })

  it('closes the sheet after navigating to a destination', async () => {
    renderLayout()
    await userEvent.click(moreButton())
    await userEvent.click(within(moreSheet()).getByRole('link', { name: /impostazioni/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('settings page')).toBeInTheDocument()
  })

  it('closes the sheet with Escape and returns focus to the More button', async () => {
    renderLayout()
    await userEvent.click(moreButton())
    expect(moreSheet()).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(moreButton()).toHaveFocus()
  })

  it('closes the sheet when tapping the backdrop', async () => {
    renderLayout()
    await userEvent.click(moreButton())
    await userEvent.click(screen.getByTestId('more-sheet-backdrop'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('highlights the More tab while a secondary route is active', () => {
    renderLayout('/settings')
    expect(moreButton().className).toContain('text-brand')
  })

  it('does not highlight the More tab on primary routes', () => {
    renderLayout('/')
    expect(moreButton().className).not.toContain('text-brand')
  })
})
