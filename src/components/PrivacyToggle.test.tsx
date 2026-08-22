import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { PrivacyProvider } from '../lib/privacy'
import { PrivacyToggle } from './PrivacyToggle'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('privacy-mode')
})

describe('PrivacyToggle', () => {
  it('toggles privacy-mode class and localStorage on click', () => {
    render(
      <PrivacyProvider>
        <PrivacyToggle />
      </PrivacyProvider>,
    )
    const button = screen.getByRole('button')
    expect(document.documentElement.classList.contains('privacy-mode')).toBe(false)

    fireEvent.click(button)
    expect(document.documentElement.classList.contains('privacy-mode')).toBe(true)
    expect(localStorage.getItem('hideMoney')).toBe('true')

    fireEvent.click(button)
    expect(document.documentElement.classList.contains('privacy-mode')).toBe(false)
    expect(localStorage.getItem('hideMoney')).toBe('false')
  })

  it('reflects the persisted hidden state on mount', () => {
    localStorage.setItem('hideMoney', 'true')
    render(
      <PrivacyProvider>
        <PrivacyToggle />
      </PrivacyProvider>,
    )
    expect(document.documentElement.classList.contains('privacy-mode')).toBe(true)
  })
})
