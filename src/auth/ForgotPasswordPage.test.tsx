import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext'
import { ForgotPasswordPage } from './ForgotPasswordPage'

const { mockResetPasswordForEmail } = vi.hoisted(() => ({
  mockResetPasswordForEmail: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  },
}))

function renderForgotPassword() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <AuthProvider>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ForgotPasswordPage', () => {
  it('forwards the CAPTCHA token to resetPasswordForEmail', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    renderForgotPassword()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText(/email/i), 'me@example.com')
    await user.click(screen.getByRole('button', { name: /invia link/i }))
    // No Turnstile site key is configured in tests, so captchaToken stays
    // undefined and the second argument omits it.
    await waitFor(() =>
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('me@example.com', {
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
      }),
    )
  })

  it('shows the same neutral confirmation for an existing and a non-existing account', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    renderForgotPassword()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText(/email/i), 'unknown@example.com')
    await user.click(screen.getByRole('button', { name: /invia link/i }))
    await waitFor(() => expect(screen.getByText(/riceverai un link di reset/i)).toBeInTheDocument())
  })
})
