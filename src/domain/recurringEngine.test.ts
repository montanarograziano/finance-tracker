import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RecurringException, RecurringRule } from '../lib/types'
import { runRecurringEngine } from './recurringEngine'

function makeRule(overrides: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: 'r1',
    user_id: 'u1',
    account_id: 'a1',
    category_id: 'c1',
    type: 'expense',
    transfer_to_account_id: null,
    amount: 100,
    description: 'Affitto',
    frequency: 'monthly',
    day_of_month: 15,
    month_of_year: null,
    start_date: '2026-01-15',
    end_date: null,
    active: true,
    last_generated_date: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function createMockSupabase(rules: RecurringRule[], exceptions: RecurringException[] = []) {
  const insertedTransactions: object[] = []
  const upsertOptions: object[] = []
  const updatedRules: { id: string; last_generated_date: string }[] = []

  const from = (table: string) => {
    if (table === 'recurring_rules') {
      return {
        select: () => ({
          eq: () => ({
            lte: () => Promise.resolve({ data: rules, error: null }),
          }),
        }),
        update: (data: { last_generated_date: string }) => ({
          eq: (_col: string, id: string) => {
            updatedRules.push({ id, last_generated_date: data.last_generated_date })
            return Promise.resolve({ error: null })
          },
        }),
      }
    }
    if (table === 'recurring_exceptions') {
      return {
        select: () => ({
          in: () => Promise.resolve({ data: exceptions, error: null }),
        }),
      }
    }
    if (table === 'transactions') {
      return {
        upsert: (rows: object[], options: object) => {
          insertedTransactions.push(...rows)
          upsertOptions.push(options)
          return Promise.resolve({ error: null })
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  }

  return {
    client: { from } as unknown as SupabaseClient,
    insertedTransactions,
    upsertOptions,
    updatedRules,
  }
}

// Fixed test date: March 15 2026 — the rule fires on day 15
const TEST_DATE = new Date(2026, 2, 15) // month is 0-indexed

describe('runRecurringEngine', () => {
  it('inserts a transaction for each due occurrence and updates last_generated_date', async () => {
    // Rule started 2026-01-15, never generated; today is 2026-03-15
    // Expected: 3 transactions (Jan 15, Feb 15, Mar 15)
    const { client, insertedTransactions, upsertOptions, updatedRules } = createMockSupabase([
      makeRule(),
    ])

    await runRecurringEngine(client, TEST_DATE)

    expect(insertedTransactions).toHaveLength(3)
    expect((insertedTransactions[0] as { date: string }).date).toBe('2026-01-15')
    expect((insertedTransactions[1] as { date: string }).date).toBe('2026-02-15')
    expect((insertedTransactions[2] as { date: string }).date).toBe('2026-03-15')
    expect(updatedRules).toHaveLength(1)
    expect(updatedRules[0].last_generated_date).toBe('2026-03-15')
    expect((insertedTransactions[0] as { recurring_rule_id: string }).recurring_rule_id).toBe('r1')
    expect(upsertOptions).toEqual([
      { onConflict: 'recurring_rule_id,date', ignoreDuplicates: true },
    ])
  })

  it('is idempotent: resumes from last_generated_date', async () => {
    // last_generated_date = 2026-02-15 → only Mar 15 is due
    const rule = makeRule({ last_generated_date: '2026-02-15' })
    const { client, insertedTransactions } = createMockSupabase([rule])

    await runRecurringEngine(client, TEST_DATE)

    expect(insertedTransactions).toHaveLength(1)
    expect((insertedTransactions[0] as { date: string }).date).toBe('2026-03-15')
  })

  it('skips occurrences that have an exception', async () => {
    const exception: RecurringException = {
      id: 'e1',
      user_id: 'u1',
      rule_id: 'r1',
      occurrence_date: '2026-03-15',
      action: 'skip',
      created_at: '2026-03-15T00:00:00Z',
    }
    const rule = makeRule({ last_generated_date: '2026-02-15' })
    const { client, insertedTransactions } = createMockSupabase([rule], [exception])

    await runRecurringEngine(client, TEST_DATE)

    expect(insertedTransactions).toHaveLength(0)
  })

  it('returns early without DB writes when there are no active rules', async () => {
    const { client, insertedTransactions, updatedRules } = createMockSupabase([])

    await runRecurringEngine(client, TEST_DATE)

    expect(insertedTransactions).toHaveLength(0)
    expect(updatedRules).toHaveLength(0)
  })
})
