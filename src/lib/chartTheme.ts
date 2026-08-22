import type { CSSProperties } from 'react'

/**
 * Shared recharts theming. Colors resolve through CSS variables defined in
 * index.css so charts follow the light/dark theme automatically.
 */

export const chartTick = { fill: 'var(--chart-axis)', fontSize: 12 } as const

export const tooltipContentStyle: CSSProperties = {
  backgroundColor: 'var(--tooltip-bg)',
  border: '1px solid var(--tooltip-border)',
  borderRadius: 12,
  color: 'var(--tooltip-text)',
  boxShadow: '0 8px 24px rgb(0 0 0 / 0.12)',
  fontSize: 13,
}

export const tooltipLabelStyle: CSSProperties = {
  color: 'var(--tooltip-text)',
  fontWeight: 600,
}

export const legendStyle: CSSProperties = { fontSize: 13 }

export const CHART = {
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  line: 'var(--chart-line)',
  alt: 'var(--chart-alt)',
  income: 'var(--chart-income)',
  incomeActive: 'var(--chart-income-active)',
  expense: 'var(--chart-expense)',
  expenseActive: 'var(--chart-expense-active)',
} as const
