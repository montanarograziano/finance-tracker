import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from './theme'
import { useTheme } from './themeContext'

function mockMQ(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((q: string) => ({
      matches,
      media: q,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  mockMQ(false)
})

function Spy({ cb }: { cb: (v: ReturnType<typeof useTheme>) => void }) {
  cb(useTheme())
  return null
}

describe('ThemeProvider', () => {
  it('applies dark class when setTheme("dark")', () => {
    let ctx!: ReturnType<typeof useTheme>
    render(
      <ThemeProvider>
        <Spy
          cb={(v) => {
            ctx = v
          }}
        />
      </ThemeProvider>,
    )
    act(() => ctx.setTheme('dark'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes dark class when setTheme("light")', () => {
    document.documentElement.classList.add('dark')
    let ctx!: ReturnType<typeof useTheme>
    render(
      <ThemeProvider>
        <Spy
          cb={(v) => {
            ctx = v
          }}
        />
      </ThemeProvider>,
    )
    act(() => ctx.setTheme('light'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('applies dark class for system when matchMedia prefers dark', () => {
    mockMQ(true)
    let ctx!: ReturnType<typeof useTheme>
    render(
      <ThemeProvider>
        <Spy
          cb={(v) => {
            ctx = v
          }}
        />
      </ThemeProvider>,
    )
    act(() => ctx.setTheme('system'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('persists theme choice to localStorage', () => {
    let ctx!: ReturnType<typeof useTheme>
    render(
      <ThemeProvider>
        <Spy
          cb={(v) => {
            ctx = v
          }}
        />
      </ThemeProvider>,
    )
    act(() => ctx.setTheme('dark'))
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})
