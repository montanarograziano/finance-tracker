import { supabase } from '../lib/supabase'
import type { Account, AccountType } from '../lib/types'

export type AccountInput = {
  name: string
  type: AccountType
  initial_balance: number
}

export async function listAccounts(): Promise<Account[]> {
  const { data, error } = await supabase.from('accounts').select('*').order('created_at')
  if (error) throw new Error(error.message)
  return data as Account[]
}

export async function createAccount(input: AccountInput): Promise<void> {
  const { error } = await supabase.from('accounts').insert(input)
  if (error) throw new Error(error.message)
}

/** Insert several accounts and return the created rows (used by import). */
export async function createAccountsReturning(inputs: AccountInput[]): Promise<Account[]> {
  if (inputs.length === 0) return []
  const { data, error } = await supabase.from('accounts').insert(inputs).select()
  if (error) throw new Error(error.message)
  return data as Account[]
}

export async function updateAccount(id: string, input: AccountInput): Promise<void> {
  const { error } = await supabase.from('accounts').update(input).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from('accounts').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
