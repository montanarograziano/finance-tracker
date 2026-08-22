import type { SupabaseClient } from '@supabase/supabase-js'
import type { RecurringException, RecurringRule, TransactionType } from '../lib/types'
import { isoDate } from './filters'
import { getOccurrenceDates } from './recurring'

type RecurringTransactionInsert = {
  account_id: string
  category_id: string | null
  type: TransactionType
  amount: number
  date: string
  description: string
  notes: null
  tags: string[]
  transfer_to_account_id: string | null
  recurring_rule_id: string
}

export async function runRecurringEngine(
  supabase: SupabaseClient,
  today: Date = new Date(),
): Promise<void> {
  const now = new Date(today)
  now.setHours(0, 0, 0, 0)
  const todayStr = isoDate(now)

  // 1. Fetch active rules with start_date on or before today
  const { data: rulesData, error: rulesError } = await supabase
    .from('recurring_rules')
    .select('*')
    .eq('active', true)
    .lte('start_date', todayStr)
  if (rulesError) throw new Error(rulesError.message)
  const rules = (rulesData ?? []) as RecurringRule[]
  if (rules.length === 0) return

  // 2. Fetch all exceptions for these rules
  const ruleIds = rules.map((r) => r.id)
  const { data: exceptionsData, error: exceptionsError } = await supabase
    .from('recurring_exceptions')
    .select('*')
    .in('rule_id', ruleIds)
  if (exceptionsError) throw new Error(exceptionsError.message)
  const exceptions = (exceptionsData ?? []) as RecurringException[]
  const exceptionSet = new Set(exceptions.map((e) => `${e.rule_id}:${e.occurrence_date}`))

  // 3. Compute due occurrences for each rule
  const toInsert: RecurringTransactionInsert[] = []

  for (const rule of rules) {
    // from: last_generated_date (exclusive) or start_date - 1 day (to include start_date itself)
    let from: Date
    if (rule.last_generated_date) {
      from = new Date(rule.last_generated_date + 'T00:00:00')
    } else {
      from = new Date(rule.start_date + 'T00:00:00')
      from.setDate(from.getDate() - 1)
    }

    const occurrences = getOccurrenceDates(rule, from, now)

    for (const d of occurrences) {
      const dateStr = isoDate(d)
      if (exceptionSet.has(`${rule.id}:${dateStr}`)) continue

      toInsert.push({
        account_id: rule.account_id,
        category_id: rule.category_id,
        type: rule.type,
        amount: rule.amount,
        date: dateStr,
        description: rule.description,
        notes: null,
        tags: [],
        transfer_to_account_id: rule.transfer_to_account_id,
        recurring_rule_id: rule.id,
      })
    }
  }

  // 4. Ignore occurrences another tab or a retry has already generated.
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from('transactions').upsert(toInsert, {
      onConflict: 'recurring_rule_id,date',
      ignoreDuplicates: true,
    })
    if (insertError) throw new Error(insertError.message)
  }

  // 5. Update last_generated_date on every processed rule
  for (const rule of rules) {
    const { error } = await supabase
      .from('recurring_rules')
      .update({ last_generated_date: todayStr })
      .eq('id', rule.id)
    if (error) throw new Error(error.message)
  }
}
