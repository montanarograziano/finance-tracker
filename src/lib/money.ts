const CENTS_PER_EUR = 100

export function toCents(amount: number): number {
  return Math.round(amount * CENTS_PER_EUR)
}

export function fromCents(cents: number): number {
  return cents / CENTS_PER_EUR
}

/** Sum euro amounts safely by accumulating in integer cents. */
export function sumAmounts(amounts: number[]): number {
  return fromCents(amounts.reduce((acc, a) => acc + toCents(a), 0))
}

// useGrouping forced on: it-IT CLDR data uses "min2" grouping, which would drop the
// thousands separator on 4-digit amounts (1234,50 instead of 1.234,50).
const eurFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  useGrouping: true,
})

export function formatEur(amount: number): string {
  return eurFormatter.format(amount)
}

const pctFormatter = new Intl.NumberFormat('it-IT', {
  style: 'percent',
  maximumFractionDigits: 1,
})

/** Format a fraction (0–1) as an it-IT percentage, e.g. 0.344 → "34,4%". */
export function formatPct(fraction: number): string {
  return pctFormatter.format(Number.isFinite(fraction) ? fraction : 0)
}

/** Compact axis tick: €1.5k / €800. */
export function tickEur(v: number): string {
  if (Math.abs(v) >= 1000) {
    const k = v / 1000
    return `€${Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1)}k`
  }
  return `€${Math.round(v)}`
}
