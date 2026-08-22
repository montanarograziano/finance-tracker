import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { PrivacyProvider } from './privacy'
import { usePrivacy } from './privacyContext'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('privacy-mode')
})

function Spy({ cb }: { cb: (v: ReturnType<typeof usePrivacy>) => void }) {
  cb(usePrivacy())
  return null
}

describe('PrivacyProvider', () => {
  it('starts with money visible by default', () => {
    let ctx!: ReturnType<typeof usePrivacy>
    render(
      <PrivacyProvider>
        <Spy
          cb={(v) => {
            ctx = v
          }}
        />
      </PrivacyProvider>,
    )
    expect(ctx.hideMoney).toBe(false)
    expect(document.documentElement.classList.contains('privacy-mode')).toBe(false)
  })

  it('applies privacy-mode class when toggled on', () => {
    let ctx!: ReturnType<typeof usePrivacy>
    render(
      <PrivacyProvider>
        <Spy
          cb={(v) => {
            ctx = v
          }}
        />
      </PrivacyProvider>,
    )
    act(() => ctx.toggleHideMoney())
    expect(document.documentElement.classList.contains('privacy-mode')).toBe(true)
  })

  it('removes privacy-mode class when toggled back off', () => {
    let ctx!: ReturnType<typeof usePrivacy>
    render(
      <PrivacyProvider>
        <Spy
          cb={(v) => {
            ctx = v
          }}
        />
      </PrivacyProvider>,
    )
    act(() => ctx.toggleHideMoney())
    act(() => ctx.toggleHideMoney())
    expect(document.documentElement.classList.contains('privacy-mode')).toBe(false)
  })

  it('persists the choice to localStorage', () => {
    let ctx!: ReturnType<typeof usePrivacy>
    render(
      <PrivacyProvider>
        <Spy
          cb={(v) => {
            ctx = v
          }}
        />
      </PrivacyProvider>,
    )
    act(() => ctx.toggleHideMoney())
    expect(localStorage.getItem('hideMoney')).toBe('true')
  })

  it('restores hidden state from localStorage on mount', () => {
    localStorage.setItem('hideMoney', 'true')
    let ctx!: ReturnType<typeof usePrivacy>
    render(
      <PrivacyProvider>
        <Spy
          cb={(v) => {
            ctx = v
          }}
        />
      </PrivacyProvider>,
    )
    expect(ctx.hideMoney).toBe(true)
    expect(document.documentElement.classList.contains('privacy-mode')).toBe(true)
  })
})
