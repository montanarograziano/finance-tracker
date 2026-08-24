import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext'
import { UpdatePasswordPage } from './UpdatePasswordPage'

const { mockGetSession, mockUpdateUser } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockUpdateUser: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      updateUser: mockUpdateUser,
    },
  },
}))

function renderUpdatePassword() {
  return render(
    <MemoryRouter initialEntries={['/update-password']}>
      <AuthProvider>
        <Routes>
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('UpdatePasswordPage', () => {
  it('shows the invalid-link state when there is no recovery session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    renderUpdatePassword()
    expect(await screen.findByText(/scaduto o non valido/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/nuova password/i)).not.toBeInTheDocument()
  })

  it('rejects mismatched passwords without calling updateUser', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
    })
    renderUpdatePassword()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText(/nuova password/i), 'password123')
    await user.type(screen.getByLabelText(/conferma password/i), 'different1')
    await user.click(screen.getByRole('button', { name: /aggiorna password/i }))
    expect(screen.getByText(/non coincidono/i)).toBeInTheDocument()
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('updates the password and redirects into the app on success', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
    })
    mockUpdateUser.mockResolvedValue({ data: {}, error: null })
    renderUpdatePassword()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText(/nuova password/i), 'newpassword123')
    await user.type(screen.getByLabelText(/conferma password/i), 'newpassword123')
    await user.click(screen.getByRole('button', { name: /aggiorna password/i }))
    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword123' }))
    expect(await screen.findByText('home')).toBeInTheDocument()
  })
})
