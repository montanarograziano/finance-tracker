import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Turnstile } from './Turnstile'

type TestTurnstile = {
  render: (container: HTMLElement, options: { callback: (token: string) => void }) => string
  remove: (widgetId: string) => void
}

const turnstileWindow = window as Window & { turnstile?: TestTurnstile }

afterEach(() => {
  vi.unstubAllEnvs()
  delete turnstileWindow.turnstile
  document.getElementById('cloudflare-turnstile')?.remove()
})

describe('Turnstile', () => {
  it('returns a verification token and removes its widget on cleanup', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key')
    const onToken = vi.fn()
    const remove = vi.fn()
    turnstileWindow.turnstile = {
      render: (_container, options) => {
        options.callback('verified-token')
        return 'widget-1'
      },
      remove,
    }

    const { unmount } = render(
      <Turnstile label="Security verification" onToken={onToken} resetKey={0} />,
    )

    await waitFor(() => expect(onToken).toHaveBeenCalledWith('verified-token'))
    unmount()
    expect(remove).toHaveBeenCalledWith('widget-1')
  })
})
