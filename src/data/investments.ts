import { supabase } from '../lib/supabase'
import type { Investment } from '../lib/types'

export async function listInvestments(): Promise<Investment[]> {
  const { data, error } = await supabase.from('investments').select('*').order('name')
  if (error) throw new Error(error.message)
  return data as Investment[]
}
