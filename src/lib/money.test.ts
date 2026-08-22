import { describe, expect, it } from 'vitest'
import { formatEur, formatPct, fromCents, sumAmounts, toCents } from './money'

describe('money', () => {
  it('converts to and from cents with rounding', () => {
    expect(toCents(19.99)).toBe(1999)
    expect(toCents(0.1)).toBe(10)
    expect(fromCents(1999)).toBe(19.99)
  })

  it('sums amounts without float drift', () => {
    expect(sumAmounts([0.1, 0.2])).toBe(0.3)
    expect(sumAmounts([10.35, -2.05, 0.7])).toBe(9)
    expect(sumAmounts([])).toBe(0)
  })

  it('formats EUR in it-IT locale', () => {
    // Intl uses non-breaking spaces; normalize before asserting
    expect(formatEur(1234.5).replace(/\s/g, ' ')).toBe('1.234,50 €')
    expect(formatEur(-7).replace(/\s/g, ' ')).toBe('-7,00 €')
  })

  it('formats fractions as it-IT percentages', () => {
    expect(formatPct(0.344).replace(/\s/g, '')).toBe('34,4%')
    expect(formatPct(1).replace(/\s/g, '')).toBe('100%')
    expect(formatPct(0).replace(/\s/g, '')).toBe('0%')
    expect(formatPct(NaN).replace(/\s/g, '')).toBe('0%')
  })
})
