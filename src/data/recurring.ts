import { supabase } from '../lib/supabase'
import type {
  RecurringExceptionAction,
  RecurringFrequency,
  RecurringRule,
  TransactionType,
} from '../lib/types'

export type RecurringRuleInput = {
  account_id: string
  category_id: string | null
  type: TransactionType
  transfer_to_account_id: string | null
  amount: number
  description: string
  frequency: RecurringFrequency
  day_of_month: number
  month_of_year: number | null
  start_date: string
  end_date: string | null
  active: boolean
}

export async function listRecurringRules(): Promise<RecurringRule[]> {
  const { data, error } = await supabase
    .from('recurring_rules')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as RecurringRule[]
}

export async function createRecurringRule(input: RecurringRuleInput): Promise<void> {
  const { error } = await supabase.from('recurring_rules').insert(input)
  if (error) throw new Error(error.message)
}

export async function updateRecurringRule(
  id: string,
  input: Partial<RecurringRuleInput>,
): Promise<void> {
  const { error } = await supabase.from('recurring_rules').update(input).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteRecurringRule(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_rules').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteAllRuleTransactions(ruleId: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('recurring_rule_id', ruleId)
  if (error) throw new Error(error.message)
}

export async function createRecurringException(
  ruleId: string,
  occurrenceDate: string,
  action: RecurringExceptionAction,
): Promise<void> {
  const { error } = await supabase
    .from('recurring_exceptions')
    .insert({ rule_id: ruleId, occurrence_date: occurrenceDate, action })
  if (error) throw new Error(error.message)
}
