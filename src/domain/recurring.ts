import type { RecurringRule } from '../lib/types'

/** The subset of RecurringRule fields needed to enumerate occurrence dates. */
export type OccurrenceRule = Pick<
  RecurringRule,
  'frequency' | 'day_of_month' | 'month_of_year' | 'start_date' | 'end_date'
>

/**
 * Returns all occurrence dates for `rule` that are strictly after `from`
 * and on or before `to`, within the rule's start_date / end_date bounds.
 */
export function getOccurrenceDates(rule: OccurrenceRule, from: Date, to: Date): Date[] {
  const results: Date[] = []
  const ruleStart = new Date(rule.start_date + 'T00:00:00')
  const ruleEnd = rule.end_date ? new Date(rule.end_date + 'T00:00:00') : null

  if (rule.frequency === 'monthly') {
    // Start scanning from the later of `from` and `ruleStart`
    const scanFrom = from >= ruleStart ? from : ruleStart
    let y = scanFrom.getFullYear()
    let m = scanFrom.getMonth() // 0-indexed

    while (true) {
      const d = new Date(y, m, rule.day_of_month)
      if (d > to) break
      if (ruleEnd && d > ruleEnd) break
      if (d > from && d >= ruleStart) {
        results.push(d)
      }
      m += 1
      if (m > 11) {
        m = 0
        y += 1
      }
    }
  } else {
    // yearly — month_of_year is guaranteed non-null by DB constraint
    const scanFromYear = Math.max(from.getFullYear(), ruleStart.getFullYear())
    const scanToYear = to.getFullYear()
    for (let y = scanFromYear; y <= scanToYear; y++) {
      const d = new Date(y, rule.month_of_year! - 1, rule.day_of_month)
      if (d > to) break
      if (ruleEnd && d > ruleEnd) break
      if (d > from && d >= ruleStart) {
        results.push(d)
      }
    }
  }

  return results
}

/** Monthly cost equivalent: amount for monthly rules; amount/12 (rounded to cents) for yearly. */
export function monthlyEquivalent(rule: Pick<RecurringRule, 'frequency' | 'amount'>): number {
  if (rule.frequency === 'monthly') return rule.amount
  return Math.round((rule.amount / 12) * 100) / 100
}

/** First occurrence strictly after `after`, or null if rule has ended. */
export function nextOccurrenceDate(rule: RecurringRule, after: Date): Date | null {
  const horizon = new Date(after.getFullYear() + 5, 11, 31)
  const dates = getOccurrenceDates(rule, after, horizon)
  return dates.length > 0 ? dates[0] : null
}
