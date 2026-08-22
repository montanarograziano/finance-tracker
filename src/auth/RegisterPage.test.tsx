import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext'
import { RegisterPage } from './RegisterPage'

const { mockSignUp } = vi.hoisted(() => ({ mockSignUp: vi.fn() }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signUp: mockSignUp,
    },
  },
}))

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('RegisterPage', () => {
  it('renders email, password, confirm-password fields and submit button', async () => {
    renderRegister()
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/conferma password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /crea account/i })).toBeInTheDocument()
  })

  it('shows error for invalid email', async () => {
    renderRegister()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText(/email/i), 'notanemail')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.type(screen.getByLabelText(/conferma password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /crea account/i }))
    expect(screen.getByText(/email non valida/i)).toBeInTheDocument()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('shows error for password shorter than 8 characters', async () => {
    renderRegister()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'short')
    await user.type(screen.getByLabelText(/conferma password/i), 'short')
    await user.click(screen.getByRole('button', { name: /crea account/i }))
    expect(screen.getByText(/almeno 8 caratteri/i)).toBeInTheDocument()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('shows error when passwords do not match', async () => {
    renderRegister()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.type(screen.getByLabelText(/conferma password/i), 'different1')
    await user.click(screen.getByRole('button', { name: /crea account/i }))
    expect(screen.getByText(/non coincidono/i)).toBeInTheDocument()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('calls signUp once with correct args on valid form', async () => {
    mockSignUp.mockResolvedValue({ data: { session: null, user: null }, error: null })
    renderRegister()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.type(screen.getByLabelText(/conferma password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /crea account/i }))
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledOnce())
    expect(mockSignUp).toHaveBeenCalledWith({ email: 'user@example.com', password: 'password123' })
  })

  it('tells the user to check their inbox when email confirmation is required', async () => {
    mockSignUp.mockResolvedValue({
      data: { session: null, user: { id: 'u1', email: 'user@example.com' } },
      error: null,
    })
    renderRegister()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.type(screen.getByLabelText(/conferma password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /crea account/i }))
    await waitFor(() => expect(screen.getByText(/link di conferma/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /crea account/i })).toBeDisabled()
  })

  it('shows Supabase error message on failed signup', async () => {
    mockSignUp.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'User already registered' },
    })
    renderRegister()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText(/email/i), 'existing@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.type(screen.getByLabelText(/conferma password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /crea account/i }))
    await waitFor(() => expect(screen.getByText('User already registered')).toBeInTheDocument())
  })
})
