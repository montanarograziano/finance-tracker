import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const auth = vi.hoisted(() => ({
  session: null as { user: { id: string } } | null,
  listener: undefined as
    ((_event: string, session: { user: { id: string } } | null) => void) | undefined,
  holdPrivateQuery: false,
}))

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: auth.session } })),
      onAuthStateChange: vi.fn((listener) => {
        auth.listener = listener
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
    },
  },
}))

vi.mock('./components/Layout', async () => {
  const { Outlet } = await import('react-router-dom')
  return { Layout: Outlet }
})

vi.mock('./pages/DashboardPage', async () => {
  const { useQuery } = await import('@tanstack/react-query')
  return {
    DashboardPage: () => {
      const { data } = useQuery({
        queryKey: ['private-test-data'],
        queryFn: () =>
          auth.holdPrivateQuery
            ? new Promise<string>(() => undefined)
            : Promise.resolve(auth.session?.user.id ?? ''),
      })
      return <div>{data ?? 'loading private data'}</div>
    },
  }
})

beforeEach(() => {
  auth.session = null
  auth.listener = undefined
  auth.holdPrivateQuery = false
  window.history.pushState({}, '', '/')
})

describe('App', () => {
  it('redirects to the login page when unauthenticated', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: /accedi/i })).toBeInTheDocument()
  })

  it('does not reuse private query data after the authenticated user changes', async () => {
    auth.session = { user: { id: 'user-a' } }
    render(<App />)
    expect(await screen.findByText('user-a')).toBeInTheDocument()

    auth.holdPrivateQuery = true
    auth.session = { user: { id: 'user-b' } }
    await act(() => auth.listener?.('SIGNED_IN', auth.session))

    await waitFor(() => expect(screen.getByText('loading private data')).toBeInTheDocument())
    expect(screen.queryByText('user-a')).not.toBeInTheDocument()
  })
})
