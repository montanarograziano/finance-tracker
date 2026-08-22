import { describe, expect, it } from 'vitest'
import { isoDate } from './filters'
import type { RecurringRule } from '../lib/types'
import { getOccurrenceDates, monthlyEquivalent, nextOccurrenceDate } from './recurring'

function makeRule(overrides: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: 'r1',
    user_id: 'u1',
    account_id: 'a1',
    category_id: 'c1',
    type: 'expense',
    transfer_to_account_id: null,
    amount: 100,
    description: 'Test',
    frequency: 'monthly',
    day_of_month: 5,
    month_of_year: null,
    start_date: '2026-01-05',
    end_date: null,
    active: true,
    last_generated_date: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('getOccurrenceDates — monthly', () => {
  const rule = makeRule()

  it('returns dates strictly after from and on/before to', () => {
    const from = new Date(2026, 0, 4) // Jan 4 → first occurrence Jan 5 included
    const to = new Date(2026, 2, 5) // Mar 5
    expect(getOccurrenceDates(rule, from, to).map(isoDate)).toEqual([
      '2026-01-05',
      '2026-02-05',
      '2026-03-05',
    ])
  })

  it('excludes the from date itself (strictly after)', () => {
    const from = new Date(2026, 1, 5) // Feb 5 exactly
    const to = new Date(2026, 2, 31)
    expect(getOccurrenceDates(rule, from, to).map(isoDate)).toEqual(['2026-03-05'])
  })

  it('spans a year boundary', () => {
    const from = new Date(2025, 10, 30) // Nov 30 2025
    const to = new Date(2026, 1, 28) // Feb 28 2026
    expect(getOccurrenceDates(rule, from, to).map(isoDate)).toEqual(['2026-01-05', '2026-02-05'])
  })

  it('respects start_date — occurrences before start_date are excluded', () => {
    const lateRule = makeRule({ start_date: '2026-03-05' })
    const from = new Date(2026, 0, 1)
    const to = new Date(2026, 4, 31)
    expect(getOccurrenceDates(lateRule, from, to).map(isoDate)).toEqual([
      '2026-03-05',
      '2026-04-05',
      '2026-05-05',
    ])
  })

  it('respects end_date — occurrences after end_date are excluded', () => {
    const endedRule = makeRule({ end_date: '2026-02-01' })
    const from = new Date(2026, 0, 4)
    const to = new Date(2026, 2, 31)
    expect(getOccurrenceDates(endedRule, from, to).map(isoDate)).toEqual(['2026-01-05'])
  })

  it('returns empty when range is fully before start_date', () => {
    const from = new Date(2025, 0, 1)
    const to = new Date(2025, 11, 31)
    expect(getOccurrenceDates(rule, from, to)).toHaveLength(0)
  })

  it('day 28 in February does not overflow to March', () => {
    const feb28Rule = makeRule({ day_of_month: 28, start_date: '2026-02-28' })
    const from = new Date(2026, 1, 27) // Feb 27
    const to = new Date(2026, 1, 28) // Feb 28
    const result = getOccurrenceDates(feb28Rule, from, to)
    expect(result).toHaveLength(1)
    expect(result[0].getMonth()).toBe(1) // 0-indexed: 1 = February
    expect(result[0].getDate()).toBe(28)
  })
})

describe('getOccurrenceDates — yearly', () => {
  const rule = makeRule({
    frequency: 'yearly',
    month_of_year: 3,
    day_of_month: 15,
    start_date: '2024-03-15',
  })

  it('returns yearly occurrence in a single-year range', () => {
    const from = new Date(2026, 0, 1)
    const to = new Date(2026, 11, 31)
    expect(getOccurrenceDates(rule, from, to).map(isoDate)).toEqual(['2026-03-15'])
  })

  it('returns multiple years when range spans years', () => {
    const from = new Date(2025, 0, 1)
    const to = new Date(2027, 11, 31)
    expect(getOccurrenceDates(rule, from, to).map(isoDate)).toEqual([
      '2025-03-15',
      '2026-03-15',
      '2027-03-15',
    ])
  })

  it('returns empty when month/day has not yet occurred this year and range is narrow', () => {
    const from = new Date(2026, 2, 16) // March 16 — one day after occurrence
    const to = new Date(2026, 2, 31)
    expect(getOccurrenceDates(rule, from, to)).toHaveLength(0)
  })
})

describe('monthlyEquivalent', () => {
  it('returns amount unchanged for monthly rules', () => {
    expect(monthlyEquivalent(makeRule({ frequency: 'monthly', amount: 500 }))).toBe(500)
  })

  it('returns amount/12 rounded to 2 decimal places for yearly rules', () => {
    expect(monthlyEquivalent(makeRule({ frequency: 'yearly', amount: 1200 }))).toBe(100)
    expect(monthlyEquivalent(makeRule({ frequency: 'yearly', amount: 100 }))).toBe(8.33)
  })
})

describe('nextOccurrenceDate', () => {
  const rule = makeRule()

  it('returns the next occurrence strictly after after-date', () => {
    const result = nextOccurrenceDate(rule, new Date(2026, 0, 10))
    expect(result).not.toBeNull()
    expect(isoDate(result!)).toBe('2026-02-05')
  })

  it('returns null when rule has ended before after-date', () => {
    const endedRule = makeRule({ end_date: '2026-01-01' })
    expect(nextOccurrenceDate(endedRule, new Date(2026, 1, 1))).toBeNull()
  })
})
