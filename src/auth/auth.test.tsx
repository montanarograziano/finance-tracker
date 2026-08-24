import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext'
import { LoginPage } from './LoginPage'
import { useAuth } from './useAuth'
import { ProtectedRoute } from './ProtectedRoute'

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ error: null }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi
        .fn()
        .mockResolvedValue({ error: { message: 'Invalid login credentials' } }),
      signUp: vi.fn().mockResolvedValue({ data: { session: null, user: null }, error: null }),
      signInWithOAuth: vi
        .fn()
        .mockResolvedValue({ data: { provider: 'google', url: '' }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>area privata</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

function CaptchaSignInProbe() {
  const { signIn } = useAuth()
  return (
    <button onClick={() => void signIn('me@example.com', 'password123', 'captcha-token')}>
      captcha sign in
    </button>
  )
}

function SignUpProbe() {
  const { signUp } = useAuth()
  return (
    <button onClick={() => void signUp('new@example.com', 'password123', 'captcha-token')}>
      sign up
    </button>
  )
}

function DeleteAccountProbe() {
  const { deleteAccount } = useAuth()
  return <button onClick={() => void deleteAccount()}>delete own account</button>
}

describe('auth', () => {
  it('redirects unauthenticated users to the login page', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { name: /accedi/i })).toBeInTheDocument()
    expect(screen.queryByText('area privata')).not.toBeInTheDocument()
  })

  it('shows the error returned by signIn', async () => {
    renderApp('/login')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText(/email/i), 'me@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /accedi/i }))
    await waitFor(() => expect(screen.getByText('Invalid login credentials')).toBeInTheDocument())
  })

  it('forwards the CAPTCHA token to password sign-in', async () => {
    const { supabase } = await import('../lib/supabase')
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AuthProvider>
          <CaptchaSignInProbe />
        </AuthProvider>
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'captcha sign in' }))
    await waitFor(() =>
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'me@example.com',
        password: 'password123',
        options: { captchaToken: 'captcha-token' },
      }),
    )
  })

  it('sends signup confirmation back to the GitHub Pages base path', async () => {
    const { supabase } = await import('../lib/supabase')
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AuthProvider>
          <SignUpProbe />
        </AuthProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'sign up' }))

    await waitFor(() =>
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: {
          emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
          captchaToken: 'captcha-token',
        },
      }),
    )
  })

  it('starts the Google OAuth flow from the login page', async () => {
    const { supabase } = await import('../lib/supabase')
    renderApp('/login')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /google/i }))
    await waitFor(() =>
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
      }),
    )
  })

  it('deletes only through the RPC then clears the local session', async () => {
    const { supabase } = await import('../lib/supabase')
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AuthProvider>
          <DeleteAccountProbe />
        </AuthProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'delete own account' }))

    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledWith('delete_own_account'))
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
})
