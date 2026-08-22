import { supabase } from '../lib/supabase'
import type { AccountWithBalance } from '../lib/types'

export async function fetchAccountBalances(): Promise<AccountWithBalance[]> {
  const { data, error } = await supabase.rpc('account_balances')
  if (error) throw new Error(error.message)
  return (data ?? []) as AccountWithBalance[]
}

export async function fetchNetWorthSeries(): Promise<{ month: string; value: number }[]> {
  const { data, error } = await supabase.rpc('net_worth_series')
  if (error) throw new Error(error.message)
  return (data ?? []) as { month: string; value: number }[]
}
